import React from 'react'
import type { FieldDefinition } from '@/types/object-definition'

/**
 * Formats a field value for read-only display in the detail view.
 * Used by GenericObjectDetailViewMainSection and the dev-components detail-view-formatter.
 */
export function formatDetailValue(field: FieldDefinition, val: any): React.ReactNode {
  if (val === null || val === undefined || val === '') {
    return '(Empty)'
  }
  if (field.type === 'reference' && typeof val === 'object') {
    const name = val.fullName ?? [val.firstName, val.lastName].filter(Boolean).join(' ').trim()
    return name || val.name || val.email || `#${val.id ?? '(Unknown)'}`
  }
  switch (field.type) {
    case 'boolean':
      return val ? 'Yes' : 'No'
    case 'date':
      if (val) {
        const date = new Date(val)
        return date.toLocaleDateString()
      }
      return '(Empty)'
    case 'url':
      return (
        <a
          href={/^https?:\/\//i.test(val) ? val : `https://${val}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {val}
        </a>
      )
    case 'number': {
      const numVal = typeof val === 'number' ? val : parseFloat(val)
      if (isNaN(numVal)) return typeof val === 'object' ? JSON.stringify(val) : String(val)
      if (field.renderType === 'percent') {
        return `${(numVal * 100).toFixed(1)}%`
      }
      return numVal.toLocaleString()
    }
    case 'datetime':
      if (val) {
        const dt = new Date(val)
        return dt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      }
      return '(Empty)'
    case 'select':
      if (field.options?.length) {
        const opt = field.options.find((o) => o.value === val)
        return opt?.label ?? val
      }
      return val
    case 'multiselect': {
      const arr = Array.isArray(val) ? val : [val]
      if (arr.length === 0) return '(Empty)'
      if (field.options?.length) {
        const labels = arr.map((v) => field.options!.find((o) => o.value === v)?.label ?? v)
        return labels.join(', ')
      }
      return arr.join(', ')
    }
    case 'email':
    case 'phone':
    default:
      return typeof val === 'object' ? JSON.stringify(val) : val
  }
}
