import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { updateProfile, type Profile } from '@/services/profiles-api'
import { toast } from 'sonner'

interface ProfileInfoFormProps {
  profile: Profile
}

export function ProfileInfoForm({ profile }: ProfileInfoFormProps) {
  const queryClient = useQueryClient()
  const [label, setLabel] = useState(profile.label)
  const [description, setDescription] = useState(profile.description || '')
  const [saving, setSaving] = useState(false)

  const hasChanges = label !== profile.label || description !== (profile.description || '')

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile(profile.name, { ...profile, label, description })
      queryClient.invalidateQueries({ queryKey: ['profile', profile.name] })
      toast.success('Profile updated')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile information</CardTitle>
        <CardDescription>Basic profile details. Name cannot be changed.</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid gap-2'>
          <Label>Name</Label>
          <Input value={profile.name} disabled className='font-mono bg-muted' />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='label'>Label</Label>
          <Input
            id='label'
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder='Display name'
          />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='description'>Description</Label>
          <Textarea
            id='description'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='Optional description'
            rows={2}
          />
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
