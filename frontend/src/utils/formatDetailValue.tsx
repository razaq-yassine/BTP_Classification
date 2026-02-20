import React from 'react'
import { Link } from '@tanstack/react-router'
import i18n from 'i18next'
import { translateSelectOptionLabel } from './translateMetadata'
import { toLocaleDateString, toLocaleDateTimeString } from '@/utils/formatDateLocale'
import { RichTextView } from '@/components/rich-text-view'
import { apiBaseUrl } from '@/services/api'
import type { FieldDefinition, GenericRecord } from '@/types/object-definition'
import { ProtectedFileLink } from '@/components/generic/ProtectedFileLink'
import { ExpandableText } from '@/components/expandable-text'
import { evaluateFormula } from './evaluateFormula'
import { formatCurrency } from '@/stores/appConfigStore'

const linkClass = 'text-blue-600 dark:text-primary hover:underline'

/**
 * Extracts display name from a reference or masterDetail field value.
 * Shared by formatDetailValue, ReferenceFieldValue, and ListViewFieldFormatter.
 */
export function getReferenceDisplayName(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>
    const fullName = v.fullName as string | undefined
    const joined = [v.firstName, v.lastName].filter(Boolean).join(' ').trim()
    const name = v.name as string | undefined
    const email = v.email as string | undefined
    const fallback = `#${v.id ?? '(Unknown)'}`
    return (fullName ?? joined) || name || email || fallback || String(value)
  }
  return String(value)
}

/**
 * Formats a field value for read-only display in the detail view.
 * Used by GenericObjectDetailViewMainSection and the dev-components detail-view-formatter.
 * @param objectName - Object name (e.g. 'order') for translating select/multiselect options
 */
