import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import SecureAccessLogin from '@/features/auth/secure-access/secure-access-login'

export const Route = createFileRoute('/secure-access')({
  component: SecureAccessPage,
  beforeLoad: async () => {
    const { checkAuth, isAuthenticated, user } = useAuthStore.getState()
    if (isAuthenticated && user?.profile === 'admin') {
      return
    }
    if (isAuthenticated && user?.profile !== 'admin') {
      throw redirect({ to: '/login', search: { message: 'Use the main app to sign in.' } })
    }
    try {
      await checkAuth()
      const { user: updatedUser } = useAuthStore.getState()
      if (updatedUser?.profile === 'admin') {
        throw redirect({ to: '/dashboard' })
      }
      if (updatedUser && updatedUser.profile !== 'admin') {
        throw redirect({ to: '/login', search: { message: 'Use the main app to sign in.' } })
      }
    } catch (e) {
      if (e && typeof e === 'object' && 'to' in e) throw e
    }
  },
})

function SecureAccessPage() {
  return <SecureAccessLogin />
}
