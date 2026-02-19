import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/authStore'
import { useEffectiveLanguage } from '@/hooks/useEffectiveLanguage'
import api from '@/services/api'
import { toast } from 'sonner'
import { LANGUAGE_OPTIONS } from '@/constants/languages'

export function LanguageSwitcher() {
  const { t } = useTranslation('settings')
  const updateUser = useAuthStore((s) => s.checkAuth)
  const effective = useEffectiveLanguage()

  const handleSelect = async (value: string) => {
    const preferredLanguage = value || null
    try {
      await api.patch('/api/auth/me', { preferredLanguage })
      await updateUser()
      toast.success(t('preferredLanguageUpdated'))
    } catch {
      toast.error(t('failedToUpdatePreferredLanguage'))
    }
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className='rounded-full'>
          <Languages className='h-[1.2rem] w-[1.2rem]' />
          <span className='sr-only'>{t('selectLanguage')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {LANGUAGE_OPTIONS.map((opt) => {
          const isSelected = opt.value === effective
          return (
            <DropdownMenuItem
              key={opt.value}
              onSelect={() => handleSelect(opt.value)}
            >
              {'labelKey' in opt ? t(opt.labelKey as string) : opt.label}
              {isSelected && ' ✓'}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
