import { HTMLAttributes, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { IconBrandGoogle } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
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

type UserAuthFormProps = HTMLAttributes<HTMLFormElement>

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const { t } = useTranslation('common')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)

  const formSchema = z.object({
    usernameOrEmail: z.string().min(1, t('pleaseEnterUsernameOrEmail')),
    password: z.string().min(1, t('pleaseEnterPassword')),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      usernameOrEmail: '',
      password: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setError('')
    try {
      const result = await login(data.usernameOrEmail, data.password)
      if (result.success) {
        if (result.requiresTwoFactor && result.tempToken) {
          sessionStorage.setItem(TEMP_TOKEN_KEY, result.tempToken)
          navigate({ to: '/login-verify-2fa' })
        } else if (result.mustChangePassword && result.tempToken) {
          sessionStorage.setItem(MUST_CHANGE_PW_TOKEN_KEY, result.tempToken)
          navigate({ to: '/change-password-required' })
        } else {
          navigate({ to: '/dashboard' })
        }
      } else {
        setError(result.error || t('loginFailed'))
      }
    } catch (err) {
      setError(t('errors:unexpectedError'))
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
          name='usernameOrEmail'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('usernameOrEmail')}</FormLabel>
              <FormControl>
                <Input placeholder={t('usernameOrEmailPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem className='relative'>
              <FormLabel>{t('password')}</FormLabel>
              <FormControl>
                <PasswordInput placeholder='********' {...field} />
              </FormControl>
              <FormMessage />
              <Link
                to='/forgot-password'
                className='text-muted-foreground absolute -top-0.5 right-0 text-sm font-medium hover:opacity-75'
              >
                {t('forgotPassword')}
              </Link>
            </FormItem>
          )}
        />
        <Button type='submit' className='mt-2' disabled={isLoading}>
          {t('login')}
        </Button>

        <div className='hidden'>
          <div className='relative my-2'>
            <div className='absolute inset-0 flex items-center'>
              <span className='w-full border-t' />
            </div>
            <div className='relative flex justify-center text-xs uppercase'>
              <span className='bg-background text-muted-foreground px-2'>
                {t('orContinueWith')}
              </span>
            </div>
          </div>

          <Button variant='outline' type='button' disabled={isLoading}>
            <IconBrandGoogle className='h-4 w-4' /> {t('continueWithGoogle')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
