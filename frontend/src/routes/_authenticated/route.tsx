import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { DashboardSkeleton } from '@/components/layout/dashboard-skeleton'
import { prefetchObjectDefinitions } from '@/hooks/useObjectDefinitionsQuery'
import { useAuthStore } from '@/stores/authStore'
import { useAppConfigStore } from '@/stores/appConfigStore'
import api from '@/services/api'

const DEFAULT_CONFIG = { defaultCurrency: 'USD', currencySymbol: '$' }

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
  pendingComponent: DashboardSkeleton,
  pendingMs: 0, // Show skeleton immediately instead of after 1s delay
  loader: async ({ context }) => {
    const { checkAuth } = useAuthStore.getState()
    const { hydrateConfig } = useAppConfigStore.getState()

    const [,, configResult] = await Promise.all([
      prefetchObjectDefinitions(context.queryClient),
      checkAuth(),
      (async () => {
        try {
          const [appRes, tenantRes] = await Promise.all([
            api.get<{ defaultCurrency?: string; currencySymbol?: string; timezone?: string; defaultPreferredLanguage?: string }>('/api/config/app-config').catch(() => ({ data: null })),
            api.get<{ defaultCurrency?: string; currencySymbol?: string; timezone?: string; defaultPreferredLanguage?: string } | null>('/api/config/tenant-context').catch(() => ({ data: null })),
          ])
          const appData = appRes?.data
          const tenantData = tenantRes?.data
          return {
            defaultCurrency: tenantData?.defaultCurrency ?? appData?.defaultCurrency ?? DEFAULT_CONFIG.defaultCurrency,
            currencySymbol: tenantData?.currencySymbol ?? appData?.currencySymbol ?? DEFAULT_CONFIG.currencySymbol,
            timezone: tenantData?.timezone ?? appData?.timezone,
            defaultPreferredLanguage: tenantData?.defaultPreferredLanguage ?? appData?.defaultPreferredLanguage,
          }
        } catch {
          return DEFAULT_CONFIG
        }
      })(),
    ])

    hydrateConfig(configResult)
    const { isAuthenticated } = useAuthStore.getState()
    if (!isAuthenticated) {
      throw redirect({ to: '/login', search: { message: undefined } })
    }
  },
})
