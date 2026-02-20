import { Link, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import ViteLogo from '@/assets/vite.svg'
import api from '@/services/api'
import { SignUpForm } from './components/sign-up-form'

export default function SignUp2() {
  const { invite } = useSearch({ from: '/(auth)/sign-up' })
  const [inviteInfo, setInviteInfo] = useState<{
    valid: boolean
    inviteTarget?: string
    email?: string | null
  } | null>(null)

  useEffect(() => {
    if (!invite) {
      setInviteInfo({ valid: false })
      return
    }
    api
      .get(`/api/auth/invites/validate?token=${encodeURIComponent(invite)}`)
      .then((res) => {
        setInviteInfo({
          valid: res.data.valid,
          inviteTarget: res.data.inviteTarget,
          email: res.data.email,
        })
      })
      .catch(() => setInviteInfo({ valid: false }))
  }, [invite])

  return (
    <div className='relative container grid h-svh flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0'>
      <div className='bg-muted relative hidden h-full flex-col p-10 text-white lg:flex dark:border-r'>
        <div className='absolute inset-0 bg-zinc-900' />
        <div className='relative z-20 flex items-center text-lg font-medium'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='mr-2 h-6 w-6'
          >
            <path d='M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3' />
          </svg>
          Shadcn Admin
        </div>

        <img
          src={ViteLogo}
          className='relative m-auto'
          width={301}
          height={60}
          alt='Vite'
        />

        <div className='relative z-20 mt-auto'>
          <blockquote className='space-y-2'>
            <p className='text-lg'>
              &ldquo;This template has saved me countless hours of work and
              helped me deliver stunning designs to my clients faster than ever
              before.&rdquo;
            </p>
            <footer className='text-sm'>John Doe</footer>
          </blockquote>
        </div>
      </div>
      <div className='lg:p-8'>
        <div className='mx-auto flex w-full flex-col justify-center space-y-2 sm:w-[350px]'>
          {inviteInfo === null ? (
            <p className='text-muted-foreground'>Loading...</p>
          ) : !invite || !inviteInfo.valid ? (
            <>
              <h1 className='text-2xl font-semibold tracking-tight'>Invite required</h1>
              <p className='text-muted-foreground text-sm'>
                Sign up is by invitation only. Please use the link from your invitation email, or contact your administrator.
              </p>
              <Link to='/login' search={{ message: undefined }} className='text-primary hover:underline'>
                Go to login
              </Link>
            </>
          ) : (
            <>
              <div className='flex flex-col space-y-2 text-left'>
                <h1 className='text-2xl font-semibold tracking-tight'>Create an account</h1>
                <p className='text-muted-foreground text-sm'>
                  You&apos;ve been invited to join {inviteInfo.inviteTarget}. Enter your details below.
                </p>
              </div>
              <SignUpForm inviteToken={invite} defaultEmail={inviteInfo.email ?? undefined} />
              <p className='text-muted-foreground px-8 text-center text-sm'>
                Already have an account?{' '}
                <Link to='/login' search={{ message: undefined }} className='hover:text-primary underline underline-offset-4'>
                  Sign In
                </Link>
              </p>
              <p className='text-muted-foreground px-8 text-center text-sm'>
                By creating an account, you agree to our{' '}
                <a href='/terms' className='hover:text-primary underline underline-offset-4'>
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href='/privacy' className='hover:text-primary underline underline-offset-4'>
                  Privacy Policy
                </a>
                .
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
