import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LANGUAGE_OPTIONS } from '@/constants/languages'
import { DEFAULT_LANGUAGE } from '@/i18n'

/**
 * Language switcher for unauthenticated pages (login, sign-up, etc.).
 * Changes i18n language directly without persisting to backend.
 */
export function LoginLanguageSwitcher() {
  const { i18n, t } = useTranslation(['common', 'settings'])
  const current = i18n.language?.split('-')[0] ?? DEFAULT_LANGUAGE

  const handleSelect = (value: string) => {
    void i18n.changeLanguage(value)
    document.documentElement.lang = value
    document.documentElement.dir = value === 'ar' ? 'rtl' : 'ltr'
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className='rounded-full'>
          <Languages className='h-[1.2rem] w-[1.2rem]' />
          <span className='sr-only'>{t('settings:selectLanguage')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {LANGUAGE_OPTIONS.map((opt) => {
          const isSelected = opt.value === current
          return (
            <DropdownMenuItem
              key={opt.value}
              onSelect={() => handleSelect(opt.value)}
            >
              {opt.label}
              {isSelected && ' ✓'}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
