import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import SettingsEmail from '@/features/settings/email'

export const Route = createFileRoute('/_authenticated/settings/email')({
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.profile !== 'admin') {
      throw redirect({ to: '/settings' })
    }
  },
  component: SettingsEmail,
})
