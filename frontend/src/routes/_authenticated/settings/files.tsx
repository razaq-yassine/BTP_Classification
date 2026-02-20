import { createFileRoute, redirect } from '@tanstack/react-router'
import { FileExplorer } from '@/features/files'
import { useAuthStore } from '@/stores/authStore'

export const Route = createFileRoute('/_authenticated/settings/files')({
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    const isAdmin = (user?.profile ?? '').toLowerCase() === 'admin'
    const hasOrgId = (user?.organizationId ?? null) != null
    const hasTenantId = (user?.tenantId ?? null) != null
    if (!isAdmin && !hasOrgId && !hasTenantId) {
      throw redirect({ to: '/settings' })
    }
  },
  component: FileExplorer
})
