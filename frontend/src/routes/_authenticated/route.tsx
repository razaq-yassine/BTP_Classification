import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { DashboardSkeleton } from '@/components/layout/dashboard-skeleton'
import { prefetchObjectDefinitions } from '@/hooks/useObjectDefinitionsQuery'
import { useAuthStore } from '@/stores/authStore'

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
  pendingComponent: DashboardSkeleton,
  pendingMs: 0, // Show skeleton immediately instead of after 1s delay
  loader: ({ context }) => prefetchObjectDefinitions(context.queryClient),
  beforeLoad: async () => {
    // Check authentication status
    const { checkAuth } = useAuthStore.getState()

    try {
      await checkAuth()
      // If checkAuth succeeds, user is authenticated, allow access
      const { isAuthenticated: currentAuthStatus } = useAuthStore.getState()
      if (!currentAuthStatus) {
        throw redirect({ to: '/login' })
      }
    } catch (error) {
      // If checkAuth fails, user is not authenticated, redirect to login
      throw redirect({ to: '/login' })
    }
  },
})
