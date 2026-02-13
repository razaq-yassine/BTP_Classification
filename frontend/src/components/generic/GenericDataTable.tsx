"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { ListViewFieldFormatter } from "@/components/generic/ListViewFieldFormatter"

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
  onReferenceClick?: (objectName: string, id: string | number) => void
  searchTerm?: string
}

function filterData<T>(data: T[], searchTerm: string, fields: { key: string }[]): T[] {
  if (!searchTerm.trim()) return data
  const lowerSearch = searchTerm.toLowerCase()
  return data.filter((item) =>
    fields.some((field) => {
      const value = (item as Record<string, unknown>)[field.key]
      return value != null && String(value).toLowerCase().includes(lowerSearch)
    })
  )
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

export function GenericDataTable<TData extends GenericRecord>({
  data,
  objectDefinition,
  isLoading = false,
  onRowClick,
  onSelectionChange,
  onReferenceClick,
  searchTerm = '',
}: GenericDataTableProps<TData>) {
  // Simple state management
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set())
  const [sortField, setSortField] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc' | null>(null)
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = objectDefinition.listView?.pageSize ?? 10

  // Get fields from object configuration (include options, format, render for formatter)
  const fields = React.useMemo(() => {
    const listViewFields = objectDefinition.listView?.fields || []
    return listViewFields.map((field: any) => ({
      key: typeof field === 'string' ? field : field.key,
      label: typeof field === 'string' ? field : field.label || field.key,
      type: typeof field === 'string' ? 'text' : field.type || 'text',
      sortable: typeof field === 'string' ? true : field.sortable !== false,
      options: typeof field === 'object' ? field.options : undefined,
      format: typeof field === 'object' ? field.format : undefined,
      render: typeof field === 'object' ? (field.renderType ?? (typeof field.render === 'string' ? field.render : undefined)) : undefined,
      objectName: typeof field === 'object' ? field.objectName : undefined,
    }))
  }, [objectDefinition.listView?.fields])

  // Process data: client-side filter (fallback when server search fails) + sort
  const processedData = React.useMemo(() => {
    const filtered = filterData(data, searchTerm, fields)
    return sortData(filtered, sortField, sortDirection)
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

  const isAllSelected = paginatedData.length > 0 && paginatedData.every(item => selectedRows.has(String(item.id || '')))
  const isSomeSelected = paginatedData.some(item => selectedRows.has(String(item.id || '')))

  return (
    <div className="w-full">
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
              {fields.map((field: any) => (
                <TableHead
                  key={field.key}
                  className={
                    field.type === 'number' && field.render === 'currency'
                      ? 'text-center'
                      : field.type === 'boolean'
                        ? 'text-center'
                        : undefined
                  }
                >
                  <button
                    className={`flex items-center cursor-pointer hover:bg-muted/50 p-1 rounded ${
                      field.type === 'number' && field.render === 'currency'
                        ? 'justify-center w-full'
                        : field.type === 'boolean'
                          ? 'justify-center w-full'
                          : 'space-x-2'
                    }`}
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
                  {fields.map((field: any) => (
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
                    {fields.map((field: any, fieldIndex: number) => {
                      const value = row[field.key as keyof typeof row]
                      const cellContent = (
                        <ListViewFieldFormatter
                          type={field.type}
                          value={value}
                          format={field.format}
                          options={field.options}
                          render={field.render}
                          objectName={field.objectName}
                          onReferenceClick={onReferenceClick}
                        />
                      )
                      const isFirstColumn = fieldIndex === 0
                      const wrapped =
                        isFirstColumn && onRowClick && row ? (
                          <button
                            className="text-left w-full cursor-pointer hover:underline font-medium"
                            onClick={() => onRowClick(row)}
                          >
                            {cellContent}
                          </button>
                        ) : (
                          cellContent
                        )
                      return (
                        <TableCell
                          key={field.key}
                          className={
                            field.type === 'number' && field.render === 'currency'
                              ? 'text-center'
                              : field.type === 'boolean'
                                ? 'text-center'
                                : undefined
                          }
                        >
                          {wrapped}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={fields.length + 1} className="h-24 text-center">
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
