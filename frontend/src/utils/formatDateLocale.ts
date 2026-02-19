import { format, isValid, type Locale } from 'date-fns'
import { ar, fr } from 'date-fns/locale'
import i18n from 'i18next'

const LOCALE_MAP: Record<string, Locale | undefined> = {
  ar,
  fr,
  en: undefined,
}

/** RTL languages: use numeric-only format (dd/MM/yyyy, HH:mm) to avoid RTL/LTR mixing and Arabic AM/PM. */
const RTL_LANGUAGES = new Set(['ar'])

/** Get the date-fns locale for the current i18n language. Used by Calendar for month/weekday labels. */
export function getDateLocale(): Locale | undefined {
  const lang = i18n.language?.split('-')[0] ?? 'en'
  return LOCALE_MAP[lang]
}

function isRtlLanguage(): boolean {
  const lang = i18n.language?.split('-')[0] ?? 'en'
  return RTL_LANGUAGES.has(lang)
}

/**
 * Format a date for display using the current i18n locale.
 * For RTL: uses dd/MM/yyyy (numeric only, no Arabic words).
 */
export function formatDateLocale(date: Date, formatStr?: string): string {
  if (!isValid(date)) return ''
  if (isRtlLanguage()) return format(date, 'dd/MM/yyyy')
  const locale = getDateLocale()
  return format(date, formatStr ?? 'PPP', { locale: locale ?? undefined })
}

/**
 * Format a datetime for display using the current i18n locale.
 * For RTL: uses dd/MM/yyyy, HH:mm (numeric only, 24hr, no Arabic words).
 */
export function formatDateTimeLocale(date: Date, formatStr?: string): string {
  if (!isValid(date)) return ''
  if (isRtlLanguage()) return format(date, 'dd/MM/yyyy, HH:mm')
  const locale = getDateLocale()
  return format(date, formatStr ?? 'PPp', { locale: locale ?? undefined })
}

/**
 * Format a date for list/detail display - short format.
 * For RTL: uses dd/MM/yyyy (numeric only).
 */
export function formatDateShort(date: Date, formatStr?: string): string {
  if (!isValid(date)) return ''
  if (isRtlLanguage()) return format(date, 'dd/MM/yyyy')
  const locale = getDateLocale()
  return format(date, formatStr ?? 'MMM d, yyyy', { locale: locale ?? undefined })
}

/**
 * Format a datetime for list display.
 * For RTL: uses dd/MM/yyyy, HH:mm (numeric only, 24hr).
 */
export function formatDateTimeShort(date: Date, formatStr?: string): string {
  if (!isValid(date)) return ''
  if (isRtlLanguage()) return format(date, 'dd/MM/yyyy, HH:mm')
  const locale = getDateLocale()
  return format(date, formatStr ?? 'MMM d, yyyy h:mm a', { locale: locale ?? undefined })
}

/**
 * Use native toLocaleDateString/toLocaleString with current locale for flexible formatting.
 * For RTL: uses numeric format and 24hr to avoid Arabic words.
 */
export function toLocaleDateString(date: Date, options?: Intl.DateTimeFormatOptions): string {
  if (isRtlLanguage() && !options) {
    return format(date, 'dd/MM/yyyy')
  }
  const lang = i18n.language ?? 'en'
  return date.toLocaleDateString(lang, options ?? { dateStyle: 'medium' })
}

export function toLocaleDateTimeString(date: Date, options?: Intl.DateTimeFormatOptions): string {
  if (isRtlLanguage() && !options) {
    return format(date, 'dd/MM/yyyy, HH:mm')
  }
  const lang = i18n.language ?? 'en'
  return date.toLocaleString(lang, options ?? { dateStyle: 'medium', timeStyle: 'short' })
}
