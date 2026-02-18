import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { getProfile } from '@/services/profiles-api'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { ListViewPermissionsForm } from '@/features/settings/profiles/components/list-view-permissions-form'

export const Route = createFileRoute('/_authenticated/settings/profiles/$profileName/list-views')({
  component: ListViewPermissionsPage,
})

function ListViewPermissionsPage() {
  const { profileName } = Route.useParams()
  const navigate = useNavigate()

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', profileName],
    queryFn: () => getProfile(profileName),
  })

  if (profileLoading) {
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
            <h2 className='text-lg font-semibold'>List view permissions</h2>
            <p className='text-sm text-muted-foreground'>
              Choose which list views profile &quot;{profile.label}&quot; can see for each object.
            </p>
          </div>
        </div>

        {profileName === 'admin' && (
          <p className='text-sm text-muted-foreground rounded-md border p-3 bg-muted/50'>
            Admin profile sees all list views regardless of these settings.
          </p>
        )}

        <ListViewPermissionsForm profileName={profileName} />
      </div>
    </Main>
  )
}
