import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { CurrencySettings } from '@/features/settings/currency'

export const Route = createFileRoute('/_authenticated/settings/currency')({
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.profile !== 'admin') {
      throw redirect({ to: '/settings' })
    }
  },
  component: CurrencySettings,
})
