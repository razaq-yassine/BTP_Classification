import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
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
import { PasswordInput } from '@/components/password-input'

const MUST_CHANGE_PW_TOKEN_KEY = 'must_change_pw_token'

const formSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .refine((p) => /[a-z]/.test(p), 'Password must contain a lowercase letter')
      .refine((p) => /\d/.test(p), 'Password must contain a number'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] })

export const Route = createFileRoute('/change-password-required')({
  component: ChangePasswordRequiredPage,
  beforeLoad: () => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem(MUST_CHANGE_PW_TOKEN_KEY)) {
      throw redirect({ to: '/login', search: { message: undefined } })
    }
  },
})

function ChangePasswordRequiredPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const completePasswordChange = useAuthStore((s) => s.completePasswordChange)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    const token = sessionStorage.getItem(MUST_CHANGE_PW_TOKEN_KEY)
    if (!token) return
    setIsLoading(true)
    setError('')
    try {
      const result = await completePasswordChange(token, data.newPassword, data.confirmPassword)
      if (result.success) {
        sessionStorage.removeItem(MUST_CHANGE_PW_TOKEN_KEY)
        navigate({ to: '/dashboard' })
      } else {
        setError(result.error || 'Failed to change password')
      }
    } catch {
      setError('An unexpected error occurred')
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
          Shadcn Admin
        </div>
        <img src={ViteLogo} className='relative m-auto' width={301} height={60} alt='' />
        <div className='relative z-20 mt-auto'>
          <blockquote className='space-y-2'>
            <p className='text-lg'>&ldquo;You must change your password before continuing.&rdquo;</p>
          </blockquote>
        </div>
      </div>
      <div className='lg:p-8'>
        <div className='mx-auto flex w-full flex-col justify-center space-y-2 sm:w-[350px]'>
          <h1 className='text-2xl font-semibold tracking-tight'>Change password required</h1>
          <p className='text-muted-foreground text-sm'>
            Your administrator has required you to change your password. Please enter a new password below.
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
                control={form.control}
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
              <Button type='submit' className='mt-2' disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Update password'}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
