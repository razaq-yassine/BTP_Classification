/**
 * Customer trigger helper — one helper per object. Use utils.ts for general logic.
 */
type Record = { [key: string]: unknown }

const CUSTOMER_TRACKED_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'company',
  'address',
  'notes',
  'tags',
  'priority'
] as const

const LOG_SAMPLE_FIELDS = ['id', 'email', 'firstName', 'company', 'notes'] as const

function sampleForLog(rec: Record) {
  const out: Record<string, unknown> = {}
  for (const k of LOG_SAMPLE_FIELDS) {
    const v = rec[k]
    if (v !== undefined) out[k] = typeof v === 'string' && v.length > 30 ? (v as string).slice(0, 30) + '…' : v
  }
  return out
}

export function logCustomerTrigger(
  event: string,
  oldVal: Record | undefined,
  newVal: Record | undefined,
  extra?: Record<string, unknown>
): void {
  const payload: Record<string, unknown> = { event }
  if (oldVal) payload.old = sampleForLog(oldVal)
  if (newVal) payload.new = sampleForLog(newVal)
  if (extra) Object.assign(payload, extra)
  console.log('[Trigger:customer]', JSON.stringify(payload))
}

export function getChangedFields(oldVal: Record, newVal: Record): string[] {
  const changed: string[] = []
  for (const k of CUSTOMER_TRACKED_FIELDS) {
    if (oldVal[k] !== newVal[k]) changed.push(k)
  }
  return changed
}

export function appendTriggeredMarker(notes: string, maxLength = 200): string {
  if (notes.length >= maxLength) return notes
  return notes ? `${notes} [Triggered]` : '[Triggered]'
}
