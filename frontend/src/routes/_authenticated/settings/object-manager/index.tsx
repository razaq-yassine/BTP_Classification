import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { getObjectNames } from '@/services/metadata-api'
import { ObjectList } from '@/features/settings/object-manager/components/object-list'
import { CreateObjectDialog } from '@/features/settings/object-manager/components/create-object-dialog'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'

export const Route = createFileRoute('/_authenticated/settings/object-manager/')({
  component: ObjectManagerList,
})

function ObjectManagerList() {
  const [createOpen, setCreateOpen] = useState(false)
  const navigate = useNavigate()
  const { data: objectNames = [], isLoading } = useQuery({
    queryKey: ['metadata', 'objects'],
    queryFn: getObjectNames,
  })

  const handleSelect = (name: string) => {
    navigate({ to: '/settings/object-manager/$objectName', params: { objectName: name } })
  }

  return (
    <Main>
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-lg font-semibold'>Object Manager</h2>
            <p className='text-muted-foreground text-sm'>
              Select an object to edit its metadata.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className='mr-2 size-4' />
            Create object
          </Button>
        </div>
        <ObjectList
          objects={objectNames}
          isLoading={isLoading}
          onSelect={handleSelect}
        />
      </div>
      <CreateObjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </Main>
  )
}
