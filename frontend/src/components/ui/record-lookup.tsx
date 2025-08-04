import { useState, useEffect, useCallback } from 'react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

import { Check, ChevronsUpDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import axios from 'axios'

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
  apiEndpoint
}: RecordLookupProps) {
  const [open, setOpen] = useState(false)
  const [records, setRecords] = useState<LookupRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<LookupRecord | null>(null)

  // Helper function to get display name from record
  const getRecordDisplayName = (record: LookupRecord): string => {
    return record.name || record.full_name || record.title || `Record ${record.id}` || 'Unknown'
  }

  // Generate dynamic placeholders based on searchBy field
  const dynamicPlaceholder = placeholder || `Search ${objectName.toLowerCase()}...`
  const dynamicSearchPlaceholder = searchPlaceholder || `Search by ${searchBy.replace('_', ' ')}...`

  // Construct API endpoint - use the object's API endpoint or construct from object name
  // Note: axios baseURL is already set to /api, so we don't need leading slash
  const endpoint = apiEndpoint || `${objectName.toLowerCase()}`

  // Fetch initial records (last 5 created)
  const fetchInitialRecords = useCallback(async () => {
    try {
      setLoading(true)
      console.log('Fetching initial records from:', endpoint)
      
      const response = await axios.get(endpoint)
      console.log('API Response:', response.data)
      
      // Handle different response structures
      let recordsData = []
      if (response.data.results) {
        recordsData = response.data.results
      } else if (Array.isArray(response.data)) {
        recordsData = response.data
      } else if (response.data.data) {
        recordsData = response.data.data
      } else if (response.data[objectName]) {
        // Handle {customers: Array(5), count: 5} structure
        recordsData = response.data[objectName]
      } else if (response.data[objectName.toLowerCase()]) {
        // Handle {customers: Array(5), count: 5} structure (lowercase)
        recordsData = response.data[objectName.toLowerCase()]
      }
      
      console.log('Processed records:', recordsData)
      setRecords(recordsData)
    } catch (error) {
      console.error('Failed to fetch initial records:', error)
      console.error('Endpoint:', endpoint)
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
        console.log('Searching records with query:', query, 'by field:', searchBy)
        
        // Use search endpoint with query parameter
        const searchEndpoint = `${endpoint}?search=${encodeURIComponent(query)}`
        const response = await axios.get(searchEndpoint)
        console.log('Search API Response:', response.data)
        
        // Handle different response structures
        let recordsData = []
        if (response.data.results) {
          recordsData = response.data.results
        } else if (Array.isArray(response.data)) {
          recordsData = response.data
        } else if (response.data.data) {
          recordsData = response.data.data
        } else if (response.data[objectName]) {
          // Handle {customers: Array(5), count: 5} structure
          recordsData = response.data[objectName]
        } else if (response.data[objectName.toLowerCase()]) {
          // Handle {customers: Array(5), count: 5} structure (lowercase)
          recordsData = response.data[objectName.toLowerCase()]
        }
        
        // Filter records client-side by the searchBy field if server doesn't filter
        if (recordsData.length > 0 && searchBy) {
          recordsData = recordsData.filter((record: LookupRecord) => {
            const fieldValue = record[searchBy]
            return fieldValue && String(fieldValue).toLowerCase().includes(query.toLowerCase())
          })
        }
        
        console.log('Processed search records:', recordsData)
        setRecords(recordsData)
      } catch (error) {
        console.error('Failed to search records:', error)
        console.error('Search endpoint:', endpoint, 'Query:', query)
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
          console.log('Fetching record by ID:', value)
          // Try different endpoint formats for fetching by ID
          let response
          try {
            // Try with trailing slash first
            response = await axios.get(`${endpoint}/${value}/`)
          } catch (error) {
            // Try without trailing slash
            response = await axios.get(`${endpoint}/${value}`)
          }
          
          console.log('Fetched record by ID:', response.data)
          setSelectedRecord(response.data)
        } catch (error) {
          console.error('Failed to fetch selected record:', error)
          console.error('Endpoint:', `${endpoint}/${value}`, 'Value:', value)
          
          // If fetching by ID fails, try to find it in the current records
          const existingRecord = records.find(r => r.id === value)
          if (existingRecord) {
            console.log('Found record in existing records:', existingRecord)
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
      console.log('Popover opened, loading initial records')
      setSearchQuery('') // Clear any previous search
      fetchInitialRecords()
    }
  }, [open, fetchInitialRecords])

  // Handle search input changes (only when popover is open)
  useEffect(() => {
    if (open) {
      if (searchQuery.trim()) {
        console.log('Search query changed:', searchQuery)
        setRecords([]) // Clear current records while searching
        searchRecords(searchQuery)
      } else {
        console.log('Search cleared, loading initial records')
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

  const renderRecordItem = (record: LookupRecord) => {
    return (
      <div className="flex flex-col">
        <span className="font-medium">{getRecordDisplayName(record)}</span>
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
    )
  }

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("justify-between flex-1", className)}
            disabled={disabled}
          >
            <div className="flex items-center gap-2 flex-1 text-left">
              <Search className="h-4 w-4 text-muted-foreground" />
              {selectedRecord ? (
                <span className="truncate">{getRecordDisplayName(selectedRecord)}</span>
              ) : (
                <span className="text-muted-foreground">{dynamicPlaceholder}</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
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
                          "mr-2 h-4 w-4",
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
