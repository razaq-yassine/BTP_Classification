import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Main } from '@/components/layout/main'
import { SelectDropdown } from '@/components/select-dropdown'
import { RecordLookup } from '@/components/ui/record-lookup'
import api from '@/services/api'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsUser, type UserDetail } from '../hooks/useSettingsUser'
import { getProfileNames, getProfile } from '@/services/profiles-api'

function formatProfileLabel(name: string): string {
  return name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const profileFormSchema = z.object({
  firstName: z.string().max(255).optional().nullable(),
  lastName: z.string().max(255).optional().nullable(),
  email: z.string().email().optional(),
  profile: z.string().optional(),
  organizationId: z.number().nullable().optional(),
  tenantId: z.number().nullable().optional(),
})

const changePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .refine((p) => /[a-z]/.test(p), 'Password must contain a lowercase letter')
      .refine((p) => /\d/.test(p), 'Password must contain a number'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
    forceReset: z.boolean().optional(),
    notifyUser: z.boolean().optional(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] })

type ProfileFormValues = z.infer<typeof profileFormSchema>
type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

const FALLBACK_PROFILES = [
  { label: 'Standard User', value: 'standard-user' },
  { label: 'Admin', value: 'admin' },
]

interface Props {
  userId: string
}

/** Form component that only mounts when user is loaded - ensures correct defaultValues */
function UserProfileForm({
  user,
  userId,
  isAdmin,
  canManageOrg,
  currentUser,
  onRefetch,
  emailConfigured,
}: {
  user: UserDetail
  userId: string
  isAdmin: boolean
  canManageOrg: boolean
  currentUser: { id?: number } | null
  onRefetch: () => void
  emailConfigured: boolean
}) {
  const { data: profileNames = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => getProfileNames(),
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
    enabled: profileNames.length > 0,
  })
  const profileOptions = profilesWithLabels.length > 0 ? profilesWithLabels : FALLBACK_PROFILES
  // Ensure current user's profile is in the list (e.g. custom profile from business project)
  const optionsWithCurrent = user.profile && !profileOptions.some((p) => p.value === user.profile)
    ? [...profileOptions, { label: formatProfileLabel(user.profile), value: user.profile }]
    : profileOptions

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email ?? '',
      profile: user.profile ?? 'standard-user',
      organizationId: user.organizationId ?? null,
      tenantId: user.tenantId ?? null,
    },
    mode: 'onChange',
  })

  const selectedOrgId = profileForm.watch('organizationId')

  useEffect(() => {
    profileForm.reset({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email ?? '',
      profile: user.profile ?? 'standard-user',
      organizationId: user.organizationId ?? null,
      tenantId: user.tenantId ?? null,
    })
  }, [user, profileForm])

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '', forceReset: false, notifyUser: false },
    mode: 'onChange',
  })

  const [enabling2FA, setEnabling2FA] = useState(false)
  const [disabling2FA, setDisabling2FA] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const navigate = useNavigate()

  const handleEnable2FA = async () => {
    if (!userId) return
    setEnabling2FA(true)
    try {
      await api.post(`/api/auth/users/${userId}/enable-2fa`)
      await onRefetch()
      toast.success('Two-factor authentication enabled')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to enable 2FA'
      toast.error(msg)
    } finally {
      setEnabling2FA(false)
    }
  }

  const handleDisable2FA = async () => {
    if (!userId) return
    setDisabling2FA(true)
    try {
      await api.post(`/api/auth/users/${userId}/disable-2fa`)
      await onRefetch()
      toast.success('Two-factor authentication disabled')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to disable 2FA'
      toast.error(msg)
    } finally {
      setDisabling2FA(false)
    }
  }

  const handleProfileSubmit = async (data: ProfileFormValues) => {
    if (!userId) return
    try {
      const body: Record<string, unknown> = {
        firstName: data.firstName?.trim() || null,
        lastName: data.lastName?.trim() || null,
      }
      if (isAdmin) {
        if (data.email?.trim()) body.email = data.email.trim().toLowerCase()
        if (data.profile) body.profile = data.profile
        body.organizationId = data.organizationId ?? null
        body.tenantId = data.tenantId ?? null
      } else if (canManageOrg && data.profile) {
        body.profile = data.profile
      }
      await api.patch(`/api/auth/users/${userId}`, body)
      await onRefetch()
      toast.success('User updated successfully')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update'
      toast.error(msg)
    }
  }

  const handlePasswordSubmit = async (data: ChangePasswordFormValues) => {
    if (!userId) return
    setPasswordLoading(true)
    try {
      await api.post(`/api/auth/users/${userId}/change-password`, {
        newPassword: data.newPassword,
        forceReset: data.forceReset ?? false,
        notifyUser: data.notifyUser ?? false,
      })
      passwordForm.reset({ newPassword: '', confirmPassword: '', forceReset: false, notifyUser: false })
      toast.success('Password updated successfully')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update password'
      toast.error(msg)
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <Main>
      <div className='space-y-6'>
        <div className='flex items-center gap-4'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => navigate({ to: '/settings/users' })}
            aria-label='Back to users'
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h2 className='text-lg font-semibold'>
              {user.firstName || user.lastName ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : user.username}
            </h2>
            <p className='text-muted-foreground text-sm'>@{user.username}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Edit user profile and settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className='space-y-6'>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <FormField
                    control={profileForm.control}
                    name='firstName'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First name</FormLabel>
                        <FormControl>
                          <Input placeholder='First name' {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name='lastName'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last name</FormLabel>
                        <FormControl>
                          <Input placeholder='Last name' {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='space-y-2'>
                    <FormLabel>Username</FormLabel>
                    <Input value={user.username} disabled className='font-mono bg-muted' />
                    <p className='text-muted-foreground text-xs'>Username cannot be changed.</p>
                  </div>
                  {isAdmin ? (
                    <FormField
                      control={profileForm.control}
                      name='email'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type='email' placeholder='email@example.com' {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className='space-y-2'>
                      <FormLabel>Email</FormLabel>
                      <Input value={user.email} disabled className='font-mono bg-muted' />
                    </div>
                  )}
                </div>
                {(isAdmin || canManageOrg) && (
                  <div className='grid gap-4 sm:grid-cols-2'>
                        <FormField
                          control={profileForm.control}
                          name='profile'
                          render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profile</FormLabel>
                          <SelectDropdown
                            key={`profile-${user.profile ?? ''}`}
                            defaultValue={field.value}
                            onValueChange={field.onChange}
                            isControlled
                            placeholder='Select profile'
                            items={(isAdmin ? optionsWithCurrent : optionsWithCurrent.filter((p) => p.value !== 'admin')).map(({ label, value }) => ({ label, value }))}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {isAdmin && (
                      <>
                        <FormField
                          control={profileForm.control}
                          name='organizationId'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization</FormLabel>
                              <FormControl>
                                <RecordLookup
                                  objectName='organization'
                                  value={field.value ?? undefined}
                                  onValueChange={(v) => {
                                    field.onChange(v)
                                    profileForm.setValue('tenantId', null)
                                  }}
                                  placeholder='Search organization...'
                                  searchBy='name'
                                  userId={currentUser?.id}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name='tenantId'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tenant</FormLabel>
                              <FormControl>
                                <RecordLookup
                                  objectName='tenant'
                                  value={field.value ?? undefined}
                                  onValueChange={field.onChange}
                                  placeholder='Search tenant...'
                                  searchBy='name'
                                  filterParams={selectedOrgId != null ? { organizationId: selectedOrgId } : undefined}
                                  userId={currentUser?.id}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>
                )}
                <div className='flex items-center gap-2'>
                  <Badge variant='outline' className={user.isActive ? 'bg-teal-100/30 text-teal-900 dark:text-teal-200' : 'bg-neutral-300/40'}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {user.emailVerified && (
                    <Badge variant='secondary'>Email verified</Badge>
                  )}
                </div>
                <Button type='submit'>Update profile</Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Two-factor authentication</CardTitle>
            <CardDescription>Enable or disable two-factor authentication for this user. When enabled, they will receive a verification code by email when signing in.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex flex-wrap items-center gap-2'>
              {user.twoFactorEnabled ? (
                <>
                  <Badge variant='default' className='bg-green-600 hover:bg-green-600'>Enabled</Badge>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleDisable2FA}
                    disabled={disabling2FA}
                  >
                    {disabling2FA ? 'Disabling...' : 'Disable 2FA'}
                  </Button>
                </>
              ) : (
                <>
                  <Badge variant='secondary'>Disabled</Badge>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleEnable2FA}
                    disabled={!emailConfigured || enabling2FA}
                  >
                    {enabling2FA ? 'Enabling...' : 'Enable 2FA'}
                  </Button>
                </>
              )}
            </div>
            {!emailConfigured && !user.twoFactorEnabled && (
              <p className='text-sm text-amber-600 dark:text-amber-500'>
                Two-factor authentication requires SMTP to be configured. Please contact your administrator.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>Set a new password for this user. No current password is required.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className='space-y-6'>
                <FormField
                  control={passwordForm.control}
                  name='newPassword'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder='••••••••' {...field} />
                      </FormControl>
                      <p className='text-muted-foreground text-xs'>At least 8 characters, one lowercase letter, and one number.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name='confirmPassword'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm new password</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder='••••••••' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className='flex flex-col gap-4'>
                  <FormField
                    control={passwordForm.control}
                    name='forceReset'
                    render={({ field }) => (
                      <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                        <FormControl>
                          <Checkbox
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className='space-y-1 leading-none'>
                          <FormLabel className='font-normal'>Force user to reset password after first login</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name='notifyUser'
                    render={({ field }) => (
                      <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                        <FormControl>
                          <Checkbox
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                            disabled={!user.emailVerified}
                          />
                        </FormControl>
                        <div className='space-y-1 leading-none'>
                          <FormLabel className='font-normal'>
                            Notify user via email
                            {!user.emailVerified && (
                              <span className='text-muted-foreground ml-1 text-xs'>(Email not verified)</span>
                            )}
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                <Button type='submit' disabled={passwordLoading}>
                  {passwordLoading ? 'Updating...' : 'Update password'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}

export function SettingsUserDetail({ userId }: Props) {
  const currentUser = useAuthStore((s) => s.user)
  const isAdmin = (currentUser?.profile ?? '').toLowerCase() === 'admin'
  const canManageOrg = isAdmin || (currentUser?.organizationId ?? null) != null
  const { data: user, isLoading, error, refetch } = useSettingsUser(userId)
  const { data: emailConfigured = false } = useQuery({
    queryKey: ['config', 'email-ready'],
    queryFn: async () => {
      const { data } = await api.get<{ emailConfigured?: boolean }>('/api/config/email-ready')
      return data?.emailConfigured ?? false
    },
  })

  if (isLoading || !user) {
    return (
      <Main>
        <div className='py-8 text-muted-foreground text-sm'>
          {error ? 'User not found' : 'Loading...'}
        </div>
      </Main>
    )
  }

  return (
    <UserProfileForm
      user={user}
      userId={userId}
      isAdmin={isAdmin}
      canManageOrg={canManageOrg}
      currentUser={currentUser}
      onRefetch={refetch}
      emailConfigured={emailConfigured}
    />
  )
}
