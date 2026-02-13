type Record = { [key: string]: unknown }

export function beforeInsert(newValue: Record): Record {
  return newValue
}

export function afterInsert(_newValue: Record): void {
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
