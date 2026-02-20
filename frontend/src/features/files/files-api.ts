import api from '@/services/api'

export interface ExplorerFile {
  id: number
  objectName: string
  recordId: number
  filename: string
  storagePath: string
  size: number
  mimeType: string | null
  uploadedAt: string | null
  organizationId: number | null
  tenantId: number | null
}

export interface StorageUsage {
  usedBytes: number
  maxBytes: number | null
}

export async function fetchFilesExplorer(params: {
  organizationId?: number
  tenantId?: number
  objectName?: string
  search?: string
  sortBy?: string
  sortOrder?: string
}): Promise<ExplorerFile[]> {
  const searchParams = new URLSearchParams()
  if (params.organizationId != null) searchParams.set('organizationId', String(params.organizationId))
  if (params.tenantId != null) searchParams.set('tenantId', String(params.tenantId))
  if (params.objectName) searchParams.set('objectName', params.objectName)
  if (params.search) searchParams.set('search', params.search)
  if (params.sortBy) searchParams.set('sortBy', params.sortBy)
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder)
  const { data } = await api.get<{ files: ExplorerFile[] }>(`/api/files/explorer?${searchParams}`)
  return data.files ?? []
}

export async function fetchStorageUsage(params?: {
  organizationId?: number
  tenantId?: number
}): Promise<StorageUsage> {
  const searchParams = new URLSearchParams()
  if (params?.organizationId != null) {
    searchParams.set('organizationId', String(params.organizationId))
  }
  if (params?.tenantId != null) {
    searchParams.set('tenantId', String(params.tenantId))
  }
  const { data } = await api.get<StorageUsage>(`/api/storage/usage?${searchParams}`)
  return data
}
