import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ObjectDetailsForm } from './object-details-form'
import { FieldsEditor } from './fields-editor'
import { ListViewForm } from './list-view-form'
import { DetailViewForm } from './detail-view-form'
import { deleteObject } from '@/services/metadata-api'
import { toast } from 'sonner'
import { clearObjectCache } from '@/metadata/loader'
import { invalidateObjectDefinitions } from '@/hooks/useObjectDefinitionsQuery'

const SECTIONS = [
  { id: 'details', label: 'Object Details' },
  { id: 'fields', label: 'Fields' },
  { id: 'list-view', label: 'List View' },
  { id: 'detail-view', label: 'Detail View' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

interface ObjectEditorProps {
  objectName: string
}

export function ObjectEditor({ objectName }: ObjectEditorProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [section, setSection] = useState<SectionId>('details')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    try {
      setDeleting(true)
      await deleteObject(objectName)
      clearObjectCache()
      invalidateObjectDefinitions(queryClient)
      queryClient.invalidateQueries({ queryKey: ['metadata', 'objects'] })
      toast.success(`Object "${objectName}" deleted. Database table will be dropped on next deploy.`)
      setShowDeleteDialog(false)
      navigate({ to: '/settings/object-manager' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to delete object'
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Main>
      <div className='mb-4 flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => navigate({ to: '/settings/object-manager' })}
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <h2 className='text-lg font-semibold capitalize'>{objectName}</h2>
        </div>
        <Button
          variant='outline'
          size='sm'
          className='text-destructive hover:bg-destructive/10 hover:text-destructive'
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className='h-4 w-4 mr-2' />
          Delete Object
        </Button>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title='Delete Object'
        desc={
          <p>
            Are you sure you want to delete the object <strong>{objectName}</strong>? This will remove all
            metadata files and the database table (on next deploy). All data in this table will be permanently lost.
            This cannot be undone.
          </p>
        }
        confirmText='Delete'
        destructive
        handleConfirm={handleDelete}
        isLoading={deleting}
      />

      <div className='flex gap-6'>
        <aside className='w-48 shrink-0 space-y-1'>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type='button'
              onClick={() => setSection(s.id)}
              className={
                section === s.id
                  ? 'block w-full rounded-md px-3 py-2 text-left text-sm bg-accent font-medium'
                  : 'block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent/50'
              }
            >
              {s.label}
            </button>
          ))}
        </aside>

        <div className='min-w-0 flex-1'>
          {section === 'details' && (
            <ObjectDetailsForm objectName={objectName} />
          )}
          {section === 'fields' && <FieldsEditor objectName={objectName} />}
          {section === 'list-view' && (
            <ListViewForm objectName={objectName} />
          )}
          {section === 'detail-view' && (
            <DetailViewForm objectName={objectName} />
          )}
        </div>
      </div>
    </Main>
  )
}
