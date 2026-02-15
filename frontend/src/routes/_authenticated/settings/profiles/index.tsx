import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { getProfileNames } from '@/services/profiles-api'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { ProfileList } from '@/features/settings/profiles/components/profile-list'
import { CreateProfileDialog } from '@/features/settings/profiles/components/create-profile-dialog'

export const Route = createFileRoute('/_authenticated/settings/profiles/')({
  component: ProfilesListPage,
})

function ProfilesListPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const navigate = useNavigate()
  const { data: profileNames = [], isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: getProfileNames,
  })

  const handleSelect = (name: string) => {
    navigate({ to: '/settings/profiles/$profileName', params: { profileName: name } })
  }

  return (
    <Main>
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-lg font-semibold'>Profiles</h2>
            <p className='text-muted-foreground text-sm'>
              Manage user profiles and their permissions.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className='mr-2 size-4' />
            Create profile
          </Button>
        </div>
        <ProfileList
          profiles={profileNames}
          isLoading={isLoading}
          onSelect={handleSelect}
        />
      </div>
      <CreateProfileDialog open={createOpen} onOpenChange={setCreateOpen} />
    </Main>
  )
}