export function formatDetailValue(field: FieldDefinition, val: any, record?: GenericRecord, objectName?: string): React.ReactNode {
  // Formula fields: evaluate expression
  if (field.type === 'formula' && field.formulaExpression && record) {
    const result = evaluateFormula(field.formulaExpression, record)
    // Format result based on type
    if (typeof result === 'number') {
      const lang = i18n.language ?? 'en'
      return result.toLocaleString(lang)
    }
    return String(result)
  }
  if (val === null || val === undefined || val === '') {
    return i18n.t('common:empty')
  }
  if (field.type === 'reference' || field.type === 'masterDetail') {
    const refId = typeof val === 'object' ? (val as { id?: string | number })?.id : val
    const displayName = getReferenceDisplayName(val)
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
      return val ? i18n.t('common:yes') : i18n.t('common:no')
    case 'date':
      if (val) {
        const date = new Date(val)
        return <span dir="ltr" className="tabular-nums">{toLocaleDateString(date)}</span>
      }
      return i18n.t('common:empty')
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
    case 'url': {
      const isDangerousScheme = /^(javascript|data|vbscript):/i.test(val)
      const href = isDangerousScheme
        ? undefined
        : /^https?:\/\//i.test(val)
          ? val
          : `https://${val}`
      if (!href) {
        return <span>{val}</span>
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          onClick={(e) => e.stopPropagation()}
        >
          {val}
        </a>
      )
    }
    case 'color': {
      const hex = typeof val === 'string' ? val : ''
      if (!hex) return i18n.t('common:empty')
      const displayHex = hex.startsWith('#') ? hex : `#${hex}`
      return (
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block size-4 shrink-0 rounded border border-border"
            style={{ backgroundColor: displayHex }}
            aria-hidden
          />
          <span className="font-mono text-sm">{displayHex}</span>
        </span>
      )
    }
    case 'number': {
      const numVal = typeof val === 'number' ? val : parseFloat(val)
      if (isNaN(numVal)) return typeof val === 'object' ? JSON.stringify(val) : String(val)
      if (field.renderType === 'percent') {
        return `${(numVal * 100).toFixed(1)}%`
      }
      if (field.renderType === 'currency') {
        return formatCurrency(numVal)
      }
      const lang = i18n.language ?? 'en'
      return numVal.toLocaleString(lang)
    }
    case 'datetime':
      if (val) {
        const dt = new Date(val)
        return <span dir="ltr" className="tabular-nums">{toLocaleDateTimeString(dt)}</span>
      }
      return i18n.t('common:empty')
    case 'text': {
      const text = typeof val === 'object' ? JSON.stringify(val) : String(val)
      return <ExpandableText maxLines={3}>{text}</ExpandableText>
    }
    case 'password':
      return '••••••••'
    case 'geolocation': {
      let loc: { latitude?: number; longitude?: number }
      try {
        loc = typeof val === 'string' ? JSON.parse(val) : val
      } catch {
        return i18n.t('common:empty')
      }
      if (loc?.latitude == null && loc?.longitude == null) return i18n.t('common:empty')
      const lat = loc.latitude ?? ''
      const lng = loc.longitude ?? ''
      const label = [lat, lng].filter((x) => x !== '').join(', ')
      if (!label) return i18n.t('common:empty')
      return (
        <a
          href={`https://www.google.com/maps?q=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          onClick={(e) => e.stopPropagation()}
        >
          {label}
        </a>
      )
    }
    case 'address': {
      let addr: Record<string, string>
      try {
        addr = typeof val === 'string' ? JSON.parse(val) : val
      } catch {
        return val ? String(val) : i18n.t('common:empty')
      }
      if (!addr || typeof addr !== 'object') return i18n.t('common:empty')
      const parts = [addr.street, addr.city, addr.state, addr.zip, addr.country].filter(Boolean)
      return parts.length ? (
        <div className="whitespace-pre-wrap break-words">{parts.join(', ')}</div>
      ) : (
        i18n.t('common:empty')
      )
    }
    case 'richText': {
      const html = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')
      return <RichTextView html={html} />
    }
    case 'file': {
      const fileId = typeof val === 'object' && val != null && 'id' in val ? Number((val as { id: number }).id) : typeof val === 'number' ? val : NaN
      const path = typeof val === 'object' ? JSON.stringify(val) : String(val)
      if (fileId && !isNaN(fileId)) {
        const fileUrl = `${apiBaseUrl}/api/files/download/${fileId}`
        const filename = typeof val === 'object' && val != null && 'filename' in val ? String((val as { filename: string }).filename) : `File #${fileId}`
        return (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
            onClick={(e) => e.stopPropagation()}
          >
            {filename}
          </a>
        )
      }
      if (!path || path.trim() === '') return i18n.t('common:empty')
      const filename = path.split('/').pop() || path
      const normalizedPath = path.startsWith('/') ? path : `/${path}`
      if (normalizedPath.startsWith('/uploads/')) {
        return (
          <ProtectedFileLink
            path={normalizedPath}
            filename={filename}
            className={linkClass}
            onClick={(e) => e.stopPropagation()}
          />
        )
      }
      const fileUrl = `${apiBaseUrl}${normalizedPath}`
      return (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          onClick={(e) => e.stopPropagation()}
        >
          {filename}
        </a>
      )
    }
    case 'select':
      if (field.options?.length) {
        const opt = field.options.find((o) => o.value === val)
        const fallback = opt?.label ?? val
        return objectName ? translateSelectOptionLabel(objectName, field.key, val, fallback) : fallback
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
      if (arr.length === 0) return i18n.t('common:empty')
      if (field.options?.length) {
        const labels = arr.map((v) => {
          const opt = field.options!.find((o) => o.value === v)
          const fallback = opt?.label ?? v
          return objectName ? translateSelectOptionLabel(objectName, field.key, v, fallback) : fallback
        })
        return labels.join(', ')
      }
      return arr.join(', ')
    }
    default:
      return typeof val === 'object' ? JSON.stringify(val) : val
  }
}
