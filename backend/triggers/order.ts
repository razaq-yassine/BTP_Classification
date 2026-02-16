/**
 * Order triggers. Add logic as needed. Use helpers/order.ts for object-specific logic.
 */
type Record = { [key: string]: unknown }

export function beforeInsert(_oldValue: Record | undefined, newValue: Record): Record {
  return newValue
}

export function afterInsert(_oldValue: Record | undefined, _newValue: Record): void {
  // Side effects
}

export function beforeUpdate(_oldValue: Record, newValue: Record): Record {
  return newValue
}

export function afterUpdate(_oldValue: Record, _newValue: Record): void {
  // audit
}

export function beforeDelete(_oldValue: Record): void {
  // throw if cannot delete
}

export function afterDelete(_oldValue: Record): void {
  // cleanup
}
