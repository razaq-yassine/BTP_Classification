import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ObjectDefinition, GenericRecord, RelatedObjectDefinition } from '@/types/object-definition'
import { GenericDataTable } from './GenericDataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Plus, RefreshCw } from 'lucide-react'
import axios from 'axios'

interface GenericRelatedListViewProps {
  parentObjectDefinition: ObjectDefinition
  parentRecord: GenericRecord
  relatedObjectDefinition: RelatedObjectDefinition
  relatedObjectConfig: ObjectDefinition // Full config for the related object
  compact?: boolean
  showSearch?: boolean
  showAddButton?: boolean
  maxHeight?: string
}

export function GenericRelatedListView({ 
  parentObjectDefinition,
  parentRecord,
  relatedObjectDefinition,
  relatedObjectConfig,
  compact = true,
  showSearch = false,
  showAddButton = false,
  maxHeight = '400px'
}: GenericRelatedListViewProps) {
  const navigate = useNavigate()
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
      // This could be customized based on the relationship type
      let apiUrl = ''
      
      if (relatedObjectDefinition.apiEndpoint) {
        // Use custom endpoint if provided
        apiUrl = relatedObjectDefinition.apiEndpoint.replace('{parentId}', parentRecord.id.toString())
      } else {
        // Default: assume related objects are fetched via parent endpoint
        apiUrl = `${parentObjectDefinition.apiEndpoint}/${parentRecord.id}/${relatedObjectDefinition.key}/`
      }
      
      const response = await axios.get(apiUrl)
      
      // Handle different response formats
      const data = response.data.results || response.data[relatedObjectDefinition.key] || response.data
      setRecords(Array.isArray(data) ? data : [])
      
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to fetch related ${relatedObjectDefinition.label.toLowerCase()}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRecordClick = (record: GenericRecord) => {
    // Navigate to the related record's detail view if configured
    if (relatedObjectConfig.detailPath) {
      const detailPath = relatedObjectConfig.detailPath.replace('$customerId', record.id.toString())
      navigate({ to: detailPath })
    }
  }

  const handleRefresh = () => {
    fetchRelatedRecords()
  }

  const handleAddNew = () => {
    // Navigate to create new related record
    // This would need to be implemented based on your routing structure
    console.log('Add new', relatedObjectDefinition.label)
  }

  // Filter records based on search term
  const filteredRecords = records.filter(record => {
    if (!searchTerm) return true
    
    const searchFields = relatedObjectConfig.listView.searchFields || relatedObjectConfig.listView.fields
    return searchFields.some(fieldKey => {
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
        <GenericDataTable
          objectDefinition={relatedObjectConfig}
          records={filteredRecords}
          loading={loading}
          error={error}
          onRecordClick={handleRecordClick}
          compact={compact}
          sortable={true}
        />
      </div>
    </div>
  )
}
