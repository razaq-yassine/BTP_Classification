import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { RelatedObjectDefinition, GenericRecord, ObjectDefinition } from '@/types/object-definition'
import { getObjectDefinition } from '@/metadata/loader'
import { cn } from '@/lib/utils'
import { pluralize } from '@/metadata/utils'
import { translateObjectLabel } from '@/utils/translateMetadata'
import { GenericDataTable } from './GenericDataTable'
import { GenericCreateDialog } from './GenericCreateDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Search, Plus, RefreshCw, ChevronDown } from 'lucide-react'
import api from '@/services/api'
import { isNetworkError } from '@/utils/handle-server-error'

interface GenericRelatedListViewProps {
  parentRecord: GenericRecord
  relatedObjectDefinition: RelatedObjectDefinition
  showSearch?: boolean
  showAddButton?: boolean
  maxHeight?: string
  /** When true, renders in a collapsible section with header (name + buttons), no search */
  collapsible?: boolean
}

export function GenericRelatedListView({ 
  parentRecord,
  relatedObjectDefinition,
  showSearch = true,
  showAddButton = true,
  maxHeight = '400px',
  collapsible = false
}: GenericRelatedListViewProps) {
  const { t } = useTranslation(['common', 'errors'])
  const navigate = useNavigate()
  const [records, setRecords] = useState<GenericRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [relatedObjectDef, setRelatedObjectDef] = useState<ObjectDefinition | null>(null)

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
      const msg = isNetworkError(err)
        ? t('errors:connectionLost')
        : err.response?.data?.detail || err.response?.data?.message || t('errors:failedToFetchRelated', { object: relatedObjectDefinition.label.toLowerCase() })
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleRecordClick = async (record: GenericRecord) => {
    const def = await getObjectDefinition(relatedObjectDefinition.objectDefinition)
    if (!def?.detailPath) return
    const idPlaceholder = `$${relatedObjectDefinition.objectDefinition}Id`
    const detailPath = def.detailPath.replace(idPlaceholder, String(record.id))
    navigate({ to: detailPath })
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

  const handleRefresh = () => {
    fetchRelatedRecords()
  }

  const handleAddNew = async () => {
    try {
      const def = await getObjectDefinition(relatedObjectDefinition.objectDefinition)
      if (!def) return
      setRelatedObjectDef(def)
      setCreateDialogOpen(true)
    } catch {
      // Object definition not found
    }
  }

  const handleRecordCreated = () => {
    fetchRelatedRecords()
  }

  // Build initial values from parent: foreignKey "customer.id" -> { customer: parentRecord.id }
  const getCreateInitialValues = useCallback((): Record<string, any> => {
    const fkMatch = relatedObjectDefinition.foreignKey?.match(/^(\w+)\.id$/)
    const parentField = fkMatch ? fkMatch[1] : null
    if (!parentField || !parentRecord?.id) return {}
    const initial: Record<string, any> = { [parentField]: parentRecord.id }
    // When parent is tenant, also pre-fill organization if available
    if (parentField === 'tenant' && parentRecord.organizationId != null) {
      initial.organization = parentRecord.organizationId
    }
    // When parent is customer (or other tenant-scoped), pre-fill org/tenant from parent
    if (parentRecord.organizationId != null) {
      initial.organization = parentRecord.organizationId
    }
    if (parentRecord.tenantId != null) {
      initial.tenant = parentRecord.tenantId
    }
    return initial
  }, [relatedObjectDefinition.foreignKey, parentRecord])

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

  const tableContent = (
    <div
      style={{ maxHeight }}
      className={cn(
        'w-full overflow-auto',
        collapsible ? 'min-h-0' : undefined
      )}
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <span>{t('common:loading')}</span>
        </div>
      ) : error ? (
        <div className="text-destructive py-4">{error}</div>
      ) : (
        <GenericDataTable
          data={filteredRecords}
          objectDefinition={{
            name: relatedObjectDefinition.objectDefinition,
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
          onReferenceClick={handleReferenceClick}
          hideFooter={collapsible}
        />
      )}
    </div>
  )

  const headerContent = (
    <div className="flex items-center justify-between w-full gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn(
          'truncate',
          collapsible ? 'text-base font-semibold' : 'text-sm font-medium'
        )}>
          {translateObjectLabel(relatedObjectDefinition.objectDefinition, relatedObjectDefinition.labelPlural, true)}
        </span>
        {!collapsible && (
          <span className="text-xs text-muted-foreground shrink-0">({records.length})</span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
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
            {t('common:add')}
          </Button>
        )}
      </div>
    </div>
  )

  if (collapsible) {
    return (
      <>
        <Collapsible defaultOpen={true} className="w-full border rounded-lg overflow-hidden">
          <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-3 bg-muted shadow-sm hover:bg-muted/90 transition-colors [&[data-state=open]>svg.chevron]:rotate-180 border-b border-border">
            <ChevronDown className="chevron h-4 w-4 shrink-0 text-muted-foreground transition-transform" />
            {headerContent}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="w-full">
              {tableContent}
            </div>
          </CollapsibleContent>
        </Collapsible>
        {relatedObjectDef && (
          <GenericCreateDialog
            objectDefinition={relatedObjectDef}
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onRecordCreated={handleRecordCreated}
            initialValues={getCreateInitialValues()}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">{translateObjectLabel(relatedObjectDefinition.objectDefinition, relatedObjectDefinition.labelPlural, true)}</h3>
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
                {t('common:add')}
              </Button>
            )}
          </div>
        </div>

        {showSearch && (
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common:searchObject', { objectName: translateObjectLabel(relatedObjectDefinition.objectDefinition, relatedObjectDefinition.labelPlural, true).toLowerCase() })}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        )}

        {tableContent}
      </div>
      {relatedObjectDef && (
        <GenericCreateDialog
          objectDefinition={relatedObjectDef}
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onRecordCreated={handleRecordCreated}
          initialValues={getCreateInitialValues()}
        />
      )}
    </>
  )
}
