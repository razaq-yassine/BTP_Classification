import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'

export const Route = createFileRoute('/_authenticated/settings/profiles')({
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.profile !== 'admin') {
      throw redirect({ to: '/settings' })
    }
  },
  component: ProfilesLayout,
})

function ProfilesLayout() {
  return <Outlet />
}
