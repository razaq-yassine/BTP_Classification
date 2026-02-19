import api from './api'
import { SYSTEM_OBJECTS_SET } from '@shared/protected-metadata'

const METADATA_BASE = '/api/admin/metadata'

/** Filter out system objects (organization, tenant, user, permissions, roles, etc.) from Object Manager list. */
function filterSystemObjects(names: string[]): string[] {
  return names.filter((name) => !SYSTEM_OBJECTS_SET.has(name.toLowerCase()))
}

async function getObjectNamesFromStatic(): Promise<string[]> {
  const res = await fetch('/metadata/objects/index.json')
  if (!res.ok) return []
  const data = await res.json()
  return filterSystemObjects(Array.isArray(data) ? data : [])
}

export type MetadataFile =
  | 'object.json'
  | 'listView.json'
  | 'detailView.json'
  | 'fields.json'
  | 'header.json'
  | 'relatedObjects.json'

export async function createObject(name: string): Promise<{ name: string }> {
  const res = await api.post<{ success: boolean; name: string }>(`${METADATA_BASE}/objects`, { name })
  return { name: res.data.name }
}

export async function deleteObject(objectName: string): Promise<void> {
  await api.delete(`${METADATA_BASE}/objects/${objectName}`)
}

export async function getObjectNames(): Promise<string[]> {
  try {
    const res = await api.get<string[]>(`${METADATA_BASE}/objects`)
    const names = Array.isArray(res.data) ? res.data : []
    return filterSystemObjects(names)
  } catch {
    return getObjectNamesFromStatic()
  }
}

export async function getMetadataFile<T = unknown>(
  objectName: string,
  file: MetadataFile
): Promise<T> {
  const res = await api.get<T>(`${METADATA_BASE}/objects/${objectName}/${file}`)
  return res.data
}

export async function saveMetadataFile(
  objectName: string,
  file: MetadataFile,
  data: unknown
): Promise<void> {
  await api.put(`${METADATA_BASE}/objects/${objectName}/${file}`, data)
}

export async function getField<T = unknown>(
  objectName: string,
  fieldKey: string
): Promise<T> {
  const res = await api.get<T>(
    `${METADATA_BASE}/objects/${objectName}/fields/${fieldKey}`
  )
  return res.data
}

export async function saveField(
  objectName: string,
  fieldKey: string,
  data: unknown
): Promise<void> {
  await api.put(
    `${METADATA_BASE}/objects/${objectName}/fields/${fieldKey}`,
    data
  )
}

export async function bumpVersion(): Promise<void> {
  await api.post(`${METADATA_BASE}/bump-version`)
}

export interface GlobalAction {
  id: string
  label: string
  description?: string
}

export async function getGlobalActions(): Promise<GlobalAction[]> {
  const res = await api.get<{ actions: GlobalAction[] }>(`${METADATA_BASE}/global-actions`)
  const data = res.data
  return Array.isArray(data?.actions) ? data.actions : []
}

const TRANSLATION_NAMESPACES = ['common', 'navigation', 'settings', 'errors', 'objects'] as const

export async function getTranslationLocales(): Promise<string[]> {
  const res = await api.get<string[]>(`${METADATA_BASE}/translations`)
  return Array.isArray(res.data) ? res.data : []
}

export async function getTranslationNamespace(
  locale: string,
  namespace: (typeof TRANSLATION_NAMESPACES)[number]
): Promise<Record<string, string | Record<string, unknown>>> {
  const res = await api.get<Record<string, string | Record<string, unknown>>>(
    `${METADATA_BASE}/translations/${locale}/${namespace}`
  )
  return res.data ?? {}
}

export async function saveTranslationNamespace(
  locale: string,
  namespace: (typeof TRANSLATION_NAMESPACES)[number],
  data: Record<string, unknown>
): Promise<void> {
  await api.put(`${METADATA_BASE}/translations/${locale}/${namespace}`, data)
}

export interface TranslationCoverageNamespace {
  total: number
  translated: number
  missing: number
  empty: number
  missingKeys: string[]
  emptyKeys: string[]
}

export interface TranslationCoverageLocale {
  total: number
  translated: number
  missing: number
  empty: number
  missingKeys: string[]
  emptyKeys: string[]
  byNamespace: Record<string, TranslationCoverageNamespace>
}

export interface HardcodedString {
  str: string
  file: string
  line: number
}

export interface TranslationCoverageResponse {
  referenceLocale: string
  locales: string[]
  byLocale: Record<string, TranslationCoverageLocale>
  hardcodedStrings?: HardcodedString[]
}

export async function getTranslationCoverage(): Promise<TranslationCoverageResponse> {
  const res = await api.get<TranslationCoverageResponse>(
    `${METADATA_BASE}/translations/coverage`
  )
  return res.data
}

export { TRANSLATION_NAMESPACES }
