import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp'

const TEMP_TOKEN_KEY = '2fa_temp_token'
const MUST_CHANGE_PW_TOKEN_KEY = 'must_change_pw_token'

const formSchema = z.object({
  code: z.string().length(6, 'Please enter the 6-digit code'),
})

export const Route = createFileRoute('/login-verify-2fa')({
  component: LoginVerify2FAPage,
  beforeLoad: () => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem(TEMP_TOKEN_KEY)) {
      throw redirect({ to: '/login', search: { message: undefined } })
    }
  },
})

function LoginVerify2FAPage() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const verify2FA = useAuthStore((s) => s.verify2FA)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: '' },
  })

  const code = form.watch('code')

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    const token = sessionStorage.getItem(TEMP_TOKEN_KEY)
    if (!token || data.code.length !== 6) return
    setIsLoading(true)
    setError('')
    try {
      const result = await verify2FA(token, data.code)
      if (result.success) {
        sessionStorage.removeItem(TEMP_TOKEN_KEY)
        if (result.mustChangePassword && result.tempToken) {
          sessionStorage.setItem(MUST_CHANGE_PW_TOKEN_KEY, result.tempToken)
          navigate({ to: '/change-password-required' })
          return
        }
        const fromSecureAccess = sessionStorage.getItem('2fa_from_secure_access')
        sessionStorage.removeItem('2fa_from_secure_access')
        if (fromSecureAccess) {
          const user = useAuthStore.getState().user
          if (user?.profile !== 'admin') {
            useAuthStore.getState().logout()
            navigate({ to: '/login', search: { message: 'Use the main app to sign in.' } })
            return
          }
        }
        navigate({ to: '/dashboard' })
      } else {
        setError(result.error || 'Invalid code')
      }
    } catch {
      setError(t('errors:unexpectedError', { defaultValue: 'An unexpected error occurred' }))
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    sessionStorage.removeItem(TEMP_TOKEN_KEY)
    navigate({ to: '/login', search: { message: undefined }, replace: true })
  }

  return (
    <div className='relative container grid h-svh flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0'>
      <div className='bg-muted relative hidden h-full flex-col p-10 text-white lg:flex dark:border-r'>
        <div className='absolute inset-0 bg-zinc-900' />
        <div className='relative z-20 flex items-center text-lg font-medium'>
          <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='mr-2 h-6 w-6'>
            <path d='M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3' />
          </svg>
          Shadcn Admin
        </div>
        <img src={ViteLogo} className='relative m-auto' width={301} height={60} alt='' />
        <div className='relative z-20 mt-auto'>
          <blockquote className='space-y-2'>
            <p className='text-lg'>&ldquo;This template has saved me countless hours of work.&rdquo;</p>
            <footer className='text-sm'>John Doe</footer>
          </blockquote>
        </div>
      </div>
      <div className='lg:p-8'>
        <div className='mx-auto flex w-full flex-col justify-center space-y-2 sm:w-[350px]'>
          <h1 className='text-2xl font-semibold tracking-tight'>
            {t('verificationCode', { defaultValue: 'Verification code' })}
          </h1>
          <p className='text-muted-foreground text-sm'>
            Enter the 6-digit code sent to your email.
          </p>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className='grid gap-3'>
              {error && (
                <div className='text-sm text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 p-3 rounded-md'>
                  {error}
                </div>
              )}
              <FormField
                control={form.control}
                name='code'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='sr-only'>{t('verificationCode', { defaultValue: 'Verification code' })}</FormLabel>
                    <FormControl>
                      <InputOTP
                        maxLength={6}
                        {...field}
                        containerClassName='justify-between sm:[&>[data-slot="input-otp-group"]>div]:w-12'
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type='submit' className='mt-2' disabled={isLoading || code.length !== 6}>
                {t('verify', { defaultValue: 'Verify' })}
              </Button>
              <Button type='button' variant='ghost' className='text-sm' onClick={handleBack} disabled={isLoading}>
                {t('back', { defaultValue: 'Back' })}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
