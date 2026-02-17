import api from './api'

const METADATA_BASE = '/api/admin/metadata'

export interface FieldPermission {
  visible: boolean
  editable: boolean
}

export interface ObjectPermission {
  create: boolean
  read: boolean
  update: boolean
  delete: boolean
  fieldPermissions?: Record<string, FieldPermission>
}

export interface Profile {
  name: string
  label: string
  description?: string
  objectPermissions: Record<string, ObjectPermission>
  globalActionPermissions?: Record<string, boolean>
}

export async function getProfileNames(): Promise<string[]> {
  const res = await api.get<string[]>(`${METADATA_BASE}/profiles`)
  return Array.isArray(res.data) ? res.data : []
}

export async function getProfile(name: string): Promise<Profile> {
  const res = await api.get<Profile>(`${METADATA_BASE}/profiles/${encodeURIComponent(name)}`)
  return res.data
}

export async function createProfile(data: Partial<Profile>): Promise<Profile> {
  const res = await api.post<Profile>(`${METADATA_BASE}/profiles`, data)
  return res.data
}

export async function updateProfile(name: string, data: Partial<Profile>): Promise<void> {
  await api.put(`${METADATA_BASE}/profiles/${encodeURIComponent(name)}`, data)
}
