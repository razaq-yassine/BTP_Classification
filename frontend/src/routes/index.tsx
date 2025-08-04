import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'

export const Route = createFileRoute('/')({
  component: () => null, // This component won't render due to redirect
  beforeLoad: async () => {
    // Check authentication status and redirect accordingly
    const { checkAuth } = useAuthStore.getState().auth
    
    // Try to check if user is already authenticated via session
    try {
      await checkAuth()
      const { isAuthenticated: updatedAuth } = useAuthStore.getState().auth
      if (updatedAuth) {
        throw redirect({ to: '/dashboard' })
      }
    } catch (error) {
      // If checkAuth fails, user is not authenticated
    }
    
    // Redirect to login if not authenticated
    throw redirect({ to: '/login' })
  },
})
