import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

export interface AdminUserRow {
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

export interface AdminUsersResponse {
  rows: AdminUserRow[]
  total: number
  page: number
  size: number
}

export function useAdminUsers(page = 0, size = 20, search = '') {
  const isAdmin = useAuthStore((s) => s.user?.profile === 'admin')

  return useQuery({
    queryKey: ['admin', 'users', page, size, search],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('size', String(size))
      if (search) params.set('search', search)
      const { data } = await api.get<AdminUsersResponse>(`/api/auth/admin/users?${params}`)
      return data
    },
    enabled: isAdmin,
  })
}
