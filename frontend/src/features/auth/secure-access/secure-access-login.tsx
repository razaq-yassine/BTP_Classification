import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import ViteLogo from '@/assets/vite.svg'
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

const TEMP_TOKEN_KEY = '2fa_temp_token'
const MUST_CHANGE_PW_TOKEN_KEY = 'must_change_pw_token'

const formSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Please enter your username or email'),
  password: z.string().min(1, 'Please enter your password'),
})

export default function SecureAccessLogin() {
  const { t } = useTranslation('common')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)
  const checkAuth = useAuthStore((s) => s.checkAuth)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { usernameOrEmail: '', password: '' },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setError('')
    try {
      const result = await login(data.usernameOrEmail, data.password)
      if (result.success) {
        if (result.requiresTwoFactor && result.tempToken) {
          sessionStorage.setItem(TEMP_TOKEN_KEY, result.tempToken)
          sessionStorage.setItem('2fa_from_secure_access', '1')
          navigate({ to: '/login-verify-2fa' })
          return
        }
        if (result.mustChangePassword && result.tempToken) {
          sessionStorage.setItem(MUST_CHANGE_PW_TOKEN_KEY, result.tempToken)
          sessionStorage.setItem('2fa_from_secure_access', '1')
          navigate({ to: '/change-password-required' })
          return
        }
        const user = useAuthStore.getState().user
        if (user?.profile !== 'admin') {
          logout()
          setError('Use the main app to sign in. This page is for administrators only.')
        } else {
          await checkAuth()
          navigate({ to: '/dashboard' })
        }
      } else {
        setError(result.error || 'Login failed')
      }
    } catch (err) {
      setError(t('errors:unexpectedError', { defaultValue: 'An unexpected error occurred' }))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='relative container grid h-svh flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0'>
      <div className='bg-muted relative hidden h-full flex-col p-10 text-white lg:flex dark:border-r'>
        <div className='absolute inset-0 bg-zinc-900' />
        <div className='relative z-20 flex items-center text-lg font-medium'>
          <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='mr-2 h-6 w-6'>
            <path d='M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3' />
          </svg>
          Admin Access
        </div>
        <img src={ViteLogo} className='relative m-auto' width={301} height={60} alt='' />
        <div className='relative z-20 mt-auto'>
          <blockquote className='space-y-2'>
            <p className='text-lg'>&ldquo;Secure administrator login.&rdquo;</p>
            <footer className='text-sm'>Platform Admin</footer>
          </blockquote>
        </div>
      </div>
      <div className='lg:p-8'>
        <div className='mx-auto flex w-full flex-col justify-center space-y-2 sm:w-[350px]'>
          <div className='flex flex-col space-y-2 text-left'>
            <h1 className='text-2xl font-semibold tracking-tight'>Admin Login</h1>
            <p className='text-muted-foreground text-sm'>
              Sign in with your administrator account.
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='grid gap-3'>
              {error && (
                <div className='text-sm text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 p-3 rounded-md'>
                  {error}
                </div>
              )}
              <FormField
                control={form.control}
                name='usernameOrEmail'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username or email</FormLabel>
                    <FormControl>
                      <Input placeholder='Username or email' {...field} />
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
              <Button type='submit' className='mt-2' disabled={isLoading}>
                Sign in
              </Button>
            </form>
          </Form>
          <p className='text-muted-foreground text-center text-sm'>
            Not an admin?{' '}
            <Link to='/login' search={{ message: undefined }} className='hover:text-primary underline underline-offset-4'>
              Sign in to the main app
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
