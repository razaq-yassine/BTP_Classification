import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { getObjectNames } from '@/services/metadata-api'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { ObjectList } from '@/features/settings/object-manager/components/object-list'

export const Route = createFileRoute('/_authenticated/settings/profiles/$profileName/objects/')({
  component: ProfileObjectsListPage,
})

function ProfileObjectsListPage() {
  const { profileName } = Route.useParams()
  const navigate = useNavigate()
  const { data: objectNames = [], isLoading } = useQuery({
    queryKey: ['metadata', 'objects'],
    queryFn: getObjectNames,
  })

  const handleSelect = (objectName: string) => {
    navigate({
      to: '/settings/profiles/$profileName/objects/$objectName',
      params: { profileName, objectName },
    })
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
            <h2 className='text-lg font-semibold'>Object permissions</h2>
            <p className='text-sm text-muted-foreground'>
              Select an object to configure its permissions for profile &quot;{profileName}&quot;
            </p>
          </div>
        </div>
        <ObjectList
          objects={objectNames}
          isLoading={isLoading}
          onSelect={handleSelect}
        />
      </div>
    </Main>
  )
}
