import { validateEmail } from './helpers/validation'

type Record = { [key: string]: unknown }

export function beforeInsert(newValue: Record): Record {
  validateEmail((newValue.email as string) || '')
  return newValue
}

export function afterInsert(_newValue: Record): void {
  // sendWelcomeEmail(newValue.email)
}

export function beforeUpdate(_oldValue: Record, newValue: Record): Record {
  return newValue
}

export function afterUpdate(_oldValue: Record, _newValue: Record): void {
  // auditLog.record('customer', oldValue, newValue)
}

export function beforeDelete(_oldValue: Record): void {
  // throw if cannot delete
}

export function afterDelete(_oldValue: Record): void {
  // cleanup
}
