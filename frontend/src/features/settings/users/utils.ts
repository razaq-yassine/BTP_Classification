import type { UserRow } from './hooks/useSettingsUsers'

export interface UserDisplay {
  id: number
  username: string
  email: string
  firstName: string
  lastName: string
  profile: string
  status: 'active' | 'inactive'
  organizationId: number | null
  tenantId: number | null
}

export function mapUserRowToDisplay(row: UserRow): UserDisplay {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    firstName: row.firstName ?? '',
    lastName: row.lastName ?? '',
    profile: row.profile,
    status: row.isActive ? 'active' : 'inactive',
    organizationId: row.organizationId,
    tenantId: row.tenantId,
  }
}
