/**
 * Dossier triggers.
 * When status changes to COMPLETED or SOUMIS: recompute totalEncadrementScore and caMax/caMaxHT,
 * fetch caEntries + membres, compute classification, insert resultatSimulation (append, no override).
 */
import type { ClassificationResult as EngineResult } from '../engine/classificationEngine.js'
import { db } from '../db/index.js'
import {
  dossiers,
  caEntries,
  membreEncadrements,
  resultatSimulations,
} from '../db/schema.js'
import { eq } from 'drizzle-orm'
import {
  computeClassification,
  type ClassificationResult,
  type DossierInput,
  type MembreInput,
  type CaEntryInput,
} from '../engine/classificationEngine.js'
import { recomputeDossierEncadrementScore } from './helpers/membreEncadrement.js'

function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0
  return typeof v === 'string' ? parseFloat(v) || 0 : Number(v)
}

function parseSectors(s: string | null | undefined): string[] {
  if (!s || !String(s).trim()) return []
  try {
    const p = JSON.parse(s) as unknown
    if (Array.isArray(p)) return p.map(String).filter(Boolean)
  } catch {
    /* fallback */
  }
  return String(s).split(/[,;]/).map((x) => x.trim()).filter(Boolean)
}

export async function afterUpdate(
  oldValue: Record<string, unknown>,
  newValue: Record<string, unknown>
): Promise<void> {
  const newStatus = newValue?.status as string | undefined
  const oldStatus = oldValue?.status as string | undefined

  if ((newStatus !== 'COMPLETED' && newStatus !== 'SOUMIS') || oldStatus === newStatus) return

  const dossierId = newValue?.id as number
  const organizationId = newValue?.organizationId as number
  if (!dossierId || !organizationId) return

  // Ensure totalEncadrementScore and caMax/caMaxHT are up to date before classification
  await recomputeDossierEncadrementScore(dossierId)

  const dossierInput: DossierInput = {
    id: dossierId,
    organizationId,
    sectorsSelected: (newValue?.sectorsSelected ?? null) as string | null,
    classificationMethod: (newValue?.classificationMethod ?? null) as string | null,
    capitalSocial: (newValue?.capitalSocial ?? null) as string | number | null | undefined,
    masseSalariale: (newValue?.masseSalariale ?? null) as string | number | null | undefined,
    totalEncadrementScore: (newValue?.totalEncadrementScore ?? null) as string | number | null | undefined,
  }

  const caEntriesList = await db
    .select()
    .from(caEntries)
    .where(eq(caEntries.dossierId, dossierId))

  const membresList = await db
    .select()
    .from(membreEncadrements)
    .where(eq(membreEncadrements.dossierId, dossierId))

  const caEntriesInput: CaEntryInput[] = caEntriesList.map((e) => ({
    id: e.id!,
    secteur: String(e.secteur),
    caTTC: e.caTTC ?? 0,
    caHT: e.caHT ?? 0,
    montantSoustraite: e.montantSoustraite,
    isGrosOeuvresSingleLot: e.isGrosOeuvresSingleLot ?? false,
  }))

  const membresInput: MembreInput[] = membresList.map((m) => ({
    id: m.id!,
    role: String(m.role),
    anneesExperience: m.anneesExperience,
    secteurImputation: m.secteurImputation,
  }))

  const results = computeClassification(dossierInput, membresInput, caEntriesInput)

  const sectors = parseSectors((newValue?.sectorsSelected ?? null) as string | null | undefined)
  let caMaxTTC = 0
  let caMaxHT = 0
  for (const sector of sectors) {
    const bySector = caEntriesInput.filter(
      (e) => String(e.secteur).toUpperCase() === sector.toUpperCase()
    )
    for (const e of bySector) {
      const caTTC = toNum(e.caTTC)
      const caHT = toNum(e.caHT)
      const montant = toNum(e.montantSoustraite)
      let caNet = caTTC - montant
      let effHT = Math.max(0, caHT - montant)
      if (sector.toUpperCase() === 'A' && e.isGrosOeuvresSingleLot === true) {
        caNet *= 0.5
        effHT *= 0.5
      }
      if (caNet > caMaxTTC) caMaxTTC = caNet
      if (effHT > caMaxHT) caMaxHT = effHT
    }
  }

  const now = new Date()

  for (const r of results) {
    await insertResultatSimulation(dossierId, organizationId, r, now)
  }

  await db
    .update(dossiers)
    .set({
      caMax: caMaxTTC > 0 ? String(caMaxTTC) : null,
      caMaxHT: caMaxHT > 0 ? String(caMaxHT) : null,
      updatedAt: now,
    })
    .where(eq(dossiers.id, dossierId))
}

/**
 * Always INSERT a new resultatSimulation record (no upsert/override).
 * Each simulation run creates a new snapshot; latest is identified by max(computedAt).
 * Name includes timestamp to ensure uniqueness when multiple records exist per (dossier, secteur).
 */
async function insertResultatSimulation(
  dossierId: number,
  organizationId: number,
  result: ClassificationResult,
  computedAt: Date
): Promise<void> {
  const r = result as EngineResult & { encadrementScoreActual?: number; caActualMDH?: number; ratioActual?: number }
  const caActualDH = r.caActualMDH != null ? String(r.caActualMDH * 1_000_000) : null
  const name = `RES-D${dossierId}-S${result.secteur}-${computedAt.getTime()}`
  const insertRow = {
    name,
    secteur: result.secteur,
    classeObtenue: result.classeObtenue,
    scoreCa: result.scoreCa,
    scoreCapital: result.scoreCapital,
    scoreEncadrement: result.scoreEncadrement,
    scoreMasseSalariale: result.scoreMasseSalariale,
    scoreMateriel: result.scoreMateriel,
    caActualDH,
    encadrementScoreActual: r.encadrementScoreActual != null ? String(r.encadrementScoreActual) : null,
    masseSalarialeRatioPercent: r.ratioActual != null ? String(r.ratioActual / 100) : null,
    details: result.details,
    computedAt,
    dossierId,
    organizationId,
    createdAt: computedAt,
    updatedAt: computedAt,
    createdById: null,
    ownerId: null,
    editedById: null,
  }
  await db.insert(resultatSimulations).values(insertRow)
}
