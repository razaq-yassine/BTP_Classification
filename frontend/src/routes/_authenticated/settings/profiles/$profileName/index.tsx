import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Shield, ChevronRight } from 'lucide-react'
import { getProfile } from '@/services/profiles-api'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { ProfileInfoForm } from '@/features/settings/profiles/components/profile-info-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/settings/profiles/$profileName/')({
  component: ProfileDetailPage,
})

function ProfileDetailPage() {
  const { t } = useTranslation('settings')
  const { profileName } = Route.useParams()
  const navigate = useNavigate()
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', profileName],
    queryFn: () => getProfile(profileName),
  })

  const handleObjectPermissionsClick = () => {
    navigate({ to: '/settings/profiles/$profileName/objects', params: { profileName } })
  }

  const handleGlobalActionsClick = () => {
    navigate({ to: '/settings/profiles/$profileName/global-actions', params: { profileName } })
  }

  const handleListViewPermissionsClick = () => {
    navigate({ to: '/settings/profiles/$profileName/list-views', params: { profileName } })
  }

  if (isLoading) {
    return (
      <Main>
        <div className='rounded-md border p-4 text-muted-foreground'>Loading profile...</div>
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
      <div className='space-y-6'>
        <div className='flex items-center gap-2'>
          <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/settings/profiles' })}>
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h2 className='text-lg font-semibold'>{profile.label}</h2>
            <p className='text-sm text-muted-foreground'>{profile.name}</p>
          </div>
        </div>

        <ProfileInfoForm profile={profile} />

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Shield className='h-5 w-5' />
              Security options
            </CardTitle>
            <CardDescription>
              Configure object and field permissions for this profile.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-2'>
            <button
              type='button'
              onClick={handleObjectPermissionsClick}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors',
                'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <div>
                <p className='font-medium'>Object and field permissions</p>
                <p className='text-sm text-muted-foreground'>
                  Set create, read, update, delete for objects. Configure visible and editable for fields.
                </p>
              </div>
              <ChevronRight className='h-5 w-5 text-muted-foreground' />
            </button>

            <button
              type='button'
              onClick={handleGlobalActionsClick}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors',
                'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <div>
                <p className='font-medium'>{t('globalActionPermissions', { defaultValue: 'Global action permissions' })}</p>
                <p className='text-sm text-muted-foreground'>
                  {t('globalActionPermissionsProfileDesc', {
                    defaultValue: 'Allow or deny global actions (quick create, tools, etc.) for this profile.',
                  })}
                </p>
              </div>
              <ChevronRight className='h-5 w-5 text-muted-foreground' />
            </button>

            <button
              type='button'
              onClick={handleListViewPermissionsClick}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors',
                'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <div>
                <p className='font-medium'>List view permissions</p>
                <p className='text-sm text-muted-foreground'>
                  Choose which list views this profile can see for each object.
                </p>
              </div>
              <ChevronRight className='h-5 w-5 text-muted-foreground' />
            </button>
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}
