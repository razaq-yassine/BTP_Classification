import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '@/services/api'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/confirm-email-change')({
  component: ConfirmEmailChangePage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || '',
  }),
})

function ConfirmEmailChangePage() {
  const { token } = Route.useSearch()
  const { t } = useTranslation('common')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const hasSettled = useRef(false)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage(t('confirmEmailChangeNoToken', { defaultValue: 'No confirmation token provided.' }))
      return
    }
    const controller = new AbortController()
    api
      .get(`/api/auth/confirm-email-change?token=${encodeURIComponent(token)}`, { signal: controller.signal })
      .then(() => {
        hasSettled.current = true
        setStatus('success')
        setMessage(t('confirmEmailChangeSuccess', { defaultValue: 'Your email has been changed successfully. You can now sign in with your new email.' }))
      })
      .catch((err) => {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
        if (hasSettled.current) return
        setStatus('error')
        setMessage(err?.response?.data?.message || t('confirmEmailChangeError', { defaultValue: 'Invalid or expired confirmation link.' }))
      })
    return () => controller.abort()
  }, [token, t])

  return (
    <div className='flex min-h-screen flex-col items-center justify-center p-6'>
      <div className='w-full max-w-md space-y-6 rounded-lg border bg-card p-8 text-center shadow-sm'>
        {status === 'loading' && (
          <p className='text-muted-foreground'>{t('confirming', { defaultValue: 'Confirming your new email...' })}</p>
        )}
        {status === 'success' && (
          <>
            <p className='text-foreground font-medium text-green-600 dark:text-green-400'>{message}</p>
            <div className='flex flex-col gap-2'>
              <Button asChild>
                <Link to='/login'>{t('goToLogin', { defaultValue: 'Go to login' })}</Link>
              </Button>
              <Button variant='outline' asChild>
                <Link to='/settings'>{t('goToSettings', { defaultValue: 'Go to settings' })}</Link>
              </Button>
            </div>
          </>
        )}
        {status === 'error' && (
          <>
            <p className='text-destructive'>{message}</p>
            <Button asChild>
              <Link to='/login'>{t('goToLogin', { defaultValue: 'Go to login' })}</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
