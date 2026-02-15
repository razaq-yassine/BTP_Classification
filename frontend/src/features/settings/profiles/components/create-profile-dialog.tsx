import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
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
import { Textarea } from '@/components/ui/textarea'
import { createProfile } from '@/services/profiles-api'
import { toast } from 'sonner'

interface CreateProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateProfileDialog({ open, onOpenChange }: CreateProfileDialogProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const profileName = name.trim().toLowerCase().replace(/\s+/g, '-')
    if (!profileName || !/^[a-z][a-z0-9-]*$/.test(profileName)) {
      toast.error('Invalid name. Use lowercase letters, numbers, and hyphens.')
      return
    }
    setSaving(true)
    try {
      await createProfile({
        name: profileName,
        label: label.trim() || profileName,
        description: description.trim() || '',
        objectPermissions: {},
      })
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      onOpenChange(false)
      setName('')
      setLabel('')
      setDescription('')
      navigate({ to: '/settings/profiles/$profileName', params: { profileName } })
      toast.success('Profile created')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create profile'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create profile</DialogTitle>
            <DialogDescription>
              Create a new profile. You can configure object and field permissions after creation.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='name'>Name</Label>
              <Input
                id='name'
                placeholder='e.g. sales-rep'
                value={name}
                onChange={(e) => setName(e.target.value)}
                className='font-mono'
              />
              <p className='text-xs text-muted-foreground'>
                Lowercase letters, numbers, hyphens. Used as identifier.
              </p>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='label'>Label</Label>
              <Input
                id='label'
                placeholder='e.g. Sales Representative'
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='description'>Description</Label>
              <Textarea
                id='description'
                placeholder='Optional description'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type='submit' disabled={saving}>
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
