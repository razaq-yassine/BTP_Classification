import React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { format, isValid } from 'date-fns'

export interface SelectOption {
  value: string
  label: string
  color?: string
  colorHover?: string
}

export interface FieldFormatterProps {
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'email' | 'phone' | 'text' | 'url' | 'select' | 'multiselect' | 'reference' | 'formula'
  value: any
  format?: string
  options?: SelectOption[]
  render?: string // e.g. 'statusBadge', 'currency'
  record?: Record<string, unknown>
  objectName?: string // For reference fields - target object to navigate to
  onReferenceClick?: (objectName: string, id: string | number) => void
}

const EMPTY = <span className="text-muted-foreground italic">(Empty)</span>

export function ListViewFieldFormatter({ type, value, format: dateFormat, options, render: renderType, objectName, onReferenceClick }: FieldFormatterProps) {
  const isEmpty = value === null || value === undefined || value === ''
  if (isEmpty && type !== 'boolean') return EMPTY

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
        if (!isValid(date)) return EMPTY
        const formattedDate = dateFormat ? format(date, dateFormat) : format(date, 'MMM d, yyyy')
        return <span className="text-sm tabular-nums whitespace-nowrap">{formattedDate}</span>
      } catch {
        return EMPTY
      }

    case 'email':
      return (
        <a
          href={`mailto:${value}`}
          className="text-primary hover:underline text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      )

    case 'phone':
      return (
        <a
          href={`tel:${value}`}
          className="text-primary hover:underline text-sm"
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
          className="text-primary hover:underline text-sm"
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

    case 'select':
      return (
        <SelectColoredDiv value={value} options={options ?? []} />
      )

    case 'multiselect':
      if (!Array.isArray(value) || value.length === 0) return EMPTY
      return (
        <div className="flex flex-wrap gap-1">
          {value.slice(0, 3).map((val, index) => {
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
          {value.length > 3 && (
            <span className="text-xs text-muted-foreground">+{value.length - 3} more</span>
          )}
        </div>
      )

    case 'datetime':
      try {
        const date = new Date(value)
        if (!isValid(date)) return EMPTY
        const formatted = dateFormat ? format(date, dateFormat) : format(date, 'MMM d, yyyy h:mm a')
        return (
          <span className="text-sm tabular-nums whitespace-nowrap" title={date.toLocaleString()}>
            {formatted}
          </span>
        )
      } catch {
        return EMPTY
      }

    case 'reference': {
      const refId = typeof value === 'object' ? value?.id : value
      const displayName =
        typeof value === 'object'
          ? (value.fullName ?? value.name ?? value.orderNumber ?? [value.firstName, value.lastName].filter(Boolean).join(' ')) || value.id
          : value
      const canNavigate = objectName && refId != null && onReferenceClick
      if (canNavigate) {
        return (
          <button
            type="button"
            className="text-sm text-primary hover:underline text-left"
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
        ? `$${numValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
