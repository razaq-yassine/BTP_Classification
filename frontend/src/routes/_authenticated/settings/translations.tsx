import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'

export const Route = createFileRoute('/_authenticated/settings/translations')({
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.profile !== 'admin') {
      throw redirect({ to: '/settings' })
    }
  },
  component: TranslationsLayout,
})

function TranslationsLayout() {
  return <Outlet />
}
