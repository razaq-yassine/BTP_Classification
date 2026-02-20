import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import api from '@/services/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { IconEdit } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import type { UserDisplay } from '../utils'

interface Props {
  data: UserDisplay[]
  search: string
  onSearchChange: (v: string) => void
  isAdmin: boolean
}

const PROFILE_LABELS: Record<string, string> = {
  'standard-user': 'Standard User',
  'tenant-user': 'Tenant User',
  'org-user': 'Organization User',
  'org-owner': 'Organization Owner',
  admin: 'Admin',
}

export function SettingsUsersTable({ data, search, onSearchChange, isAdmin }: Props) {
  const navigate = useNavigate()
  const { data: orgs = [] } = useQuery({
    queryKey: ['organizations-list'],
    queryFn: async () => {
      const { data: res } = await api.get<{ organizations?: { id: number; name: string }[] }>('/api/organizations?size=100')
      const list = res?.organizations ?? res
      return Array.isArray(list) ? list : []
    },
    enabled: isAdmin,
  })
  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants-list'],
    queryFn: async () => {
      const { data: res } = await api.get<{ tenants?: { id: number; name: string; organizationId?: number }[] }>('/api/tenants?size=100')
      const list = res?.tenants ?? res
      return Array.isArray(list) ? list : []
    },
    enabled: isAdmin,
  })

  const getOrgName = (id: number | null) => (id ? orgs.find((o) => o.id === id)?.name ?? `Org #${id}` : '-')
  const getTenantName = (id: number | null) => (id ? tenants.find((t) => t.id === id)?.name ?? `Tenant #${id}` : '-')

  return (
    <div className='space-y-4'>
      <Input
        placeholder='Search by username, email, or name...'
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className='max-w-sm'
      />
      <div className='overflow-hidden rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Profile</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && (
                <>
                  <TableHead>Organization</TableHead>
                  <TableHead>Tenant</TableHead>
                </>
              )}
              <TableHead className='w-[80px]'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 8 : 6} className='h-24 text-center text-muted-foreground'>
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((u) => (
                <TableRow
                  key={u.id}
                  className='cursor-pointer hover:bg-muted/50'
                  onClick={() => navigate({ to: '/settings/users/$userId', params: { userId: String(u.id) } })}
                >
                  <TableCell className='font-medium'>{u.username}</TableCell>
                  <TableCell>
                    {u.firstName} {u.lastName}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{PROFILE_LABELS[u.profile] ?? u.profile}</TableCell>
                  <TableCell>
                    <Badge variant='outline' className={cn('capitalize', u.status === 'active' ? 'bg-teal-100/30 text-teal-900 dark:text-teal-200' : 'bg-neutral-300/40')}>
                      {u.status}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <>
                      <TableCell>{getOrgName(u.organizationId)}</TableCell>
                      <TableCell>{getTenantName(u.tenantId)}</TableCell>
                    </>
                  )}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => navigate({ to: '/settings/users/$userId', params: { userId: String(u.id) } })}
                      aria-label={`Edit ${u.username}`}
                    >
                      <IconEdit className='h-4 w-4' />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
