import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { PasswordInput } from '@/components/password-input'
import api from '@/services/api'
import { toast } from 'sonner'

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

type ChangePasswordFormValues = z.infer<ReturnType<typeof getChangePasswordSchema>>

export function AccountForm() {
  const { t } = useTranslation('settings')
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(getChangePasswordSchema(t)),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    mode: 'onChange',
  })

  const handleSubmit = async (data: ChangePasswordFormValues) => {
    try {
      await api.post('/api/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      form.reset({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success(t('passwordChanged', { defaultValue: 'Password updated successfully' }))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('failedToUpdate', { defaultValue: 'Failed to update' })
      toast.error(msg)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-8'>
        <div className='space-y-4'>
          <h3 className='text-lg font-medium'>{t('changePassword', { defaultValue: 'Change password' })}</h3>
          <FormField
            control={form.control}
            name='currentPassword'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('currentPassword', { defaultValue: 'Current password' })}</FormLabel>
                <FormControl>
                  <PasswordInput placeholder='••••••••' {...field} />
                </FormControl>
                <FormDescription>{t('currentPasswordDescription', { defaultValue: 'Enter your current password to verify your identity.' })}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
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
            control={form.control}
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
        </div>
        <Button type='submit'>{t('updatePassword', { defaultValue: 'Update password' })}</Button>
      </form>
    </Form>
  )
}
