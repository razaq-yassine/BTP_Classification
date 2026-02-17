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
import { StatisticsCards } from './StatisticsCards'
import { ListViewSwitcher } from './ListViewSwitcher'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Plus, Trash2 } from 'lucide-react'
import type { ListViewDefinition } from '@/types/object-definition'
import api from '@/services/api'
import { Main } from '@/components/layout/main'
import { isNetworkError } from '@/utils/handle-server-error'
import { trackRecentlyViewed, getRecentlyViewedIds } from '@/utils/recently-viewed'
import { useAuthStore, selectUser } from '@/stores/authStore'
import { usePermissions } from '@/hooks/usePermissions'
import { getObjectAvatarClasses, getObjectButtonClasses } from '@/utils/object-color'
import { cn } from '@/lib/utils'

interface GenericListViewProps {
  objectDefinition: ObjectDefinition
  basePath?: string
}

// Helper to get/set active view from localStorage
function getStoredViewKey(objectName: string): string | null {
  try {
    return localStorage.getItem(`listView_${objectName}`)
  } catch {
    return null
  }
}

function setStoredViewKey(objectName: string, viewKey: string): void {
  try {
    localStorage.setItem(`listView_${objectName}`, viewKey)
  } catch {
    // Ignore localStorage errors
  }
}

// Helper to get/set pinned (default) view from localStorage
function getPinnedViewKey(objectName: string): string | null {
  try {
    return localStorage.getItem(`listViewPinned_${objectName}`)
  } catch {
    return null
  }
}

function setPinnedViewKey(objectName: string, viewKey: string | null): void {
  try {
    if (viewKey) {
      localStorage.setItem(`listViewPinned_${objectName}`, viewKey)
    } else {
      localStorage.removeItem(`listViewPinned_${objectName}`)
    }
  } catch {
    // Ignore localStorage errors
  }
}

