import React from 'react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

export interface DetailFieldFormatterProps {
  type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'phone' | 'text' | 'url' | 'select'
  value: any
  format?: string // For date formatting, etc.
  options?: { value: string; label: string }[] // For select fields
}

export function DetailViewFieldFormatter({ type, value, format: dateFormat, options }: DetailFieldFormatterProps) {
  // Handle null/undefined values
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-400">Not provided</span>
  }

  switch (type) {
    case 'boolean':
      return (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Yes' : 'No'}
        </Badge>
      )

    case 'date':
      try {
        const date = new Date(value)
        const formattedDate = dateFormat ? format(date, dateFormat) : format(date, 'MMM dd, yyyy HH:mm')
        return <span>{formattedDate}</span>
      } catch {
        return <span className="text-gray-500">{value}</span>
      }

    case 'email':
      return (
        <a 
          href={`mailto:${value}`} 
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {value}
        </a>
      )

    case 'phone':
      return (
        <a 
          href={`tel:${value}`} 
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {value}
        </a>
      )

    case 'url': {
      const href = /^https?:\/\//i.test(value) ? value : `https://${value}`
      return (
        <a 
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {value}
        </a>
      )
    }

    case 'text':
      return (
        <div className="whitespace-pre-wrap break-words">
          {value}
        </div>
      )

    case 'select':
      // Find the label for the value from options
      const option = options?.find(opt => opt.value === value)
      return (
        <Badge variant="outline">
          {option?.label || value}
        </Badge>
      )

    case 'number':
      // Format numbers with proper locale formatting
      const numValue = typeof value === 'number' ? value : parseFloat(value)
      if (isNaN(numValue)) {
        return <span className="text-gray-500">{value}</span>
      }
      return <span className="font-mono">{numValue.toLocaleString()}</span>

    case 'string':
    default:
      return <span>{value}</span>
  }
}

// Helper function to get the appropriate formatter for a field type in detail view
export function formatDetailFieldValue(
  type: DetailFieldFormatterProps['type'], 
  value: any, 
  format?: string, 
  options?: { value: string; label: string }[]
): React.ReactNode {
  return (
    <DetailViewFieldFormatter 
      type={type} 
      value={value} 
      format={format} 
      options={options} 
    />
  )
}
