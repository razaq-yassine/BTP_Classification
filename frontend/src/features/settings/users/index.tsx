import { useState } from 'react'
import { Plus } from 'lucide-react'
import { IconMailPlus } from '@tabler/icons-react'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsUsers } from './hooks/useSettingsUsers'
import { SettingsUsersTable } from './components/settings-users-table'
import { SettingsCreateUserDialog } from './components/settings-create-user-dialog'
import { SettingsInviteUserDialog } from './components/settings-invite-user-dialog'
import { mapUserRowToDisplay } from './utils'

export default function SettingsUsers() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = (user?.profile ?? '').toLowerCase() === 'admin'
  const [createOpen, setCreateOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data, isLoading, refetch } = useSettingsUsers(0, 100, search)
  const userList = data?.rows.map(mapUserRowToDisplay) ?? []

  return (
    <Main>
      <div className='space-y-4'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-lg font-semibold'>Users</h2>
            <p className='text-muted-foreground text-sm'>
              {isAdmin
                ? 'Manage all users across the platform. Create users or invite them via email.'
                : 'Manage users in your organization. Create internal users or invite external users to tenants.'}
            </p>
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' onClick={() => setInviteOpen(true)}>
              <IconMailPlus className='mr-2 size-4' />
              Invite User
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className='mr-2 size-4' />
              Create User
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className='text-muted-foreground py-8 text-sm'>Loading users...</p>
        ) : (
          <SettingsUsersTable
            data={userList}
            search={search}
            onSearchChange={setSearch}
            isAdmin={isAdmin}
          />
        )}
      </div>

      <SettingsCreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={refetch}
        isAdmin={isAdmin}
        userOrgId={user?.organizationId}
      />
      <SettingsInviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSuccess={refetch}
        isAdmin={isAdmin}
        userOrgId={user?.organizationId}
      />
    </Main>
  )
}
