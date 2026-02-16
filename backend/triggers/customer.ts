/**
 * Customer triggers - for testing and automation.
 * Uses helpers/customer.ts (one helper per object). General logic in helpers/utils.ts.
 */
import { validateEmail } from './helpers/utils.js'
import { logCustomerTrigger, getChangedFields, appendTriggeredMarker } from './helpers/customer.js'

type Record = { [key: string]: unknown }

export function beforeInsert(_oldValue: Record | undefined, newValue: Record): Record {
  validateEmail((newValue.email as string) || '')
  logCustomerTrigger('beforeInsert', undefined, newValue, { note: 'oldValue is undefined on insert' })
  const notes = (newValue.notes as string) || ''
  return { ...newValue, notes: appendTriggeredMarker(notes) }
}

export function afterInsert(_oldValue: Record | undefined, newValue: Record): void {
  logCustomerTrigger('afterInsert', _oldValue, newValue)
}

export function beforeUpdate(oldValue: Record, newValue: Record): Record {
  const changed = getChangedFields(oldValue, newValue)
  logCustomerTrigger('beforeUpdate', oldValue, newValue, { changed: changed.length ? changed : 'none' })
  return newValue
}

export function afterUpdate(oldValue: Record, newValue: Record): void {
  const changed = getChangedFields(oldValue, newValue)
  logCustomerTrigger('afterUpdate', oldValue, newValue, { changed: changed.length ? changed : 'none' })
}

export function beforeDelete(oldValue: Record): void {
  logCustomerTrigger('beforeDelete', oldValue, undefined, { note: 'newValue is undefined on delete' })
}

export function afterDelete(oldValue: Record): void {
  logCustomerTrigger('afterDelete', oldValue, undefined)
}
