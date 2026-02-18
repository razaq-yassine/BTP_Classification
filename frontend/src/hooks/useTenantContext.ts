import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

export interface TenantContext {
  name: string
  logoUrl?: string | null
  subtitle?: string
  defaultCurrency?: string | null
  currencySymbol?: string | null
  timezone?: string | null
  defaultPreferredLanguage?: string | null
  sidebarTheme?: string | null
}

export function useTenantContext() {
  return useQuery({
    queryKey: ['tenant-context'],
    queryFn: async () => {
      const { data } = await api.get<TenantContext | null>('/api/config/tenant-context')
      return data ?? null
    },
    staleTime: 5 * 60 * 1000,
  })
}
