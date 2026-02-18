import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getProfileNames, getProfile, getSidebarIds, updateProfile, type Profile } from '@/services/profiles-api'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/settings/sidebar-assignment/')({
  component: SidebarAssignmentPage,
})

function SidebarAssignmentPage() {
  const queryClient = useQueryClient()
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const { data: profileNames = [], isLoading: namesLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: getProfileNames,
  })

  const profileQueries = useQuery({
    queryKey: ['profiles', 'full', profileNames],
    queryFn: async () => {
      const profiles = await Promise.all(profileNames.map((name) => getProfile(name)))
      return profiles
    },
    enabled: profileNames.length > 0,
  })

  const { data: sidebarIds = [] } = useQuery({
    queryKey: ['sidebars'],
    queryFn: getSidebarIds,
  })

  const profiles = profileQueries.data ?? []
  const isLoading = namesLoading || profileQueries.isLoading

  const effectiveAssignments = useMemo(() => {
    const result: Record<string, string> = { ...assignments }
    for (const p of profiles) {
      if (!(p.name in result)) {
        result[p.name] = p.sidebar ?? 'default'
      }
    }
    return result
  }, [profiles, assignments])

  const hasChanges = useMemo(() => {
    for (const p of profiles) {
      const current = p.sidebar ?? 'default'
      const assigned = effectiveAssignments[p.name]
      if (assigned !== current) return true
    }
    return false
  }, [profiles, effectiveAssignments])

  const handleChange = (profileName: string, sidebarId: string) => {
    setAssignments((prev) => ({ ...prev, [profileName]: sidebarId }))
  }

  const handleSave = async () => {
    if (!hasChanges) return
    setSaving(true)
    try {
      const updates: Array<{ name: string; profile: Profile; sidebar: string }> = []
      for (const p of profiles) {
        const assigned = effectiveAssignments[p.name]
        const current = p.sidebar ?? 'default'
        if (assigned !== current) {
          updates.push({ name: p.name, profile: p, sidebar: assigned })
        }
      }
      await Promise.all(
        updates.map(({ name, profile, sidebar }) =>
          updateProfile(name, { ...profile, sidebar })
        )
      )
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setAssignments({})
      toast.success('Sidebar assignments saved')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to save'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Main>
        <div className='rounded-md border p-4 text-muted-foreground'>
          Loading...
        </div>
      </Main>
    )
  }

  const allSidebarIds =
    sidebarIds.length > 0 ? sidebarIds : ['default']

  return (
    <Main>
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-lg font-semibold'>Sidebar assignment</h2>
            <p className='text-muted-foreground text-sm'>
              Assign navigation sidebars to profiles. Users with each profile will see the assigned sidebar.
            </p>
          </div>
          {hasChanges && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save assignments'}
            </Button>
          )}
        </div>

        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profile</TableHead>
                <TableHead>Label</TableHead>
                <TableHead className='w-[200px]'>Sidebar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className='py-8 text-center text-muted-foreground'>
                    No profiles found. Create profiles in Permission Profiles first.
                  </TableCell>
                </TableRow>
              ) : (
                profiles.map((profile) => (
                  <TableRow key={profile.name}>
                    <TableCell className='font-mono'>{profile.name}</TableCell>
                    <TableCell>{profile.label}</TableCell>
                    <TableCell>
                      <Select
                        value={effectiveAssignments[profile.name] ?? 'default'}
                        onValueChange={(v) => handleChange(profile.name, v)}
                      >
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Select sidebar' />
                        </SelectTrigger>
                        <SelectContent>
                          {allSidebarIds.map((id) => (
                            <SelectItem key={id} value={id}>
                              {id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Main>
  )
}
