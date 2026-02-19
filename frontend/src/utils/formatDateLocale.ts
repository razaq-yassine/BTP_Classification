import { format, isValid, type Locale } from 'date-fns'
import { ar, fr } from 'date-fns/locale'
import i18n from 'i18next'

const LOCALE_MAP: Record<string, Locale | undefined> = {
  ar,
  fr,
  en: undefined,
}

function getDateLocale(): Locale | undefined {
  const lang = i18n.language?.split('-')[0] ?? 'en'
  return LOCALE_MAP[lang]
}

/**
 * Format a date for display using the current i18n locale.
 */
export function formatDateLocale(date: Date, formatStr?: string): string {
  if (!isValid(date)) return ''
  const locale = getDateLocale()
  return format(date, formatStr ?? 'PPP', { locale: locale ?? undefined })
}

/**
 * Format a datetime for display using the current i18n locale.
 */
export function formatDateTimeLocale(date: Date, formatStr?: string): string {
  if (!isValid(date)) return ''
  const locale = getDateLocale()
  return format(date, formatStr ?? 'PPp', { locale: locale ?? undefined })
}

/**
 * Format a date for list/detail display - short format.
 */
export function formatDateShort(date: Date, formatStr?: string): string {
  if (!isValid(date)) return ''
  const locale = getDateLocale()
  return format(date, formatStr ?? 'MMM d, yyyy', { locale: locale ?? undefined })
}

/**
 * Format a datetime for list display.
 */
export function formatDateTimeShort(date: Date, formatStr?: string): string {
  if (!isValid(date)) return ''
  const locale = getDateLocale()
  return format(date, formatStr ?? 'MMM d, yyyy h:mm a', { locale: locale ?? undefined })
}

/**
 * Use native toLocaleDateString/toLocaleString with current locale for flexible formatting.
 */
export function toLocaleDateString(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const lang = i18n.language ?? 'en'
  return date.toLocaleDateString(lang, options ?? { dateStyle: 'medium' })
}

export function toLocaleDateTimeString(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const lang = i18n.language ?? 'en'
  return date.toLocaleString(lang, options ?? { dateStyle: 'medium', timeStyle: 'short' })
}
