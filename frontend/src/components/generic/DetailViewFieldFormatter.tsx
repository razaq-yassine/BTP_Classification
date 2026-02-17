import React from 'react'
import { Badge } from '@/components/ui/badge'
import { RichTextView } from '@/components/rich-text-view'
import { format } from 'date-fns'

export interface DetailFieldFormatterProps {
  type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'phone' | 'text' | 'url' | 'select' | 'password' | 'geolocation' | 'address' | 'richText' | 'file'
  value: any
  format?: string // For date formatting, etc.
  options?: { value: string; label: string }[] // For select fields
}

export function DetailViewFieldFormatter({ type, value, format: dateFormat, options }: DetailFieldFormatterProps) {
  // Handle null/undefined values
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground">Not provided</span>
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
        return <span className="text-muted-foreground">{value}</span>
      }

    case 'email':
      return (
        <a 
          href={`mailto:${value}`} 
          className="text-blue-600 dark:text-primary hover:underline"
        >
          {value}
        </a>
      )

    case 'phone':
      return (
        <a 
          href={`tel:${value}`} 
          className="text-blue-600 dark:text-primary hover:underline"
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
          className="text-blue-600 dark:text-primary hover:underline"
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

    case 'password':
      return <span>••••••••</span>

    case 'geolocation': {
      let loc: { latitude?: number; longitude?: number }
      try {
        loc = typeof value === 'string' ? JSON.parse(value) : value
      } catch {
        return <span className="text-muted-foreground">Not provided</span>
      }
      if (loc?.latitude == null && loc?.longitude == null) return <span className="text-muted-foreground">Not provided</span>
      return <span>{[loc.latitude, loc.longitude].filter((x) => x != null).join(', ')}</span>
    }

    case 'address': {
      let addr: Record<string, string>
      try {
        addr = typeof value === 'string' ? JSON.parse(value) : value
      } catch {
        return <span className="text-muted-foreground">Not provided</span>
      }
      if (!addr || typeof addr !== 'object') return <span className="text-muted-foreground">Not provided</span>
      const parts = [addr.street, addr.city, addr.state, addr.zip, addr.country].filter(Boolean)
      return <span>{parts.join(', ')}</span>
    }

    case 'richText': {
      const html = typeof value === 'string' ? value : String(value ?? '')
      return <RichTextView html={html} />
    }

    case 'file': {
      const path = typeof value === 'string' ? value : String(value ?? '')
      const filename = path.split('/').pop() || path
      return path ? (
        <a href={path.startsWith('/') ? path : `/${path}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-primary hover:underline">
          {filename}
        </a>
      ) : (
        <span className="text-muted-foreground">Not provided</span>
      )
    }

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
        return <span className="text-muted-foreground">{value}</span>
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
