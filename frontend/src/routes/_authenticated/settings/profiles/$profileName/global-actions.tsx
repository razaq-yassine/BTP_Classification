import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { getProfile, updateProfile } from '@/services/profiles-api'
import { getGlobalActions } from '@/services/metadata-api'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { GlobalActionsPermissionsForm } from '@/features/settings/profiles/components/global-actions-permissions-form'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/settings/profiles/$profileName/global-actions')({
  component: GlobalActionsPermissionsPage,
})

function GlobalActionsPermissionsPage() {
  const { profileName } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', profileName],
    queryFn: () => getProfile(profileName),
  })

  const { data: actions = [], isLoading: actionsLoading } = useQuery({
    queryKey: ['metadata', 'global-actions'],
    queryFn: getGlobalActions,
  })

  const initialPermissions = profile?.globalActionPermissions ?? {}

  const handleSave = async (data: Record<string, boolean>) => {
    if (!profile) return
    try {
      await updateProfile(profileName, {
        ...profile,
        globalActionPermissions: data,
      })
      queryClient.invalidateQueries({ queryKey: ['profile', profileName] })
      toast.success('Global action permissions saved')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to save'
      toast.error(msg)
    }
  }

  const isLoading = profileLoading || actionsLoading

  if (isLoading) {
    return (
      <Main>
        <div className='rounded-md border p-4 text-muted-foreground'>Loading...</div>
      </Main>
    )
  }

  if (!profile) {
    return (
      <Main>
        <div className='rounded-md border p-4 text-destructive'>Profile not found</div>
      </Main>
    )
  }

  return (
    <Main>
      <div className='space-y-4'>
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => navigate({ to: '/settings/profiles/$profileName', params: { profileName } })}
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h2 className='text-lg font-semibold'>Global action permissions</h2>
            <p className='text-sm text-muted-foreground'>
              Configure which global actions (quick create, tools, etc.) are available for profile &quot;{profileName}&quot;
            </p>
          </div>
        </div>

        {profileName === 'admin' && (
          <p className='text-sm text-muted-foreground rounded-md border p-3 bg-muted/50'>
            Admin profile has full access to all global actions regardless of these settings.
          </p>
        )}

        <GlobalActionsPermissionsForm
          actions={actions}
          initialPermissions={initialPermissions}
          onSave={handleSave}
        />
      </div>
    </Main>
  )
}
