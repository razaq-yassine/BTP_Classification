import React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { translateSelectOptionLabel } from '@/utils/translateMetadata'
import { getReferenceDisplayName } from '@/utils/formatDetailValue'
import { isValid } from 'date-fns'
import { formatDateShort, formatDateTimeShort } from '@/utils/formatDateLocale'
import { formatCurrency } from '@/stores/appConfigStore'

export interface SelectOption {
  value: string
  label: string
  color?: string
  colorHover?: string
}

export interface FieldFormatterProps {
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'email' | 'phone' | 'text' | 'url' | 'select' | 'multiselect' | 'reference' | 'masterDetail' | 'formula' | 'password' | 'geolocation' | 'address' | 'richText' | 'file' | 'color'
  value: any
  format?: string
  options?: SelectOption[]
  render?: string // e.g. 'statusBadge', 'currency'
  record?: Record<string, unknown>
  objectName?: string // For reference fields - target object to navigate to
  fieldKey?: string // For select/multiselect - field key for option translation
  sourceObjectName?: string // For select/multiselect - object name (e.g. 'order') for option translation
  onReferenceClick?: (objectName: string, id: string | number) => void
}

export function ListViewFieldFormatter({ type, value, format: dateFormat, options, render: renderType, objectName, fieldKey, sourceObjectName, onReferenceClick }: FieldFormatterProps) {
  const isEmpty = value === null || value === undefined || value === ''
  if (isEmpty && type !== 'boolean') return null

  switch (type) {
    case 'boolean':
      return (
        <Checkbox
          checked={Boolean(value === true || value === 'true')}
          disabled
          className="pointer-events-none"
          aria-label={value ? 'Active' : 'Inactive'}
        />
      )

    case 'date':
      try {
        const date = new Date(value)
        if (!isValid(date)) return null
        const formattedDate = dateFormat ? formatDateShort(date, dateFormat) : formatDateShort(date)
        return <span dir="ltr" className="text-sm tabular-nums whitespace-nowrap">{formattedDate}</span>
      } catch {
        return null
      }

    case 'email':
      return (
        <a
          href={`mailto:${value}`}
          className="text-blue-600 dark:text-primary hover:underline text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      )

    case 'phone':
      return (
        <a
          href={`tel:${value}`}
          className="text-blue-600 dark:text-primary hover:underline text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      )

    case 'url': {
      const isDangerousScheme = /^(javascript|data|vbscript):/i.test(value)
      const href = isDangerousScheme
        ? undefined
        : /^https?:\/\//i.test(value)
          ? value
          : `https://${value}`
      const display = value.length > 40 ? `${value.substring(0, 40)}...` : value
      if (!href) {
        return <span className="text-sm">{display}</span>
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-primary hover:underline text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {display}
        </a>
      )
    }

    case 'color': {
      const hex = typeof value === 'string' ? value : ''
      if (!hex) return null
      const displayHex = hex.startsWith('#') ? hex : `#${hex}`
      return (
        <span className="flex items-center gap-2 text-sm">
          <span
            className="size-4 shrink-0 rounded border border-border"
            style={{ backgroundColor: displayHex }}
            aria-hidden
          />
          {displayHex}
        </span>
      )
    }

    case 'text':
      const truncatedText = value.length > 50 ? `${value.substring(0, 50)}...` : value
      return (
        <span className="text-sm" title={value}>
          {truncatedText}
        </span>
      )

    case 'password':
      return <span className="text-sm">••••••••</span>

    case 'geolocation': {
      let loc: { latitude?: number; longitude?: number }
      try {
        loc = typeof value === 'string' ? JSON.parse(value) : value
      } catch {
        return null
      }
      if (loc?.latitude == null && loc?.longitude == null) return null
      const label = [loc.latitude, loc.longitude].filter((x) => x != null).join(', ')
      return <span className="text-sm">{label}</span>
    }

    case 'address': {
      // Support both JSON object/string (street, city, state, zip, country) and plain string addresses
      if (typeof value === 'string' && value.trim()) {
        try {
          const parsed = JSON.parse(value)
          if (parsed && typeof parsed === 'object') {
            const parts = [parsed.street, parsed.city, parsed.state, parsed.zip, parsed.country].filter(Boolean)
            const display = parts.length > 0 ? parts.join(', ') : ''
            const truncated = display.length > 40 ? `${display.substring(0, 40)}...` : display
            return truncated ? <span className="text-sm" title={display}>{truncated}</span> : null
          }
        } catch {
          // Plain string address (e.g. "123 Main St, Brooklyn, NY 11201")
          const truncated = value.length > 40 ? `${value.substring(0, 40)}...` : value
          return <span className="text-sm" title={value}>{truncated}</span>
        }
      }
      if (value && typeof value === 'object') {
        const parts = [value.street, value.city, value.state, value.zip, value.country].filter(Boolean)
        const display = parts.length > 0 ? parts.join(', ') : ''
        const truncated = display.length > 40 ? `${display.substring(0, 40)}...` : display
        return truncated ? <span className="text-sm" title={display}>{truncated}</span> : null
      }
      return null
    }

    case 'richText': {
      const str = typeof value === 'string' ? value : String(value ?? '')
      const stripped = str.replace(/<[^>]*>/g, '').trim()
      const truncated = stripped.length > 50 ? `${stripped.substring(0, 50)}...` : stripped
      return truncated ? <span className="text-sm" title={stripped}>{truncated}</span> : null
    }

    case 'file': {
      const path = typeof value === 'string' ? value : String(value ?? '')
      const filename = path.split('/').pop() || path
      return filename ? <span className="text-sm">{filename}</span> : null
    }

    case 'select':
      return (
        <SelectColoredDiv
          value={value}
          options={options ?? []}
          sourceObjectName={sourceObjectName}
          fieldKey={fieldKey}
        />
      )

    case 'multiselect': {
      let arr: string[] = Array.isArray(value) ? value : []
      if (!Array.isArray(value) && typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          arr = Array.isArray(parsed) ? parsed : []
        } catch {
          arr = value ? [value] : []
        }
      }
      if (arr.length === 0) return null
      return (
        <div className="flex flex-wrap gap-1">
          {arr.slice(0, 3).map((val, index) => {
            const opt = options?.find((o) => o.value === val)
            const color = opt?.color
            const label = (sourceObjectName && fieldKey)
              ? translateSelectOptionLabel(sourceObjectName, fieldKey, val, opt?.label || val)
              : (opt?.label || val)
            return (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                style={color ? { backgroundColor: `${color}20`, color } : undefined}
              >
                {label}
              </span>
            )
          })}
          {arr.length > 3 && (
            <span className="text-xs text-muted-foreground">+{arr.length - 3} more</span>
          )}
        </div>
      )
    }

    case 'datetime':
      try {
        const date = new Date(value)
        if (!isValid(date)) return null
        const formatted = dateFormat ? formatDateTimeShort(date, dateFormat) : formatDateTimeShort(date)
        return (
          <span dir="ltr" className="text-sm tabular-nums whitespace-nowrap" title={formatted}>
            {formatted}
          </span>
        )
      } catch {
        return null
      }

    case 'reference':
    case 'masterDetail': {
      const refId = typeof value === 'object' ? value?.id : value
      const displayName = getReferenceDisplayName(value) || value
      const canNavigate = objectName && refId != null && onReferenceClick
      if (canNavigate) {
        return (
          <button
            type="button"
            className="text-sm text-blue-600 dark:text-primary hover:underline text-start"
            onClick={(e) => {
              e.stopPropagation()
              onReferenceClick(objectName, refId)
            }}
          >
            {displayName ?? value}
          </button>
        )
      }
      return <span className="text-sm">{displayName ?? value}</span>
    }

    case 'number':
      const numValue = typeof value === 'number' ? value : parseFloat(value)
      if (isNaN(numValue)) return <span className="text-sm text-muted-foreground">{value}</span>
      const isCurrency = renderType === 'currency'
      const isPercent = renderType === 'percent'
      const formatted = isCurrency
        ? formatCurrency(numValue)
        : isPercent
          ? `${(numValue * 100).toFixed(1)}%`
          : numValue.toLocaleString()
      return (
        <span className={`text-sm tabular-nums block w-full ${(isCurrency || isPercent) ? 'text-center' : ''}`}>
          {formatted}
        </span>
      )

    case 'string':
    default:
      const truncatedString = value.length > 40 ? `${value.substring(0, 40)}...` : value
      return (
        <span className="text-sm" title={value}>
          {truncatedString}
        </span>
      )
  }
}

function SelectColoredDiv({ value, options, sourceObjectName, fieldKey }: { value: string; options: SelectOption[]; sourceObjectName?: string; fieldKey?: string }) {
  const option = options.find((o) => o.value === value)
  const label = (sourceObjectName && fieldKey)
    ? translateSelectOptionLabel(sourceObjectName, fieldKey, value, option?.label ?? value)
    : (option?.label ?? value)
  const color = option?.color

  return (
    <div
      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium"
      style={
        color
          ? {
            backgroundColor: `${color}20`,
            color: color,
          }
          : undefined
      }
    >
      {label}
    </div>
  )
}

// Helper function to get the appropriate formatter for a field type
export function formatFieldValue(
  type: FieldFormatterProps['type'],
  value: any,
  format?: string,
  options?: SelectOption[],
  render?: string
): React.ReactNode {
  return (
    <ListViewFieldFormatter
      type={type}
      value={value}
      format={format}
      options={options}
      render={render}
    />
  )
}
