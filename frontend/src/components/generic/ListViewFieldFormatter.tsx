import React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { format, isValid } from 'date-fns'
import { formatCurrency } from '@/stores/appConfigStore'

export interface SelectOption {
  value: string
  label: string
  color?: string
  colorHover?: string
}

export interface FieldFormatterProps {
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'email' | 'phone' | 'text' | 'url' | 'select' | 'multiselect' | 'reference' | 'masterDetail' | 'formula' | 'password' | 'geolocation' | 'address' | 'richText' | 'file'
  value: any
  format?: string
  options?: SelectOption[]
  render?: string // e.g. 'statusBadge', 'currency'
  record?: Record<string, unknown>
  objectName?: string // For reference fields - target object to navigate to
  onReferenceClick?: (objectName: string, id: string | number) => void
}

export function ListViewFieldFormatter({ type, value, format: dateFormat, options, render: renderType, objectName, onReferenceClick }: FieldFormatterProps) {
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
        const formattedDate = dateFormat ? format(date, dateFormat) : format(date, 'MMM d, yyyy')
        return <span className="text-sm tabular-nums whitespace-nowrap">{formattedDate}</span>
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
      const href = /^https?:\/\//i.test(value) ? value : `https://${value}`
      const display = value.length > 40 ? `${value.substring(0, 40)}...` : value
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
      let addr: Record<string, string>
      try {
        addr = typeof value === 'string' ? JSON.parse(value) : value
      } catch {
        return null
      }
      if (!addr || typeof addr !== 'object') return null
      const parts = [addr.street, addr.city, addr.state, addr.zip, addr.country].filter(Boolean)
      const display = parts.length > 0 ? parts.join(', ') : ''
      const truncated = display.length > 40 ? `${display.substring(0, 40)}...` : display
      return truncated ? <span className="text-sm" title={display}>{truncated}</span> : null
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
        <SelectColoredDiv value={value} options={options ?? []} />
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
            const label = opt?.label || val
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
        const formatted = dateFormat ? format(date, dateFormat) : format(date, 'MMM d, yyyy h:mm a')
        return (
          <span className="text-sm tabular-nums whitespace-nowrap" title={date.toLocaleString()}>
            {formatted}
          </span>
        )
      } catch {
        return null
      }

    case 'reference':
    case 'masterDetail': {
      const refId = typeof value === 'object' ? value?.id : value
      const displayName =
        typeof value === 'object'
          ? (value.fullName ?? value.name ?? [value.firstName, value.lastName].filter(Boolean).join(' ')) || value.id
          : value
      const canNavigate = objectName && refId != null && onReferenceClick
      if (canNavigate) {
        return (
          <button
            type="button"
            className="text-sm text-blue-600 dark:text-primary hover:underline text-left"
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

function SelectColoredDiv({ value, options }: { value: string; options: SelectOption[] }) {
  const option = options.find((o) => o.value === value)
  const label = option?.label ?? value
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
