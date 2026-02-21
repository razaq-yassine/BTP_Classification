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
import { SelectDropdown } from '@/components/select-dropdown'

const BASE_PROFILES = [
  { label: 'Standard User', value: 'standard-user' },
] as const

const formSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  profile: z.string().min(1, 'Profile is required'),
  organizationId: z.string().optional(),
  tenantId: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

const NONE = '__none__'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  isAdmin: boolean
  userOrgId?: number | null
}

export function SettingsInviteUserDialog({ open, onOpenChange, onSuccess, isAdmin, userOrgId }: Props) {
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
      email: '',
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
      const body: Record<string, unknown> = {
        email: values.email.trim().toLowerCase(),
        profile: values.profile,
      }
      if (isAdmin) {
        if (values.organizationId && values.organizationId !== NONE) body.organizationId = Number(values.organizationId)
        if (values.tenantId && values.tenantId !== NONE) body.tenantId = Number(values.tenantId)
      } else if (values.tenantId && values.tenantId !== NONE) {
        body.tenantId = Number(values.tenantId)
      }
      const res = await api.post<{ inviteUrl: string; message?: string }>('/api/auth/invites', body)
      form.reset()
      onOpenChange(false)
      onSuccess()
      toast.success(res.data.message ?? 'Invite created. Share the link with the user.')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create invite'
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
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Send an invite link to the user. They will sign up and be assigned to the selected organization or tenant.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id='invite-user-form' onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
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
              name='profile'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile</FormLabel>
                  <SelectDropdown
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    isControlled
                    placeholder='Select profile'
                    items={BASE_PROFILES.map(({ label, value }) => ({ label, value }))}
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
          <Button type='submit' form='invite-user-form' disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Invite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
