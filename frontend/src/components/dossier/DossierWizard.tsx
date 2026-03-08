import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronDown, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import api from '@/services/api'
import { toast } from 'sonner'
import { formatCurrency } from '@/stores/appConfigStore'
import type { GenericRecord } from '@/types/object-definition'
import { DossierWizardPage } from '@/components/dossier/DossierWizardPage'
import { GenericDetailInputFormatter } from '@/components/generic/GenericDetailInputFormatter'
import { useObjectDefinition } from '@/hooks/useObjectDefinition'
import { useAuthStore } from '@/stores/authStore'
import { useTenantConfig } from '@/hooks/useTenantConfig'

const SECTOR_OPTIONS = [
  { value: 'A', label: "A — Construction" },
  { value: 'B', label: "B — Travaux routiers et voirie urbaine" },
  { value: 'C', label: "C — Assainissement, conduites, canaux" },
  { value: 'D', label: "D — Construction d'ouvrages d'art" },
  { value: 'E', label: "E — Travaux maritimes et fluviaux" },
  { value: 'F', label: "F — Barrages et ouvrages hydrauliques" },
  { value: 'G', label: "G — Injection, drainage et parois moulées" },
  { value: 'H', label: "H — Sondages et forages hydrogéologiques" },
  { value: 'I', label: "I — Équipements hydromécaniques" },
  { value: 'Y', label: "Y — Aménagement des cours d'eau et protection contre les inondations" },
]

const T2_ELIGIBLE_SECTORS = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'I', 'Y'])

/** masseSalarialeRatioPercent from sector configs - null = no minimum */
const MASSE_SALARIALE_RATIO_PERCENT_BY_SECTOR: Record<string, number | null> = {
  A: 15,
  B: 9,
  C: 9,
  D: 9,
  E: 9,
  F: 9,
  G: 9,
  H: null,
  I: 7,
  Y: 9,
}

/** Classe options by sector: A,B,C,F have S; D,E,G,H,I,Y have different ranges */
const CLASSE_OPTIONS_BY_SECTOR: Record<string, string[]> = {
  A: ['S', '1', '2', '3', '4', '5'],
  B: ['S', '1', '2', '3', '4', '5'],
  C: ['S', '1', '2', '3', '4', '5'],
  D: ['1', '2', '3', '4', '5'],
  E: ['1', '2', '3', '4', '5'],
  F: ['S', '1', '2', '3', '4', '5'],
  G: ['1', '2', '3', '4'],
  H: ['1', '2', '3', '4'],
  I: ['1', '2', '3', '4', '5'],
  Y: ['1', '2', '3', '4', '5'],
}

const ICE_PATTERN = /^\d{15}$/

const CLASSIFICATION_METHOD_LABELS: Record<string, string> = {
  T1: "Tableau 1 — Chiffre d'affaires uniquement",
  T2: "Tableau 2 — Chiffre d'affaires + Capital social",
}

const FORME_JURIDIQUE_OPTIONS = [
  { value: 'SARL', label: 'SARL' },
  { value: 'SA', label: 'SA' },
  { value: 'SUARL', label: 'SUARL' },
  { value: 'EI', label: 'EI' },
  { value: 'SNC', label: 'SNC' },
]

/** 10 official roles from encadrement.json */
const ENCADREMENT_ROLES = [
  { value: 'gerant', label: 'Gérant / Directeur Général', scoreLt5: 20, scoreGte5: 25, score: undefined },
  { value: 'ingenieur', label: 'Ingénieur / Docteur', score: 13 },
  { value: 'master', label: 'Master scientifique (Bac+5)', score: 10 },
  { value: 'licence', label: 'Licence en sciences ou Maîtrise', score: 8 },
  { value: 'technicien', label: 'Technicien spécialisé', score: 6 },
  { value: 'cadre', label: 'Cadre administratif', score: 5 },
  { value: 'techbac2', label: 'Technicien (Bac+2 sciences)', score: 4 },
  { value: 'deug', label: 'Deug en sciences (Bac+2)', score: 3 },
  { value: 'autrebac2', label: 'Autre diplôme niveau Bac+2', score: 2 },
  { value: 'ofppt', label: 'Diplôme qualification professionnelle (OFPPT)', score: 1 },
] as const

const ENGINEER_ROLES = new Set(['ingenieur', 'master', 'licence'])
const TECHNICIAN_ROLES = new Set(['technicien', 'techbac2', 'deug', 'autrebac2', 'ofppt', 'cadre'])

function computeMemberScore(role: string, anneesExperience: number | string): number {
  const r = role.toLowerCase().trim()
  const years = typeof anneesExperience === 'number' ? anneesExperience : parseFloat(String(anneesExperience)) || 0
  const def = ENCADREMENT_ROLES.find((o) => o.value === r)
  if (!def) return 0
  if (def.value === 'gerant') return years >= 5 ? 25 : 20
  return def.score ?? 0
}

const CA_YEARS_3 = ['N', 'N-1', 'N-2'] as const
const CA_YEARS_5 = ['N', 'N-1', 'N-2', 'N-3', 'N-4'] as const

interface SecteurClasseDemandee {
  secteur: string
  classeDemandee: string
}

function parseSecteurClasseDemandee(val: unknown): SecteurClasseDemandee[] {
  if (!val) return []
  if (Array.isArray(val)) {
    return val
      .filter((x): x is SecteurClasseDemandee => x && typeof x === 'object' && 'secteur' in x)
      .map((x) => ({ secteur: String(x.secteur || ''), classeDemandee: String(x.classeDemandee || '') }))
  }
  if (typeof val === 'string') {
    try {
      const p = JSON.parse(val) as unknown
      return Array.isArray(p) ? parseSecteurClasseDemandee(p) : []
    } catch {
      return []
    }
  }
  return []
}

interface MembreEncadrementRow {
  id?: number
  name: string
  role: string
  diplome?: string
  anneesExperience: number | string
  secteurImputation: string
  _local?: boolean
}

export interface CaEntryCell {
  caTTC: string
  caHT: string
  montantSoustraite: string
  isGrosOeuvresSingleLot: boolean
}

export interface DossierWizardProps {
  /** For drawer mode: controls visibility */
  open?: boolean
  /** For drawer mode: called when drawer should close */
  onOpenChange?: (open: boolean) => void
  /** When provided, opens in resume mode with pre-filled data at currentStep */
  initialDossier?: GenericRecord | null
  /** Callback when wizard completes successfully (e.g. redirect, refresh) */
  onSuccess?: (dossier: GenericRecord) => void
  /** 'drawer' = side panel (default), 'page' = full page layout */
  layout?: 'drawer' | 'page'
  /** For page layout: callback when user clicks Précédent on step 1 (for leave confirmation) */
  onRequestLeave?: () => void
}

function normalizeClassificationMethod(val: string): string {
  const v = val.toUpperCase()
  if (v === 'TABLEAU1' || v === 'T1') return 'T1'
  if (v === 'TABLEAU2' || v === 'T2') return 'T2'
  return val || ''
}

function parseSectors(val: unknown): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try {
      const p = JSON.parse(val)
      return Array.isArray(p) ? p : val ? [val] : []
    } catch {
      return val ? [val] : []
    }
  }
  return []
}

