import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { getProfile } from '@/services/profiles-api'
import { getMetadataFile } from '@/services/metadata-api'
import { updateProfile } from '@/services/profiles-api'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { ObjectPermissionsForm } from '@/features/settings/profiles/components/object-permissions-form'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/settings/profiles/$profileName/objects/$objectName')({
  component: ObjectPermissionsPage,
})

function ObjectPermissionsPage() {
  const { profileName, objectName } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', profileName],
    queryFn: () => getProfile(profileName),
  })

  const { data: fieldsData, isLoading: fieldsLoading } = useQuery({
    queryKey: ['metadata', 'objects', objectName, 'fields'],
    queryFn: () => getMetadataFile<string[]>(objectName, 'fields.json'),
  })

  const fieldKeys = Array.isArray(fieldsData)
    ? fieldsData.filter((k) => typeof k === 'string' && !['id', 'createdAt', 'updatedAt'].includes(k))
    : []

  const objPerm = profile?.objectPermissions?.[objectName]
  const objectPerm = objPerm ?? {
    create: false,
    read: false,
    update: false,
    delete: false,
    fieldPermissions: {} as Record<string, { visible: boolean; editable: boolean }>,
  }

  const handleSave = async (data: {
    create: boolean
    read: boolean
    update: boolean
    delete: boolean
    fieldPermissions: Record<string, { visible: boolean; editable: boolean }>
  }) => {
    if (!profile) return
    const newObjectPermissions = {
      ...profile.objectPermissions,
      [objectName]: data,
    }
    try {
      await updateProfile(profileName, {
        ...profile,
        objectPermissions: newObjectPermissions,
      })
      queryClient.invalidateQueries({ queryKey: ['profile', profileName] })
      toast.success('Permissions saved')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to save'
      toast.error(msg)
    }
  }

  const isLoading = profileLoading || fieldsLoading

  if (isLoading) {
    return (
      <Main>
        <div className='rounded-md border p-4 text-muted-foreground'>Loading...</div>
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
            onClick={() =>
              navigate({
                to: '/settings/profiles/$profileName/objects',
                params: { profileName },
              })
            }
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h2 className='text-lg font-semibold capitalize'>{objectName}</h2>
            <p className='text-sm text-muted-foreground'>
              Object and field permissions for profile &quot;{profileName}&quot;
            </p>
          </div>
        </div>

        <ObjectPermissionsForm
          objectName={objectName}
          fieldKeys={fieldKeys}
          initialPermissions={objectPerm}
          onSave={handleSave}
        />
      </div>
    </Main>
  )
}
