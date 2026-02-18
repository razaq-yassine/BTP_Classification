import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import SettingsNotificationSettings from '@/features/settings/notification-settings'

export const Route = createFileRoute('/_authenticated/settings/notification-settings')({
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.profile !== 'admin') {
      throw redirect({ to: '/settings' })
    }
  },
  component: SettingsNotificationSettings,
})