export function DossierWizard({
  open = true,
  onOpenChange,
  initialDossier,
  onSuccess,
  layout = 'drawer',
  onRequestLeave,
}: DossierWizardProps) {
  const { t } = useTranslation(['common', 'objects'])
  const navigate = useNavigate()
  const { definition: dossierDef } = useObjectDefinition('dossier')
  const { definition: membreEncadrementDef } = useObjectDefinition('membreEncadrement')
  const isResume = !!initialDossier?.id
  const user = useAuthStore((s) => s.user)
  const { data: tenantConfig } = useTenantConfig()
  const tenantMode = tenantConfig?.mode ?? 'single_tenant'
  const hasOrgs = ['single_tenant', 'multi_tenant', 'org_and_tenant'].includes(tenantMode)
  const isAdmin = Boolean(
    user && (user.profile === 'admin' || (user.organizationId == null && user.tenantId == null))
  )
  const needsOrgSelector = isAdmin && hasOrgs

  const getFieldDef = (key: string) => dossierDef?.fields?.find((f) => f.key === key)
  const getMembreFieldDef = (key: string) => membreEncadrementDef?.fields?.find((f) => f.key === key)
  const isPageLayout = layout === 'page'

  const [dossier, setDossier] = useState<GenericRecord | null>(initialDossier ?? null)
  const dossierId = dossier?.id ? Number(dossier.id) : null
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [raisonSociale, setRaisonSociale] = useState('')
  const [formeJuridique, setFormeJuridique] = useState('')
  const [dateCreation, setDateCreation] = useState('')
  const [ice, setIce] = useState('')
  const [sectorsSelected, setSectorsSelected] = useState<string[]>([])
  const [secteurClasseDemandee, setSecteurClasseDemandee] = useState<SecteurClasseDemandee[]>([])
  const [classificationMethod, setClassificationMethod] = useState('')
  const [organization, setOrganization] = useState<number | string | null>(null)
  const [caYears, setCaYears] = useState<string>('3')
  const [caEntriesBySectorYear, setCaEntriesBySectorYear] = useState<Record<string, Record<string, CaEntryCell>>>({})
  const [capitalSocial, setCapitalSocial] = useState<string>('')
  const [masseSalariale, setMasseSalariale] = useState<string>('')
  const [membres, setMembres] = useState<MembreEncadrementRow[]>([])
  const [materielChecklist, setMaterielChecklist] = useState<Record<string, Record<string, { checked: boolean; quantite: number }>>>({})
  const [materielCertifiedBySector, setMaterielCertifiedBySector] = useState<Record<string, boolean>>({})
  const [materielMinimumConfig, setMaterielMinimumConfig] = useState<Record<string, string[]>>({})
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [addMemberForm, setAddMemberForm] = useState<{
    nomComplet: string
    role: string
    secteurImputation: string
    experienceYears: string
  }>({ nomComplet: '', role: '', secteurImputation: '', experienceYears: '' })
  const [addMemberSaving, setAddMemberSaving] = useState(false)
  const [btpEncadrementConfig, setBtpEncadrementConfig] = useState<{
    roles: Array<{ role: string; label: string; score?: number; scoreLt5?: number; scoreGte5?: number }>
    minScoresBySectorClasse: Record<string, Record<string, { t1: number; t2?: number }>>
  } | null>(null)
  const [classificationPreview, setClassificationPreview] = useState<Array<{
    secteur: string
    classeObtenue: string
    scoreCa: boolean
    scoreCapital: boolean
    scoreEncadrement: boolean
    scoreMasseSalariale: boolean
    scoreMateriel: boolean
    encadrementScoreActual: number
    encadrementScoreRequired: number
    caActualMDH: number
    caRequiredMDH: number
    ratioActual?: number
    ratioRequired?: number
    requestedClasse?: string
  }> | null>(null)

  const currentStepNum = dossier?.currentStep != null ? Number(dossier.currentStep) : 1

  const steps = useMemo(() => {
    const s = [
      { n: 1, key: 'info', skip: false },
      { n: 2, key: 'sectors', skip: false },
      { n: 3, key: 'ca', skip: false },
      { n: 4, key: 'capital', skip: classificationMethod === 'T1' },
      { n: 5, key: 'encadrement', skip: false },
      { n: 6, key: 'masse', skip: false },
      { n: 7, key: 'materiel', skip: false },
      { n: 9, key: 'recap', skip: false },
    ]
    return s.filter((x) => !x.skip)
  }, [classificationMethod, sectorsSelected])

  const totalSteps = steps.length
  const currentStepIndex = steps.findIndex((s) => s.n === currentStepNum)
  const displayStep = currentStepIndex >= 0 ? currentStepIndex + 1 : 1
  const progressPercent = totalSteps > 0 ? (displayStep / totalSteps) * 100 : 0

  useEffect(() => {
    if (open || isPageLayout) {
      if (initialDossier) {
        setDossier(initialDossier)
        setRaisonSociale(String(initialDossier.raisonSociale ?? ''))
        setFormeJuridique(String(initialDossier.formeJuridique ?? ''))
        setDateCreation(
          initialDossier.dateCreation
            ? new Date(initialDossier.dateCreation as string).toISOString().slice(0, 10)
            : ''
        )
        setIce(String(initialDossier.ice ?? ''))
        setSectorsSelected(parseSectors(initialDossier.sectorsSelected))
        setSecteurClasseDemandee(parseSecteurClasseDemandee(initialDossier.secteurClasseDemandee))
        setClassificationMethod(normalizeClassificationMethod(String(initialDossier.classificationMethod ?? '')))
        setOrganization((initialDossier.organizationId ?? (initialDossier as any).organization?.id) ?? null)
        setCaYears(String(initialDossier.caYears ?? '3'))
        setCapitalSocial(String(initialDossier.capitalSocial ?? ''))
        setMasseSalariale(String(initialDossier.masseSalariale ?? ''))
        setMaterielCertifiedBySector(
          (() => {
            const secs = parseSectors(initialDossier.sectorsSelected)
            return typeof initialDossier.materielConfirmed === 'boolean' && initialDossier.materielConfirmed
              ? Object.fromEntries(secs.map((s) => [s, true]))
              : {}
          })()
        )
      } else {
        setDossier(null)
        setRaisonSociale('')
        setFormeJuridique('')
        setDateCreation('')
        setIce('')
        setSectorsSelected([])
        setSecteurClasseDemandee([])
        setClassificationMethod('')
        setOrganization(null)
        setCaYears('3')
        setCaEntriesBySectorYear({})
        setCapitalSocial('')
        setMasseSalariale('')
        setMembres([])
        setMaterielChecklist({})
        setMaterielCertifiedBySector({})
      }
      setError('')
    }
  }, [open, initialDossier])

  useEffect(() => {
    const id = dossierId ?? (initialDossier?.id != null ? Number(initialDossier.id) : null)
    if (!id || (!open && !isPageLayout)) return
    const loadRelated = async () => {
      try {
        setLoading(true)
        const [memRes, caRes] = await Promise.all([
          api.get(`/api/membreEncadrements/dossier/${id}`).catch(() => ({ data: { membreEncadrements: [] } })),
          api.get(`/api/caEntries/dossier/${id}`).catch(() => ({ data: { caEntries: [] } })),
        ])
        const memData = memRes.data?.membreEncadrements ?? memRes.data?.results ?? memRes.data
        const memArr = Array.isArray(memData) ? memData : []
        setMembres(
          memArr.map((m: any) => ({
            id: m.id,
            name: m.name ?? '',
            role: m.role ?? '',
            diplome: m.diplome ?? undefined,
            anneesExperience: m.anneesExperience ?? '',
            secteurImputation: m.secteurImputation ?? '',
          }))
        )
        const caData = caRes.data?.caEntries ?? caRes.data?.results ?? caRes.data
        const caArr = Array.isArray(caData) ? caData : []
        // eslint-disable-next-line no-console
        if (caArr.length > 0) console.log('[DossierWizard] caEntries loaded:', caArr.length, 'entries', caArr.slice(0, 3))
        const bySectorYear: Record<string, Record<string, CaEntryCell>> = {}
        for (const e of caArr as any[]) {
          const sec = String(e.secteur ?? '').trim()
          const yr = String(e.annee ?? '').trim()
          if (!sec || !yr) continue
          if (!bySectorYear[sec]) bySectorYear[sec] = {}
          bySectorYear[sec][yr] = {
            caTTC: String(e.caTTC ?? ''),
            caHT: String(e.caHT ?? ''),
            montantSoustraite: String(e.montantSoustraite ?? ''),
            isGrosOeuvresSingleLot: e.isGrosOeuvresSingleLot === true,
          }
        }
        setCaEntriesBySectorYear(bySectorYear)
      } finally {
        setLoading(false)
      }
    }
    loadRelated()
  }, [open, dossierId, initialDossier?.id, isPageLayout])

  useEffect(() => {
    if ((currentStepNum === 5 || currentStepNum === 9) && (open || isPageLayout)) {
      api
        .get<{ roles: Array<{ role: string; label: string; score?: number; scoreLt5?: number; scoreGte5?: number }>; minScoresBySectorClasse: Record<string, Record<string, { t1: number; t2?: number }>> }>('/api/config/btp-encadrement')
        .then(({ data }) => setBtpEncadrementConfig(data))
        .catch(() => setBtpEncadrementConfig(null))
    }
  }, [currentStepNum, open, isPageLayout])

  useEffect(() => {
    if (currentStepNum === 7 && open) {
      api
        .get<{ sectors: Record<string, string[]> }>('/api/config/btp-materiel-minimum')
        .then(({ data }) => setMaterielMinimumConfig(data.sectors ?? {}))
        .catch(() => setMaterielMinimumConfig({}))
    }
  }, [currentStepNum, open])

  useEffect(() => {
    if ((currentStepNum === 9 && (open || isPageLayout)) && dossierId) {
      api
        .get<{ results: typeof classificationPreview }>(`/api/dossiers/${dossierId}/classification-preview`)
        .then(({ data }) => setClassificationPreview(data.results ?? []))
        .catch(() => setClassificationPreview(null))
    } else {
      setClassificationPreview(null)
    }
  }, [currentStepNum, open, isPageLayout, dossierId])

  const secteurImputationOptions = useMemo(() => {
    const opts = sectorsSelected
      .map((s) => {
        const o = SECTOR_OPTIONS.find((x) => x.value === s)
        return o ? { value: s, label: o.label } : null
      })
      .filter(Boolean) as { value: string; label: string }[]
    opts.push({ value: 'ALL', label: 'TOUS' })
    return opts
  }, [sectorsSelected])

  const computedEncadrementTotal = useMemo(() => {
    let total = 0
    for (const m of membres) {
      total += computeMemberScore(m.role, m.anneesExperience)
    }
    return total
  }, [membres])

  const engineerCount = useMemo(
    () => membres.filter((m) => ENGINEER_ROLES.has(m.role.toLowerCase())).length,
    [membres]
  )
  const technicianCount = useMemo(
    () => membres.filter((m) => TECHNICIAN_ROLES.has(m.role.toLowerCase())).length,
    [membres]
  )

  const caYearsList = caYears === '5' ? CA_YEARS_5 : CA_YEARS_3

  const getCaCell = (sector: string, year: string): CaEntryCell => {
    return (
      caEntriesBySectorYear[sector]?.[year] ?? {
        caTTC: '',
        caHT: '',
        montantSoustraite: '',
        isGrosOeuvresSingleLot: false,
      }
    )
  }

  const setCaCell = (sector: string, year: string, cell: CaEntryCell) => {
    setCaEntriesBySectorYear((prev) => {
      const next = { ...prev }
      if (!next[sector]) next[sector] = {}
      next[sector] = { ...next[sector], [year]: cell }
      return next
    })
  }

  const computeCaNet = (cell: CaEntryCell, sector: string): number => {
    const caTTC = parseFloat(String(cell.caTTC)) || 0
    const montant = parseFloat(String(cell.montantSoustraite)) || 0
    let caNet = caTTC - montant
    if (sector === 'A' && cell.isGrosOeuvresSingleLot) caNet *= 0.5
    return Math.max(0, caNet)
  }

  const caMaxBySector = useMemo(() => {
    const out: Record<string, number> = {}
    const years = caYears === '5' ? CA_YEARS_5 : CA_YEARS_3
    for (const sector of sectorsSelected) {
      let max = 0
      for (const year of years) {
        const cell = caEntriesBySectorYear[sector]?.[year] ?? {
          caTTC: '',
          caHT: '',
          montantSoustraite: '',
          isGrosOeuvresSingleLot: false,
        }
        const caTTC = parseFloat(String(cell.caTTC)) || 0
        const montant = parseFloat(String(cell.montantSoustraite)) || 0
        let caNet = caTTC - montant
        if (sector === 'A' && cell.isGrosOeuvresSingleLot) caNet *= 0.5
        const net = Math.max(0, caNet)
        if (net > max) max = net
      }
      out[sector] = max
    }
    return out
  }, [sectorsSelected, caYears, caEntriesBySectorYear])

  const caMaxHTBySector = useMemo(() => {
    const out: Record<string, number> = {}
    const years = caYears === '5' ? CA_YEARS_5 : CA_YEARS_3
    for (const sector of sectorsSelected) {
      let max = 0
      for (const year of years) {
        const cell = caEntriesBySectorYear[sector]?.[year] ?? {
          caTTC: '',
          caHT: '',
          montantSoustraite: '',
          isGrosOeuvresSingleLot: false,
        }
        const caHT = parseFloat(String(cell.caHT)) || 0
        const montant = parseFloat(String(cell.montantSoustraite)) || 0
        let effectiveHT = Math.max(0, caHT - montant)
        if (sector === 'A' && cell.isGrosOeuvresSingleLot) effectiveHT *= 0.5
        if (effectiveHT > max) max = effectiveHT
      }
      out[sector] = max
    }
    return out
  }, [sectorsSelected, caYears, caEntriesBySectorYear])

  const patchDossier = async (payload: Record<string, unknown>) => {
    if (!dossierId) throw new Error('No dossier ID')
    const endpoint = '/api/dossiers'
    const res = await api.put(`${endpoint}/${dossierId}`, { ...dossier, ...payload })
    setDossier(res.data)
    return res.data
  }

  const refetchDossier = async () => {
    if (!dossierId) return
    const res = await api.get(`/api/dossiers/${dossierId}`)
    const data = res.data?.dossiers ?? res.data
    if (data) setDossier(data)
  }

  const postDossier = async (payload: Record<string, unknown>) => {
    const res = await api.post('/api/dossiers', payload)
    setDossier(res.data)
    return res.data
  }

  const goNext = async () => {
    setError('')
    try {
      setSaving(true)

      if (currentStepNum === 1) {
        if (!raisonSociale.trim()) {
          setError(t('objects:dossier.fields.raisonSociale') + ' est requis')
          return
        }
        if (!classificationMethod) {
          setError('Méthode de classification est requise')
          return
        }
        if (ice.trim() && !ICE_PATTERN.test(ice.trim())) {
          setError("L'ICE doit contenir exactement 15 chiffres")
          return
        }
        if (needsOrgSelector && (organization == null || organization === '')) {
          setError('Organisation requise pour créer ce dossier')
          return
        }
        const payload: Record<string, unknown> = {
          raisonSociale: raisonSociale.trim(),
          formeJuridique: formeJuridique || undefined,
          dateCreation: dateCreation || undefined,
          ice: ice.trim() || undefined,
          classificationMethod,
          status: 'IN_PROGRESS',
          currentStep: 2,
        }
        if (needsOrgSelector && organization != null && organization !== '') {
          payload.organizationId = Number(organization)
        }
        const created = await postDossier(payload)
        if (created?.id) {
          setDossier(created)
        }
        return
      }

      if (!dossierId) {
        setError('Dossier non créé')
        return
      }

      if (currentStepNum === 2) {
        if (sectorsSelected.length === 0) {
          setError('Sélectionnez au moins un secteur')
          return
        }
        const missingClasse = sectorsSelected.find(
          (s) => !secteurClasseDemandee.find((e) => e.secteur === s)?.classeDemandee
        )
        if (missingClasse) {
          const label = SECTOR_OPTIONS.find((o) => o.value === missingClasse)?.label ?? missingClasse
          setError(`Sélectionnez une classe demandée pour le secteur ${label}`)
          return
        }
        const secteurClassePayload = secteurClasseDemandee
          .filter((e) => sectorsSelected.includes(e.secteur) && e.classeDemandee)
          .map((e) => ({ secteur: e.secteur, classeDemandee: e.classeDemandee }))
        await patchDossier({
          sectorsSelected: sectorsSelected.length ? sectorsSelected : undefined,
          secteurClasseDemandee: secteurClassePayload.length ? secteurClassePayload : undefined,
          currentStep: 3,
        })
        return
      }

      if (currentStepNum === 3) {
        const orgId = (dossier?.organizationId ?? (needsOrgSelector ? organization : null)) as number | null | undefined
        const existingCa = await api.get(`/api/caEntries/dossier/${dossierId}`).catch(() => ({ data: { caEntries: [] } }))
        const caArr = existingCa.data?.caEntries ?? existingCa.data?.results ?? existingCa.data
        const toDelete = Array.isArray(caArr) ? caArr : []
        for (const e of toDelete as { id: number }[]) {
          if (e.id) await api.delete(`/api/caEntries/${e.id}`).catch(() => {})
        }
        for (const sector of sectorsSelected) {
          for (const year of caYearsList) {
            const cell = getCaCell(sector, year)
            const caTTC = parseFloat(String(cell.caTTC)) || 0
            const caHT = parseFloat(String(cell.caHT)) || 0
            const montant = parseFloat(String(cell.montantSoustraite)) || 0
            const name = `CA-${dossierId}-${sector}-${year}-${Date.now()}`
            await api.post('/api/caEntries', {
              name,
              secteur: sector,
              annee: year,
              caTTC,
              caHT,
              montantSoustraite: montant || undefined,
              isGrosOeuvresSingleLot: sector === 'A' ? cell.isGrosOeuvresSingleLot : false,
              dossierId,
              ...(orgId != null && { organizationId: Number(orgId) }),
            })
          }
        }
        const nextStep = classificationMethod === 'T1' ? 5 : 4
        await patchDossier({
          caYears: caYears || undefined,
          currentStep: nextStep,
        })
        return
      }

      if (currentStepNum === 4) {
        await patchDossier({
          capitalSocial: capitalSocial ? parseFloat(capitalSocial) : undefined,
          currentStep: 5,
        })
        return
      }

      if (currentStepNum === 5) {
        await patchDossier({ currentStep: 6 })
        return
      }

      if (currentStepNum === 6) {
        await patchDossier({
          masseSalariale: masseSalariale ? parseFloat(masseSalariale) : undefined,
          currentStep: 7,
        })
        return
      }

      if (currentStepNum === 7) {
        const sectorsWithMateriel = sectorsSelected.filter((s) => (materielMinimumConfig[s]?.length ?? 0) > 0)
        const allCertified = sectorsWithMateriel.every((s) => materielCertifiedBySector[s] === true)
        if (!allCertified) {
          setError('Veuillez certifier la disponibilité du matériel minimum avant de continuer.')
          return
        }
        await patchDossier({
          materielConfirmed: allCertified,
          currentStep: 9,
        })
        await refetchDossier()
        return
      }

      if (currentStepNum === 9) {
        await patchDossier({ status: 'SOUMIS', currentStep: 9 })
        toast.success('Dossier soumis avec succès')
        if (!isPageLayout) onOpenChange?.(false)
        if (dossierId) {
          navigate({ to: '/dossiers/$dossierId', params: { dossierId: String(dossierId) } })
        }
        onSuccess?.(dossier!)
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Erreur'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const goPrev = () => {
    setError('')
    if (currentStepNum <= 1) {
      if (isPageLayout && onRequestLeave) onRequestLeave()
      return
    }
    const prevStep = steps[currentStepIndex - 1]?.n ?? currentStepNum - 1
    setDossier((d) => (d ? { ...d, currentStep: prevStep } : d))
  }

  const addMembre = () => {
    setAddMemberForm({ nomComplet: '', role: '', secteurImputation: secteurImputationOptions[0]?.value ?? 'ALL', experienceYears: '' })
    setAddMemberOpen(true)
  }

  const saveAddMember = async () => {
    if (!dossierId || !addMemberForm.nomComplet.trim() || !addMemberForm.role) {
      toast.error('Nom complet et rôle sont requis')
      return
    }
    try {
      setAddMemberSaving(true)
      const orgId = (dossier?.organizationId ?? (needsOrgSelector ? organization : null)) as number | null | undefined
      const exp = parseFloat(addMemberForm.experienceYears) || 0
      const score = computeMemberScore(addMemberForm.role, exp)
      const res = await api.post('/api/membreEncadrements', {
        name: addMemberForm.nomComplet.trim(),
        role: addMemberForm.role,
        anneesExperience: exp,
        secteurImputation: addMemberForm.secteurImputation || undefined,
        scoreCalcule: score,
        dossierId,
        ...(orgId != null && { organizationId: Number(orgId) }),
      })
      const created = res.data
      setMembres((prev) => [
        ...prev,
        {
          id: created?.id,
          name: created?.name ?? addMemberForm.nomComplet,
          role: created?.role ?? addMemberForm.role,
          anneesExperience: exp,
          secteurImputation: created?.secteurImputation ?? addMemberForm.secteurImputation,
        },
      ])
      setAddMemberOpen(false)
      toast.success('Membre ajouté')
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Erreur')
    } finally {
      setAddMemberSaving(false)
    }
  }

  const removeMembre = async (i: number) => {
    const m = membres[i]
    if (m?.id) {
      try {
        await api.delete(`/api/membreEncadrements/${m.id}`)
        setMembres((prev) => prev.filter((_, j) => j !== i))
      } catch (err: any) {
        toast.error(err.response?.data?.message || err.message || 'Erreur')
      }
    } else {
      setMembres((prev) => prev.filter((_, j) => j !== i))
    }
  }

  const setMaterielItemChecked = (sector: string, item: string, checked: boolean, quantite?: number) => {
    setMaterielChecklist((prev) => {
      const bySector = prev[sector] ?? {}
      return {
        ...prev,
        [sector]: {
          ...bySector,
          [item]: { checked, quantite: quantite ?? (bySector[item]?.quantite ?? 1) },
        },
      }
    })
  }

  const setMaterielItemQuantite = (sector: string, item: string, quantite: number) => {
    setMaterielChecklist((prev) => {
      const bySector = prev[sector] ?? {}
      const current = bySector[item]
      if (!current) return prev
      return {
        ...prev,
        [sector]: { ...bySector, [item]: { ...current, quantite: Math.max(1, quantite) } },
      }
    })
  }

  const setSectorCertified = (sector: string, certified: boolean) => {
    setMaterielCertifiedBySector((prev) => ({ ...prev, [sector]: certified }))
  }

  const renderStep = () => {
    if (currentStepNum === 1) {
      const raisonSocialeDef = getFieldDef('raisonSociale') ?? { key: 'raisonSociale', label: 'Raison sociale', type: 'string' as const, required: true }
      const classificationMethodDef = getFieldDef('classificationMethod') ?? { key: 'classificationMethod', label: "Méthode de classification", type: 'select' as const, required: true, options: [{ value: 'T1', label: "Tableau 1 — Chiffre d'affaires uniquement" }, { value: 'T2', label: "Tableau 2 — Chiffre d'affaires + Capital social" }] }
      const formeJuridiqueDef = getFieldDef('formeJuridique') ?? { key: 'formeJuridique', label: 'Forme juridique', type: 'select' as const, options: FORME_JURIDIQUE_OPTIONS }
      const dateCreationDef = getFieldDef('dateCreation') ?? { key: 'dateCreation', label: 'Date de création', type: 'date' as const }
      const iceDef = getFieldDef('ice') ?? { key: 'ice', label: 'ICE', type: 'string' as const, validation: { pattern: '^\\d{15}$', message: "L'ICE doit contenir exactement 15 chiffres" } }

      return (
        <div className="space-y-4">
          {needsOrgSelector && (
            <div>
              <GenericDetailInputFormatter
                fieldDefinition={{
                  key: 'organization',
                  label: 'Organisation',
                  type: 'masterDetail',
                  objectName: 'organization',
                  required: true,
                  editable: true,
                }}
                value={organization}
                onChange={(v) => setOrganization(v ?? null)}
                objectName="dossier"
                className="w-full"
              />
            </div>
          )}
          <div>
            <GenericDetailInputFormatter
              fieldDefinition={raisonSocialeDef}
              value={raisonSociale}
              onChange={setRaisonSociale}
              objectName="dossier"
              className="w-full"
            />
          </div>
          <div>
            <GenericDetailInputFormatter
              fieldDefinition={classificationMethodDef}
              value={classificationMethod}
              onChange={setClassificationMethod}
              objectName="dossier"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Tableau 2 est disponible uniquement pour les secteurs A, B, C, D, E, F, G, I et Y.
            </p>
          </div>
          <div>
            <GenericDetailInputFormatter
              fieldDefinition={formeJuridiqueDef}
              value={formeJuridique}
              onChange={setFormeJuridique}
              objectName="dossier"
              className="w-full"
            />
          </div>
          <div>
            <GenericDetailInputFormatter
              fieldDefinition={dateCreationDef}
              value={dateCreation}
              onChange={setDateCreation}
              objectName="dossier"
              className="w-full"
            />
          </div>
          <div>
            <GenericDetailInputFormatter
              fieldDefinition={iceDef}
              value={ice}
              onChange={setIce}
              objectName="dossier"
              className="w-full"
            />
          </div>
        </div>
      )
    }

    if (currentStepNum === 2) {
      const ineligibleSectors = classificationMethod === 'T2'
        ? sectorsSelected.filter((s) => !T2_ELIGIBLE_SECTORS.has(s.toUpperCase()))
        : []
      const sectorsSelectedDef = getFieldDef('sectorsSelected') ?? { key: 'sectorsSelected', label: 'Secteurs ciblés', type: 'multiselect' as const, options: SECTOR_OPTIONS }

      const setClasseForSecteur = (secteur: string, classe: string) => {
        setSecteurClasseDemandee((prev) =>
          prev.map((x) => (x.secteur === secteur ? { ...x, classeDemandee: classe } : x))
        )
      }

      return (
        <div className="space-y-4">
          <div>
            <GenericDetailInputFormatter
              fieldDefinition={sectorsSelectedDef}
              value={sectorsSelected}
              onChange={(v) => {
                const next = Array.isArray(v) ? v : []
                setSectorsSelected(next)
                setSecteurClasseDemandee((prev) => {
                  const bySecteur = new Map(prev.map((x) => [x.secteur, x.classeDemandee]))
                  return next.map((s) => ({ secteur: s, classeDemandee: bySecteur.get(s) ?? '' }))
                })
              }}
              objectName="dossier"
              className="w-full"
            />
          </div>

          {sectorsSelected.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Classe demandée par secteur</Label>
              <div className="space-y-2">
                {sectorsSelected.map((secteur) => {
                  const label = SECTOR_OPTIONS.find((o) => o.value === secteur)?.label ?? secteur
                  const entry = secteurClasseDemandee.find((e) => e.secteur === secteur)
                  const classe = entry?.classeDemandee ?? ''
                  const options = (CLASSE_OPTIONS_BY_SECTOR[secteur] ?? ['1', '2', '3', '4', '5']).map((v) => ({ value: v, label: v }))
                  const isSectorH = secteur === 'H'
                  const showT2Warning = classificationMethod === 'T2' && isSectorH

                  return (
                    <div key={secteur} className="flex flex-wrap items-center gap-2">
                      <span className="min-w-[280px] font-medium">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Classe demandée :</span>
                        <Select value={classe || '__none__'} onValueChange={(v) => setClasseForSecteur(secteur, v === '__none__' ? '' : v)}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">—</SelectItem>
                            {options.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {showT2Warning && (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-500 text-sm">
                            ⚠️ Secteur H non éligible au Tableau 2. Sera évalué en Tableau 1 uniquement.
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {ineligibleSectors.filter((s) => s !== 'H').length > 0 && (
            <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-900 dark:text-amber-200">
              {ineligibleSectors
                .filter((s) => s !== 'H')
                .map((sector) => {
                  const label = SECTOR_OPTIONS.find((o) => o.value === sector)?.label ?? sector
                  return (
                    <p key={sector}>
                      Le secteur {label} n&apos;est pas éligible au Tableau 2. Il sera évalué selon le Tableau 1.
                    </p>
                  )
                })}
            </div>
          )}
        </div>
      )
    }

    if (currentStepNum === 3) {
      const caYearsDef = getFieldDef('caYears') ?? { key: 'caYears', label: 'Période CA : 3 ans ou 5 ans ?', type: 'select' as const, options: [{ value: '3', label: '3 ans' }, { value: '5', label: '5 ans' }], defaultValue: '3' }

      return (
        <div className="space-y-6">
          <div>
            <GenericDetailInputFormatter
              fieldDefinition={caYearsDef}
              value={caYears}
              onChange={(v) => setCaYears(String(v ?? '3'))}
              objectName="dossier"
              className="w-full"
            />
          </div>
          {sectorsSelected.map((sector) => {
            const label = SECTOR_OPTIONS.find((o) => o.value === sector)?.label ?? sector
            const isSectorA = sector === 'A'
            return (
              <div key={sector} className="space-y-2">
                <Label className="text-base font-medium">Secteur {label}</Label>
                <div className="overflow-x-auto rounded border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-2 py-1.5 text-left font-medium">Année</th>
                        <th className="px-2 py-1.5 text-right font-medium">CA TTC</th>
                        <th className="px-2 py-1.5 text-right font-medium">CA HT</th>
                        <th className="px-2 py-1.5 text-right font-medium">Montant sous-traité</th>
                        <th className="px-2 py-1.5 text-right font-medium">CA Net</th>
                        {isSectorA && (
                          <th className="px-2 py-1.5 text-left font-medium">Marché gros œuvres lot unique sans BDPU → CA retenu à 50%</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {caYearsList.map((year) => {
                        const cell = getCaCell(sector, year)
                        const caNet = computeCaNet(cell, sector)
                        return (
                          <tr key={year} className="border-b last:border-0">
                            <td className="px-2 py-1.5">{year}</td>
                            <td className="px-2 py-1.5">
                              <Input
                                type="number"
                                className="h-8 text-right w-24"
                                value={cell.caTTC}
                                onChange={(e) => setCaCell(sector, year, { ...cell, caTTC: e.target.value })}
                                placeholder="0"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input
                                type="number"
                                className="h-8 text-right w-24"
                                value={cell.caHT}
                                onChange={(e) => setCaCell(sector, year, { ...cell, caHT: e.target.value })}
                                placeholder="0"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input
                                type="number"
                                className="h-8 text-right w-24"
                                value={cell.montantSoustraite}
                                onChange={(e) => setCaCell(sector, year, { ...cell, montantSoustraite: e.target.value })}
                                placeholder="0"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-right font-medium">{formatCurrency(caNet)}</td>
                            {isSectorA && (
                              <td className="px-2 py-1.5">
                                <Checkbox
                                  checked={cell.isGrosOeuvresSingleLot}
                                  onCheckedChange={(v) =>
                                    setCaCell(sector, year, { ...cell, isGrosOeuvresSingleLot: v === true })
                                  }
                                />
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    if (currentStepNum === 4) {
      const capitalSocialDef = getFieldDef('capitalSocial') ?? { key: 'capitalSocial', label: 'Capital social (DH)', type: 'number' as const }
      return (
        <div className="space-y-4">
          <div>
            <GenericDetailInputFormatter
              fieldDefinition={capitalSocialDef}
              value={capitalSocial ? parseFloat(String(capitalSocial)) : ''}
              onChange={(v) => setCapitalSocial(v !== '' && v != null ? String(v) : '')}
              objectName="dossier"
              className="w-full"
            />
          </div>
        </div>
      )
    }

    if (currentStepNum === 5) {
      const roleLabel = (role: string) => ENCADREMENT_ROLES.find((r) => r.value === role)?.label ?? role
      const minRequired = (() => {
        if (!btpEncadrementConfig?.minScoresBySectorClasse || secteurClasseDemandee.length === 0) return null
        const tbl = classificationMethod === 'T2' ? 't2' : 't1'
        let min = 0
        for (const sc of secteurClasseDemandee) {
          const byClasse = btpEncadrementConfig.minScoresBySectorClasse[sc.secteur]?.[sc.classeDemandee]
          const val = byClasse && (tbl === 't2' && byClasse.t2 != null ? byClasse.t2 : byClasse.t1)
          if (val != null && val > min) min = val
        }
        return min > 0 ? min : null
      })()

      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Encadrement</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Ajoutez les membres du personnel d&apos;encadrement de votre entreprise.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <Label>Membres d&apos;encadrement</Label>
            <Button type="button" variant="outline" size="sm" onClick={addMembre}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter un membre
            </Button>
          </div>
          <div className="overflow-x-auto rounded border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-1.5 text-left font-medium">Nom complet</th>
                  <th className="px-2 py-1.5 text-left font-medium">Rôle</th>
                  <th className="px-2 py-1.5 text-left font-medium">Diplôme</th>
                  <th className="px-2 py-1.5 text-right font-medium">Expérience</th>
                  <th className="px-2 py-1.5 text-left font-medium">Secteur imputé</th>
                  <th className="px-2 py-1.5 text-right font-medium">Score</th>
                  <th className="px-2 py-1.5 w-12" />
                </tr>
              </thead>
              <tbody>
                {membres.map((m, i) => (
                  <tr key={m.id ?? i} className="border-b last:border-0">
                    <td className="px-2 py-1.5">{m.name || '—'}</td>
                    <td className="px-2 py-1.5">{roleLabel(m.role) || '—'}</td>
                    <td className="px-2 py-1.5">{m.diplome || roleLabel(m.role) || '—'}</td>
                    <td className="px-2 py-1.5 text-right">{m.role === 'gerant' ? `${m.anneesExperience} ans` : '—'}</td>
                    <td className="px-2 py-1.5">{m.secteurImputation === 'ALL' ? 'TOUS' : (SECTOR_OPTIONS.find((o) => o.value === m.secteurImputation)?.label ?? m.secteurImputation) || '—'}</td>
                    <td className="px-2 py-1.5 text-right font-medium">{computeMemberScore(m.role, m.anneesExperience)}</td>
                    <td className="px-2 py-1.5">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeMembre(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-medium">
              Score total d&apos;encadrement : <span className="font-semibold">{computedEncadrementTotal}</span> points
            </p>
            <p className="text-muted-foreground">
              Ingénieurs : {engineerCount} | Techniciens : {technicianCount}
            </p>
          </div>
          {minRequired != null && computedEncadrementTotal < minRequired && (
            <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-900 dark:text-amber-200">
              ⚠️ Score actuel ({computedEncadrementTotal}) inférieur au minimum requis ({minRequired})
              {secteurClasseDemandee[0] && (
                <> pour Secteur {SECTOR_OPTIONS.find((o) => o.value === secteurClasseDemandee[0].secteur)?.label ?? secteurClasseDemandee[0].secteur} Classe {secteurClasseDemandee[0].classeDemandee}</>
              )}
              . Vous pouvez continuer mais le dossier risque d&apos;être non éligible.
            </div>
          )}

          <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un membre</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <GenericDetailInputFormatter
                  fieldDefinition={getMembreFieldDef('name') ?? { key: 'name', label: 'Nom complet', type: 'string', required: true }}
                  value={addMemberForm.nomComplet}
                  onChange={(v) => setAddMemberForm((p) => ({ ...p, nomComplet: String(v ?? '') }))}
                  objectName="membreEncadrement"
                  className="w-full"
                />
                <GenericDetailInputFormatter
                  fieldDefinition={{
                    ...(getMembreFieldDef('role') ?? { key: 'role', label: 'Rôle', type: 'select' as const }),
                    options: ENCADREMENT_ROLES.map((o) => ({ value: o.value, label: o.label })),
                    required: true,
                  }}
                  value={addMemberForm.role}
                  onChange={(v) => setAddMemberForm((p) => ({ ...p, role: String(v ?? '') }))}
                  objectName="membreEncadrement"
                  className="w-full"
                />
                <GenericDetailInputFormatter
                  fieldDefinition={{
                    ...(getMembreFieldDef('secteurImputation') ?? { key: 'secteurImputation', label: 'Secteur imputation', type: 'select' as const }),
                    options: secteurImputationOptions,
                  }}
                  value={addMemberForm.secteurImputation}
                  onChange={(v) => setAddMemberForm((p) => ({ ...p, secteurImputation: String(v ?? '') }))}
                  objectName="membreEncadrement"
                  className="w-full"
                />
                {addMemberForm.role === 'gerant' && (
                  <GenericDetailInputFormatter
                    fieldDefinition={getMembreFieldDef('anneesExperience') ?? { key: 'anneesExperience', label: "Années d'expérience", type: 'number' }}
                    value={addMemberForm.experienceYears !== '' ? parseFloat(addMemberForm.experienceYears) : ''}
                    onChange={(v) => setAddMemberForm((p) => ({ ...p, experienceYears: v !== '' && v != null ? String(v) : '' }))}
                    objectName="membreEncadrement"
                    className="w-full"
                  />
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddMemberOpen(false)} disabled={addMemberSaving}>
                  Annuler
                </Button>
                <Button onClick={saveAddMember} disabled={addMemberSaving || !addMemberForm.nomComplet.trim() || !addMemberForm.role}>
                  {addMemberSaving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )
    }

    if (currentStepNum === 6) {
      const masseSalarialeDef = getFieldDef('masseSalariale') ?? { key: 'masseSalariale', label: 'Masse salariale (DH)', type: 'number' as const }
      const masseValue = parseFloat(String(masseSalariale)) || 0
      const masseHints = sectorsSelected.map((sector) => {
        const caMaxHT = caMaxHTBySector[sector] ?? 0
        const ratio = MASSE_SALARIALE_RATIO_PERCENT_BY_SECTOR[sector] ?? null
        if (ratio == null) return { sector, minMasse: null, ratio: null }
        const minMasse = Math.round(caMaxHT * (ratio / 100))
        return { sector, minMasse, ratio }
      })

      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Masse salariale</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Indiquez la masse salariale annuelle de votre entreprise.
            </p>
          </div>
          <div>
            <GenericDetailInputFormatter
              fieldDefinition={masseSalarialeDef}
              value={masseSalariale ? parseFloat(String(masseSalariale)) : ''}
              onChange={(v) => setMasseSalariale(v !== '' && v != null ? String(v) : '')}
              objectName="dossier"
              className="w-full"
            />
          </div>
          {masseHints.length > 0 && (
            <div className="space-y-1.5 text-sm">
              {masseHints.map((h) => {
                if (h.ratio == null) {
                  return (
                    <p key={h.sector} className="text-muted-foreground">
                      Secteur {h.sector} : pas de seuil minimum
                    </p>
                  )
                }
                const ok = masseValue >= (h.minMasse ?? 0)
                return (
                  <div key={h.sector} className={ok ? 'text-green-600 dark:text-green-500' : 'text-destructive'}>
                    <p>
                      Seuil minimum requis — Secteur {h.sector} : {formatCurrency(h.minMasse ?? 0)} DH ({h.ratio}% du CA HT net)
                    </p>
                    {!ok && masseValue > 0 && (
                      <p className="text-xs mt-0.5">En dessous du seuil — le dossier sera non éligible pour ce secteur</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    if (currentStepNum === 7) {
      const sectorsWithMateriel = sectorsSelected.filter((s) => (materielMinimumConfig[s]?.length ?? 0) > 0)
      const allSectorsCertified = sectorsWithMateriel.every((s) => materielCertifiedBySector[s] === true)
      return (
        <div className="space-y-4">
          {sectorsWithMateriel.map((sector) => {
            const items = materielMinimumConfig[sector] ?? []
            const sectorLabel = SECTOR_OPTIONS.find((o) => o.value === sector)?.label ?? `Secteur ${sector}`
            const shortLabel = sectorLabel.split('—')[0]?.trim() ?? sector
            const checkedCount = items.filter(
              (item) => materielChecklist[sector]?.[item]?.checked === true
            ).length
            const totalCount = items.length
            const allItemsChecked = checkedCount === totalCount
            const certified = materielCertifiedBySector[sector] === true
            const headerComplete = allItemsChecked && certified
            const defaultOpen = sectorsWithMateriel.length === 1

            return (
              <Collapsible key={sector} defaultOpen={defaultOpen} className="border rounded-lg overflow-hidden">
                <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-3 bg-muted hover:bg-muted/90 transition-colors text-left [&[data-state=open]>svg.chevron]:rotate-180">
                  <span className="font-semibold">
                    Matériel minimum — Secteur {shortLabel}
                    {headerComplete ? (
                      <span className="text-green-600 dark:text-green-500 ml-2">✅</span>
                    ) : (
                      <span className="text-muted-foreground font-normal ml-2">
                        {checkedCount}/{totalCount} items
                      </span>
                    )}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 chevron transition-transform" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 pt-0 space-y-3">
                    <div className="space-y-2">
                      {items.map((item) => {
                        const state = materielChecklist[sector]?.[item] ?? { checked: false, quantite: 1 }
                        return (
                          <div key={item} className="flex items-center gap-3">
                            <Checkbox
                              id={`materiel-${sector}-${item}`}
                              checked={state.checked}
                              onCheckedChange={(v) =>
                                setMaterielItemChecked(sector, item, v === true, state.quantite)
                              }
                            />
                            <Label htmlFor={`materiel-${sector}-${item}`} className="flex-1 cursor-pointer font-normal">
                              {item}
                            </Label>
                            {state.checked && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Qté:</span>
                                <Input
                                  type="number"
                                  min={1}
                                  className="w-16 h-8"
                                  value={state.quantite}
                                  onChange={(e) => {
                                    const v = parseInt(e.target.value, 10)
                                    setMaterielItemQuantite(sector, item, Number.isNaN(v) || v < 1 ? 1 : v)
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Checkbox
                        id={`cert-${sector}`}
                        checked={certified}
                        onCheckedChange={(v) => setSectorCertified(sector, v === true)}
                      />
                      <Label htmlFor={`cert-${sector}`} className="text-sm font-normal cursor-pointer">
                        Je certifie que l&apos;entreprise dispose du matériel minimum requis pour ce secteur
                      </Label>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )
          })}
          {!allSectorsCertified && sectorsWithMateriel.length > 0 && (
            <p className="text-sm text-destructive">
              Veuillez certifier la disponibilité du matériel minimum avant de continuer.
            </p>
          )}
        </div>
      )
    }

    if (currentStepNum === 9) {
      const methLabel = CLASSIFICATION_METHOD_LABELS[classificationMethod] ?? classificationMethod
      const sectorLabels = sectorsSelected.map((v) => SECTOR_OPTIONS.find((o) => o.value === v)?.label ?? v).join(', ')
      const encadrementMinRequired = (() => {
        if (!btpEncadrementConfig?.minScoresBySectorClasse || secteurClasseDemandee.length === 0) return null
        const tbl = classificationMethod === 'T2' ? 't2' : 't1'
        let min = 0
        for (const sc of secteurClasseDemandee) {
          const byClasse = btpEncadrementConfig.minScoresBySectorClasse[sc.secteur]?.[sc.classeDemandee]
          const val = byClasse && (tbl === 't2' && byClasse.t2 != null ? byClasse.t2 : byClasse.t1)
          if (val != null && val > min) min = val
        }
        return min > 0 ? min : null
      })()
      return (
        <div className="space-y-6 text-sm">
          <div className="space-y-2">
            <div><strong>Raison sociale :</strong> {raisonSociale}</div>
            <div><strong>Forme juridique :</strong> {formeJuridique || '—'}</div>
            <div><strong>Secteurs :</strong> {sectorLabels || '—'}</div>
            <div><strong>Méthode :</strong> {methLabel || '—'}</div>
            {sectorsSelected.map((s) => {
              const label = SECTOR_OPTIONS.find((o) => o.value === s)?.label ?? s
              const maxVal = caMaxBySector[s]
              return maxVal != null && maxVal > 0 ? (
                <div key={s}><strong>CA max {label} :</strong> {formatCurrency(maxVal)}</div>
              ) : null
            })}
            <div><strong>Score encadrement :</strong> {computedEncadrementTotal} points</div>
            {capitalSocial && <div><strong>Capital social :</strong> {formatCurrency(parseFloat(capitalSocial))}</div>}
            {masseSalariale && <div><strong>Masse salariale :</strong> {formatCurrency(parseFloat(masseSalariale))}</div>}

            {/* Additional summary fields */}
            <div><strong>Période CA :</strong> {caYears || '3'} ans</div>
            {secteurClasseDemandee
              .filter((sc) => sectorsSelected.includes(sc.secteur))
              .map((sc) => {
                const label = SECTOR_OPTIONS.find((o) => o.value === sc.secteur)?.label ?? `Secteur ${sc.secteur}`
                return (
                  <div key={sc.secteur}>
                    <strong>Classe demandée — {label} : Classe {sc.classeDemandee}</strong>
                  </div>
                )
              })}
            <div><strong>Nombre d&apos;ingénieurs déclarés :</strong> {engineerCount}</div>
            <div><strong>Nombre de techniciens déclarés :</strong> {technicianCount}</div>
            <div><strong>Score encadrement actuel :</strong> {computedEncadrementTotal} pts</div>
            {encadrementMinRequired != null && (
              <div>
                <strong>Score encadrement minimum requis :</strong> {encadrementMinRequired} pts
                {secteurClasseDemandee[0] && (
                  <> ({SECTOR_OPTIONS.find((o) => o.value === secteurClasseDemandee[0].secteur)?.label ?? secteurClasseDemandee[0].secteur}, Classe {secteurClasseDemandee[0].classeDemandee})</>
                )}
              </div>
            )}
          </div>

          {/* Preliminary result section */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold">Résultat préliminaire</h3>
            {classificationPreview == null ? (
              <p className="text-muted-foreground">Chargement...</p>
            ) : classificationPreview.length === 0 ? (
              <p className="text-muted-foreground">Aucun secteur sélectionné.</p>
            ) : (
              <div className="space-y-2">
                {classificationPreview.map((r) => {
                  const sectorLabel = SECTOR_OPTIONS.find((o) => o.value === r.secteur)?.label ?? `Secteur ${r.secteur}`
                  const classeDisplay = r.requestedClasse || r.classeObtenue
                  const isEligible = r.classeObtenue !== 'NON_ELIGIBLE'
                  return (
                    <div
                      key={r.secteur}
                      className={`rounded-lg border p-3 text-sm ${isEligible ? 'border-green-500/50 bg-green-50 dark:bg-green-900/10' : 'border-red-500/50 bg-red-50 dark:bg-red-900/10'}`}
                    >
                      <div className="font-medium flex items-center gap-2">
                        {isEligible ? (
                          <>✅ {sectorLabel} — Classe {r.classeObtenue} : ÉLIGIBLE</>
                        ) : (
                          <>❌ {sectorLabel} — Classe {classeDisplay} : NON ÉLIGIBLE</>
                        )}
                      </div>
                      {!isEligible && (
                        <div className="mt-2 space-y-1 text-muted-foreground">
                          <div>→ CA: {r.scoreCa ? '✅' : '❌'} {r.caActualMDH.toFixed(1)} MDH {r.caRequiredMDH > 0 ? `≥ ${r.caRequiredMDH} MDH requis` : ''}</div>
                          <div>→ Encadrement: {r.scoreEncadrement ? '✅' : '❌'} {r.encadrementScoreActual} pts {r.encadrementScoreRequired > 0 ? `/ ${r.encadrementScoreRequired} requis` : ''}</div>
                          <div>
                            → Masse salariale: {r.scoreMasseSalariale ? '✅' : '❌'}{' '}
                            {r.ratioActual != null && r.ratioRequired != null
                              ? `${r.ratioActual.toFixed(1)}% ≥ ${r.ratioRequired}% requis`
                              : r.scoreMasseSalariale
                                ? 'OK'
                                : '—'}
                          </div>
                          <div>→ Matériel: ✅</div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Submit button */}
          <Button
            onClick={goNext}
            disabled={saving}
            className="w-full"
          >
            {saving ? 'Envoi en cours...' : 'Soumettre le dossier'}
          </Button>
        </div>
      )
    }

    return null
  }

  const showNext = currentStepNum < 9 ? 'Suivant' : 'Soumettre'
  const isLastStep = currentStepNum === 9

  if (isPageLayout) {
    return (
      <DossierWizardPage
        initialDossier={initialDossier ?? undefined}
        steps={steps}
        currentStepNum={currentStepNum}
        displayStep={displayStep}
        totalSteps={totalSteps}
        progressPercent={progressPercent}
        onGoPrev={goPrev}
        onGoNext={goNext}
        saving={saving}
        nextDisabled={
          (currentStepNum === 1 &&
            ice.trim().length > 0 &&
            !ICE_PATTERN.test(ice.trim())) ||
          (currentStepNum === 2 &&
            (sectorsSelected.length === 0 ||
              sectorsSelected.some(
                (s) => !secteurClasseDemandee.find((e) => e.secteur === s)?.classeDemandee
              ))) ||
          (currentStepNum === 7 &&
            !sectorsSelected
              .filter((s) => (materielMinimumConfig[s]?.length ?? 0) > 0)
              .every((s) => materielCertifiedBySector[s] === true))
        }
        error={error}
        isLastStep={isLastStep}
        renderStep={() =>
          loading && currentStepNum >= 6 ? (
            <div className="py-8 text-center text-muted-foreground">Chargement...</div>
          ) : (
            renderStep()
          )
        }
      />
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange!}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col overflow-hidden"
      >
        <SheetHeader>
          <SheetTitle>
            {isResume ? 'Reprendre le dossier' : 'Nouveau dossier'}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="mb-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Étape {displayStep} sur {totalSteps}</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 w-full overflow-hidden rounded-full bg-secondary"
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>
          )}

          {loading && currentStepNum >= 6 ? (
            <div className="py-8 text-center text-muted-foreground">Chargement...</div>
          ) : (
            renderStep()
          )}
        </div>

        <SheetFooter className="flex-row gap-2 pt-4 border-t">
          {currentStepNum > 1 && (
            <Button variant="outline" onClick={goPrev} disabled={saving}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
            </Button>
          )}
          <Button
            onClick={goNext}
            disabled={
              saving ||
              (currentStepNum === 1 &&
                ice.trim().length > 0 &&
                !ICE_PATTERN.test(ice.trim())) ||
              (currentStepNum === 2 &&
                (sectorsSelected.length === 0 ||
                  sectorsSelected.some(
                    (s) => !secteurClasseDemandee.find((e) => e.secteur === s)?.classeDemandee
                  ))) ||
              (currentStepNum === 7 &&
                !sectorsSelected
                  .filter((s) => (materielMinimumConfig[s]?.length ?? 0) > 0)
                  .every((s) => materielCertifiedBySector[s] === true))
            }
            className="ml-auto"
          >
            {saving ? 'Enregistrement...' : showNext}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
