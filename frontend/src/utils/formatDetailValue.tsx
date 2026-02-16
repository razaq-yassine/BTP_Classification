import React from 'react'
import { Link } from '@tanstack/react-router'
import type { FieldDefinition, GenericRecord } from '@/types/object-definition'
import { evaluateFormula } from './evaluateFormula'

const linkClass = 'text-primary hover:underline'

/**
 * Formats a field value for read-only display in the detail view.
 * Used by GenericObjectDetailViewMainSection and the dev-components detail-view-formatter.
 */
export function formatDetailValue(field: FieldDefinition, val: any, record?: GenericRecord): React.ReactNode {
  // Formula fields: evaluate expression
  if (field.type === 'formula' && field.formulaExpression && record) {
    const result = evaluateFormula(field.formulaExpression, record)
    // Format result based on type
    if (typeof result === 'number') {
      return result.toLocaleString()
    }
    return String(result)
  }
  if (val === null || val === undefined || val === '') {
    return '(Empty)'
  }
  if (field.type === 'reference') {
    const refId = typeof val === 'object' ? val?.id : val
    const displayName =
      typeof val === 'object'
        ? (val.fullName ?? [val.firstName, val.lastName].filter(Boolean).join(' ').trim()) || val.name || val.email || `#${val.id ?? '(Unknown)'}`
        : String(val)
    const objectName = field.objectName
    const basePath = (field as { basePath?: string }).basePath
    const toPath = basePath ? `${basePath}/${refId}` : `/${objectName}/${refId}`
    if ((objectName || basePath) && refId != null) {
      return (
        <Link
          to={toPath}
          className={linkClass}
          onClick={(e) => e.stopPropagation()}
        >
          {displayName}
        </Link>
      )
    }
    return displayName
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
    case 'email':
      return (
        <a
          href={`mailto:${val}`}
          className={linkClass}
          onClick={(e) => e.stopPropagation()}
        >
          {val}
        </a>
      )
    case 'phone':
      return (
        <a
          href={`tel:${val}`}
          className={linkClass}
          onClick={(e) => e.stopPropagation()}
        >
          {val}
        </a>
      )
    case 'url':
      return (
        <a
          href={/^https?:\/\//i.test(val) ? val : `https://${val}`}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
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
    case 'text':
      return (
        <div className="whitespace-pre-wrap break-words">
          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
        </div>
      )
    case 'select':
      if (field.options?.length) {
        const opt = field.options.find((o) => o.value === val)
        return opt?.label ?? val
      }
      return val
    case 'multiselect': {
      let arr: string[] = Array.isArray(val) ? val : []
      if (!Array.isArray(val) && typeof val === 'string') {
        try {
          const parsed = JSON.parse(val)
          arr = Array.isArray(parsed) ? parsed : []
        } catch {
          arr = val ? [val] : []
        }
      }
      if (arr.length === 0) return '(Empty)'
      if (field.options?.length) {
        const labels = arr.map((v) => field.options!.find((o) => o.value === v)?.label ?? v)
        return labels.join(', ')
      }
      return arr.join(', ')
    }
    default:
      return typeof val === 'object' ? JSON.stringify(val) : val
  }
}
