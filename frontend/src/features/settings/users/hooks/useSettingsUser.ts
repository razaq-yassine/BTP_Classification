import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

export interface UserDetail {
  id: number
  username: string
  email: string
  firstName: string | null
  lastName: string | null
  profile: string
  isActive: boolean
  organizationId: number | null
  tenantId: number | null
  dateJoined: string | null
  emailVerified?: boolean
  twoFactorEnabled?: boolean
  pendingEmail?: string | null
  preferredLanguage?: string | null
  mustChangePassword?: boolean
}

export function useSettingsUser(userId: number | string | undefined) {
  const user = useAuthStore((s) => s.user)
  const isAdmin = (user?.profile ?? '').toLowerCase() === 'admin'
  const hasOrgId = (user?.organizationId ?? null) != null

  return useQuery({
    queryKey: ['settings', 'user', userId],
    queryFn: async () => {
      const { data } = await api.get<UserDetail>(`/api/auth/users/${userId}`)
      return data
    },
    enabled: !!userId && (isAdmin || hasOrgId),
  })
}
