import React from 'react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

export interface FieldFormatterProps {
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'email' | 'phone' | 'text' | 'select' | 'multiselect' | 'lookup' | 'reference'
  value: any
  format?: string // For date formatting, etc.
  options?: { value: string; label: string }[] // For select fields
}

export function ListViewFieldFormatter({ type, value, format: dateFormat, options }: FieldFormatterProps) {
  // Handle null/undefined values
  if (value === null || value === undefined) {
    return <span className="text-gray-400">—</span>
  }

  switch (type) {
    case 'boolean':
      return (
        <Badge variant={value ? 'default' : 'secondary'} className="text-xs">
          {value ? 'Yes' : 'No'}
        </Badge>
      )

    case 'date':
      try {
        const date = new Date(value)
        const formattedDate = dateFormat ? format(date, dateFormat) : format(date, 'MMM dd, yyyy')
        return <span className="text-sm">{formattedDate}</span>
      } catch {
        return <span className="text-sm text-gray-500">{value}</span>
      }

    case 'email':
      if (!value) return <span className="text-gray-400">—</span>
      return (
        <a 
          href={`mailto:${value}`} 
          className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
          onClick={(e) => e.stopPropagation()} // Prevent row click when clicking email
        >
          {value}
        </a>
      )

    case 'phone':
      if (!value) return <span className="text-gray-400">—</span>
      return (
        <a 
          href={`tel:${value}`} 
          className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
          onClick={(e) => e.stopPropagation()} // Prevent row click when clicking phone
        >
          {value}
        </a>
      )

    case 'text':
      if (!value) return <span className="text-gray-400">—</span>
      // Truncate long text in list view
      const truncatedText = value.length > 50 ? `${value.substring(0, 50)}...` : value
      return (
        <span className="text-sm" title={value}>
          {truncatedText}
        </span>
      )

    case 'select':
      if (!value) return <span className="text-gray-400">—</span>
      // Find the label for the value from options
      const option = options?.find(opt => opt.value === value)
      return (
        <Badge variant="outline" className="text-xs">
          {option?.label || value}
        </Badge>
      )

    case 'multiselect':
      if (!value || !Array.isArray(value) || value.length === 0) {
        return <span className="text-gray-400">—</span>
      }
      return (
        <div className="flex flex-wrap gap-1">
          {value.slice(0, 3).map((val, index) => {
            const option = options?.find(opt => opt.value === val)
            return (
              <Badge key={index} variant="secondary" className="text-xs">
                {option?.label || val}
              </Badge>
            )
          })}
          {value.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{value.length - 3} more
            </Badge>
          )}
        </div>
      )

    case 'datetime':
      if (!value) return <span className="text-gray-400">—</span>
      try {
        const date = new Date(value)
        return (
          <span className="text-sm" title={date.toLocaleString()}>
            {format(date, dateFormat || 'MMM d, yyyy h:mm a')}
          </span>
        )
      } catch {
        return <span className="text-sm text-gray-500">{value}</span>
      }

    case 'lookup':
    case 'reference':
      if (!value) return <span className="text-gray-400">—</span>
      // For lookup fields, value might be an object with name or just an ID
      if (typeof value === 'object' && value.name) {
        return (
          <Badge variant="outline" className="text-xs">
            {value.name}
          </Badge>
        )
      }
      return (
        <Badge variant="outline" className="text-xs">
          {value}
        </Badge>
      )

    case 'number':
      if (value === null || value === undefined || value === '') {
        return <span className="text-gray-400">—</span>
      }
      // Format numbers with proper locale formatting
      const numValue = typeof value === 'number' ? value : parseFloat(value)
      if (isNaN(numValue)) {
        return <span className="text-sm text-gray-500">{value}</span>
      }
      return <span className="text-sm font-mono">{numValue.toLocaleString()}</span>

    case 'string':
    default:
      if (!value) return <span className="text-gray-400">—</span>
      // Truncate long strings in list view
      const truncatedString = value.length > 40 ? `${value.substring(0, 40)}...` : value
      return (
        <span className="text-sm" title={value}>
          {truncatedString}
        </span>
      )
  }
}

// Helper function to get the appropriate formatter for a field type
export function formatFieldValue(
  type: FieldFormatterProps['type'], 
  value: any, 
  format?: string, 
  options?: { value: string; label: string }[]
): React.ReactNode {
  return (
    <ListViewFieldFormatter 
      type={type} 
      value={value} 
      format={format} 
      options={options} 
    />
  )
}
