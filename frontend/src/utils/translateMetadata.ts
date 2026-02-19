import i18n from 'i18next'

/** Slugify a section title for use as translation key (e.g. "Order Information" -> "orderInformation") */
export function slugifySectionTitle(title: string): string {
  const words = title
    .replace(/&/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
  return words
    .map((w, i) =>
      i === 0
        ? w.charAt(0).toLowerCase() + w.slice(1)
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join('')
}

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
  const translated = i18n.t(`${objectName}.${key}`, { ns: 'objects', defaultValue: '' })
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
  const translated = i18n.t(`${objectName}.fields.${fieldKey}`, {
    ns: 'objects',
    defaultValue: ''
  })
  return translated || fallback
}

/**
 * Translate a list view label (e.g. "All Orders", "Recently Viewed").
 */
export function translateListViewLabel(
  objectName: string,
  viewKey: string,
  fallback: string
): string {
  const translated = i18n.t(`${objectName}.listViews.${viewKey}`, {
    ns: 'objects',
    defaultValue: ''
  })
  return translated || fallback
}

/**
 * Translate a statistics card label (e.g. "Total Orders", "Total Revenue").
 */
export function translateStatisticLabel(
  objectName: string,
  statKey: string,
  fallback: string
): string {
  const translated = i18n.t(`${objectName}.statistics.${statKey}`, {
    ns: 'objects',
    defaultValue: ''
  })
  return translated || fallback
}

/**
 * Translate a select/multiselect option label (e.g. status "PENDING" -> "Pending").
 */
export function translateSelectOptionLabel(
  objectName: string,
  fieldKey: string,
  optionValue: string,
  fallback: string
): string {
  const key = `${objectName}.fieldOptions.${fieldKey}.${optionValue}`
  const translated = i18n.t(key, { ns: 'objects', defaultValue: '' })
  return translated || fallback
}

/**
 * Translate a detail view section title (e.g. "Order Information").
 * Uses titleKey when present (bypasses slugify); otherwise slugifies title.
 * Tries objects.{objectName}.sections.{key} first, then common.section{key}.
 */
export function translateSectionTitle(
  objectName: string,
  title: string,
  fallback: string,
  titleKey?: string
): string {
  const sectionKey = titleKey ?? slugifySectionTitle(title)
  // Try object-specific sections first (objects namespace - same as field labels that work)
  const fromObjects = i18n.t(`${objectName}.sections.${sectionKey}`, {
    ns: 'objects',
    defaultValue: ''
  })
  if (fromObjects) return fromObjects
  // Fall back to common namespace (shared keys like sectionbasicInformation)
  const fromCommon = i18n.t(`section${sectionKey}`, {
    ns: 'common',
    defaultValue: ''
  })
  return fromCommon || fallback
}
