import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

export interface UserRow {
  id: number
  username: string
  email: string
  firstName: string | null
  lastName: string | null
  profile: string
  isActive: boolean
  organizationId: number | null
  tenantId: number | null
  dateJoined: string
}

export interface UsersResponse {
  rows: UserRow[]
  total: number
  page: number
  size: number
}

export function useSettingsUsers(page = 0, size = 100, search = '') {
  const user = useAuthStore((s) => s.user)
  const isAdmin = (user?.profile ?? '').toLowerCase() === 'admin'
  const hasOrgId = (user?.organizationId ?? null) != null

  return useQuery({
    queryKey: ['settings', 'users', page, size, search],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('size', String(size))
      if (search) params.set('search', search)
      const { data } = await api.get<UsersResponse>(`/api/auth/users?${params}`)
      return data
    },
    enabled: isAdmin || hasOrgId,
  })
}
