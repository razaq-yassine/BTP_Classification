import { useState } from 'react'
import { ObjectDefinition, GenericRecord, FieldDefinition } from '@/types/object-definition'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { ListViewFieldFormatter } from './ListViewFieldFormatter'
import { Loader2 } from 'lucide-react'

interface GenericDataTableProps {
  objectDefinition: ObjectDefinition
  records: GenericRecord[]
  loading?: boolean
  error?: string
  onRecordClick?: (record: GenericRecord) => void
  showFields?: string[] // Override which fields to show
  sortable?: boolean
  compact?: boolean // For smaller tables in related views
  selectedRecords?: Set<string | number>
  onSelectRecord?: (recordId: string | number, selected: boolean) => void
  onSelectAll?: (selected: boolean) => void
}

export function GenericDataTable({ 
  objectDefinition, 
  records, 
  loading = false, 
  error = '', 
  onRecordClick,
  showFields,
  sortable = true,
  compact = false,
  selectedRecords,
  onSelectRecord,
  onSelectAll
}: GenericDataTableProps) {
  const [sortField, setSortField] = useState(objectDefinition.listView.defaultSort || '')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(objectDefinition.listView.defaultSortOrder || 'asc')

  const fieldsToShow = showFields || objectDefinition.listView.fields

  const getFieldDefinition = (fieldKey: string): FieldDefinition | undefined => {
    return objectDefinition.fields.find(field => field.key === fieldKey)
  }

  const renderFieldValue = (fieldKey: string, value: any, record: GenericRecord) => {
    const fieldDef = getFieldDefinition(fieldKey)
    if (!fieldDef) return value?.toString() || ''

    if (fieldDef.render) {
      return fieldDef.render(value, record)
    }

    return (
      <ListViewFieldFormatter
        type={fieldDef.type}
        value={value}
        format={fieldDef.format}
        options={fieldDef.options}
      />
    )
  }

  const sortedRecords = [...records].sort((a, b) => {
    if (!sortField) return 0
    
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    if (aValue === bValue) return 0
    
    const comparison = aValue < bValue ? -1 : 1
    return sortOrder === 'asc' ? comparison : -comparison
  })

  const handleSort = (fieldKey: string) => {
    if (!sortable) return
    
    const fieldDef = getFieldDefinition(fieldKey)
    if (!fieldDef?.sortable) return

    if (sortField === fieldKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(fieldKey)
      setSortOrder('asc')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const paddingClass = compact ? 'px-4 py-2' : 'px-6 py-4'
  const headerPaddingClass = compact ? 'px-4 py-2' : 'px-6 py-3'

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-muted/50">
          <tr>
            {selectedRecords && onSelectRecord && onSelectAll && (
              <th className={`${headerPaddingClass} w-12`}>
                <Checkbox
                  checked={selectedRecords.size === records.length && records.length > 0}
                  onCheckedChange={(checked) => onSelectAll(!!checked)}
                  aria-label="Select all"
                />
              </th>
            )}
            {fieldsToShow.map((fieldKey) => {
              const fieldDef = getFieldDefinition(fieldKey)
              const isSortable = sortable && fieldDef?.sortable
              return (
                <th
                  key={fieldKey}
                  className={`${headerPaddingClass} text-left text-xs font-medium text-muted-foreground uppercase tracking-wider ${
                    isSortable ? 'cursor-pointer hover:bg-muted/70' : ''
                  }`}
                  onClick={() => handleSort(fieldKey)}
                >
                  <div className="flex items-center">
                    {fieldDef?.label || fieldKey}
                    {sortField === fieldKey && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="bg-background divide-y divide-border">
          {sortedRecords.map((record) => (
            <tr 
              key={record.id} 
              className={`transition-colors ${onRecordClick ? 'hover:bg-muted/50 cursor-pointer' : ''}`}
            >
              {selectedRecords && onSelectRecord && (
                <td className={`${paddingClass} w-12`}>
                  <Checkbox
                    checked={selectedRecords.has(record.id)}
                    onCheckedChange={(checked) => onSelectRecord(record.id, !!checked)}
                    aria-label={`Select record ${record.id}`}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
              )}
              {fieldsToShow.map((fieldKey) => (
                <td 
                  key={fieldKey} 
                  className={`${paddingClass} whitespace-nowrap text-sm text-foreground`}
                  onClick={() => onRecordClick?.(record)}
                >
                  {renderFieldValue(fieldKey, record[fieldKey], record)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {sortedRecords.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No records found.
        </div>
      )}
    </div>
  )
}
