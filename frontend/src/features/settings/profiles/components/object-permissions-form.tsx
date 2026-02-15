import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'

interface ObjectPermissionsFormProps {
  objectName: string
  fieldKeys: string[]
  initialPermissions: {
    create: boolean
    read: boolean
    update: boolean
    delete: boolean
    fieldPermissions?: Record<string, { visible: boolean; editable: boolean }>
  }
  onSave: (data: {
    create: boolean
    read: boolean
    update: boolean
    delete: boolean
    fieldPermissions: Record<string, { visible: boolean; editable: boolean }>
  }) => Promise<void>
}

export function ObjectPermissionsForm({
  objectName,
  fieldKeys,
  initialPermissions,
  onSave,
}: ObjectPermissionsFormProps) {
  const [create, setCreate] = useState(initialPermissions.create)
  const [read, setRead] = useState(initialPermissions.read)
  const [update, setUpdate] = useState(initialPermissions.update)
  const [del, setDel] = useState(initialPermissions.delete)
  const [fieldPerms, setFieldPerms] = useState<Record<string, { visible: boolean; editable: boolean }>>(
    () => {
      const fp = initialPermissions.fieldPermissions ?? {}
      const result: Record<string, { visible: boolean; editable: boolean }> = {}
      for (const key of fieldKeys) {
        result[key] = fp[key] ?? { visible: false, editable: false }
      }
      return result
    }
  )
  const [saving, setSaving] = useState(false)

  const handleFieldPermChange = (
    fieldKey: string,
    perm: 'visible' | 'editable',
    value: boolean
  ) => {
    setFieldPerms((prev) => {
      const current = prev[fieldKey] ?? { visible: false, editable: false }
      const next = { ...current, [perm]: value }
      // Editable implies visible
      if (perm === 'editable' && value) {
        next.visible = true
      }
      return { ...prev, [fieldKey]: next }
    })
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await onSave({
        create,
        read,
        update,
        delete: del,
        fieldPermissions: fieldPerms,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Object permissions</CardTitle>
          <CardDescription>
            CRUD permissions for the {objectName} object.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-wrap gap-6'>
          <div className='flex items-center space-x-2'>
            <Switch id='create' checked={create} onCheckedChange={setCreate} />
            <Label htmlFor='create'>Create</Label>
          </div>
          <div className='flex items-center space-x-2'>
            <Switch id='read' checked={read} onCheckedChange={setRead} />
            <Label htmlFor='read'>Read</Label>
          </div>
          <div className='flex items-center space-x-2'>
            <Switch id='update' checked={update} onCheckedChange={setUpdate} />
            <Label htmlFor='update'>Update</Label>
          </div>
          <div className='flex items-center space-x-2'>
            <Switch id='delete' checked={del} onCheckedChange={setDel} />
            <Label htmlFor='delete'>Delete</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Field permissions</CardTitle>
          <CardDescription>
            Visible: field is shown. Editable: field can be edited (requires Update permission).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fieldKeys.length === 0 ? (
            <p className='text-sm text-muted-foreground'>No custom fields. Add fields in Object Manager.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field</TableHead>
                  <TableHead className='w-[120px]'>Visible</TableHead>
                  <TableHead className='w-[120px]'>Editable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fieldKeys.map((fieldKey) => (
                  <TableRow key={fieldKey}>
                    <TableCell className='font-medium'>{fieldKey}</TableCell>
                    <TableCell>
                      <Checkbox
                        checked={fieldPerms[fieldKey]?.visible ?? false}
                        onCheckedChange={(checked) =>
                          handleFieldPermChange(fieldKey, 'visible', !!checked)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={fieldPerms[fieldKey]?.editable ?? false}
                        onCheckedChange={(checked) =>
                          handleFieldPermChange(fieldKey, 'editable', !!checked)
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSubmit} disabled={saving}>
        {saving ? 'Saving...' : 'Save permissions'}
      </Button>
    </div>
  )
}
