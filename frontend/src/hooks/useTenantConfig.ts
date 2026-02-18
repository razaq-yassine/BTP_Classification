import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

export type TenantMode = 'single_tenant' | 'multi_tenant' | 'org_and_tenant'

export interface TenantConfig {
  mode: TenantMode
}

export function useTenantConfig() {
  return useQuery({
    queryKey: ['tenant-config'],
    queryFn: async () => {
      const { data } = await api.get<TenantConfig>('/api/config/tenant-config')
      return data ?? { mode: 'single_tenant' }
    },
    staleTime: 5 * 60 * 1000,
  })
}
