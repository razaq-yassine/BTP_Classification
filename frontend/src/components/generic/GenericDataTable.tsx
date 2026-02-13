"use client"

import * as React from "react"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

// Generic interfaces
interface GenericRecord {
  id?: string | number
  [key: string]: any
}

interface GenericDataTableProps<TData extends GenericRecord> {
  data: TData[]
  objectDefinition: any
  isLoading?: boolean
  onRowClick?: (record: TData) => void
  onSelectionChange?: (selectedIds: string[]) => void
}

// Simple sorting and filtering logic
function sortData<T>(data: T[], sortField: string | null, sortDirection: 'asc' | 'desc' | null): T[] {
  if (!sortField || !sortDirection) return data
  
  return [...data].sort((a, b) => {
    const aVal = (a as any)[sortField]
    const bVal = (b as any)[sortField]
    
    if (aVal === bVal) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1
    
    const comparison = aVal < bVal ? -1 : 1
    return sortDirection === 'asc' ? comparison : -comparison
  })
}

function filterData<T>(data: T[], searchTerm: string, fields: any[]): T[] {
  if (!searchTerm.trim()) return data
  
  const lowerSearch = searchTerm.toLowerCase()
  return data.filter(item => 
    fields.some(field => {
      const value = (item as any)[field.key]
      return value != null && String(value).toLowerCase().includes(lowerSearch)
    })
  )
}

// Cell renderers
function renderCell(value: any, field: any, isFirstColumn: boolean, onRowClick?: (record: any) => void, record?: any) {
  // Format based on field type
  switch (field.type) {
    case 'email':
      return (
        <a href={`mailto:${value}`} className="hover:underline">
          {String(value || '')}
        </a>
      )
    case 'phone':
      return (
        <a href={`tel:${value}`} className="hover:underline">
          {String(value || '')}
        </a>
      )
    case 'boolean':
      return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    case 'date':
    case 'datetime':
      return (
        <span className="text-muted-foreground">
          {value ? new Date(String(value)).toLocaleDateString() : ''}
        </span>
      )
    default:
      if (isFirstColumn && onRowClick && record) {
        return (
          <button 
            className="text-left cursor-pointer hover:underline font-medium"
            onClick={() => onRowClick(record)}
          >
            {String(value || '')}
          </button>
        )
      }
      return <span>{String(value || '')}</span>
  }
}

export function GenericDataTable<TData extends GenericRecord>({
  data,
  objectDefinition,
  isLoading = false,
  onRowClick,
  onSelectionChange,
}: GenericDataTableProps<TData>) {
  // Simple state management
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = React.useState('')
  const [sortField, setSortField] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc' | null>(null)
  const [hiddenColumns, setHiddenColumns] = React.useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 10

  // Get fields from object configuration
  const fields = React.useMemo(() => {
    const listViewFields = objectDefinition.listView?.fields || []
    // Ensure fields have required properties
    return listViewFields.map((field: any) => ({
      key: typeof field === 'string' ? field : field.key,
      label: typeof field === 'string' ? field : field.label || field.key,
      type: typeof field === 'string' ? 'text' : field.type || 'text',
      sortable: typeof field === 'string' ? true : field.sortable !== false
    }))
  }, [objectDefinition.listView?.fields])

  // Process data
  const processedData = React.useMemo(() => {
    let result = filterData(data, searchTerm, fields)
    result = sortData(result, sortField, sortDirection)
    return result
  }, [data, searchTerm, fields, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedData = processedData.slice(startIndex, startIndex + pageSize)

  // Selection handlers
  const handleSelectAll = React.useCallback((checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedData.map(item => String(item.id || '')))
      setSelectedRows(allIds)
    } else {
      setSelectedRows(new Set())
    }
  }, [paginatedData])

  const handleSelectRow = React.useCallback((id: string, checked: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(id)
      } else {
        newSet.delete(id)
      }
      return newSet
    })
  }, [])

  // Notify parent of selection changes (stable callback)
  const selectedRowsArray = React.useMemo(() => Array.from(selectedRows), [selectedRows])
  
  React.useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedRowsArray)
    }
  }, [selectedRowsArray, onSelectionChange])

  // Sorting handler
  const handleSort = React.useCallback((fieldKey: string) => {
    if (sortField === fieldKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortField(null)
        setSortDirection(null)
      } else {
        setSortDirection('asc')
      }
    } else {
      setSortField(fieldKey)
      setSortDirection('asc')
    }
  }, [sortField, sortDirection])

  // Column visibility
  const visibleFields = fields.filter((field: any) => !hiddenColumns.has(field.key))

  const isAllSelected = paginatedData.length > 0 && paginatedData.every(item => selectedRows.has(String(item.id || '')))
  const isSomeSelected = paginatedData.some(item => selectedRows.has(String(item.id || '')))

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex items-center py-4">
        <Input
          placeholder={`Filter ${objectDefinition.name?.toLowerCase() || 'records'}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {fields.map((field: any, index: number) => {
              if (!field.key) return null // Skip invalid fields
              return (
                <DropdownMenuCheckboxItem
                  key={field.key}
                  className="capitalize"
                  checked={!hiddenColumns.has(field.key)}
                  disabled={index === 0} // First column always visible
                  onCheckedChange={(checked) => {
                    setHiddenColumns(prev => {
                      const newSet = new Set(prev)
                      if (checked) {
                        newSet.delete(field.key)
                      } else {
                        newSet.add(field.key)
                      }
                      return newSet
                    })
                  }}
                >
                  {field.label || field.key}
                </DropdownMenuCheckboxItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Selection column */}
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected || (isSomeSelected && "indeterminate")}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              {/* Data columns */}
              {visibleFields.map((field: any) => (
                <TableHead key={field.key}>
                  <button
                    className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                    onClick={() => handleSort(field.key)}
                  >
                    <span>{field.label}</span>
                    {sortField === field.key && (
                      <span className="text-xs">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  {visibleFields.map((field: any) => (
                    <TableCell key={field.key}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => {
                const rowId = String(row.id || rowIndex)
                const isSelected = selectedRows.has(rowId)
                
                return (
                  <TableRow key={rowId} data-state={isSelected ? "selected" : undefined}>
                    {/* Selection cell */}
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectRow(rowId, !!checked)}
                        aria-label="Select row"
                      />
                    </TableCell>
                    {/* Data cells */}
                    {visibleFields.map((field: any, fieldIndex: number) => (
                      <TableCell key={field.key}>
                        {renderCell(
                          row[field.key as keyof typeof row],
                          field,
                          fieldIndex === 0,
                          onRowClick,
                          row
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={visibleFields.length + 1} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {selectedRows.size} of {processedData.length} row(s) selected.
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Page</p>
            <span className="text-sm font-medium">
              {currentPage} of {totalPages || 1}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
