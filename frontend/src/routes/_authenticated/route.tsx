import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuthStore } from '@/stores/authStore'

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
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
