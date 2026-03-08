import { useEffect, useState } from 'react'
import api from '@/services/api'
import { formatDateTimeShort } from '@/utils/formatDateLocale'
import { formatCurrency } from '@/stores/appConfigStore'
import { Loader2 } from 'lucide-react'
import type { GenericRecord } from '@/types/object-definition'

interface ClassificationResultRow {
  secteur: string
  classeObtenue: string
  caActualDH?: string | number | null
  encadrementScoreActual?: string | number | null
  masseSalarialeRatioPercent?: string | number | null
  computedAt: string | null
}

interface DossierHeaderClassificationValueProps {
  record: GenericRecord
}

const emptyChar = '—'

function formatPercent(val: string | number | null | undefined): string {
  if (val == null || val === '') return emptyChar
  const n = parseFloat(String(val))
  if (isNaN(n)) return emptyChar
  return `${(n * 100).toFixed(2)}%`
}

/**
 * Display of latest classification result for the dossier detail header.
 * Fetches from /api/dossiers/:id/latest-classification-result.
 * Shows 6 separated values: Secteur, Classe obtenue, CA, Encadrement, Masse salariale, Dernier calcul.
 */
export function DossierHeaderClassificationValue({ record }: DossierHeaderClassificationValueProps) {
  const [data, setData] = useState<{ results: ClassificationResultRow[]; computedAt: string | null } | null>(null)
  const [loading, setLoading] = useState(true)

  const dossierId = record?.id
  useEffect(() => {
    if (dossierId == null) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    api
      .get<{ results: ClassificationResultRow[]; computedAt: string | null }>(
        `/api/dossiers/${dossierId}/latest-classification-result`
      )
      .then(({ data: res }) => {
        if (!cancelled) setData(res)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [dossierId])

  if (loading) {
    return (
      <div className="col-span-full flex items-center gap-2 text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        <span className="text-sm">Chargement…</span>
      </div>
    )
  }

  if (!data || data.results.length === 0) {
    return (
      <div className="col-span-full text-sm text-muted-foreground py-2">
        {emptyChar}
      </div>
    )
  }

  const rows = data.results
  const secteurs = rows.map((r) => r.secteur).join(', ')
  const classes =
    rows.length === 1
      ? rows[0].classeObtenue
      : rows.map((r) => `${r.secteur}→${r.classeObtenue}`).join(', ')
  const caValues = rows
    .map((r) => {
      const v = r.caActualDH
      if (v == null || v === '') return null
      return formatCurrency(parseFloat(String(v)))
    })
    .filter(Boolean)
  const caDisplay = caValues.length > 0 ? caValues.join(', ') : emptyChar
  const encValues = rows
    .map((r) => r.encadrementScoreActual)
    .filter((v) => v != null && v !== '')
  const encDisplay = encValues.length > 0 ? encValues.join(', ') : emptyChar
  const masseValues = rows
    .map((r) => formatPercent(r.masseSalarialeRatioPercent))
    .filter((v) => v !== emptyChar)
  const masseDisplay = masseValues.length > 0 ? masseValues.join(', ') : emptyChar
  const dernierCalcul = data.computedAt ? formatDateTimeShort(new Date(data.computedAt)) : emptyChar

  const items: { label: string; value: string }[] = [
    { label: 'Secteur', value: secteurs },
    { label: 'Classe obtenue', value: classes },
    { label: 'CA', value: caDisplay },
    { label: 'Encadrement', value: String(encDisplay) },
    { label: 'Masse salariale', value: masseDisplay },
    { label: 'Dernier calcul', value: dernierCalcul },
  ]

  return (
    <div className="col-span-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {items.map(({ label, value }) => (
        <div key={label} className="flex flex-col gap-0.5 min-w-0">
          <p className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">{label}</p>
          <p className="text-xs sm:text-sm font-semibold truncate">{value}</p>
        </div>
      ))}
    </div>
  )
}
