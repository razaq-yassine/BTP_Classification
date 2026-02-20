import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import SignIn2 from '@/features/auth/sign-in/sign-in-2'

export const Route = createFileRoute('/login')({
  component: SignIn2,
  validateSearch: (search: Record<string, unknown>) => ({
    message: typeof search.message === 'string' ? search.message : undefined,
  }),
  beforeLoad: async () => {
    const { checkAuth, isAuthenticated } = useAuthStore.getState()
    if (isAuthenticated) {
      throw redirect({ to: '/dashboard' })
    }
    try {
      await checkAuth()
      const { isAuthenticated: updatedAuthStatus } = useAuthStore.getState()
      if (updatedAuthStatus) {
        throw redirect({ to: '/dashboard' })
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'to' in error) {
        throw error
      }
    }
  },
})
