import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'

export const Route = createFileRoute('/_authenticated/settings/users')({
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    const isAdmin = (user?.profile ?? '').toLowerCase() === 'admin'
    const hasOrgId = (user?.organizationId ?? null) != null
    if (!isAdmin && !hasOrgId) {
      throw redirect({ to: '/settings' })
    }
  },
  component: UsersLayout,
})

function UsersLayout() {
  return <Outlet />
}
