import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '@/services/api'
import { formatDateTimeShort } from '@/utils/formatDateLocale'
import { Loader2 } from 'lucide-react'

interface ClassificationResultRow {
  secteur: string
  classeObtenue: string
  computedAt: string | null
}

interface DossierClassificationResultBlockProps {
  dossierId: string | number
}

export function DossierClassificationResultBlock({ dossierId }: DossierClassificationResultBlockProps) {
  const { t } = useTranslation('common')
  const [data, setData] = useState<{ results: ClassificationResultRow[]; computedAt: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    api
      .get<{ results: ClassificationResultRow[]; computedAt: string | null }>(
        `/api/dossiers/${dossierId}/latest-classification-result`
      )
      .then(({ data: res }) => {
        if (!cancelled) setData(res)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.message || 'Failed to fetch')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [dossierId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{t('loading')}</span>
      </div>
    )
  }

  if (error || !data || data.results.length === 0) {
    return null
  }

  return (
    <div className="mt-3 rounded-lg border border-green-200 dark:border-green-800/50 bg-green-50/80 dark:bg-green-950/30 pl-3 border-l-4 border-l-green-500 dark:border-l-green-600">
      <div className="py-2">
        <h4 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
          Résultat de classification
        </h4>
        <div className="space-y-1 text-sm">
          {data.results.map((r, i) => (
            <div key={i} className="text-foreground">
              Secteur {r.secteur} → Classe obtenue: <strong>{r.classeObtenue}</strong>
            </div>
          ))}
        </div>
        {data.computedAt && (
          <div className="mt-2 text-xs text-muted-foreground">
            Calculé le : {formatDateTimeShort(new Date(data.computedAt))}
          </div>
        )}
      </div>
    </div>
  )
}
