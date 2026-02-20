import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { useAuthStore } from '@/stores/authStore'
import { columns } from './components/users-columns'
import { UsersDialogs } from './components/users-dialogs'
import { UsersPrimaryButtons } from './components/users-primary-buttons'
import { UsersTable } from './components/users-table'
import UsersProvider from './context/users-context'
import { useAdminUsers } from './hooks/useAdminUsers'
import { mapAdminUserToUser } from './data/schema'

export default function Users() {
  const isAdmin = useAuthStore((s) => s.user?.profile === 'admin')
  const { data, isLoading, refetch } = useAdminUsers(0, 100, '')
  const userList = data?.rows.map(mapAdminUserToUser) ?? []

  return (
    <UsersProvider refetchUsers={refetch}>
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-2 flex flex-wrap items-center justify-between space-y-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>User List</h2>
            <p className='text-muted-foreground'>
              {isAdmin ? 'Manage your users and their roles here.' : 'View users in your organization.'}
            </p>
          </div>
          <UsersPrimaryButtons />
        </div>
        <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
          {isAdmin ? (
            isLoading ? (
              <p className='text-muted-foreground py-8'>Loading users...</p>
            ) : (
              <UsersTable data={userList} columns={columns} />
            )
          ) : (
            <p className='text-muted-foreground py-8'>
              User list is available to administrators. You can invite users using the Invite User button above.
            </p>
          )}
        </div>
      </Main>

      <UsersDialogs />
    </UsersProvider>
  )
}
