import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ObjectDefinition, GenericRecord } from '@/types/object-definition'
import { pluralize } from '@/metadata/utils'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GenericDataTable } from './GenericDataTable'
import { GenericListViewSkeleton } from './GenericListViewSkeleton'
import { GenericCreateDialog } from './GenericCreateDialog'
import { Plus, Trash2 } from 'lucide-react'
import api from '@/services/api'
import { Main } from '@/components/layout/main'
import { isNetworkError } from '@/utils/handle-server-error'

interface GenericListViewProps {
  objectDefinition: ObjectDefinition
  basePath?: string
}

export function GenericListView({ objectDefinition, basePath }: GenericListViewProps) {
  const navigate = useNavigate()
  const [records, setRecords] = useState<GenericRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    fetchRecords()
  }, [objectDefinition])

  const fetchRecords = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Ensure the endpoint doesn't have a trailing slash
      const endpoint = objectDefinition.apiEndpoint.endsWith('/') 
        ? objectDefinition.apiEndpoint.slice(0, -1) 
        : objectDefinition.apiEndpoint
      
      // Extract field keys from listView configuration to optimize API call
      const fieldsToFetch = ['id'] // Always include ID for navigation
      
      if (objectDefinition.listView?.fields) {
        objectDefinition.listView.fields.forEach(field => {
          const fieldKey = typeof field === 'string' ? field : field.key
          if (fieldKey && !fieldsToFetch.includes(fieldKey)) {
            fieldsToFetch.push(fieldKey)
          }
        })
      }
      
      // Build query parameters to only fetch required fields
      const queryParams = new URLSearchParams()
      if (fieldsToFetch.length > 1) { // More than just 'id'
        queryParams.append('fields', fieldsToFetch.join(','))
      }
      
      const fullEndpoint = queryParams.toString() 
        ? `${endpoint}?${queryParams.toString()}`
        : endpoint
      
      const response = await api.get(fullEndpoint)
      
      const responseKey = pluralize(objectDefinition.name)
      const records = Array.isArray(response.data)
        ? response.data
        : response.data?.[responseKey] ?? response.data?.results ?? response.data ?? []
      setRecords(records)
    } catch (err: any) {
      const msg = isNetworkError(err)
        ? 'Connection lost. Please wait and try again.'
        : err.response?.data?.message || err.response?.data?.error || `Failed to fetch ${objectDefinition.labelPlural.toLowerCase()}`
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleViewRecord = (record: GenericRecord) => {
    if (objectDefinition.detailPath) {
      const idPlaceholder = `$${objectDefinition.name}Id`
      const detailPath = objectDefinition.detailPath.replace(idPlaceholder, record.id.toString())
      navigate({ to: detailPath })
    } else if (basePath) {
      navigate({ to: `${basePath}/${record.id}` })
    }
  }

  const handleAddRecord = () => {
    setShowCreateDialog(true)
  }

  const handleRecordCreated = (newRecord: GenericRecord) => {
    // Add the new record to the list
    setRecords(prev => [newRecord, ...prev])
    // Optionally refresh the entire list to get updated data
    fetchRecords()
  }



  const handleTableSelectionChange = (ids: string[]) => {
    setSelectedIds(ids)
  }

  if (loading) {
    return <GenericListViewSkeleton />
  }

  return (
    <>
      <Main className="px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{objectDefinition.labelPlural}</h1>
            <p className="text-muted-foreground">
              {records.length} {objectDefinition.labelPlural.toLowerCase()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <Button 
                variant="destructive" 
                onClick={() => {
                  // TODO: Implement delete functionality
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''}
              </Button>
            )}
            <Button onClick={handleAddRecord}>
              <Plus className="mr-2 h-4 w-4" />
              Add {objectDefinition.label}
            </Button>
          </div>
        </div>
        
        <div className='flex-1 overflow-auto'>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between gap-4">
                {error}
                {error.includes('Connection lost') && (
                  <Button variant="outline" size="sm" onClick={() => fetchRecords()}>
                    Retry
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          ) : (
            <GenericDataTable
              data={records}
              objectDefinition={objectDefinition}
              isLoading={loading}
              onRowClick={handleViewRecord}
              onSelectionChange={handleTableSelectionChange}
            />
          )}
        </div>
      </Main>
      
      {/* Create Dialog */}
      <GenericCreateDialog
        objectDefinition={objectDefinition}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onRecordCreated={handleRecordCreated}
      />
    </>
  )
}
