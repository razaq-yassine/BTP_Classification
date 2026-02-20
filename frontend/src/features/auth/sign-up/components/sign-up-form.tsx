import { HTMLAttributes, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
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

type SignUpFormProps = HTMLAttributes<HTMLFormElement> & {
  inviteToken: string
  defaultEmail?: string
}

const getFormSchema = (t: (key: string, options?: { defaultValue?: string }) => string) =>
  z
    .object({
      username: z
        .string()
        .min(2, t('usernameMinLength', { defaultValue: 'Username must be at least 2 characters' }))
        .max(255)
        .regex(/^[a-zA-Z0-9_-]+$/, t('usernameFormat', { defaultValue: 'Username can only contain letters, numbers, underscores and hyphens' })),
      email: z.string().email(t('pleaseEnterEmail', { defaultValue: 'Please enter a valid email' })),
      password: z
        .string()
        .min(1, t('pleaseEnterPassword'))
        .min(8, t('passwordMinLength', { defaultValue: 'Password must be at least 8 characters' }))
        .refine((p) => /[a-z]/.test(p), t('passwordLowercase', { defaultValue: 'Password must contain at least one lowercase letter' }))
        .refine((p) => /\d/.test(p), t('passwordNumber', { defaultValue: 'Password must contain at least one number' })),
      confirmPassword: z.string().min(1, t('pleaseConfirmPassword')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('passwordsDoNotMatch', { defaultValue: "Passwords don't match" }),
      path: ['confirmPassword'],
    })

export function SignUpForm({ className, inviteToken, defaultEmail, ...props }: SignUpFormProps) {
  const { t } = useTranslation('common')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const checkAuth = useAuthStore((s) => s.checkAuth)

  const form = useForm<z.infer<ReturnType<typeof getFormSchema>>>({
    resolver: zodResolver(getFormSchema(t)),
    defaultValues: {
      username: '',
      email: defaultEmail ?? '',
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(data: z.infer<ReturnType<typeof getFormSchema>>) {
    setIsLoading(true)
    setError('')
    try {
      const response = await api.post('/api/auth/register', {
        inviteToken,
        username: data.username.trim(),
        email: data.email.trim(),
        password: data.password,
      })
      const { accessToken } = response.data
      localStorage.setItem('jwt_token', accessToken)
      await checkAuth()
      navigate({ to: '/dashboard' })
    } catch (err: any) {
      setError(err.response?.data?.message ?? t('errors:unexpectedError', { defaultValue: 'An unexpected error occurred' }))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        {error && (
          <div className='text-sm text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 p-3 rounded-md'>
            {error}
          </div>
        )}
        <FormField
          control={form.control}
          name='username'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('username', { defaultValue: 'Username' })}</FormLabel>
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
              <FormLabel>{t('email', { defaultValue: 'Email' })}</FormLabel>
              <FormControl>
                <Input placeholder='name@example.com' type='email' {...field} />
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
              <FormLabel>{t('confirmPassword')}</FormLabel>
              <FormControl>
                <PasswordInput placeholder='********' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          Create Account
        </Button>
      </form>
    </Form>
  )
}
