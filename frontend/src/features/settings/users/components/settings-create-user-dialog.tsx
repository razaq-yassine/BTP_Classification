import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import api from '@/services/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { SelectDropdown } from '@/components/select-dropdown'
import { getProfileNames, getProfile } from '@/services/profiles-api'

function formatProfileLabel(name: string): string {
  return name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const formSchema = z
  .object({
    username: z.string().min(2, 'Username must be at least 2 characters'),
    email: z.string().email('Email is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    profile: z.string().min(1, 'Profile is required'),
    organizationId: z.string().optional(),
    tenantId: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] })
  .refine((d) => /[a-z]/.test(d.password), { message: 'Password must contain a lowercase letter', path: ['password'] })
  .refine((d) => /\d/.test(d.password), { message: 'Password must contain a number', path: ['password'] })

type FormValues = z.infer<typeof formSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  isAdmin: boolean
  userOrgId?: number | null
}

const NONE = '__none__'

export function SettingsCreateUserDialog({ open, onOpenChange, onSuccess, isAdmin, userOrgId }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  const { data: orgs = [] } = useQuery({
    queryKey: ['organizations-list'],
    queryFn: async () => {
      const { data } = await api.get<{ organizations?: { id: number; name: string }[] }>('/api/organizations?size=100')
      const list = data?.organizations ?? data
      return Array.isArray(list) ? list : []
    },
    enabled: open && isAdmin,
  })
  const { data: profileNames = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => getProfileNames(),
    enabled: open,
  })
  const { data: profilesWithLabels = [] } = useQuery({
    queryKey: ['profiles-with-labels', profileNames],
    queryFn: async () => {
      const result = await Promise.all(
        profileNames.map(async (name) => {
          try {
            const p = await getProfile(name)
            return { label: p.label ?? formatProfileLabel(name), value: name }
          } catch {
            return { label: formatProfileLabel(name), value: name }
          }
        })
      )
      return result
    },
    enabled: open && profileNames.length > 0,
  })
  const profileOptions = profilesWithLabels.length > 0 ? profilesWithLabels : [
    { label: 'Standard User', value: 'standard-user' },
    { label: 'Admin', value: 'admin' },
  ]

  const { data: tenantsRaw = [] } = useQuery({
    queryKey: ['tenants-list'],
    queryFn: async () => {
      const { data } = await api.get<{ tenants?: { id: number; name: string; organizationId?: number }[] }>('/api/tenants?size=100')
      const list = data?.tenants ?? data
      return Array.isArray(list) ? list : []
    },
    enabled: open,
  })
  const tenants = !isAdmin && userOrgId ? tenantsRaw.filter((t) => t.organizationId === userOrgId) : tenantsRaw

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      profile: 'standard-user',
      organizationId: NONE,
      tenantId: NONE,
    },
  })

  const selectedOrgId = form.watch('organizationId')
  const tenantsForOrg = selectedOrgId && selectedOrgId !== NONE ? tenants.filter((t) => t.organizationId === Number(selectedOrgId)) : tenants

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true)
    try {
      const orgId = values.organizationId && values.organizationId !== NONE ? Number(values.organizationId) : null
      const tenantId = values.tenantId && values.tenantId !== NONE ? Number(values.tenantId) : null
      if (isAdmin) {
        await api.post('/api/auth/admin/users', {
          username: values.username.trim(),
          email: values.email.trim().toLowerCase(),
          password: values.password,
          firstName: values.firstName?.trim() || undefined,
          lastName: values.lastName?.trim() || undefined,
          profile: values.profile,
          organizationId: orgId,
          tenantId,
        })
      } else {
        await api.post('/api/auth/users', {
          username: values.username.trim(),
          email: values.email.trim().toLowerCase(),
          password: values.password,
          firstName: values.firstName?.trim() || undefined,
          lastName: values.lastName?.trim() || undefined,
          profile: values.profile,
          tenantId,
        })
      }
      form.reset()
      onOpenChange(false)
      onSuccess()
      toast.success('User created successfully')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create user'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) form.reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>
            {isAdmin ? 'Create a new user and assign to an organization or tenant.' : 'Create a new user in your organization. Optionally assign to a tenant.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id='create-user-form' onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='username'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder='johndoe' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type='email' placeholder='john@example.com' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder='********' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='confirmPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder='********' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='firstName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder='John' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='lastName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder='Doe' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='profile'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile</FormLabel>
                  <SelectDropdown
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    isControlled
                    placeholder='Select profile'
                    items={profileOptions.filter((p) => isAdmin || p.value !== 'admin').map(({ label, value }) => ({ label, value }))}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            {isAdmin && (
              <>
                <FormField
                  control={form.control}
                  name='organizationId'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization (optional)</FormLabel>
                      <SelectDropdown
                        defaultValue={field.value}
                        onValueChange={(v) => {
                          field.onChange(v)
                          form.setValue('tenantId', NONE)
                        }}
                        isControlled
                        placeholder='Select organization'
                        items={[{ label: '— None (platform) —', value: NONE }, ...orgs.map((o) => ({ label: o.name, value: String(o.id) }))]}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='tenantId'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tenant (optional)</FormLabel>
                      <SelectDropdown
                        defaultValue={field.value}
                        onValueChange={field.onChange}
                        isControlled
                        placeholder='Select tenant'
                        items={[{ label: '— None —', value: NONE }, ...tenantsForOrg.map((t) => ({ label: t.name, value: String(t.id) }))]}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            {!isAdmin && (
              <FormField
                control={form.control}
                name='tenantId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenant (optional)</FormLabel>
                    <SelectDropdown
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      isControlled
                      placeholder='Select tenant'
                      items={[{ label: '— None (org-level) —', value: NONE }, ...tenants.map((t) => ({ label: t.name, value: String(t.id) }))]}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </form>
        </Form>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type='submit' form='create-user-form' disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
