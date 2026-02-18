import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { getObjectNames, getMetadataFile, saveMetadataFile } from '@/services/metadata-api'
import { getProfileNames } from '@/services/profiles-api'
import { toast } from 'sonner'
import { invalidateObjectDefinitions } from '@/hooks/useObjectDefinitionsQuery'

interface ListViewItem {
  objectName: string
  viewKey: string
  viewLabel: string
  profiles: string[] | undefined
}

interface ListViewPermissionsFormProps {
  profileName: string
}

interface ListViewJson {
  views?: Array<{ key: string; label: string; profiles?: string[]; [key: string]: unknown }>
  fields?: string[]
  [key: string]: unknown
}

function canProfileSeeView(profiles: string[] | undefined, profileName: string): boolean {
  if (!profiles || profiles.length === 0) return true
  return profiles.includes(profileName)
}

export function ListViewPermissionsForm({ profileName }: ListViewPermissionsFormProps) {
  const queryClient = useQueryClient()
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  const { data: objectNames = [] } = useQuery({
    queryKey: ['metadata', 'objects'],
    queryFn: getObjectNames,
  })

  const { data: allProfileNames = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: getProfileNames,
  })

  const listViewQueries = useQuery({
    queryKey: ['metadata', 'listViews', objectNames],
    queryFn: async () => {
      const results = await Promise.all(
        objectNames.map(async (objName) => {
          try {
            const data = await getMetadataFile<ListViewJson>(objName, 'listView.json')
            return { objectName: objName, data }
          } catch {
            return null
          }
        })
      )
      return results.filter((r): r is { objectName: string; data: ListViewJson } => r !== null)
    },
    enabled: objectNames.length > 0,
  })

  const viewItems = useMemo((): ListViewItem[] => {
    const items: ListViewItem[] = []
    const listViews = listViewQueries.data ?? []
    for (const { objectName, data } of listViews) {
      const views = data.views
      if (views && views.length > 0) {
        for (const v of views) {
          items.push({
            objectName,
            viewKey: v.key,
            viewLabel: v.label,
            profiles: v.profiles,
          })
        }
      } else {
        items.push({
          objectName,
          viewKey: 'default',
          viewLabel: 'Default',
          profiles: undefined,
        })
      }
    }
    return items
  }, [listViewQueries.data])

  const getItemId = (item: ListViewItem) => `${item.objectName}:${item.viewKey}`

  const effectiveCanSee = (item: ListViewItem): boolean => {
    const id = getItemId(item)
    if (id in overrides) return overrides[id]
    return canProfileSeeView(item.profiles, profileName)
  }

  const hasChanges = useMemo(() => {
    for (const item of viewItems) {
      const id = getItemId(item)
      if (id in overrides) {
        const original = canProfileSeeView(item.profiles, profileName)
        if (overrides[id] !== original) return true
      }
    }
    return false
  }, [viewItems, overrides, profileName])

  const handleChange = (item: ListViewItem, canSee: boolean) => {
    setOverrides((prev) => ({ ...prev, [getItemId(item)]: canSee }))
  }

  const handleSave = async () => {
    if (!hasChanges) return
    setSaving(true)
    try {
      const listViews = listViewQueries.data ?? []
      const byObject = new Map<string, ListViewJson>()
      for (const { objectName, data } of listViews) {
        byObject.set(objectName, JSON.parse(JSON.stringify(data)))
      }

      function updateViewProfiles(
        view: { profiles?: string[]; [key: string]: unknown },
        canSee: boolean
      ) {
        if (canSee) {
          if (view.profiles) {
            if (!view.profiles.includes(profileName)) {
              view.profiles = [...view.profiles, profileName]
            }
          }
        } else {
          if (view.profiles) {
            view.profiles = view.profiles.filter((p) => p !== profileName)
            if (view.profiles.length === 0) delete view.profiles
          } else {
            const restricted = allProfileNames.filter((p) => p !== profileName)
            if (restricted.length > 0) view.profiles = restricted
          }
        }
      }

      for (const item of viewItems) {
        const id = getItemId(item)
        if (!(id in overrides)) continue
        const newCanSee = overrides[id]
        const originalCanSee = canProfileSeeView(item.profiles, profileName)
        if (newCanSee === originalCanSee) continue

        const data = byObject.get(item.objectName)
        if (!data) continue

        if (item.viewKey === 'default') {
          if (data.views && data.views.length > 0) {
            const view = data.views.find((v) => v.key === 'default')
            if (view) updateViewProfiles(view, newCanSee)
          } else {
            if (newCanSee) {
              continue
            }
            const restricted = allProfileNames.filter((p) => p !== profileName)
            if (restricted.length === 0) continue
            data.defaultView = 'default'
            data.views = [
              {
                key: 'default',
                label: 'Default',
                fields: data.fields ?? [],
                defaultSort: data.defaultSort,
                defaultSortOrder: data.defaultSortOrder,
                pageSize: data.pageSize,
                statistics: data.statistics,
                filters: data.filters,
                profiles: restricted,
              },
            ]
            delete data.fields
            delete data.defaultSort
            delete data.defaultSortOrder
            delete data.pageSize
            delete data.statistics
            delete data.filters
          }
        } else {
          const views = data.views ?? []
          const view = views.find((v) => v.key === item.viewKey)
          if (view) updateViewProfiles(view, newCanSee)
        }
      }

      for (const [objectName, data] of byObject) {
        const original = listViews.find((l) => l.objectName === objectName)?.data
        if (JSON.stringify(original) !== JSON.stringify(data)) {
          await saveMetadataFile(objectName, 'listView.json', data)
        }
      }

      invalidateObjectDefinitions(queryClient)
      setOverrides({})
      toast.success('List view permissions saved')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to save'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const isLoading = listViewQueries.isLoading

  if (isLoading) {
    return (
      <Card>
        <CardContent className='py-8 text-center text-muted-foreground'>
          Loading list views...
        </CardContent>
      </Card>
    )
  }

  if (viewItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>List view permissions</CardTitle>
          <CardDescription>
            No list views found. Add objects and configure list views in Object Manager first.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>List view permissions</CardTitle>
          <CardDescription>
            Check which list views this profile can see. Views with no restriction are visible to all
            users who can read the object.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Object</TableHead>
                <TableHead>View</TableHead>
                <TableHead className='w-[120px]'>Can see</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewItems.map((item) => (
                <TableRow key={getItemId(item)}>
                  <TableCell className='font-mono'>{item.objectName}</TableCell>
                  <TableCell>{item.viewLabel}</TableCell>
                  <TableCell>
                    <Checkbox
                      checked={effectiveCanSee(item)}
                      onCheckedChange={(checked) => handleChange(item, !!checked)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {hasChanges && (
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save permissions'}
        </Button>
      )}
    </div>
  )
}
