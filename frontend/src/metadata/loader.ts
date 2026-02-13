import React from 'react'
import type {
  ObjectDefinition,
  FieldDefinition,
  RelatedObjectDefinition,
  ActionDefinition,
  CalculatedDataDefinition,
  PathDefinition,
} from '@/types/object-definition'
import { getIcon, resolveAction, resolveCalculatedData } from './action-registry'
import { objectSchema, fieldSchema } from './schemas'

const METADATA_BASE = '/metadata'

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${METADATA_BASE}${path}`)
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`)
  return res.json()
}

export async function loadObjectDefinition(objectName: string): Promise<ObjectDefinition> {
  const basePath = `/objects/${objectName}`

  const [objectData, listViewData, detailViewData, fieldsData, headerData, relatedData] =
    await Promise.all([
      fetchJson<Record<string, unknown>>(`${basePath}/object.json`),
      fetchJson<Record<string, unknown>>(`${basePath}/listView.json`),
      fetchJson<Record<string, unknown>>(`${basePath}/detailView.json`),
      loadFields(objectName),
      fetchJson<Record<string, unknown>>(`${basePath}/header.json`).catch(() => null),
      fetchJson<RelatedObjectDefinition[]>(`${basePath}/relatedObjects.json`).catch(() => []),
    ])

  objectSchema.parse(objectData)
  const fieldsMap = new Map<string, FieldDefinition>(fieldsData.map((f) => [f.key, f]))

  const listViewFields = (listViewData.fields as string[]) || []
  const resolvedListViewFields = listViewFields.map((key) => {
    const field = fieldsMap.get(key)
    if (field) return field
    const fallbackType =
      key === 'isActive'
        ? ('boolean' as const)
        : key === 'createdAt' || key === 'updatedAt'
          ? ('datetime' as const)
          : ('string' as const)
    return { key, label: key, type: fallbackType }
  })

  const detailSections = (detailViewData.sections as Array<{ title: string; columns?: number; defaultOpen?: boolean; fields: string[] }>) || []
  const resolvedDetailSections = detailSections.map((section) => ({
    title: section.title,
    columns: section.columns ?? 1,
    defaultOpen: section.defaultOpen ?? true,
    fields: (section.fields as string[]).map((key) => {
      const field = fieldsMap.get(key)
      if (field) return field
      const fallbackType =
        key === 'isActive'
          ? ('boolean' as const)
          : key === 'createdAt' || key === 'updatedAt'
            ? ('datetime' as const)
            : ('string' as const)
      return { key, label: key, type: fallbackType }
    }),
  }))

  const iconName = objectData.icon as string | undefined
  const Icon = iconName ? getIcon(iconName) : undefined

  let primaryActions: ActionDefinition[] = []
  let secondaryActions: ActionDefinition[] = []
  let calculatedData: CalculatedDataDefinition[] = []

  if (headerData) {
    const primary = (headerData.primaryActions as Array<Record<string, unknown>>) || []
    primaryActions = primary.map((config) =>
      resolveAction(config as Parameters<typeof resolveAction>[0])
    )
    const secondary = (headerData.secondaryActions as Array<Record<string, unknown>>) || []
    secondaryActions = secondary.map((config) =>
      resolveAction(config as Parameters<typeof resolveAction>[0])
    )
    const calc = (headerData.calculatedData as Array<Record<string, unknown>>) || []
    calculatedData = calc.map((config) =>
      resolveCalculatedData(config as Parameters<typeof resolveCalculatedData>[0])
    )
  }

  const relatedObjects = Array.isArray(relatedData) ? relatedData : []

  // Derive path from first field with useInPath: true (select/multiselect with options)
  let path: PathDefinition | undefined
  const pathField = fieldsData.find(
    (f) => (f as FieldDefinition & { useInPath?: boolean }).useInPath === true
  ) as (FieldDefinition & { useInPath?: boolean }) | undefined
  if (pathField?.options && pathField.options.length > 0) {
    path = {
      enabled: true,
      field: pathField.key,
      steps: pathField.options.map((o) => ({
        value: o.value,
        label: o.label,
        color: o.color,
        colorHover: o.colorHover,
      })),
    }
  }

  const resolvedRelatedObjects: RelatedObjectDefinition[] = relatedObjects.map((rel) => {
    const fields: FieldDefinition[] = (rel.fields || []).map((f) => {
      if (typeof f === 'string') return { key: f, label: f, type: 'string' as const }
      const fieldDef = (typeof f === 'object' && 'key' in f ? f : { key: '', label: '', type: 'string' }) as FieldDefinition & { render?: string }
      const renderType = fieldDef.render
      if (renderType === 'statusBadge') {
        return {
          ...fieldDef,
          type: (fieldDef.type || 'string') as FieldDefinition['type'],
          render: (value: string) =>
            React.createElement('span', {
              className: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                { PENDING: 'bg-yellow-100 text-yellow-800', CONFIRMED: 'bg-blue-100 text-blue-800', SHIPPED: 'bg-purple-100 text-purple-800', DELIVERED: 'bg-green-100 text-green-800', CANCELLED: 'bg-red-100 text-red-800' }[value] || 'bg-gray-100 text-gray-800'
              }`,
            }, value),
        } as FieldDefinition
      }
      if (renderType === 'currency') {
        return {
          ...fieldDef,
          type: (fieldDef.type || 'number') as FieldDefinition['type'],
          render: (value: number) => `$${parseFloat(value?.toString() || '0').toFixed(2)}`,
        } as FieldDefinition
      }
      if (renderType === 'booleanBadge') {
        return {
          ...fieldDef,
          type: (fieldDef.type || 'boolean') as FieldDefinition['type'],
          render: (value: boolean) =>
            React.createElement('span', {
              className: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`,
            }, value ? 'Active' : 'Inactive'),
        } as FieldDefinition
      }
      return { ...fieldDef, type: (fieldDef.type || 'string') as FieldDefinition['type'] }
    })
    return { ...rel, fields }
  })

  return {
    name: objectData.name as string,
    label: objectData.label as string,
    labelPlural: objectData.labelPlural as string,
    description: objectData.description as string | undefined,
    apiEndpoint: objectData.apiEndpoint as string,
    basePath: objectData.basePath as string | undefined,
    detailPath: objectData.detailPath as string | undefined,
    listView: {
      fields: resolvedListViewFields,
      defaultSort: listViewData.defaultSort as string | undefined,
      defaultSortOrder: listViewData.defaultSortOrder as 'asc' | 'desc' | undefined,
      pageSize: listViewData.pageSize as number | undefined,
    },
    detailView: {
      layout: detailViewData.layout as ObjectDefinition['detailView']['layout'],
      sections: resolvedDetailSections,
    },
    header: headerData
      ? {
          primaryActions,
          secondaryActions,
          calculatedData,
        }
      : undefined,
    permissions: {
      create: true,
      read: true,
      update: true,
      delete: true,
    },
    relatedObjects: resolvedRelatedObjects.length > 0 ? resolvedRelatedObjects : undefined,
    path,
    icon: Icon,
    color: objectData.color as string | undefined,
    sidebar: objectData.sidebar as ObjectDefinition['sidebar'],
  }
}

