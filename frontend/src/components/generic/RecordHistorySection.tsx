import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { translateFieldLabel } from '@/utils/translateMetadata'
import { ObjectDefinition } from '@/types/object-definition'
import api from '@/services/api'
import { formatDateTimeShort } from '@/utils/formatDateLocale'
import { History, Loader2, Eye } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export interface RecordHistoryEntry {
  id: number
  objectName: string
  recordId: number
  fieldKey: string
  oldValue: string | null
  newValue: string | null
  changedById: number | null
  changedBy: string | null
  changedAt: string | null
}

interface RecordHistorySectionProps {
  objectName: string
  recordId: number
  objectDefinition: ObjectDefinition
  /** When this changes (e.g. record.updatedAt after edit), history is refetched */
  refreshTrigger?: string | number | null
}

const MAX_DISPLAY_CHARS = 60
const MAX_DISPLAY_LINES = 2

function formatHistoryValue(value: string | null): string {
  if (value === null || value === undefined || value === '') return '—'
  try {
    const parsed = JSON.parse(value)
    if (typeof parsed === 'object' && parsed !== null && 'name' in parsed) {
      return String(parsed.name ?? parsed.id ?? value)
    }
    if (typeof parsed === 'object') return JSON.stringify(parsed)
    return String(parsed)
  } catch {
    return value
  }
}

function truncateForDisplay(text: string): { display: string; isTruncated: boolean } {
  if (!text || text.length <= MAX_DISPLAY_CHARS) {
    const lines = text.split('\n')
    if (lines.length <= MAX_DISPLAY_LINES) {
      return { display: text, isTruncated: false }
    }
    const truncated = lines.slice(0, MAX_DISPLAY_LINES).join('\n')
    return { display: truncated + '…', isTruncated: true }
  }
  const truncated = text.slice(0, MAX_DISPLAY_CHARS) + '…'
  return { display: truncated, isTruncated: true }
}

function getFieldLabel(objectDefinition: ObjectDefinition, fieldKey: string): string {
  const field = objectDefinition.fields?.find((f) => f.key === fieldKey)
  const fallback = field?.label ?? fieldKey
  return translateFieldLabel(objectDefinition.name, fieldKey, fallback)
}

export function RecordHistorySection({
  objectName,
  recordId,
  objectDefinition,
  refreshTrigger
}: RecordHistorySectionProps) {
  const { t } = useTranslation('common')
  const [entries, setEntries] = useState<RecordHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailEntry, setDetailEntry] = useState<RecordHistoryEntry | null>(null)

  useEffect(() => {
    let cancelled = false
    const isRefetch = entries.length > 0
    async function fetchHistory() {
      try {
        if (!isRefetch) {
          setLoading(true)
        } else {
          setRefreshing(true)
        }
        setError(null)
        const { data } = await api.get<{ entries: RecordHistoryEntry[] }>(
          '/api/record-history',
          { params: { objectName, recordId } }
        )
        if (!cancelled) setEntries(data.entries ?? [])
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message ?? t('failedToLoadHistory'))
          if (!isRefetch) setEntries([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }
    fetchHistory()
    return () => {
      cancelled = true
    }
  }, [objectName, recordId, refreshTrigger])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground">
        <div className="text-center">
          <History className="h-6 w-6 mx-auto mb-1.5 animate-pulse" />
          <p className="text-xs">{t('loadingHistory')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-3 text-center text-xs text-destructive">
        {error}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground">
        <div className="text-center">
          <History className="h-6 w-6 mx-auto mb-1.5" />
          <p className="text-xs font-medium">{t('noChangesYet')}</p>
          <p className="text-[11px] mt-0.5">{t('fieldChangesWillAppearHere')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-h-[320px] overflow-y-auto relative">
      {refreshing && (
        <Loader2 className="absolute top-0 right-0 h-3 w-3 animate-spin text-muted-foreground z-10" aria-hidden />
      )}
      <div className="space-y-1.5">
        {entries.map((entry) => {
          const fieldLabel = getFieldLabel(objectDefinition, entry.fieldKey)
          const oldFormatted = formatHistoryValue(entry.oldValue)
          const newFormatted = formatHistoryValue(entry.newValue)
          const { display: oldDisplay } = truncateForDisplay(oldFormatted)
          const { display: newDisplay } = truncateForDisplay(newFormatted)
          const dateStr = entry.changedAt
            ? formatDateTimeShort(new Date(entry.changedAt), 'MMM d, HH:mm')
            : ''
          const meta = [entry.changedBy, dateStr].filter(Boolean).join(' · ')
          return (
            <div
              key={entry.id}
              className="rounded border border-border/50 bg-muted/20 px-2 py-1.5 text-xs hover:bg-muted/30"
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-medium text-foreground shrink-0">{fieldLabel}</span>
                <span className="flex items-baseline gap-1.5 min-w-0 flex-1">
                  <span className="text-muted-foreground break-words line-clamp-2">{oldDisplay}</span>
                  <span className="shrink-0 text-muted-foreground">→</span>
                  <span className="text-foreground break-words line-clamp-2">{newDisplay}</span>
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  {meta && (
                    <span className="text-muted-foreground text-[11px]">{meta}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setDetailEntry(entry)}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    title={t('viewDetails', { defaultValue: 'View details' })}
                    aria-label={t('viewDetails', { defaultValue: 'View details' })}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={!!detailEntry} onOpenChange={(open) => !open && setDetailEntry(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {detailEntry
                ? t('historyRecordDetails', { defaultValue: 'History record details' })
                : ''}
            </DialogTitle>
          </DialogHeader>
          {detailEntry && (
            <div className="overflow-y-auto space-y-4 py-2 -mx-1 px-1">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground block text-xs mb-0.5">
                    {t('field', { defaultValue: 'Field' })}
                  </span>
                  <span>{getFieldLabel(objectDefinition, detailEntry.fieldKey)}</span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground block text-xs mb-0.5">
                    {t('previousValue', { defaultValue: 'Previous value' })}
                  </span>
                  <pre className="whitespace-pre-wrap break-words text-xs bg-muted/30 rounded p-2 max-h-32 overflow-y-auto font-sans">
                    {formatHistoryValue(detailEntry.oldValue) || '—'}
                  </pre>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground block text-xs mb-0.5">
                    {t('newValue', { defaultValue: 'New value' })}
                  </span>
                  <pre className="whitespace-pre-wrap break-words text-xs bg-muted/30 rounded p-2 max-h-32 overflow-y-auto font-sans">
                    {formatHistoryValue(detailEntry.newValue) || '—'}
                  </pre>
                </div>
                {(detailEntry.changedBy || detailEntry.changedAt) && (
                  <div className="text-muted-foreground text-xs pt-1 border-t">
                    {detailEntry.changedBy && <span>{detailEntry.changedBy}</span>}
                    {detailEntry.changedBy && detailEntry.changedAt && ' · '}
                    {detailEntry.changedAt &&
                      formatDateTimeShort(new Date(detailEntry.changedAt), 'MMM d, yyyy HH:mm')}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setDetailEntry(null)}>
              {t('close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
