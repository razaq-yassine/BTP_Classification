import { useState, useEffect } from 'react'
import { RelatedObjectDefinition, GenericRecord } from '@/types/object-definition'
import { pluralize } from '@/metadata/utils'
import { GenericDataTable } from './GenericDataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Plus, RefreshCw } from 'lucide-react'
import api from '@/services/api'

interface GenericRelatedListViewProps {
  parentRecord: GenericRecord
  relatedObjectDefinition: RelatedObjectDefinition
  showSearch?: boolean
  showAddButton?: boolean
  maxHeight?: string
}

export function GenericRelatedListView({ 
  parentRecord,
  relatedObjectDefinition,
  showSearch = true,
  showAddButton = true,
  maxHeight = '400px'
}: GenericRelatedListViewProps) {
  const [records, setRecords] = useState<GenericRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchRelatedRecords()
  }, [parentRecord, relatedObjectDefinition])

  const fetchRelatedRecords = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Build the API endpoint for related data
      // Use the endpoint from the related object definition
      const baseEndpoint = relatedObjectDefinition.apiEndpoint.endsWith('/') 
        ? relatedObjectDefinition.apiEndpoint.slice(0, -1) 
        : relatedObjectDefinition.apiEndpoint
        
      const apiUrl = `${baseEndpoint}/${parentRecord.id}`
      
      const response = await api.get(apiUrl)
      const responseKey = pluralize(relatedObjectDefinition.objectDefinition)
      const data = response.data?.[responseKey] ?? response.data?.results ?? response.data
      const processedRecords = Array.isArray(data) ? data : []
      
      setRecords(processedRecords)
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || `Failed to fetch related ${relatedObjectDefinition.label.toLowerCase()}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRecordClick = (_record: GenericRecord) => {
    // TODO: Navigate to the related record's detail view
  }

  const handleRefresh = () => {
    fetchRelatedRecords()
  }

  const handleAddNew = () => {
    // TODO: Navigate to create new related record
  }

  // Filter records based on search term
  const filteredRecords = records.filter(record => {
    if (!searchTerm) return true
    
    // Use the fields from the related object definition
    const searchFields = relatedObjectDefinition.fields
      .filter(f => f.searchable)
      .map(f => f.key)
    
    return searchFields.some((fieldKey: string) => {
      const value = record[fieldKey]
      return value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    })
  })

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{relatedObjectDefinition.label}</h3>
          <span className="text-xs text-muted-foreground">({records.length})</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          {showAddButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddNew}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${relatedObjectDefinition.label.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8"
          />
        </div>
      )}

      {/* Data Table */}
      <div style={{ maxHeight }} className="overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <span>Loading...</span>
          </div>
        ) : error ? (
          <div className="text-red-500 py-4">{error}</div>
        ) : (
          <GenericDataTable
            data={filteredRecords}
            objectDefinition={{
              name: relatedObjectDefinition.name,
              label: relatedObjectDefinition.label,
              labelPlural: relatedObjectDefinition.labelPlural,
              listView: {
                fields: relatedObjectDefinition.fields,
                defaultSort: relatedObjectDefinition.defaultSort,
                defaultSortOrder: relatedObjectDefinition.defaultSortOrder,
                pageSize: relatedObjectDefinition.pageSize
              },
              permissions: relatedObjectDefinition.permissions
            } as any}
            isLoading={loading}
            onRowClick={handleRecordClick}
          />
        )}
      </div>
    </div>
  )
}
