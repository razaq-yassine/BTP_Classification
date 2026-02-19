import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import api from '@/services/api'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'

const profileFormSchema = z.object({
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
})

const getChangePasswordSchema = (t: (key: string) => string) =>
  z
    .object({
      currentPassword: z.string().min(1, t('currentPasswordRequired')),
      newPassword: z
        .string()
        .min(8, t('passwordMinLength'))
        .refine((p) => /[a-z]/.test(p), t('passwordLowercase'))
        .refine((p) => /\d/.test(p), t('passwordNumber')),
      confirmPassword: z.string().min(1, t('confirmPasswordRequired')),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t('passwordsDoNotMatch'),
      path: ['confirmPassword'],
    })

type ProfileFormValues = z.infer<typeof profileFormSchema>
type ChangePasswordFormValues = z.infer<ReturnType<typeof getChangePasswordSchema>>

export default function ProfileForm() {
  const { t } = useTranslation('settings')
  const checkAuth = useAuthStore((s) => s.checkAuth)
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(true)
  const [emailConfigured, setEmailConfigured] = useState(false)
  const [sendingVerification, setSendingVerification] = useState(false)
  const [enabling2FA, setEnabling2FA] = useState(false)
  const [disable2FADialogOpen, setDisable2FADialogOpen] = useState(false)
  const [disable2FAPassword, setDisable2FAPassword] = useState('')
  const [disabling2FA, setDisabling2FA] = useState(false)
  const [changeEmailDialogOpen, setChangeEmailDialogOpen] = useState(false)
  const [changeEmailNewEmail, setChangeEmailNewEmail] = useState('')
  const [changeEmailPassword, setChangeEmailPassword] = useState('')
  const [requestingEmailChange, setRequestingEmailChange] = useState(false)

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { firstName: '', lastName: '' },
    mode: 'onChange',
  })

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(getChangePasswordSchema(t)),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    mode: 'onChange',
  })

  useEffect(() => {
    api
      .get('/api/auth/me')
      .then((res) => {
        profileForm.reset({
          firstName: res.data?.firstName ?? '',
          lastName: res.data?.lastName ?? '',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [profileForm])

  useEffect(() => {
    api
      .get('/api/config/email-ready')
      .then((res) => setEmailConfigured(res.data?.emailConfigured ?? false))
      .catch(() => setEmailConfigured(false))
  }, [])

  const handleProfileSubmit = async (data: ProfileFormValues) => {
    try {
      await api.patch('/api/auth/me', {
        firstName: data.firstName?.trim() || null,
        lastName: data.lastName?.trim() || null,
      })
      await checkAuth()
      toast.success(t('profileUpdated', { defaultValue: 'Profile updated' }))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('failedToUpdate', { defaultValue: 'Failed to update' })
      toast.error(msg)
    }
  }

  const handlePasswordSubmit = async (data: ChangePasswordFormValues) => {
    try {
      await api.post('/api/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success(t('passwordChanged', { defaultValue: 'Password updated successfully' }))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('failedToUpdate', { defaultValue: 'Failed to update' })
      toast.error(msg)
    }
  }

  const handleSendVerificationEmail = async () => {
    setSendingVerification(true)
    try {
      await api.post('/api/auth/send-verification-email')
      await checkAuth()
      toast.success(t('verificationEmailSent', { defaultValue: 'Verification email sent. Check your inbox.' }))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('failedToUpdate', { defaultValue: 'Failed to update' })
      toast.error(msg)
    } finally {
      setSendingVerification(false)
    }
  }

  const handleEnable2FA = async () => {
    setEnabling2FA(true)
    try {
      await api.post('/api/auth/enable-2fa')
      await checkAuth()
      toast.success(t('twoFactorEnabledSuccess', { defaultValue: 'Two-factor authentication enabled' }))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('failedToUpdate', { defaultValue: 'Failed to update' })
      toast.error(msg)
    } finally {
      setEnabling2FA(false)
    }
  }

  const handleRequestEmailChange = async () => {
    const newEmail = changeEmailNewEmail.trim().toLowerCase()
    if (!newEmail) {
      toast.error(t('invalidEmail', { defaultValue: 'Please enter a valid email address' }))
      return
    }
    if (!changeEmailPassword.trim()) {
      toast.error(t('passwordRequired', { defaultValue: 'Password is required' }))
      return
    }
    setRequestingEmailChange(true)
    try {
      await api.post('/api/auth/request-email-change', {
        newEmail,
        password: changeEmailPassword,
      })
      setChangeEmailDialogOpen(false)
      setChangeEmailNewEmail('')
      setChangeEmailPassword('')
      toast.success(t('emailChangeVerificationSent', { defaultValue: 'Verification email sent. Check your new email inbox to confirm the change.' }))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('failedToUpdate', { defaultValue: 'Failed to update' })
      toast.error(msg)
    } finally {
      setRequestingEmailChange(false)
    }
  }

  const handleDisable2FA = async () => {
    if (!disable2FAPassword.trim()) {
      toast.error(t('passwordRequired', { defaultValue: 'Password is required' }))
      return
    }
    setDisabling2FA(true)
    try {
      await api.post('/api/auth/disable-2fa', { password: disable2FAPassword })
      await checkAuth()
      setDisable2FADialogOpen(false)
      setDisable2FAPassword('')
      toast.success(t('twoFactorDisabledSuccess', { defaultValue: 'Two-factor authentication disabled' }))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('failedToUpdate', { defaultValue: 'Failed to update' })
      toast.error(msg)
    } finally {
      setDisabling2FA(false)
    }
  }

  return (
    <div className='space-y-4 sm:space-y-6 md:space-y-8 w-full max-w-full'>
      {/* Profile information */}
      <Card className='w-full'>
        <CardHeader>
          <CardTitle>{t('profileInformation', { defaultValue: 'Profile information' })}</CardTitle>
          <CardDescription>{t('profilePageDescription', { defaultValue: 'This is how others will see you on the site.' })}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className='space-y-6'>
              <div className='grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2'>
                <FormField
                  control={profileForm.control}
                  name='firstName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('firstName', { defaultValue: 'First name' })}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('firstNamePlaceholder', { defaultValue: 'Your first name' })} {...field} disabled={loading} />
                      </FormControl>
                      <FormDescription>{t('firstNameDescription', { defaultValue: 'Your first name as shown to others.' })}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name='lastName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('lastName', { defaultValue: 'Last name' })}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('lastNamePlaceholder', { defaultValue: 'Your last name' })} {...field} disabled={loading} />
                      </FormControl>
                      <FormDescription>{t('lastNameDescription', { defaultValue: 'Your last name as shown to others.' })}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className='grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2'>
                <div className='space-y-2 min-w-0'>
                  <FormLabel>{t('username', { defaultValue: 'Username' })}</FormLabel>
                  <Input value={user?.username ?? ''} disabled className='font-mono bg-muted' />
                  <FormDescription>{t('usernameReadOnly', { defaultValue: 'Username cannot be changed here.' })}</FormDescription>
                </div>
                <div className='space-y-2 min-w-0'>
                  <FormLabel>
                    {user?.pendingEmail ? t('currentEmail', { defaultValue: 'Current email' }) : t('email', { defaultValue: 'Email' })}
                  </FormLabel>
                  <div className='flex flex-col gap-2'>
                    <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                      <Input value={user?.email ?? ''} disabled className='font-mono bg-muted min-w-0 flex-1' type='email' />
                      {user?.emailVerified ? (
                        <Badge variant='default' className='shrink-0 bg-green-600 hover:bg-green-600'>
                          {t('emailVerified', { defaultValue: 'Verified' })}
                        </Badge>
                      ) : (
                        <Badge variant='secondary' className='shrink-0'>
                          {t('emailNotVerified', { defaultValue: 'Not verified' })}
                        </Badge>
                      )}
                    </div>
                    {!user?.emailVerified && !user?.pendingEmail && (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={handleSendVerificationEmail}
                        disabled={!emailConfigured || sendingVerification || loading}
                      >
                        {sendingVerification
                          ? t('sending', { defaultValue: 'Sending...' })
                          : t('verifyEmail', { defaultValue: 'Verify email' })}
                      </Button>
                    )}
                    {!emailConfigured && !user?.emailVerified && (
                      <FormDescription className='text-amber-600 dark:text-amber-500'>
                        {t('smtpNotConfigured', { defaultValue: 'Email verification is unavailable until SMTP is configured by your administrator.' })}
                      </FormDescription>
                    )}
                    {user?.pendingEmail && (
                      <div className='space-y-1'>
                        <FormLabel className='text-amber-700 dark:text-amber-400'>
                          {t('newEmailPending', { defaultValue: 'New email (pending verification)' })}
                        </FormLabel>
                        <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                          <Input value={user.pendingEmail} disabled className='font-mono bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 min-w-0 flex-1' type='email' />
                        <Badge variant='outline' className='shrink-0 border-amber-500 text-amber-700 dark:text-amber-400'>
                          {t('pendingVerification', { defaultValue: 'Pending verification' })}
                        </Badge>
                        </div>
                      </div>
                    )}
                    {emailConfigured && !user?.pendingEmail && (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => setChangeEmailDialogOpen(true)}
                        disabled={loading}
                      >
                        {t('changeEmail', { defaultValue: 'Change email' })}
                      </Button>
                    )}
                  </div>
                  <FormDescription>
                    {user?.pendingEmail
                      ? t('pendingEmailDescription', { defaultValue: 'Check your new email inbox and click the verification link to complete the change.' })
                      : emailConfigured
                        ? t('emailChangeDescription', { defaultValue: 'To change your email, click the button above. You will need to verify the new address.' })
                        : t('emailReadOnly', { defaultValue: 'Email cannot be changed here.' })}
                  </FormDescription>
                </div>
              </div>
              <Button type='submit' disabled={loading}>
                {t('updateProfile', { defaultValue: 'Update profile' })}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Two-factor authentication */}
      <Card className='w-full'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            {t('twoFactorAuthentication', { defaultValue: 'Two-factor authentication' })}
            <Badge variant='secondary' className='text-xs font-normal'>
              {t('recommended', { defaultValue: 'Recommended' })}
            </Badge>
          </CardTitle>
          <CardDescription>
            {t('twoFactorDescription', { defaultValue: 'Add an extra layer of security to your account. When enabled, you will receive a verification code by email when signing in.' })}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex flex-wrap items-center gap-2'>
            {user?.twoFactorEnabled ? (
              <>
                <Badge variant='default' className='bg-green-600 hover:bg-green-600'>
                  {t('twoFactorStatusEnabled', { defaultValue: 'Enabled' })}
                </Badge>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setDisable2FADialogOpen(true)}
                  disabled={loading}
                >
                  {t('disable2FA', { defaultValue: 'Disable 2FA' })}
                </Button>
              </>
            ) : (
              <>
                <Badge variant='secondary'>{t('twoFactorStatusDisabled', { defaultValue: 'Disabled' })}</Badge>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleEnable2FA}
                  disabled={!emailConfigured || enabling2FA || loading}
                >
                  {enabling2FA ? t('enabling', { defaultValue: 'Enabling...' }) : t('enable2FA', { defaultValue: 'Enable 2FA' })}
                </Button>
              </>
            )}
          </div>
          {!emailConfigured && !user?.twoFactorEnabled && (
            <p className='text-sm text-amber-600 dark:text-amber-500'>
              {t('smtpRequiredFor2FA', { defaultValue: 'Two-factor authentication requires SMTP to be configured. Please contact your administrator.' })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Change email dialog */}
      <Dialog
        open={changeEmailDialogOpen}
        onOpenChange={(open) => {
          setChangeEmailDialogOpen(open)
          if (!open) {
            setChangeEmailNewEmail('')
            setChangeEmailPassword('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('changeEmailTitle', { defaultValue: 'Change email address' })}</DialogTitle>
            <DialogDescription>
              {t('changeEmailDescription', { defaultValue: 'Enter your new email address and current password. A verification link will be sent to your new email.' })}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label>{t('newEmail', { defaultValue: 'New email' })}</Label>
              <Input
                type='email'
                placeholder='new@example.com'
                value={changeEmailNewEmail}
                onChange={(e) => setChangeEmailNewEmail(e.target.value)}
                disabled={requestingEmailChange}
              />
            </div>
            <div className='space-y-2'>
              <Label>{t('currentPassword', { defaultValue: 'Current password' })}</Label>
              <PasswordInput
                placeholder='••••••••'
                value={changeEmailPassword}
                onChange={(e) => setChangeEmailPassword(e.target.value)}
                disabled={requestingEmailChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setChangeEmailDialogOpen(false)} disabled={requestingEmailChange}>
              {t('cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button onClick={handleRequestEmailChange} disabled={requestingEmailChange || !changeEmailNewEmail.trim() || !changeEmailPassword.trim()}>
              {requestingEmailChange ? t('sending', { defaultValue: 'Sending...' }) : t('sendVerificationEmail', { defaultValue: 'Send verification email' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable 2FA dialog */}
      <Dialog open={disable2FADialogOpen} onOpenChange={setDisable2FADialogOpen}>
        <DialogContent className='w-[calc(100%-2rem)] max-w-full sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>{t('disable2FATitle', { defaultValue: 'Disable two-factor authentication' })}</DialogTitle>
            <DialogDescription>
              {t('disable2FADescription', { defaultValue: 'Enter your password to confirm you want to disable two-factor authentication.' })}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label>{t('currentPassword', { defaultValue: 'Current password' })}</Label>
              <PasswordInput
                placeholder='••••••••'
                value={disable2FAPassword}
                onChange={(e) => setDisable2FAPassword(e.target.value)}
                disabled={disabling2FA}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDisable2FADialogOpen(false)} disabled={disabling2FA}>
              {t('cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button onClick={handleDisable2FA} disabled={disabling2FA || !disable2FAPassword.trim()}>
              {disabling2FA ? t('disabling', { defaultValue: 'Disabling...' }) : t('disable2FA', { defaultValue: 'Disable 2FA' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Security - Change password */}
      <Card className='w-full'>
        <CardHeader>
          <CardTitle>{t('changePassword', { defaultValue: 'Change password' })}</CardTitle>
          <CardDescription>{t('currentPasswordDescription', { defaultValue: 'Enter your current password to verify your identity.' })}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className='space-y-6'>
              <FormField
                control={passwordForm.control}
                name='currentPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('currentPassword', { defaultValue: 'Current password' })}</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder='••••••••' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name='newPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('newPassword', { defaultValue: 'New password' })}</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder='••••••••' {...field} />
                    </FormControl>
                    <FormDescription>{t('passwordRequirements', { defaultValue: 'At least 8 characters, one lowercase letter, and one number.' })}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('confirmPassword', { defaultValue: 'Confirm new password' })}</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder='••••••••' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type='submit'>{t('updatePassword', { defaultValue: 'Update password' })}</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
