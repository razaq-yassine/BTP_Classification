/** Locales that have translation files in metadata/translations/ */
export const SUPPORTED_LOCALES = ['en', 'fr', 'ar'] as const

/** Language options: only supported locales (en, fr, ar) */
export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'ar', label: 'العربية' },
] as const
