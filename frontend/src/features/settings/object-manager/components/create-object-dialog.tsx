import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { invalidateObjectDefinitions } from '@/hooks/useObjectDefinitionsQuery'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createObject } from '@/services/metadata-api'
import { SYSTEM_FIELDS } from '@shared/protected-metadata'

interface CreateObjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateObjectDialog({ open, onOpenChange }: CreateObjectDialogProps) {
  const { t } = useTranslation(['settings', 'common'])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const createMutation = useMutation({
    mutationFn: createObject,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['metadata', 'objects'] })
      invalidateObjectDefinitions(queryClient)
      onOpenChange(false)
      setName('')
      setError(null)
      navigate({ to: '/settings/object-manager/$objectName', params: { objectName: data.name } })
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || t('failedToCreateObject'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmed = name.trim().toLowerCase()
    if (!trimmed) {
      setError(t('objectNameRequired'))
      return
    }
    if (!/^[a-z][a-z0-9]*$/.test(trimmed)) {
      setError(t('objectNameFormat'))
      return
    }
    createMutation.mutate(trimmed)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setName('')
      setError(null)
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create new object</DialogTitle>
          <DialogDescription>
            Create a new metadata object. System fields ({SYSTEM_FIELDS.join(', ')}) and Name will be added automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='object-name'>{t('objectName')}</Label>
              <Input
                id='object-name'
                placeholder={t('objectNameExample')}
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError(null)
                }}
                autoFocus
              />
              {error && (
                <p className='text-destructive text-sm'>{error}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => handleOpenChange(false)}
            >
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button type='submit' disabled={createMutation.isPending}>
              {createMutation.isPending ? t('creating') : t('create', { ns: 'common' })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
