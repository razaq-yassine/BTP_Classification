import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore, selectUser } from '@/stores/authStore'
import { useAppConfigStore } from '@/stores/appConfigStore'
import { DEFAULT_LANGUAGE } from '@/i18n'

/**
 * Resolves the effective language for the current user:
 * 1. User's preferredLanguage (explicit override)
 * 2. Tenant or org defaultPreferredLanguage (from app config store)
 * 3. App defaultPreferredLanguage (for users with no tenant/org)
 * 4. Fallback: en
 */
export function useEffectiveLanguage(): string {
  const user = useAuthStore(selectUser)
  const config = useAppConfigStore((s) => s.config)
  const { i18n } = useTranslation()

  const effective =
    user?.preferredLanguage ??
    config?.defaultPreferredLanguage ??
    DEFAULT_LANGUAGE

  useEffect(() => {
    const locale = effective || DEFAULT_LANGUAGE
    if (i18n.language !== locale) {
      void i18n.changeLanguage(locale)
    }
    document.documentElement.lang = locale
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
  }, [effective, i18n])

  return effective || DEFAULT_LANGUAGE
}
