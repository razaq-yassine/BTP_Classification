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
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <div className="text-center">
          <History className="h-8 w-8 mx-auto mb-2 animate-pulse" />
          <p className="text-sm">Loading history…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-4 text-center text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <div className="text-center">
          <History className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm font-medium">No changes yet</p>
          <p className="text-xs mt-1">Field changes will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto relative">
      {refreshing && (
        <Loader2 className="absolute top-0 right-0 h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
      )}
      {entries.map((entry) => {
        const fieldLabel = getFieldLabel(objectDefinition, entry.fieldKey)
        const oldDisplay = formatHistoryValue(entry.oldValue)
        const newDisplay = formatHistoryValue(entry.newValue)
        const dateStr = entry.changedAt
          ? format(new Date(entry.changedAt), 'MMM d, yyyy HH:mm')
          : ''
        return (
          <div
            key={entry.id}
            className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm"
          >
            <div className="font-medium text-foreground">{fieldLabel}</div>
            <div className="mt-1 flex flex-wrap items-baseline gap-1 text-muted-foreground">
              <span className="line-through">{oldDisplay}</span>
              <span>→</span>
              <span className="text-foreground">{newDisplay}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {entry.changedBy && <span>{entry.changedBy}</span>}
              {entry.changedBy && dateStr && <span> · </span>}
              {dateStr && <span>{dateStr}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
