import i18n from 'i18next'

/**
 * Translate an object label (singular or plural).
 * Falls back to the provided fallback if translation is missing.
 */
export function translateObjectLabel(
  objectName: string,
  fallback: string,
  plural?: boolean
): string {
  const key = plural ? 'labelPlural' : 'label'
  const translated = i18n.t(`objects.${objectName}.${key}`, { defaultValue: '' })
  return translated || fallback
}

/**
 * Translate a field label for an object.
 * Falls back to the provided fallback if translation is missing.
 */
export function translateFieldLabel(
  objectName: string,
  fieldKey: string,
  fallback: string
): string {
  const translated = i18n.t(`objects.${objectName}.fields.${fieldKey}`, {
    defaultValue: ''
  })
  return translated || fallback
}
