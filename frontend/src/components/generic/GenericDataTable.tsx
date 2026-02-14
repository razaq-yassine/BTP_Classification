"use client"

import * as React from "react"

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
import { evaluateFormula } from "@/utils/evaluateFormula"

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
  const pageSize = objectDefinition.listView?.pageSize ?? 20
  const [displayedCount, setDisplayedCount] = React.useState(pageSize)
  const loadMoreRef = React.useRef<HTMLDivElement>(null)

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

  // Infinite scroll: show first displayedCount rows, load more when scrolling to bottom
  const paginatedData = processedData.slice(0, displayedCount)
  const hasMore = displayedCount < processedData.length

  // Reset displayed count when data or filters change
  React.useEffect(() => {
    setDisplayedCount(pageSize)
  }, [processedData.length, searchTerm, sortField, sortDirection, pageSize])

  // IntersectionObserver for load-more on scroll
  React.useEffect(() => {
    if (!hasMore || isLoading) return
    const el = loadMoreRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore) {
          setDisplayedCount((prev) => Math.min(prev + pageSize, processedData.length))
        }
      },
      { rootMargin: '100px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, isLoading, pageSize, processedData.length])

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
                    field.type === 'number' && (field.render === 'currency' || field.render === 'percent')
                      ? 'text-center'
                      : field.type === 'boolean'
                        ? 'text-center'
                        : undefined
                  }
                >
                  <button
                    className={`flex items-center cursor-pointer hover:bg-muted/50 p-1 rounded ${
                      field.type === 'number' && (field.render === 'currency' || field.render === 'percent')
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
                      // Evaluate formula fields on the fly
                      let value = row[field.key as keyof typeof row]
                      if (field.type === 'formula' && field.formulaExpression) {
                        value = evaluateFormula(field.formulaExpression, row as any)
                      }
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
                            field.type === 'number' && (field.render === 'currency' || field.render === 'percent')
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

      {/* Load-more sentinel for infinite scroll */}
      {hasMore && paginatedData.length > 0 && (
        <div ref={loadMoreRef} className="h-4 flex items-center justify-center py-4">
          <span className="text-sm text-muted-foreground">Scroll for more...</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-sm text-muted-foreground">
          {selectedRows.size > 0
            ? `${selectedRows.size} of ${processedData.length} selected`
            : `Showing ${paginatedData.length} of ${processedData.length}`}
        </div>
      </div>
    </div>
  )
}
