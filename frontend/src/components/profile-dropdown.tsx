import { Link, useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  CreditCard,
  LogOut,
  Palette,
  User,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore, selectUser, selectLogout } from '@/stores/authStore'

function getDisplayName(user: { firstName?: string; lastName?: string; username?: string } | null): string {
  if (!user) return 'User'
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return full || user.username || 'User'
}

function getInitials(user: { firstName?: string; lastName?: string; username?: string } | null): string {
  if (!user) return 'U'
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  if (full) {
    return full
      .split(/\s+/)
      .map((s) => s[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return (user.username || 'U').slice(0, 2).toUpperCase()
}

export function ProfileDropdown() {
  const { t } = useTranslation('navigation')
  const navigate = useNavigate()
  const user = useAuthStore(selectUser)
  const logout = useAuthStore(selectLogout)

  const handleLogout = useCallback(async () => {
    try {
      logout()
      navigate({ to: '/login' })
    } catch (error) {
      console.error('Logout error:', error)
    }
  }, [logout, navigate])

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
          <Avatar className='h-8 w-8'>
            <AvatarImage src='/avatars/01.png' alt={getDisplayName(user)} />
            <AvatarFallback>{getInitials(user)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-56' align='end' forceMount>
        <DropdownMenuLabel className='font-normal'>
          <div className='flex flex-col space-y-1'>
            <p className='text-sm leading-none font-medium'>{getDisplayName(user)}</p>
            <p className='text-muted-foreground text-xs leading-none'>
              {user?.email || 'user@example.com'}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link to='/settings' target='_blank' rel='noopener noreferrer'>
              <User className='mr-2 h-4 w-4' />
              {t('profile')}
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to='/settings/appearance' target='_blank' rel='noopener noreferrer'>
              <Palette className='mr-2 h-4 w-4' />
              {t('appearance')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to='/settings/notifications' target='_blank' rel='noopener noreferrer'>
              <Bell className='mr-2 h-4 w-4' />
              {t('notifications')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to='/billing' target='_blank' rel='noopener noreferrer'>
              <CreditCard className='mr-2 h-4 w-4' />
              {t('billing')}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className='mr-2 h-4 w-4' />
          {t('logOut')}
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
