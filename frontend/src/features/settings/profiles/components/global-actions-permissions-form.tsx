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
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { GlobalAction } from '@/services/metadata-api'

interface GlobalActionsPermissionsFormProps {
  actions: GlobalAction[]
  initialPermissions: Record<string, boolean>
  onSave: (data: Record<string, boolean>) => Promise<void>
}

export function GlobalActionsPermissionsForm({
  actions,
  initialPermissions,
  onSave,
}: GlobalActionsPermissionsFormProps) {
  const [perms, setPerms] = useState<Record<string, boolean>>(() => {
    const result: Record<string, boolean> = {}
    for (const action of actions) {
      result[action.id] = initialPermissions[action.id] ?? false
    }
    return result
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (actionId: string, allowed: boolean) => {
    setPerms((prev) => ({ ...prev, [actionId]: allowed }))
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await onSave(perms)
    } finally {
      setSaving(false)
    }
  }

  if (actions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Global action permissions</CardTitle>
          <CardDescription>
            No global actions defined. Add actions to metadata/global-actions.json to configure permissions.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Global action permissions</CardTitle>
          <CardDescription>
            Allow or deny each global action for this profile. Global actions include quick create buttons, tools, and other header bar actions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead className='w-[100px]'>Allowed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actions.map((action) => (
                <TableRow key={action.id}>
                  <TableCell>
                    <div>
                      <p className='font-medium'>{action.label}</p>
                      {action.description && (
                        <p className='text-sm text-muted-foreground'>{action.description}</p>
                      )}
                      <p className='text-xs text-muted-foreground font-mono'>{action.id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={perms[action.id] ?? false}
                      onCheckedChange={(checked) => handleChange(action.id, !!checked)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Button onClick={handleSubmit} disabled={saving}>
        {saving ? 'Saving...' : 'Save permissions'}
      </Button>
    </div>
  )
}
