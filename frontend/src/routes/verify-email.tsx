import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '@/services/api'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/verify-email')({
  component: VerifyEmailPage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || '',
  }),
})

function VerifyEmailPage() {
  const { token } = Route.useSearch()
  const { t } = useTranslation('common')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const hasSettled = useRef(false)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage(t('verifyEmailNoToken', { defaultValue: 'No verification token provided.' }))
      return
    }
    const controller = new AbortController()
    api
      .get(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, { signal: controller.signal })
      .then(() => {
        hasSettled.current = true
        setStatus('success')
        setMessage(t('verifyEmailSuccess', { defaultValue: 'Your email has been verified successfully.' }))
      })
      .catch((err) => {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
        if (hasSettled.current) return
        const msg = err?.response?.data?.message || ''
        const isAlreadyUsed = msg.includes('already been used') || err?.response?.data?.code === 'LINK_ALREADY_USED_OR_EXPIRED'
        if (isAlreadyUsed) {
          hasSettled.current = true
          setStatus('success')
          setMessage(t('verifyEmailAlreadyVerified', { defaultValue: 'Your email is already verified. You can go to Settings to confirm.' }))
        } else {
          setStatus('error')
          setMessage(msg || t('verifyEmailError', { defaultValue: 'Invalid or expired verification link.' }))
        }
      })
    return () => controller.abort()
  }, [token, t])

  return (
    <div className='flex min-h-screen flex-col items-center justify-center p-6'>
      <div className='w-full max-w-md space-y-6 rounded-lg border bg-card p-8 text-center shadow-sm'>
        {status === 'loading' && (
          <p className='text-muted-foreground'>{t('verifying', { defaultValue: 'Verifying your email...' })}</p>
        )}
        {status === 'success' && (
          <>
            <p className='text-foreground font-medium text-green-600 dark:text-green-400'>{message}</p>
            <div className='flex flex-col gap-2'>
              <Button asChild>
                <Link to='/login' search={{ message: undefined }}>{t('goToLogin', { defaultValue: 'Go to login' })}</Link>
              </Button>
              <Button variant='outline' asChild>
                <Link to='/settings'>{t('goToSettings', { defaultValue: 'Go to settings' })}</Link>
              </Button>
            </div>
          </>
        )}
        {status === 'error' && (
          <>
            <p className='text-muted-foreground'>{message}</p>
            <p className='text-sm text-muted-foreground'>
              {t('verifyEmailAlreadyUsedHint', { defaultValue: 'If you already verified your email, you can go to Settings to confirm.' })}
            </p>
            <div className='flex flex-col gap-2'>
              <Button asChild>
                <Link to='/settings'>{t('goToSettings', { defaultValue: 'Go to settings' })}</Link>
              </Button>
              <Button variant='outline' asChild>
                <Link to='/login' search={{ message: undefined }}>{t('goToLogin', { defaultValue: 'Go to login' })}</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
