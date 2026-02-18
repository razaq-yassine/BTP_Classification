import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { GenericObjectManager } from '@/components/generic/GenericObjectManager'
import { useAuthStore } from '@/stores/authStore'
import { useObjectDefinition } from '@/hooks/useObjectDefinition'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_authenticated/settings/organization')({
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    const isAdmin = (user?.profile ?? '').toLowerCase() === 'admin'
    if (!user?.organizationId && !isAdmin) {
      throw redirect({ to: '/settings' })
    }
  },
  component: OrganizationSettings,
})

function OrganizationSettings() {
  const user = useAuthStore((s) => s.user)
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null)
  const { definition, loading, error } = useObjectDefinition('organization')
  const isAdmin = (user?.profile ?? '').toLowerCase() === 'admin'
  const userOrgId = user?.organizationId

  const { data: orgs = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['organizations-list'],
    queryFn: async () => {
      const { data } = await api.get<{ organizations?: { id: number; name: string }[] }>('/api/organizations?size=100')
      const list = data?.organizations ?? data
      return Array.isArray(list) ? list : []
    },
    enabled: isAdmin && !userOrgId,
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
        {error || 'Failed to load organization definition'}
      </div>
    )
  }

  const recordId = userOrgId ?? selectedOrgId
  if (!recordId) {
    return (
      <div className='space-y-4 p-4'>
        <h2 className='text-lg font-semibold'>Organization Settings</h2>
        <p className='text-muted-foreground text-sm'>
          Select an organization to configure its settings.
        </p>
        {orgsLoading ? (
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        ) : orgs.length === 0 ? (
          <p className='text-muted-foreground text-sm'>No organizations found.</p>
        ) : (
          <div className='flex flex-col gap-2'>
            {orgs.map((o) => (
              <Button
                key={o.id}
                variant='outline'
                className='justify-start'
                onClick={() => setSelectedOrgId(o.id)}
              >
                {o.name}
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
