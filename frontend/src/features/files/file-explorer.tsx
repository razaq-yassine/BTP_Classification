import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Search, Loader2, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StorageProgressBar } from '@/components/storage-progress-bar'
import { FileTree, type FileTreeNode } from './file-tree'
import { fetchFilesExplorer, fetchStorageUsage, type ExplorerFile } from './files-api'
import { useAuthStore } from '@/stores/authStore'
import api from '@/services/api'
import { useObjectDefinitionsQuery } from '@/hooks/useObjectDefinitionsQuery'
import { translateObjectLabel } from '@/utils/translateMetadata'
import { Button } from '@/components/ui/button'

const NONE = '__none__'

export function FileExplorer() {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isAdmin = (user?.profile ?? '').toLowerCase() === 'admin'
  const hasOrgId = (user?.organizationId ?? null) != null
  const hasTenantId = (user?.tenantId ?? null) != null

  const [search, setSearch] = useState('')
  const [objectFilter, setObjectFilter] = useState<string>(NONE)
  const [sortBy, setSortBy] = useState('uploadedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedOrgId, setSelectedOrgId] = useState<string>(NONE)
  const [selectedTenantId, setSelectedTenantId] = useState<string>(NONE)

  const { data: objectDefs } = useObjectDefinitionsQuery()
  const objectLabels = useMemo(() => {
    const m: Record<string, string> = {}
    for (const d of objectDefs ?? []) {
      m[d.name] = translateObjectLabel(d.name, d.labelPlural, true)
    }
    return m
  }, [objectDefs])

  const { data: orgs = [] } = useQuery({
    queryKey: ['organizations-list'],
    queryFn: async () => {
      const { data } = await api.get<{ organizations?: { id: number; name: string }[] }>(
        '/api/organizations?size=100'
      )
      const list = data?.organizations ?? data
      return Array.isArray(list) ? list : []
    },
    enabled: isAdmin
  })

  const { data: tenantsRaw = [] } = useQuery({
    queryKey: ['tenants-list'],
    queryFn: async () => {
      const { data } = await api.get<{
        tenants?: { id: number; name: string; organizationId?: number }[]
      }>('/api/tenants?size=100')
      const list = data?.tenants ?? data
      return Array.isArray(list) ? list : []
    },
    enabled: isAdmin
  })

  const tenantsForOrg =
    selectedOrgId && selectedOrgId !== NONE
      ? tenantsRaw.filter((t) => t.organizationId === Number(selectedOrgId))
      : tenantsRaw

  const effectiveOrgId = useMemo(() => {
    if (isAdmin && selectedOrgId && selectedOrgId !== NONE) return Number(selectedOrgId)
    return user?.organizationId ?? null
  }, [isAdmin, selectedOrgId, user?.organizationId])

  const effectiveTenantId = useMemo(() => {
    if (isAdmin && selectedTenantId && selectedTenantId !== NONE) return Number(selectedTenantId)
    return user?.tenantId ?? null
  }, [isAdmin, selectedTenantId, user?.tenantId])

  const scopeReady = isAdmin || effectiveOrgId != null
  const showProgressBar =
    isAdmin || (!isAdmin && (hasOrgId || hasTenantId))

  const { data: storageUsage } = useQuery({
    queryKey: ['storage-usage', effectiveOrgId, effectiveTenantId, isAdmin],
    queryFn: () =>
      effectiveOrgId != null
        ? fetchStorageUsage({
            organizationId: effectiveOrgId,
            tenantId: effectiveTenantId ?? undefined
          })
        : fetchStorageUsage(),
    enabled: showProgressBar
  })

  const explorerParams = useMemo(
    () => ({
      organizationId: effectiveOrgId ?? undefined,
      tenantId: effectiveTenantId ?? undefined,
      objectName: objectFilter !== NONE ? objectFilter : undefined,
      search: search.trim() || undefined,
      sortBy,
      sortOrder
    }),
    [effectiveOrgId, effectiveTenantId, objectFilter, search, sortBy, sortOrder]
  )

  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: ['files-explorer', explorerParams],
    queryFn: () => fetchFilesExplorer(explorerParams),
    enabled: scopeReady
  })

  const treeNodes = useMemo((): FileTreeNode[] => {
    const byObject = new Map<string, { objectName: string; objectLabel: string; records: Map<number, ExplorerFile[]> }>()
    for (const f of files) {
      const label = objectLabels[f.objectName] ?? f.objectName
      let obj = byObject.get(f.objectName)
      if (!obj) {
        obj = { objectName: f.objectName, objectLabel: label, records: new Map() }
        byObject.set(f.objectName, obj)
      }
      const recordFiles = obj.records.get(f.recordId) ?? []
      recordFiles.push(f)
      obj.records.set(f.recordId, recordFiles)
    }
    return Array.from(byObject.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([objectName, { objectLabel, records }]) => ({
        objectName,
        objectLabel,
        records: Array.from(records.entries())
          .sort(([a], [b]) => a - b)
          .map(([recordId, files]) => ({ recordId, recordLabel: `#${recordId}`, files }))
      }))
  }, [files, objectLabels])

  const formatObjectName = (objectName: string) =>
    objectLabels[objectName] ?? objectName

  const getRecordPath = useMemo(() => {
    const defs = objectDefs ?? []
    return (objectName: string, recordId: number): string | null => {
      const def = defs.find((d) => d.name === objectName)
      const basePath = def?.basePath
      if (!basePath) return null
      return `${basePath}/${recordId}`
    }
  }, [objectDefs])

  if (!scopeReady && !isAdmin) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            {t('common:fileExplorerRequiresOrg', {
              defaultValue: 'File Explorer requires an organization or tenant.'
            })}
          </p>
        </CardContent>
      </Card>
    )
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['files-explorer'] })
    queryClient.invalidateQueries({ queryKey: ['storage-usage'] })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {t('common:fileExplorer', { defaultValue: 'File Explorer' })}
          </CardTitle>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={filesLoading}
            title={t('refresh', { defaultValue: 'Refresh' })}
          >
            <RefreshCw className={`h-4 w-4 ${filesLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {showProgressBar && storageUsage && (
          <div className="pt-2">
            <StorageProgressBar
              usedBytes={storageUsage.usedBytes}
              maxBytes={storageUsage.maxBytes}
              label={
                isAdmin && effectiveOrgId == null
                  ? t('totalPlatformStorage', { defaultValue: 'Total platform storage' })
                  : undefined
              }
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdmin && (
          <div className="flex flex-wrap gap-4">
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Select org —</SelectItem>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tenant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— All tenants —</SelectItem>
                {tenantsForOrg.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('common:searchFiles', { defaultValue: 'Search files...' })}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={objectFilter} onValueChange={setObjectFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Object" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>— All objects —</SelectItem>
              {Object.entries(objectLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="filename">Name</SelectItem>
              <SelectItem value="size">Size</SelectItem>
              <SelectItem value="uploadedAt">Date</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortOrder}
            onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Asc</SelectItem>
              <SelectItem value="desc">Desc</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="min-h-[200px] rounded-md border p-4">
          {filesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <FileTree nodes={treeNodes} formatObjectName={formatObjectName} getRecordPath={getRecordPath} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