export function GenericListView({ objectDefinition, basePath }: GenericListViewProps) {
  const navigate = useNavigate()
  const user = useAuthStore(selectUser)
  const { canCreate, canDelete, isFieldVisible } = usePermissions()
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

  // Determine active view
  const views = objectDefinition.listView?.views
  const hasMultipleViews = views && views.length > 1
  const metadataDefaultView = objectDefinition.listView?.defaultView || (views?.[0]?.key)
  const pinnedViewKey = getPinnedViewKey(objectDefinition.name)
  const storedViewKey = getStoredViewKey(objectDefinition.name)
  const defaultViewKey = pinnedViewKey || metadataDefaultView || (views?.[0]?.key)
  const [activeViewKey, setActiveViewKey] = useState<string>(
    storedViewKey || defaultViewKey || ''
  )
  const [pinnedView, setPinnedView] = useState<string | null>(pinnedViewKey)

  // Get active view configuration
  const activeView: ListViewDefinition | undefined = views?.find((v) => v.key === activeViewKey)
  const baseListView = activeView || {
    fields: objectDefinition.listView?.fields || [],
    defaultSort: objectDefinition.listView?.defaultSort,
    defaultSortOrder: objectDefinition.listView?.defaultSortOrder,
    pageSize: objectDefinition.listView?.pageSize,
    statistics: objectDefinition.listView?.statistics,
  } as ListViewDefinition
  
  // Filter fields based on permissions
  const currentListView: ListViewDefinition = {
    ...baseListView,
    fields: baseListView.fields.filter((field) => {
      const fieldKey = typeof field === 'string' ? field : field.key
      return isFieldVisible(objectDefinition.name, fieldKey)
    }) as ListViewDefinition['fields'],
  }

  // Debounce search to avoid refetch on every keystroke (prevents focus loss)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const prevObjectName = useRef<string | null>(null)
  const prevViewKey = useRef<string | null>(null)
  
  useEffect(() => {
    if (prevObjectName.current !== objectDefinition.name) {
      initialLoadDone.current = false
      prevObjectName.current = objectDefinition.name
      // Reset to stored/pinned/default view when switching objects
      const stored = getStoredViewKey(objectDefinition.name)
      const pinned = getPinnedViewKey(objectDefinition.name)
      const defaultKey = pinned || objectDefinition.listView?.defaultView || (views?.[0]?.key)
      setActiveViewKey(stored || defaultKey || '')
      setPinnedView(pinned)
    }
    if (prevViewKey.current !== activeViewKey) {
      prevViewKey.current = activeViewKey
      initialLoadDone.current = false
    }
    fetchRecords()
  }, [objectDefinition, debouncedSearch, activeViewKey])

  const fetchRecords = async () => {
    try {
      if (!initialLoadDone.current) {
        setLoading(true)
      }
      setError(null)
      
      // Handle recently viewed view type
      if (activeView?.type === 'recentlyViewed') {
        const recentIds = getRecentlyViewedIds(objectDefinition.name, user?.id)
        if (recentIds.length === 0) {
          setRecords([])
          setLoading(false)
          initialLoadDone.current = true
          return
        }
        // Fetch records by IDs
        const endpoint = objectDefinition.apiEndpoint.endsWith('/') 
          ? objectDefinition.apiEndpoint.slice(0, -1) 
          : objectDefinition.apiEndpoint
        
        const fieldsToFetch = ['id']
        if (currentListView.fields) {
          currentListView.fields.forEach(field => {
            const fieldKey = typeof field === 'string' ? field : field.key
            if (fieldKey && !fieldsToFetch.includes(fieldKey)) {
              fieldsToFetch.push(fieldKey)
            }
          })
        }
        
        const queryParams = new URLSearchParams()
        queryParams.append('ids', recentIds.join(','))
        if (fieldsToFetch.length > 1) {
          queryParams.append('fields', fieldsToFetch.join(','))
        }
        
        const fullEndpoint = `${endpoint}?${queryParams.toString()}`
        const response = await api.get(fullEndpoint)
        
        const responseKey = pluralize(objectDefinition.name)
        let fetchedRecords = Array.isArray(response.data)
          ? response.data
          : response.data?.[responseKey] ?? response.data?.results ?? response.data ?? []
        
        // Sort by recently viewed order
        const idOrder = new Map(recentIds.map((id, idx) => [id, idx]))
        fetchedRecords.sort((a: GenericRecord, b: GenericRecord) => {
          const aIdx = idOrder.get(String(a.id)) ?? Infinity
          const bIdx = idOrder.get(String(b.id)) ?? Infinity
          return aIdx - bIdx
        })
        
        setRecords(fetchedRecords)
        setLoading(false)
        initialLoadDone.current = true
        return
      }
      
      // Standard fetch with filters
      const endpoint = objectDefinition.apiEndpoint.endsWith('/') 
        ? objectDefinition.apiEndpoint.slice(0, -1) 
        : objectDefinition.apiEndpoint
      
      // Extract field keys from current view configuration
      const fieldsToFetch = ['id'] // Always include ID for navigation
      
      if (currentListView.fields) {
        currentListView.fields.forEach(field => {
          const fieldKey = typeof field === 'string' ? field : field.key
          if (fieldKey && !fieldsToFetch.includes(fieldKey)) {
            fieldsToFetch.push(fieldKey)
          }
        })
      }
      
      // Build query parameters
      const queryParams = new URLSearchParams()
      if (fieldsToFetch.length > 1) { // More than just 'id'
        queryParams.append('fields', fieldsToFetch.join(','))
      }
      const pageSize = Math.max(currentListView.pageSize ?? objectDefinition.listView?.pageSize ?? 50, 50)
      queryParams.append('size', String(pageSize))
      if (debouncedSearch.trim()) {
        queryParams.append('search', debouncedSearch.trim())
      }
      
      // Apply filters from view configuration
      if (activeView?.filters) {
        queryParams.append('filters', JSON.stringify(activeView.filters))
      }
      
      // Apply default sort from view
      const sortField = currentListView.defaultSort || objectDefinition.listView?.defaultSort
      const sortOrder = currentListView.defaultSortOrder || objectDefinition.listView?.defaultSortOrder
      if (sortField) {
        queryParams.append('sort', sortField)
        if (sortOrder) {
          queryParams.append('order', sortOrder)
        }
      }
      
      const fullEndpoint = `${endpoint}?${queryParams.toString()}`
      
      const response = await api.get(fullEndpoint)
      
      const responseKey = pluralize(objectDefinition.name)
      let records = Array.isArray(response.data)
        ? response.data
        : response.data?.[responseKey] ?? response.data?.results ?? response.data ?? []
      
      // Apply client-side filtering (backend doesn't support filters query param)
      if (activeView?.filters) {
        records = applyClientSideFilters(records, activeView.filters)
      }
      
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

  // Helper to apply client-side filters (fallback when server doesn't support filters)
  const applyClientSideFilters = (records: GenericRecord[], filters: Record<string, any>): GenericRecord[] => {
    return records.filter((record) => {
      for (const [field, condition] of Object.entries(filters)) {
        const value = record[field]
        const valueStr = String(value ?? '').toUpperCase()
        
        if (condition && typeof condition === 'object') {
          if (condition.$in && Array.isArray(condition.$in)) {
            // Case-insensitive comparison for $in
            const conditionValues = condition.$in.map((v: any) => String(v).toUpperCase())
            if (!conditionValues.includes(valueStr)) return false
          } else if (condition.$eq !== undefined) {
            // Case-insensitive comparison for $eq
            if (valueStr !== String(condition.$eq).toUpperCase()) return false
          } else if (condition.$ne !== undefined) {
            // Case-insensitive comparison for $ne
            if (valueStr === String(condition.$ne).toUpperCase()) return false
          }
        } else {
          // Case-insensitive comparison for direct value
          if (valueStr !== String(condition).toUpperCase()) return false
        }
      }
      return true
    })
  }

  const handleViewChange = (viewKey: string) => {
    setActiveViewKey(viewKey)
    setStoredViewKey(objectDefinition.name, viewKey)
  }

  const handlePinChange = (viewKey: string | null) => {
    setPinnedView(viewKey)
    setPinnedViewKey(objectDefinition.name, viewKey)
    if (viewKey) {
      setActiveViewKey(viewKey)
      setStoredViewKey(objectDefinition.name, viewKey)
    }
  }

  const handleViewRecord = (record: GenericRecord) => {
    // Track recently viewed
    trackRecentlyViewed(objectDefinition.name, record.id, user?.id)

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
      <Main className="px-2 sm:px-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:flex-1 sm:min-w-0">
            {hasMultipleViews ? (
              <ListViewSwitcher
                objectIcon={objectDefinition.icon}
                objectColor={objectDefinition.color}
                views={views!}
                activeViewKey={activeViewKey}
                recordCount={records.length}
                onViewChange={handleViewChange}
                pinnedViewKey={pinnedView}
                onPinChange={handlePinChange}
              />
            ) : (
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={cn("flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full", getObjectAvatarClasses(objectDefinition.color))}>
                    {(() => {
                      const Icon = objectDefinition.icon
                      return Icon ? (
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <div className="h-4 w-4 sm:h-5 sm:w-5 rounded bg-primary-foreground/30" />
                      )
                    })()}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg sm:text-2xl font-bold tracking-tight truncate">
                      {views?.[0]?.label ?? objectDefinition.labelPlural}
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {records.length === 1 ? '1 item' : `${records.length} items`}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-1.5 shrink-0 sm:hidden">
              {selectedIds.length > 0 && canDelete(objectDefinition.name) && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              {canCreate(objectDefinition.name) && (
                <Button size="icon" className={cn("h-8 w-8", getObjectButtonClasses(objectDefinition.color))} onClick={handleAddRecord}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1 sm:max-w-sm">
            <Input
              placeholder={`Search...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 sm:h-10 min-w-0 flex-1"
            />
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              {selectedIds.length > 0 && canDelete(objectDefinition.name) && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''}
                </Button>
              )}
              {canCreate(objectDefinition.name) && (
                <Button size="sm" className={getObjectButtonClasses(objectDefinition.color)} onClick={handleAddRecord}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add {objectDefinition.label}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {(currentListView.statistics || objectDefinition.listView?.statistics) && (
          <StatisticsCards
            statistics={currentListView.statistics || objectDefinition.listView?.statistics || []}
            records={records}
          />
        )}

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
              key={`${objectDefinition.name}-${activeViewKey}-${deleteCounter}`}
              data={records}
              objectDefinition={{
                ...objectDefinition,
                listView: {
                  ...objectDefinition.listView,
                  fields: currentListView.fields,
                  defaultSort: currentListView.defaultSort,
                  defaultSortOrder: currentListView.defaultSortOrder,
                  pageSize: currentListView.pageSize,
                },
              }}
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
