import { useState, useEffect } from 'react'
import { ObjectDefinition } from '@/types/object-definition'
import api from '@/services/api'
import { format } from 'date-fns'
import { History, Loader2 } from 'lucide-react'

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

function getFieldLabel(objectDefinition: ObjectDefinition, fieldKey: string): string {
  const field = objectDefinition.fields?.find((f) => f.key === fieldKey)
  return field?.label ?? fieldKey
}

export function RecordHistorySection({
  objectName,
  recordId,
  objectDefinition,
  refreshTrigger
}: RecordHistorySectionProps) {
  const [entries, setEntries] = useState<RecordHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          setError((err as Error).message ?? 'Failed to load history')
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
          <p className="text-xs">Loading history…</p>
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
          <p className="text-xs font-medium">No changes yet</p>
          <p className="text-[11px] mt-0.5">Field changes will appear here</p>
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
          const oldDisplay = formatHistoryValue(entry.oldValue)
          const newDisplay = formatHistoryValue(entry.newValue)
          const dateStr = entry.changedAt
            ? format(new Date(entry.changedAt), 'MMM d, HH:mm')
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
                  <span className="text-muted-foreground break-words">{oldDisplay}</span>
                  <span className="shrink-0 text-muted-foreground">→</span>
                  <span className="text-foreground break-words">{newDisplay}</span>
                </span>
                {meta && (
                  <span className="text-muted-foreground shrink-0 text-[11px]">{meta}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
