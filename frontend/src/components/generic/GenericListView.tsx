import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ObjectDefinition, GenericRecord } from '@/types/object-definition'
import { pluralize } from '@/metadata/utils'
import { getObjectDefinition } from '@/metadata/loader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GenericDataTable } from './GenericDataTable'
import { GenericListViewSkeleton } from './GenericListViewSkeleton'
import { GenericCreateDialog } from './GenericCreateDialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
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
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteCounter, setDeleteCounter] = useState(0)
  const initialLoadDone = useRef(false)

  // Debounce search to avoid refetch on every keystroke (prevents focus loss)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const prevObjectName = useRef<string | null>(null)
  useEffect(() => {
    if (prevObjectName.current !== objectDefinition.name) {
      initialLoadDone.current = false
      prevObjectName.current = objectDefinition.name
    }
    fetchRecords()
  }, [objectDefinition, debouncedSearch])

  const fetchRecords = async () => {
    try {
      if (!initialLoadDone.current) {
        setLoading(true)
      }
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
      const pageSize = Math.max(objectDefinition.listView?.pageSize ?? 50, 50)
      queryParams.append('size', String(pageSize))
      if (debouncedSearch.trim()) {
        queryParams.append('search', debouncedSearch.trim())
      }
      
      const fullEndpoint = `${endpoint}?${queryParams.toString()}`
      
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
      initialLoadDone.current = true
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

  const handleReferenceClick = useCallback(
    async (objectName: string, id: string | number) => {
      const def = await getObjectDefinition(objectName)
      if (!def?.detailPath) return
      const idPlaceholder = `$${objectName}Id`
      const detailPath = def.detailPath.replace(idPlaceholder, String(id))
      navigate({ to: detailPath })
    },
    [navigate]
  )

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

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    setDeleting(true)
    try {
      const endpoint = objectDefinition.apiEndpoint.endsWith('/')
        ? objectDefinition.apiEndpoint.slice(0, -1)
        : objectDefinition.apiEndpoint
      await Promise.all(selectedIds.map((id) => api.delete(`${endpoint}/${id}`)))
      setSelectedIds([])
      setDeleteCounter((c) => c + 1)
      fetchRecords()
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to delete'
      setError(msg)
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  if (loading && !initialLoadDone.current) {
    return <GenericListViewSkeleton />
  }

  return (
    <>
      <Main className="px-4">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold tracking-tight shrink-0">
            {objectDefinition.labelPlural}
            <span className="text-muted-foreground font-normal ml-2">
              ({records.length})
            </span>
          </h1>
          <Input
            placeholder={`Search ${objectDefinition.labelPlural.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm flex-1"
          />
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
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
              key={`${objectDefinition.name}-${deleteCounter}`}
              data={records}
              objectDefinition={objectDefinition}
              isLoading={loading}
              onRowClick={handleViewRecord}
              onSelectionChange={handleTableSelectionChange}
              onReferenceClick={handleReferenceClick}
              searchTerm={searchTerm}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete selected items?"
        desc={`Are you sure you want to delete ${selectedIds.length} item${selectedIds.length > 1 ? 's' : ''}? This cannot be undone.`}
        confirmText="Delete"
        destructive
        isLoading={deleting}
        handleConfirm={handleDeleteSelected}
      />
    </>
  )
}
