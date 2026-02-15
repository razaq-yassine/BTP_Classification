import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'

export const Route = createFileRoute('/_authenticated/settings/object-manager')({
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.profile !== 'admin') {
      throw redirect({ to: '/settings' })
    }
  },
  component: ObjectManagerLayout,
})

function ObjectManagerLayout() {
  return <Outlet />
}