async function loadFields(objectName: string): Promise<FieldDefinition[]> {
  const objPath = `/objects/${objectName}`
  let fieldNames: string[]
  try {
    const index = await fetchJson<string[]>(`${objPath}/fields.json`)
    fieldNames = Array.isArray(index) ? index : []
  } catch {
    fieldNames = ['id', 'firstName', 'lastName', 'fullName', 'email', 'phone', 'company', 'address', 'isActive', 'createdAt', 'updatedAt']
  }

  const fieldsPath = `${objPath}/fields`

  const results: FieldDefinition[] = []

  for (const name of fieldNames) {
    try {
      const data = await fetchJson<Record<string, unknown>>(`${fieldsPath}/${name}.json`)
      fieldSchema.parse(data)
      const fd = data as unknown as FieldDefinition & { render?: string }
      let fieldType = (fd.type || 'string') as FieldDefinition['type']
      if ((fd.type as string) === 'lookup') fieldType = 'reference' // merge lookup into reference
      let resolvedFd: FieldDefinition = { ...fd, type: fieldType }
      if (fd.render === 'booleanBadge') {
        resolvedFd = {
          ...resolvedFd,
          renderType: 'booleanBadge',
          render: (value: boolean) =>
            React.createElement('span', {
              className: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`,
            }, value ? 'Active' : 'Inactive'),
        }
      } else if (fd.render === 'statusBadge') {
        resolvedFd = {
          ...resolvedFd,
          renderType: 'statusBadge',
          render: (value: string) =>
            React.createElement('span', {
              className: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                { PENDING: 'bg-yellow-100 text-yellow-800', CONFIRMED: 'bg-blue-100 text-blue-800', SHIPPED: 'bg-purple-100 text-purple-800', DELIVERED: 'bg-green-100 text-green-800', CANCELLED: 'bg-red-100 text-red-800' }[value] || 'bg-gray-100 text-gray-800'
              }`,
            }, value),
        }
      } else if (fd.render === 'currency') {
        resolvedFd = {
          ...resolvedFd,
          renderType: 'currency',
          render: (value: number) => `$${parseFloat(value?.toString() || '0').toFixed(2)}`,
        }
      }
      results.push(resolvedFd)
    } catch {
      // Skip missing fields
    }
  }

  return results
}

/** Object names - index.json is auto-generated by db:generate-from-metadata */
export async function getObjectNames(): Promise<string[]> {
  try {
    const res = await fetch('/metadata/objects/index.json')
    if (res.ok) {
      const data = await res.json()
      return Array.isArray(data) ? data : []
    }
  } catch {
    // Fallback if index doesn't exist
  }
  return []
}

/** Resolve URL path segment (e.g. "customers") to object name (e.g. "customer") */
export async function getObjectNameByPath(pathSegment: string): Promise<string | undefined> {
  const defs = await getAllObjectDefinitions()
  const normalized = pathSegment.startsWith('/') ? pathSegment : `/${pathSegment}`
  const def = defs.find((d) => d.basePath === normalized || d.basePath === pathSegment)
  return def?.name
}

const objectCache = new Map<string, ObjectDefinition>()

/** Clear the in-memory object cache. Call when metadata has been regenerated. */
export function clearObjectCache(): void {
  objectCache.clear()
}

export async function getObjectDefinition(objectName: string): Promise<ObjectDefinition | undefined> {
  if (objectCache.has(objectName)) {
    return objectCache.get(objectName)
  }
  try {
    const def = await loadObjectDefinition(objectName)
    objectCache.set(objectName, def)
    return def
  } catch (err) {
    console.error(`Failed to load object definition for ${objectName}:`, err)
    return undefined
  }
}

export async function getAllObjectDefinitions(): Promise<ObjectDefinition[]> {
  const names = await getObjectNames()
  const defs: ObjectDefinition[] = []
  for (const name of names) {
    const def = await getObjectDefinition(name)
    if (def) defs.push(def)
  }
  return defs
}
