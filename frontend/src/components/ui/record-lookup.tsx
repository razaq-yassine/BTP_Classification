import { useState, useEffect, useCallback } from 'react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

import { Check, ChevronsUpDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/services/api'
import { pluralize } from '@/metadata/utils'
import { useObjectDefinition } from '@/hooks/useObjectDefinition'
import { sortByRecentlyViewed } from '@/utils/recently-viewed'

// Simple debounce implementation to avoid lodash dependency
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export interface LookupRecord {
  id: string | number
  name?: string
  full_name?: string
  title?: string
  [key: string]: any // For additional fields
}

interface AdditionalField {
  key: string
  label: string
}

interface RecordLookupProps {
  objectName: string
  value?: string | number
  onValueChange: (value: string | number | null, record?: LookupRecord) => void
  additionalFields?: AdditionalField[]
  searchBy?: string // Field to search by (e.g., 'full_name', 'name', 'title')
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
  emptyMessage?: string
  apiEndpoint?: string // Optional custom endpoint
  userId?: number | null // Current user ID for user-specific recently viewed sorting
}

export function RecordLookup({
  objectName,
  value,
  onValueChange,
  additionalFields = [],
  searchBy = 'name', // Default to 'name' field
  placeholder,
  searchPlaceholder,
  disabled = false,
  className,
  emptyMessage = "No records found.",
  apiEndpoint,
  userId
}: RecordLookupProps) {
  const [open, setOpen] = useState(false)
  const [records, setRecords] = useState<LookupRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<LookupRecord | null>(null)

  const { definition } = useObjectDefinition(objectName)
  const ObjectIcon = definition?.icon

  // Helper function to get display name from record
  const getRecordDisplayName = (record: LookupRecord): string => {
    return record.name || record.fullName || record.full_name || record.title || (record.id != null ? `Record ${record.id}` : 'Unknown')
  }

  // Generate dynamic placeholders based on searchBy field
  const dynamicPlaceholder = placeholder || `Search ${objectName.toLowerCase()}...`
  const dynamicSearchPlaceholder = searchPlaceholder || `Search by ${searchBy.replace('_', ' ')}...`

  // Construct API endpoint - use the object's API endpoint or construct from object name
  const endpoint = apiEndpoint || `/api/${pluralize(objectName)}`

  // Fetch initial records (last 5 created)
  const fetchInitialRecords = useCallback(async () => {
    try {
      setLoading(true)
      
      const response = await api.get(endpoint)
      
      const responseKey = pluralize(objectName)
      let recordsData = response.data?.results ?? response.data?.[responseKey] ?? (Array.isArray(response.data) ? response.data : response.data?.data) ?? []
      
      // Sort by recently viewed (most recent first)
      recordsData = sortByRecentlyViewed(recordsData, objectName, userId)
      
      setRecords(recordsData)
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [endpoint, objectName])

  // Search records with debouncing
  const searchRecords = useCallback(
    debounce(async (query: string) => {
      try {
        setLoading(true)
        
        // Use search endpoint with query parameter
        const searchEndpoint = `${endpoint}?search=${encodeURIComponent(query)}`
        const response = await api.get(searchEndpoint)
        
        const responseKey = pluralize(objectName)
        let recordsData = response.data?.results ?? response.data?.[responseKey] ?? (Array.isArray(response.data) ? response.data : response.data?.data) ?? []
        
        // Filter records client-side by the searchBy field if server doesn't filter
        if (recordsData.length > 0 && searchBy) {
          recordsData = recordsData.filter((record: LookupRecord) => {
            const fieldValue = record[searchBy]
            return fieldValue && String(fieldValue).toLowerCase().includes(query.toLowerCase())
          })
        }
        
        // Sort by recently viewed (most recent first)
        recordsData = sortByRecentlyViewed(recordsData, objectName, userId)
        
        setRecords(recordsData)
      } catch {
        setRecords([])
      } finally {
        setLoading(false)
      }
    }, 300),
    [endpoint, objectName, searchBy]
  )

  // Fetch selected record details if value exists
  useEffect(() => {
    if (value && !selectedRecord) {
      const fetchSelectedRecord = async () => {
        try {
          // Try different endpoint formats for fetching by ID
          let response
          try {
            // Try with trailing slash first
            response = await api.get(`${endpoint}/${value}/`)
          } catch (error) {
            // Try without trailing slash
            response = await api.get(`${endpoint}/${value}`)
          }
          
          setSelectedRecord(response.data)
        } catch {
          // If fetching by ID fails, try to find it in the current records
          const existingRecord = records.find(r => r.id === value)
          if (existingRecord) {
            setSelectedRecord(existingRecord)
          }
        }
      }
      fetchSelectedRecord()
    }
  }, [value, endpoint, selectedRecord, records])

  // Load initial records when popover opens
  useEffect(() => {
    if (open) {
      setSearchQuery('') // Clear any previous search
      fetchInitialRecords()
    }
  }, [open, fetchInitialRecords])

  // Handle search input changes (only when popover is open)
  useEffect(() => {
    if (open) {
      if (searchQuery.trim()) {
        setRecords([]) // Clear current records while searching
        searchRecords(searchQuery)
      } else {
        fetchInitialRecords()
      }
    }
  }, [searchQuery, open, fetchInitialRecords, searchRecords])

  const handleSelect = (record: LookupRecord) => {
    setSelectedRecord(record)
    onValueChange(record.id, record)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedRecord(null)
    onValueChange(null)
  }

  const renderRecordItem = (record: LookupRecord, showIcon = true) => {
    return (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {showIcon && ObjectIcon && (
          <ObjectIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <div className="flex flex-col min-w-0">
          <span className="font-medium truncate">{getRecordDisplayName(record)}</span>
          {additionalFields.length > 0 && (
            <div className="flex gap-2 mt-1 flex-wrap">
              {additionalFields.map((field) => (
                record[field.key] && (
                  <span key={field.key} className="text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded">
                    {field.label}: {String(record[field.key])}
                  </span>
                )
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2 w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("justify-between flex-1 w-full", className)}
            disabled={disabled}
          >
            <div className="flex items-center gap-2 flex-1 text-left min-w-0">
              {selectedRecord && ObjectIcon ? (
                <ObjectIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              {selectedRecord ? (
                <span className="truncate">{getRecordDisplayName(selectedRecord)}</span>
              ) : (
                <span className="text-muted-foreground">{dynamicPlaceholder}</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[16rem] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder={dynamicSearchPlaceholder}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Searching...
                </div>
              ) : records.length === 0 ? (
                <CommandEmpty>{emptyMessage}</CommandEmpty>
              ) : (
                <CommandGroup>
                  {records.map((record) => (
                    <CommandItem
                      key={record.id}
                      value={getRecordDisplayName(record)}
                      onSelect={() => handleSelect(record)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          value === record.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {renderRecordItem(record)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedRecord && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleClear}
          disabled={disabled}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
