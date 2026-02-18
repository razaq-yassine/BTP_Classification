import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { GenericObjectManager } from '@/components/generic/GenericObjectManager'
import { useAuthStore } from '@/stores/authStore'
import { useObjectDefinition } from '@/hooks/useObjectDefinition'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_authenticated/settings/tenant')({
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    const isAdmin = (user?.profile ?? '').toLowerCase() === 'admin'
    if (!user?.tenantId && !isAdmin) {
      throw redirect({ to: '/settings' })
    }
  },
  component: TenantSettings,
})

function TenantSettings() {
  const user = useAuthStore((s) => s.user)
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null)
  const { definition, loading, error } = useObjectDefinition('tenant')
  const isAdmin = (user?.profile ?? '').toLowerCase() === 'admin'
  const userTenantId = user?.tenantId

  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenants-list'],
    queryFn: async () => {
      const { data } = await api.get<{ tenants?: { id: number; name: string }[] }>('/api/tenants?size=100')
      const list = data?.tenants ?? data
      return Array.isArray(list) ? list : []
    },
    enabled: isAdmin && !userTenantId,
  })

  if (loading || !definition) {
    return (
      <div className='flex items-center justify-center py-12'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (error) {
    return (
      <div className='p-4 text-destructive'>
        {error || 'Failed to load tenant definition'}
      </div>
    )
  }

  const recordId = userTenantId ?? selectedTenantId
  if (!recordId) {
    return (
      <div className='space-y-4 p-4'>
        <h2 className='text-lg font-semibold'>Tenant Settings</h2>
        <p className='text-muted-foreground text-sm'>
          Select a tenant to configure its settings.
        </p>
        {tenantsLoading ? (
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        ) : tenants.length === 0 ? (
          <p className='text-muted-foreground text-sm'>No tenants found.</p>
        ) : (
          <div className='flex flex-col gap-2'>
            {tenants.map((t) => (
              <Button
                key={t.id}
                variant='outline'
                className='justify-start'
                onClick={() => setSelectedTenantId(t.id)}
              >
                {t.name}
              </Button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <GenericObjectManager
      objectDefinition={definition}
      view='detail'
      recordId={String(recordId)}
      basePath='/settings'
    />
  )
}
