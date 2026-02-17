/**
 * Metadata validation module.
 * Validates object.json, fields.json, listView.json, detailView.json, header.json, relatedObjects.json
 * and individual field definitions. Never throws - collects all errors.
 */
import fs from 'fs'
import path from 'path'
import type { ValidationError, ValidationResult } from './types.js'
import { addError } from './types.js'
import {
  SYSTEM_FIELDS_SET,
  SYSTEM_OBJECTS_SET,
  SYSTEM_OBJECTS_WITH_EXTENSIONS,
  SYSTEM_OBJECT_BASE_FIELDS
} from '../../../shared/dist/protected-metadata.js'

const VALID_FIELD_TYPES = new Set([
  'string', 'number', 'boolean', 'date', 'datetime', 'email', 'phone', 'text', 'url',
  'select', 'multiselect', 'reference', 'lookup', 'masterdetail', 'autonumber', 'formula',
  'password', 'geolocation', 'address', 'richtext', 'file'
])

const VALID_TENANT_MODES = new Set(['none', 'tenant', 'org_and_tenant'])

export type TenantMode = 'none' | 'tenant' | 'org_and_tenant'
export type TenantScope = 'tenant' | 'org_and_tenant' | null

export interface TenantConfig {
  mode: TenantMode
}

export function loadTenantConfig(metadataPath: string): TenantConfig | null {
  const configPath = path.join(metadataPath, 'tenant-config.json')
  if (!fs.existsSync(configPath)) return null
  try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>
    const mode = (data.mode as string) || 'none'
    return { mode: mode as TenantMode }
  } catch {
    return null
  }
}

function validateTenantConfig(
  tenantConfig: TenantConfig | null,
  _metadataPath: string,
  _objectNames: string[],
  errors: ValidationError[]
): void {
  const pathPrefix = 'tenant-config.json'
  if (!tenantConfig) return
  if (!VALID_TENANT_MODES.has(tenantConfig.mode)) {
    addError(errors, pathPrefix, `mode must be one of: none, tenant, org_and_tenant`, 'TENANT_INVALID_MODE')
  }
  // Organization and tenant are system objects in metadata/system/, not metadata/objects/ - no existence check needed
}

function pluralize(name: string): string {
  if (name.endsWith('y')) return name.slice(0, -1) + 'ies'
  if (name.endsWith('s')) return name + 'es'
  return name + 's'
}

function getProfileNames(metadataPath: string): Set<string> {
  const names = new Set<string>(['admin']) // admin is synthetic, always valid
  const profilesPath = path.join(metadataPath, 'profiles')
  if (!fs.existsSync(profilesPath)) return names
  const files = fs.readdirSync(profilesPath).filter((f) => f.endsWith('.json'))
  for (const file of files) {
    names.add(file.replace(/\.json$/, ''))
  }
  return names
}

function validateAutoNumberPattern(pattern: string): string | null {
  const match = pattern.match(/\{0+\}/g)
  if (!match || match.length !== 1) {
    return 'Pattern must contain exactly one digit placeholder, e.g. {000} or MSG-{00000}'
  }
  return null
}

function validateObjectFile(
  objectName: string,
  data: Record<string, unknown>,
  errors: ValidationError[],
  tenantConfig?: TenantConfig | null
): void {
  const pathPrefix = `${objectName}/object.json`
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    addError(errors, pathPrefix, 'Missing required: name', 'OBJECT_MISSING_NAME')
  }
  if (!data.label || typeof data.label !== 'string' || !data.label.trim()) {
    addError(errors, pathPrefix, 'Missing required: label', 'OBJECT_MISSING_LABEL')
  }
  if (!data.labelPlural || typeof data.labelPlural !== 'string' || !data.labelPlural.trim()) {
    addError(errors, pathPrefix, 'Missing required: labelPlural', 'OBJECT_MISSING_LABEL_PLURAL')
  }
  if (!data.apiEndpoint || typeof data.apiEndpoint !== 'string' || !data.apiEndpoint.trim()) {
    addError(errors, pathPrefix, 'Missing required: apiEndpoint', 'OBJECT_MISSING_API_ENDPOINT')
  }
  if (data.name && data.name !== objectName) {
    addError(errors, pathPrefix, `Object name "${data.name}" does not match folder "${objectName}"`, 'OBJECT_NAME_MISMATCH')
  }
  if (data.sidebar && typeof data.sidebar !== 'object') {
    addError(errors, pathPrefix, 'sidebar must be an object', 'OBJECT_INVALID_SIDEBAR')
  }
  // tenantScope: null | 'tenant' | 'org_and_tenant'. Must match mode when mode !== 'none'
  const tenantScope = data.tenantScope as string | null | undefined
  if (tenantScope !== undefined && tenantScope !== null) {
    if (tenantScope !== 'tenant' && tenantScope !== 'org_and_tenant') {
      addError(errors, pathPrefix, 'tenantScope must be "tenant" or "org_and_tenant"', 'OBJECT_INVALID_TENANT_SCOPE')
    } else if (tenantConfig && tenantConfig.mode !== 'none') {
      if (tenantConfig.mode === 'tenant' && tenantScope !== 'tenant') {
        addError(errors, pathPrefix, 'tenantScope must be "tenant" when mode is "tenant"', 'OBJECT_TENANT_SCOPE_MISMATCH')
      }
      if (tenantConfig.mode === 'org_and_tenant' && tenantScope !== 'tenant' && tenantScope !== 'org_and_tenant') {
        addError(errors, pathPrefix, 'tenantScope must be "tenant" or "org_and_tenant" when mode is "org_and_tenant"', 'OBJECT_TENANT_SCOPE_MISMATCH')
      }
    }
  }
  // Master objects (organization, tenant) must not have tenantScope
  if ((objectName === 'organization' || objectName === 'tenant') && tenantScope) {
    addError(errors, pathPrefix, `Master object "${objectName}" must not have tenantScope`, 'OBJECT_MASTER_NO_TENANT_SCOPE')
  }
}

function validateFieldsFile(
  objectName: string,
  data: unknown,
  errors: ValidationError[]
): string[] {
  const pathPrefix = `${objectName}/fields.json`
  if (!Array.isArray(data)) {
    addError(errors, pathPrefix, 'fields.json must be an array of field keys', 'FIELDS_INVALID_FORMAT')
    return []
  }
  const keys = data as string[]
  const validKeys: string[] = []
  for (const key of keys) {
    if (SYSTEM_FIELDS_SET.has(key)) {
      addError(errors, pathPrefix, `System field '${key}' must not be in fields list`, 'SYSTEM_FIELD_FORBIDDEN')
    } else {
      validKeys.push(key)
    }
  }
  if (!keys.includes('name')) {
    addError(errors, pathPrefix, 'fields.json must include the name field', 'FIELDS_MISSING_NAME')
  }
  return validKeys
}

function loadFieldKeysForObject(objectsPath: string, objectName: string): string[] {
  try {
    const fieldsPath = path.join(objectsPath, objectName, 'fields.json')
    if (!fs.existsSync(fieldsPath)) return []
    const data = JSON.parse(fs.readFileSync(fieldsPath, 'utf-8'))
    if (!Array.isArray(data)) return []
    return data.filter((k: string) => typeof k === 'string' && !SYSTEM_FIELDS_SET.has(k))
  } catch {
    return []
  }
}

function loadFieldDefinition(objectsPath: string, objectName: string, fieldKey: string): Record<string, unknown> | null {
  try {
    const fieldPath = path.join(objectsPath, objectName, 'fields', `${fieldKey}.json`)
    if (!fs.existsSync(fieldPath)) return null
    return JSON.parse(fs.readFileSync(fieldPath, 'utf-8')) as Record<string, unknown>
  } catch {
    return null
  }
}

const VALID_COMPUTED_EXPRESSIONS = new Set(['concat', 'join', 'lookup'])

function validateComputedField(
  objectName: string,
  fieldKey: string,
  data: Record<string, unknown>,
  fieldKeys: string[],
  objectNames: string[],
  objectsPath: string,
  errors: ValidationError[]
): void {
  const pathPrefix = `${objectName}/fields/${fieldKey}`
  const expr = (data.computedExpression as string)?.toLowerCase()
  if (!expr || !VALID_COMPUTED_EXPRESSIONS.has(expr)) {
    addError(errors, pathPrefix, `computedExpression must be one of: concat, join, lookup`, 'COMPUTED_INVALID_EXPRESSION')
    return
  }
  const sourceFields = data.sourceFields as string[] | undefined
  if (!Array.isArray(sourceFields) || sourceFields.length === 0) {
    addError(errors, pathPrefix, 'sourceFields must be a non-empty array', 'COMPUTED_MISSING_SOURCE_FIELDS')
    return
  }
  const keySet = new Set(fieldKeys)
  if (expr === 'concat' || expr === 'lookup') {
    for (const sf of sourceFields) {
      if (typeof sf !== 'string' || !sf.trim()) continue
      if (!keySet.has(sf)) {
        addError(errors, pathPrefix, `sourceFields "${sf}" does not exist in fields.json`, 'COMPUTED_SOURCE_FIELD_NOT_FOUND')
      }
    }
    return
  }
  if (expr === 'join') {
    const refField = (data.referenceField as string)?.trim()
    if (!refField) {
      addError(errors, pathPrefix, 'referenceField is required for join expression', 'COMPUTED_JOIN_MISSING_REFERENCE')
      return
    }
    if (!keySet.has(refField)) {
      addError(errors, pathPrefix, `referenceField "${refField}" does not exist in fields.json`, 'COMPUTED_REFERENCE_NOT_FOUND')
      return
    }
    const refDef = loadFieldDefinition(objectsPath, objectName, refField)
    const refType = (refDef?.type as string)?.toLowerCase()
    if (!refDef || (refType !== 'reference' && refType !== 'masterdetail')) {
      addError(errors, pathPrefix, `referenceField "${refField}" must be a reference or masterDetail type`, 'COMPUTED_REFERENCE_INVALID_TYPE')
      return
    }
    const refObjectName = (refDef.objectName as string)?.trim()
    if (!refObjectName || !objectNames.includes(refObjectName)) {
      addError(errors, pathPrefix, `Referenced object "${refObjectName ?? refField}" does not exist`, 'COMPUTED_REFERENCE_OBJECT_NOT_FOUND')
      return
    }
    const refFieldKeys = loadFieldKeysForObject(objectsPath, refObjectName)
    const refKeySet = new Set(refFieldKeys)
    for (const sf of sourceFields) {
      if (typeof sf !== 'string' || !sf.trim()) continue
      if (!refKeySet.has(sf)) {
        addError(errors, pathPrefix, `sourceFields "${sf}" does not exist on referenced object "${refObjectName}"`, 'COMPUTED_JOIN_SOURCE_NOT_FOUND')
      }
    }
  }
}

function validateFieldFile(
  objectName: string,
  fieldKey: string,
  data: Record<string, unknown>,
  objectNames: string[],
  errors: ValidationError[],
  context?: { objectsPath: string; fieldKeys: string[] }
): void {
  const pathPrefix = `${objectName}/fields/${fieldKey}`
  if (SYSTEM_FIELDS_SET.has(fieldKey)) {
    addError(errors, pathPrefix, `Metadata not allowed for system field: ${fieldKey}`, 'SYSTEM_FIELD_FORBIDDEN')
    return
  }
  if (!data.key || typeof data.key !== 'string') {
    addError(errors, pathPrefix, 'Missing required: key', 'FIELD_MISSING_KEY')
  }
  if (!data.label || typeof data.label !== 'string') {
    addError(errors, pathPrefix, 'Missing required: label', 'FIELD_MISSING_LABEL')
  }
  if (!data.type || typeof data.type !== 'string') {
    addError(errors, pathPrefix, 'Missing required: type', 'FIELD_MISSING_TYPE')
    return
  }
  const type = (data.type as string).toLowerCase()
  if (!VALID_FIELD_TYPES.has(type) && type !== 'autonumber') {
    addError(errors, pathPrefix, `Invalid field type: ${data.type}`, 'FIELD_INVALID_TYPE')
  }
  if (type === 'autonumber' && fieldKey !== 'name') {
    addError(errors, pathPrefix, 'autoNumber type is only allowed for the name field', 'AUTONUMBER_ONLY_FOR_NAME')
  }
  if (data.computed === true && context) {
    validateComputedField(objectName, fieldKey, data, context.fieldKeys, objectNames, context.objectsPath, errors)
  }
  if (fieldKey === 'name') {
    if (data.required !== true) {
      addError(errors, pathPrefix, 'Name field must have required: true', 'NAME_FIELD_REQUIRED')
    }
    if (type === 'autonumber') {
      if (data.editable !== false) {
        addError(errors, pathPrefix, 'autoNumber name field must have editable: false', 'AUTONUMBER_NAME_NOT_EDITABLE')
      }
      const patternErr = validateAutoNumberPattern((data.autoNumberPattern as string) || '')
      if (patternErr) addError(errors, pathPrefix, patternErr, 'AUTONUMBER_INVALID_PATTERN')
      const start = data.autoNumberStart
      if (start == null || typeof start !== 'number' || !Number.isInteger(start) || start < 1) {
        addError(errors, pathPrefix, 'autoNumberStart must be a positive integer', 'AUTONUMBER_INVALID_START')
      }
    } else if (type !== 'string') {
      addError(errors, pathPrefix, 'Name field type must be string or autoNumber', 'NAME_FIELD_INVALID_TYPE')
    }
  }
  if (type === 'reference' || type === 'masterdetail') {
    if (!data.objectName || typeof data.objectName !== 'string' || !(data.objectName as string).trim()) {
      addError(errors, pathPrefix, 'Reference object is required', 'REFERENCE_MISSING_OBJECT')
    } else {
      const refObj = (data.objectName as string).trim()
      if (!objectNames.includes(refObj)) {
        addError(errors, pathPrefix, `Referenced object "${refObj}" does not exist`, 'REFERENCE_OBJECT_NOT_FOUND')
      }
      if (refObj === objectName) {
        addError(errors, pathPrefix, 'Reference cannot point to the same object', 'REFERENCE_SELF_REFERENCE')
      }
    }
    if (type === 'masterdetail') {
      if (data.required === false) {
        addError(errors, pathPrefix, 'masterDetail type implies required: true', 'MASTER_DETAIL_REQUIRED')
      }
    }
    const relType = data.relationshipType as string | undefined
    if (type === 'reference' && relType === 'masterDetail') {
      if (data.required !== true) {
        addError(errors, pathPrefix, 'Master-detail relationship requires required: true', 'MASTER_DETAIL_REQUIRED')
      }
    }
  }
  if (type === 'select' || type === 'multiselect') {
    const opts = data.options as Array<{ value?: string; label?: string }> | undefined
    if (!Array.isArray(opts) || opts.length === 0) {
      addError(errors, pathPrefix, 'At least one option is required for select fields', 'SELECT_MISSING_OPTIONS')
    } else {
      const empty = opts.find((o) => !o?.value?.trim() || !o?.label?.trim())
      if (empty) {
        addError(errors, pathPrefix, 'Each option must have a value and label', 'SELECT_INVALID_OPTION')
      }
    }
  }
  if (type === 'formula') {
    if (!data.formulaExpression || typeof data.formulaExpression !== 'string' || !(data.formulaExpression as string).trim()) {
      addError(errors, pathPrefix, 'Formula fields require formulaExpression', 'FORMULA_MISSING_EXPRESSION')
    }
    if (data.editable !== false && data.editable !== undefined) {
      addError(errors, pathPrefix, 'Formula fields must have editable: false', 'FORMULA_MUST_BE_READONLY')
    }
  }
}

function validateListViewFile(
  objectName: string,
  data: Record<string, unknown>,
  fieldKeys: string[],
  errors: ValidationError[],
  metadataPath?: string
): void {
  const pathPrefix = `${objectName}/listView.json`
  const keySet = new Set(fieldKeys)
  
  // Helper to validate statistics
  const validateStatistics = (statistics: Array<Record<string, unknown>>, statPathPrefix: string) => {
    const validTypes = ['count', 'sum', 'avg', 'min', 'max']
    for (let i = 0; i < statistics.length; i++) {
      const stat = statistics[i]
      const statPath = `${statPathPrefix}.statistics[${i}]`
      if (!stat.key || typeof stat.key !== 'string') {
        addError(errors, statPath, 'Missing required: key', 'STATISTICS_MISSING_KEY')
      }
      if (!stat.label || typeof stat.label !== 'string') {
        addError(errors, statPath, 'Missing required: label', 'STATISTICS_MISSING_LABEL')
      }
      const type = stat.type as string | undefined
      const formula = stat.formula as string | undefined
      if (!type && !formula) {
        // If neither type nor formula, default to count (which doesn't need a field)
        // This is valid, so we don't error
      } else if (type && !validTypes.includes(type)) {
        addError(errors, statPath, `Invalid type "${type}". Must be one of: ${validTypes.join(', ')}`, 'STATISTICS_INVALID_TYPE')
      }
      // For sum, avg, min, max, field is required (unless using custom formula)
      if (type && ['sum', 'avg', 'min', 'max'].includes(type)) {
        const field = stat.field as string | undefined
        if (!field || typeof field !== 'string') {
          addError(errors, statPath, `Field is required for type "${type}"`, 'STATISTICS_MISSING_FIELD')
        } else if (!keySet.has(field) && !SYSTEM_FIELDS_SET.has(field)) {
          addError(errors, statPath, `Field "${field}" does not exist in fields.json`, 'STATISTICS_UNKNOWN_FIELD')
        }
      }
    }
  }

  // Check if we have multiple views or legacy single view
  const views = data.views as Array<Record<string, unknown>> | undefined
  if (views && Array.isArray(views) && views.length > 0) {
    // Multiple views format
    const defaultView = data.defaultView as string | undefined
    if (defaultView) {
      const defaultViewExists = views.some((v) => v.key === defaultView)
      if (!defaultViewExists) {
        addError(errors, pathPrefix, `defaultView "${defaultView}" does not exist in views array`, 'LISTVIEW_INVALID_DEFAULT_VIEW')
      }
    }
    
    for (let i = 0; i < views.length; i++) {
      const view = views[i]
      const viewPath = `${pathPrefix}.views[${i}]`
      
      if (!view.key || typeof view.key !== 'string') {
        addError(errors, viewPath, 'Missing required: key', 'VIEW_MISSING_KEY')
      }
      if (!view.label || typeof view.label !== 'string') {
        addError(errors, viewPath, 'Missing required: label', 'VIEW_MISSING_LABEL')
      }
      
      const fields = view.fields as string[] | undefined
      if (!Array.isArray(fields)) {
        addError(errors, viewPath, 'fields must be an array', 'VIEW_INVALID_FIELDS')
      } else {
        for (const key of fields) {
          if (keySet.has(key) || SYSTEM_FIELDS_SET.has(key)) continue
          addError(errors, viewPath, `Field "${key}" does not exist in fields.json`, 'VIEW_UNKNOWN_FIELD')
        }
      }
      
      // Validate statistics if present
      const statistics = view.statistics as Array<Record<string, unknown>> | undefined
      if (statistics !== undefined) {
        if (!Array.isArray(statistics)) {
          addError(errors, viewPath, 'statistics must be an array', 'VIEW_INVALID_STATISTICS')
        } else {
          validateStatistics(statistics, viewPath)
        }
      }
      
      // Validate type if present
      const type = view.type as string | undefined
      if (type && type !== 'standard' && type !== 'recentlyViewed') {
        addError(errors, viewPath, `Invalid type "${type}". Must be "standard" or "recentlyViewed"`, 'VIEW_INVALID_TYPE')
      }

      // Validate profiles if present
      const profiles = view.profiles as string[] | undefined
      if (profiles !== undefined) {
        if (!Array.isArray(profiles)) {
          addError(errors, viewPath, 'profiles must be an array', 'VIEW_INVALID_PROFILES')
        } else if (profiles.length === 0) {
          addError(errors, viewPath, 'profiles must be non-empty when specified', 'VIEW_EMPTY_PROFILES')
        } else if (metadataPath) {
          const validProfiles = getProfileNames(metadataPath)
          for (let j = 0; j < profiles.length; j++) {
            const p = profiles[j]
            if (typeof p !== 'string' || !p.trim()) {
              addError(errors, `${viewPath}.profiles[${j}]`, 'Profile name must be a non-empty string', 'VIEW_INVALID_PROFILE_ITEM')
            } else if (!validProfiles.has(p)) {
              addError(errors, `${viewPath}.profiles[${j}]`, `Profile "${p}" does not exist in metadata/profiles/`, 'VIEW_UNKNOWN_PROFILE')
            }
          }
        }
      }
    }
  } else {
    // Legacy single view format (backward compatibility)
    const fields = data.fields as string[] | undefined
    if (!Array.isArray(fields)) {
      addError(errors, pathPrefix, 'fields must be an array', 'LISTVIEW_INVALID_FIELDS')
      return
    }
    for (const key of fields) {
      if (keySet.has(key) || SYSTEM_FIELDS_SET.has(key)) continue
      addError(errors, pathPrefix, `Field "${key}" does not exist in fields.json`, 'LISTVIEW_UNKNOWN_FIELD')
    }

    // Validate statistics if present
    const statistics = data.statistics as Array<Record<string, unknown>> | undefined
    if (statistics !== undefined) {
      if (!Array.isArray(statistics)) {
        addError(errors, pathPrefix, 'statistics must be an array', 'LISTVIEW_INVALID_STATISTICS')
      } else {
        validateStatistics(statistics, pathPrefix)
      }
    }
  }
}

function validateDetailViewFile(
  objectName: string,
  data: Record<string, unknown>,
  fieldKeys: string[],
  errors: ValidationError[]
): void {
  const pathPrefix = `${objectName}/detailView.json`
  const sections = data.sections as Array<{ title?: string; fields?: string[] }> | undefined
  if (!Array.isArray(sections)) {
    addError(errors, pathPrefix, 'sections must be an array', 'DETAILVIEW_INVALID_SECTIONS')
    return
  }
  const keySet = new Set(fieldKeys)
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]
    if (!section.title || typeof section.title !== 'string') {
      addError(errors, pathPrefix, `Section ${i + 1} missing title`, 'DETAILVIEW_SECTION_MISSING_TITLE')
    }
    const sectionFields = section.fields
    if (Array.isArray(sectionFields)) {
      for (const key of sectionFields) {
        if (typeof key !== 'string') continue
        if (keySet.has(key) || SYSTEM_FIELDS_SET.has(key)) continue
        addError(errors, pathPrefix, `Field "${key}" in section "${section.title}" does not exist`, 'DETAILVIEW_UNKNOWN_FIELD')
      }
    }
  }
}

function validateRelatedObjectsFile(
  objectName: string,
  data: unknown,
  objectNames: string[],
  errors: ValidationError[]
): void {
  const pathPrefix = `${objectName}/relatedObjects.json`
  if (!Array.isArray(data)) {
    addError(errors, pathPrefix, 'relatedObjects must be an array', 'RELATED_INVALID_FORMAT')
    return
  }
  for (let i = 0; i < data.length; i++) {
    const item = data[i] as Record<string, unknown>
    const itemPath = `${pathPrefix}[${i}]`
    if (!item.name || typeof item.name !== 'string') addError(errors, itemPath, 'Missing required: name', 'RELATED_MISSING_NAME')
    if (!item.label || typeof item.label !== 'string') addError(errors, itemPath, 'Missing required: label', 'RELATED_MISSING_LABEL')
    if (!item.labelPlural || typeof item.labelPlural !== 'string') addError(errors, itemPath, 'Missing required: labelPlural', 'RELATED_MISSING_LABEL_PLURAL')
    if (!item.objectDefinition || typeof item.objectDefinition !== 'string') addError(errors, itemPath, 'Missing required: objectDefinition', 'RELATED_MISSING_OBJECT')
    if (!item.apiEndpoint || typeof item.apiEndpoint !== 'string') addError(errors, itemPath, 'Missing required: apiEndpoint', 'RELATED_MISSING_API')
    if (!item.foreignKey || typeof item.foreignKey !== 'string') addError(errors, itemPath, 'Missing required: foreignKey', 'RELATED_MISSING_FK')
    const objDef = item.objectDefinition as string
    if (objDef && !objectNames.includes(objDef)) {
      addError(errors, itemPath, `objectDefinition "${objDef}" does not exist`, 'RELATED_OBJECT_NOT_FOUND')
    }
  }
}

/**
 * Validate that junction/detail objects use masterDetail type for parent references.
 * When parent has relatedObjects with foreignKey "parentField.id", the child's parentField must be masterDetail.
 */
function validateJunctionParentReferences(
  objectsPath: string,
  objectNames: string[],
  errors: ValidationError[]
): void {
  for (const parentObjectName of objectNames) {
    const relatedPath = path.join(objectsPath, parentObjectName, 'relatedObjects.json')
    if (!fs.existsSync(relatedPath)) continue
    let relatedData: unknown
    try {
      relatedData = JSON.parse(fs.readFileSync(relatedPath, 'utf-8'))
    } catch {
      continue
    }
    if (!Array.isArray(relatedData)) continue
    for (let i = 0; i < relatedData.length; i++) {
      const item = relatedData[i] as Record<string, unknown>
      const fk = item.foreignKey as string
      const childObjectName = item.objectDefinition as string
      if (!fk || typeof fk !== 'string' || !childObjectName) continue
      const fkMatch = fk.match(/^(\w+)\.id$/)
      if (!fkMatch) continue
      const parentFieldName = fkMatch[1]
      const childFieldDef = loadFieldDefinition(objectsPath, childObjectName, parentFieldName)
      if (!childFieldDef) continue
      const fieldType = (childFieldDef.type as string)?.toLowerCase()
      const relType = childFieldDef.relationshipType as string | undefined
      const objectName = (childFieldDef.objectName as string)?.trim()
      const isMasterDetail = fieldType === 'masterdetail' || relType === 'masterDetail'
      const referencesParent = objectName === parentObjectName
      if (referencesParent && !isMasterDetail) {
        addError(
          errors,
          `${childObjectName}/fields/${parentFieldName}.json`,
          `Junction/detail object "${childObjectName}" must use masterDetail type for parent reference "${parentFieldName}" (referenced by ${parentObjectName}/relatedObjects.json)`,
          'JUNCTION_MUST_USE_MASTER_DETAIL'
        )
      }
    }
  }
}

function getObjectNames(objectsPath: string): string[] {
  try {
    if (fs.existsSync(objectsPath)) {
      // Use directory scan so validation sees all objects on disk (index.json may be stale)
      return fs.readdirSync(objectsPath).filter((d) => {
        const p = path.join(objectsPath, d)
        return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'object.json'))
      }).filter((n) => !SYSTEM_OBJECTS_SET.has(n.toLowerCase()))
    }
  } catch {
    // ignore
  }
  return []
}

/** System objects from metadata/system/ that exist and are enabled by tenant config. Used for reference validation. */
function getSystemObjectNames(metadataPath: string, tenantConfig: TenantConfig | null): string[] {
  const systemPath = path.join(metadataPath, 'system')
  if (!fs.existsSync(systemPath) || !tenantConfig || tenantConfig.mode === 'none') return []
  const names: string[] = []
  if (tenantConfig.mode === 'tenant' || tenantConfig.mode === 'org_and_tenant') {
    if (fs.existsSync(path.join(systemPath, 'organization', 'object.json'))) names.push('organization')
  }
  if (tenantConfig.mode === 'org_and_tenant') {
    if (fs.existsSync(path.join(systemPath, 'tenant', 'object.json'))) names.push('tenant')
  }
  return names
}

export function validateSystemExtensionField(
  objectName: string,
  fieldKey: string,
  data: Record<string, unknown>,
  baseFields: Set<string>,
  errors: ValidationError[]
): void {
  const pathPrefix = `system-extensions/${objectName}/fields/${fieldKey}`
  if (baseFields.has(fieldKey)) {
    addError(errors, pathPrefix, `Extension field '${fieldKey}' cannot override base field`, 'EXT_BASE_FIELD_OVERRIDE')
    return
  }
  if (!data.key || typeof data.key !== 'string') {
    addError(errors, pathPrefix, 'Missing required: key', 'FIELD_MISSING_KEY')
  }
  if (!data.label || typeof data.label !== 'string') {
    addError(errors, pathPrefix, 'Missing required: label', 'FIELD_MISSING_LABEL')
  }
  if (!data.type || typeof data.type !== 'string') {
    addError(errors, pathPrefix, 'Missing required: type', 'FIELD_MISSING_TYPE')
    return
  }
  const type = (data.type as string).toLowerCase()
  if (!VALID_FIELD_TYPES.has(type) && type !== 'autonumber') {
    addError(errors, pathPrefix, `Invalid field type: ${data.type}`, 'FIELD_INVALID_TYPE')
  }
  if ((type === 'reference' || type === 'masterdetail') && (!data.objectName || typeof data.objectName !== 'string')) {
    addError(errors, pathPrefix, 'objectName is required for reference/masterDetail type', 'FIELD_REFERENCE_MISSING_OBJECT')
  }
}

/** Validate extension field - used by API when saving system extension fields. */
export function validateSystemExtension(
  objectName: string,
  fieldKey: string,
  fieldData: Record<string, unknown>
): ValidationResult {
  const errors: ValidationError[] = []
  const baseFields = SYSTEM_OBJECT_BASE_FIELDS[objectName]
  if (!baseFields) {
    addError(errors, `system-extensions/${objectName}`, `Object "${objectName}" does not support extensions`, 'EXT_OBJECT_NOT_SUPPORTED')
    return { valid: false, errors }
  }
  validateSystemExtensionField(objectName, fieldKey, fieldData, baseFields, errors)
  return { valid: errors.length === 0, errors }
}

/**
 * Full metadata validation - scans all objects. Used by CLI and validate endpoint.
 */
export function validateMetadataFull(metadataPath: string): ValidationResult {
  const errors: ValidationError[] = []
  const objectsPath = path.join(metadataPath, 'objects')
  if (!fs.existsSync(objectsPath)) {
    addError(errors, 'objects', 'Metadata objects path does not exist', 'PATH_NOT_FOUND')
    return { valid: errors.length === 0, errors }
  }
  const objectNames = getObjectNames(objectsPath)
  const tenantConfig = loadTenantConfig(metadataPath)
  const systemObjectNames = getSystemObjectNames(metadataPath, tenantConfig)
  const allObjectNames = [...objectNames, ...systemObjectNames]
  const objectDirs = fs.readdirSync(objectsPath).filter((d) => {
    const p = path.join(objectsPath, d)
    return fs.statSync(p).isDirectory()
  })

  // Validate tenant config
  validateTenantConfig(tenantConfig, metadataPath, objectNames, errors)

  // Check tableName uniqueness across objects
  const tableNameToObjects = new Map<string, string[]>()
  for (const objectName of objectDirs) {
    if (SYSTEM_OBJECTS_SET.has(objectName.toLowerCase())) continue
    const objPath = path.join(objectsPath, objectName)
    if (!fs.existsSync(path.join(objPath, 'object.json'))) continue
    try {
      const obj = JSON.parse(fs.readFileSync(path.join(objPath, 'object.json'), 'utf-8')) as Record<string, unknown>
      const tableName = ((obj.tableName as string) || pluralize(objectName)) as string
      const list = tableNameToObjects.get(tableName) || []
      list.push(objectName)
      tableNameToObjects.set(tableName, list)
    } catch {
      // Parse error handled in main loop
    }
  }
  for (const [tableName, objects] of tableNameToObjects) {
    if (objects.length > 1) {
      addError(errors, 'objects', `Duplicate tableName '${tableName}' used by objects: ${objects.join(', ')}`, 'DUPLICATE_TABLE_NAME')
    }
  }

  for (const objectName of objectDirs) {
    if (SYSTEM_OBJECTS_SET.has(objectName.toLowerCase())) continue
    const objPath = path.join(objectsPath, objectName)
    if (!fs.existsSync(path.join(objPath, 'object.json'))) continue
    let objectData: Record<string, unknown> = {}
    let fieldsList: string[] = []
    try {
      objectData = JSON.parse(fs.readFileSync(path.join(objPath, 'object.json'), 'utf-8')) as Record<string, unknown>
      validateObjectFile(objectName, objectData, errors, tenantConfig)
    } catch (e) {
      addError(errors, `${objectName}/object.json`, `Failed to parse: ${(e as Error).message}`, 'PARSE_ERROR')
    }
    try {
      const fieldsData = JSON.parse(fs.readFileSync(path.join(objPath, 'fields.json'), 'utf-8'))
      fieldsList = validateFieldsFile(objectName, fieldsData, errors)
    } catch (e) {
      addError(errors, `${objectName}/fields.json`, `Failed to parse: ${(e as Error).message}`, 'PARSE_ERROR')
    }
    const fieldsDir = path.join(objPath, 'fields')
    if (fs.existsSync(fieldsDir)) {
      const fieldFiles = fs.readdirSync(fieldsDir).filter((f) => f.endsWith('.json'))
      for (const file of fieldFiles) {
        const fieldKey = file.replace(/\.json$/, '')
        if (SYSTEM_FIELDS_SET.has(fieldKey)) {
          addError(errors, `${objectName}/fields/${fieldKey}.json`, `Metadata not allowed for system field: ${fieldKey}`, 'SYSTEM_FIELD_FORBIDDEN')
          continue
        }
        try {
          const fieldData = JSON.parse(fs.readFileSync(path.join(fieldsDir, file), 'utf-8')) as Record<string, unknown>
          validateFieldFile(objectName, fieldKey, fieldData, allObjectNames, errors, {
            objectsPath,
            fieldKeys: fieldsList,
          })
        } catch (e) {
          addError(errors, `${objectName}/fields/${file}`, `Failed to parse: ${(e as Error).message}`, 'PARSE_ERROR')
        }
      }
    }
    try {
      const listViewData = JSON.parse(fs.readFileSync(path.join(objPath, 'listView.json'), 'utf-8')) as Record<string, unknown>
      validateListViewFile(objectName, listViewData, fieldsList, errors, metadataPath)
    } catch (e) {
      addError(errors, `${objectName}/listView.json`, `Failed to parse: ${(e as Error).message}`, 'PARSE_ERROR')
    }
    try {
      const detailViewData = JSON.parse(fs.readFileSync(path.join(objPath, 'detailView.json'), 'utf-8')) as Record<string, unknown>
      validateDetailViewFile(objectName, detailViewData, fieldsList, errors)
    } catch (e) {
      addError(errors, `${objectName}/detailView.json`, `Failed to parse: ${(e as Error).message}`, 'PARSE_ERROR')
    }
    const relatedPath = path.join(objPath, 'relatedObjects.json')
    if (fs.existsSync(relatedPath)) {
      try {
        const relatedData = JSON.parse(fs.readFileSync(relatedPath, 'utf-8'))
        validateRelatedObjectsFile(objectName, relatedData, allObjectNames, errors)
      } catch (e) {
        addError(errors, `${objectName}/relatedObjects.json`, `Failed to parse: ${(e as Error).message}`, 'PARSE_ERROR')
      }
    }
  }

  validateJunctionParentReferences(objectsPath, allObjectNames, errors)

  // Validate system extensions (add-only fields for user, organization, tenant)
  const extensionsPath = path.join(metadataPath, 'system-extensions')
  if (fs.existsSync(extensionsPath)) {
    for (const objectName of SYSTEM_OBJECTS_WITH_EXTENSIONS) {
      const extDir = path.join(extensionsPath, objectName)
      if (!fs.existsSync(extDir)) continue
      const fieldsPath = path.join(extDir, 'fields.json')
      if (!fs.existsSync(fieldsPath)) continue
      try {
        const fieldsData = JSON.parse(fs.readFileSync(fieldsPath, 'utf-8'))
        if (!Array.isArray(fieldsData)) {
          addError(errors, `system-extensions/${objectName}/fields.json`, 'fields.json must be an array of field keys', 'EXT_FIELDS_INVALID_FORMAT')
          continue
        }
        const baseFields = SYSTEM_OBJECT_BASE_FIELDS[objectName]
        if (!baseFields) continue
        for (const fieldKey of fieldsData as string[]) {
          if (baseFields.has(fieldKey)) {
            addError(errors, `system-extensions/${objectName}/fields.json`, `Extension field '${fieldKey}' cannot override base field`, 'EXT_BASE_FIELD_OVERRIDE')
          }
          const fieldPath = path.join(extDir, 'fields', `${fieldKey}.json`)
          if (!fs.existsSync(fieldPath)) {
            addError(errors, `system-extensions/${objectName}/fields/${fieldKey}.json`, 'Field file missing', 'EXT_FIELD_FILE_MISSING')
            continue
          }
          try {
            const fieldData = JSON.parse(fs.readFileSync(fieldPath, 'utf-8')) as Record<string, unknown>
            validateSystemExtensionField(objectName, fieldKey, fieldData, baseFields, errors)
          } catch (e) {
            addError(errors, `system-extensions/${objectName}/fields/${fieldKey}.json`, `Failed to parse: ${(e as Error).message}`, 'PARSE_ERROR')
          }
        }
      } catch (e) {
        addError(errors, `system-extensions/${objectName}/fields.json`, `Failed to parse: ${(e as Error).message}`, 'PARSE_ERROR')
      }
    }
  }

  // Validate sidebars
  const sidebarsPath = path.join(metadataPath, 'sidebars')
  if (fs.existsSync(sidebarsPath)) {
    const sidebarFiles = fs.readdirSync(sidebarsPath).filter((f) => f.endsWith('.json') && f !== 'index.json')
    for (const file of sidebarFiles) {
      const sidebarId = file.replace(/\.json$/, '')
      try {
        const sidebarData = JSON.parse(fs.readFileSync(path.join(sidebarsPath, file), 'utf-8')) as Record<string, unknown>
        validateSidebarFile(sidebarId, sidebarData, errors)
      } catch (e) {
        addError(errors, `sidebars/${file}`, `Failed to parse: ${(e as Error).message}`, 'PARSE_ERROR')
      }
    }
  }

  // Validate profiles
  const profilesPath = path.join(metadataPath, 'profiles')
  if (fs.existsSync(profilesPath)) {
    const profileFiles = fs.readdirSync(profilesPath).filter((f) => f.endsWith('.json'))
    const sidebarIds = getSidebarIds(metadataPath)
    for (const file of profileFiles) {
      const profileName = file.replace(/\.json$/, '')
      try {
        const profileData = JSON.parse(fs.readFileSync(path.join(profilesPath, file), 'utf-8')) as Record<string, unknown>
        validateProfileFile(profileName, profileData, allObjectNames, objectsPath, errors, metadataPath, sidebarIds)
      } catch (e) {
        addError(errors, `profiles/${file}`, `Failed to parse: ${(e as Error).message}`, 'PARSE_ERROR')
      }
    }
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * Validate a single field - used by API when saving a field.
 * Pass objectsPath and fieldKeys to validate computed fields.
 */
export function validateField(
  objectName: string,
  fieldKey: string,
  fieldData: Record<string, unknown>,
  objectNames: string[],
  context?: { objectsPath: string; fieldKeys: string[] }
): ValidationResult {
  const errors: ValidationError[] = []
  if (SYSTEM_FIELDS_SET.has(fieldKey)) {
    addError(errors, `${objectName}/fields/${fieldKey}`, `System fields cannot be edited`, 'SYSTEM_FIELD_FORBIDDEN')
    return { valid: false, errors }
  }
  validateFieldFile(objectName, fieldKey, fieldData, objectNames, errors, context)
  return { valid: errors.length === 0, errors }
}

/**
 * Validate object.json - used by API when saving object.json.
 * Pass metadataPath to validate tenantScope against tenant-config.
 */
export function validateObject(
  objectName: string,
  objectData: Record<string, unknown>,
  metadataPath?: string
): ValidationResult {
  const errors: ValidationError[] = []
  const tenantConfig = metadataPath ? loadTenantConfig(metadataPath) : null
  validateObjectFile(objectName, objectData, errors, tenantConfig)
  return { valid: errors.length === 0, errors }
}

/**
 * Validate listView.json with context - used by API when saving listView.json.
 * Pass metadataPath to validate profiles array references.
 */
export function validateListView(
  objectName: string,
  listViewData: Record<string, unknown>,
  fieldKeys: string[],
  metadataPath?: string
): ValidationResult {
  const errors: ValidationError[] = []
  validateListViewFile(objectName, listViewData, fieldKeys, errors, metadataPath)
  return { valid: errors.length === 0, errors }
}

/**
 * Validate detailView.json with context - used by API when saving detailView.json.
 */
export function validateDetailView(
  objectName: string,
  detailViewData: Record<string, unknown>,
  fieldKeys: string[]
): ValidationResult {
  const errors: ValidationError[] = []
  validateDetailViewFile(objectName, detailViewData, fieldKeys, errors)
  return { valid: errors.length === 0, errors }
}

/**
 * Validate fields.json - used by API when saving fields.json.
 */
export function validateFieldsIndex(
  objectName: string,
  fieldsData: unknown
): ValidationResult {
  const errors: ValidationError[] = []
  validateFieldsFile(objectName, fieldsData, errors)
  return { valid: errors.length === 0, errors }
}

/**
 * Validate relatedObjects.json - used by API when saving relatedObjects.json.
 */
export function validateRelatedObjects(
  objectName: string,
  relatedData: unknown,
  objectNames: string[]
): ValidationResult {
  const errors: ValidationError[] = []
  validateRelatedObjectsFile(objectName, relatedData, objectNames, errors)
  return { valid: errors.length === 0, errors }
}

/**
 * Get object names from index - used by API for cross-reference validation.
 */
export function getObjectNamesForValidation(objectsPath: string): string[] {
  return getObjectNames(objectsPath)
}

function loadFieldKeysForProfile(objectsPath: string, objectName: string): string[] {
  try {
    const fieldsPath = path.join(objectsPath, objectName, 'fields.json')
    if (!fs.existsSync(fieldsPath)) return []
    const data = JSON.parse(fs.readFileSync(fieldsPath, 'utf-8'))
    if (!Array.isArray(data)) return []
    return data.filter((k: string) => typeof k === 'string')
  } catch {
    return []
  }
}

function loadGlobalActionIds(metadataPath: string): string[] {
  try {
    const filePath = path.join(metadataPath, 'global-actions.json')
    if (!fs.existsSync(filePath)) return []
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as { actions?: Array<{ id: string }> }
    const actions = data?.actions
    if (!Array.isArray(actions)) return []
    return actions.map((a) => a.id).filter((id): id is string => typeof id === 'string')
  } catch {
    return []
  }
}

function getSidebarIds(metadataPath: string): Set<string> {
  const ids = new Set<string>()
  const sidebarsPath = path.join(metadataPath, 'sidebars')
  if (!fs.existsSync(sidebarsPath)) return ids
  const files = fs.readdirSync(sidebarsPath).filter((f) => f.endsWith('.json') && f !== 'index.json')
  for (const file of files) {
    ids.add(file.replace(/\.json$/, ''))
  }
  return ids
}

function validateSidebarFile(
  sidebarId: string,
  sidebarData: Record<string, unknown>,
  errors: ValidationError[]
): void {
  const pathPrefix = `sidebars/${sidebarId}.json`
  if (!sidebarData.id || typeof sidebarData.id !== 'string' || !sidebarData.id.trim()) {
    addError(errors, pathPrefix, 'Missing required: id', 'SIDEBAR_MISSING_ID')
  }
  if (sidebarData.id && sidebarData.id !== sidebarId) {
    addError(errors, pathPrefix, `Sidebar id "${sidebarData.id}" does not match filename "${sidebarId}"`, 'SIDEBAR_ID_MISMATCH')
  }
  if (!sidebarData.label || typeof sidebarData.label !== 'string' || !sidebarData.label.trim()) {
    addError(errors, pathPrefix, 'Missing required: label', 'SIDEBAR_MISSING_LABEL')
  }
  if (!sidebarData.navGroups || !Array.isArray(sidebarData.navGroups)) {
    addError(errors, pathPrefix, 'Missing required: navGroups (must be an array)', 'SIDEBAR_MISSING_NAV_GROUPS')
    return
  }
  const navGroups = sidebarData.navGroups as Array<Record<string, unknown>>
  for (let i = 0; i < navGroups.length; i++) {
    const group = navGroups[i]
    if (!group || typeof group !== 'object') {
      addError(errors, `${pathPrefix}.navGroups[${i}]`, 'Nav group must be an object', 'SIDEBAR_INVALID_NAV_GROUP')
      continue
    }
    if (!group.title || typeof group.title !== 'string' || !group.title.trim()) {
      addError(errors, `${pathPrefix}.navGroups[${i}]`, 'Nav group must have a title', 'SIDEBAR_NAV_GROUP_MISSING_TITLE')
    }
    if (!group.items || !Array.isArray(group.items)) {
      addError(errors, `${pathPrefix}.navGroups[${i}]`, 'Nav group must have items array', 'SIDEBAR_NAV_GROUP_MISSING_ITEMS')
      continue
    }
    const items = group.items as Array<Record<string, unknown>>
    for (let j = 0; j < items.length; j++) {
      const item = items[j]
      if (!item || typeof item !== 'object') {
        addError(errors, `${pathPrefix}.navGroups[${i}].items[${j}]`, 'Item must be an object', 'SIDEBAR_INVALID_ITEM')
        continue
      }
      const itemType = item.type as string | undefined
      if (itemType === 'link') {
        if (!item.title || typeof item.title !== 'string') {
          addError(errors, `${pathPrefix}.navGroups[${i}].items[${j}]`, 'Link item must have title', 'SIDEBAR_LINK_MISSING_TITLE')
        }
        if (!item.url || typeof item.url !== 'string') {
          addError(errors, `${pathPrefix}.navGroups[${i}].items[${j}]`, 'Link item must have url', 'SIDEBAR_LINK_MISSING_URL')
        }
      } else if (itemType === 'collapsible') {
        if (!item.title || typeof item.title !== 'string') {
          addError(errors, `${pathPrefix}.navGroups[${i}].items[${j}]`, 'Collapsible item must have title', 'SIDEBAR_COLLAPSIBLE_MISSING_TITLE')
        }
        if (!item.items || !Array.isArray(item.items)) {
          addError(errors, `${pathPrefix}.navGroups[${i}].items[${j}]`, 'Collapsible item must have items array', 'SIDEBAR_COLLAPSIBLE_MISSING_ITEMS')
        } else {
          const subItems = item.items as Array<Record<string, unknown>>
          for (let k = 0; k < subItems.length; k++) {
            const sub = subItems[k]
            if (sub && typeof sub === 'object' && sub.type === 'link') {
              if (!sub.title || typeof sub.title !== 'string') {
                addError(errors, `${pathPrefix}.navGroups[${i}].items[${j}].items[${k}]`, 'Link item must have title', 'SIDEBAR_LINK_MISSING_TITLE')
              }
              if (!sub.url || typeof sub.url !== 'string') {
                addError(errors, `${pathPrefix}.navGroups[${i}].items[${j}].items[${k}]`, 'Link item must have url', 'SIDEBAR_LINK_MISSING_URL')
              }
            }
          }
        }
      } else if (!itemType || (itemType !== 'link' && itemType !== 'collapsible')) {
        addError(errors, `${pathPrefix}.navGroups[${i}].items[${j}]`, 'Item must have type "link" or "collapsible"', 'SIDEBAR_INVALID_ITEM_TYPE')
      }
    }
  }
}

function validateProfileFile(
  profileName: string,
  profileData: Record<string, unknown>,
  objectNames: string[],
  objectsPath: string,
  errors: ValidationError[],
  metadataPath?: string,
  sidebarIds?: Set<string>
): void {
  const pathPrefix = `profiles/${profileName}.json`
  
  // Validate structure
  if (!profileData.name || typeof profileData.name !== 'string' || !profileData.name.trim()) {
    addError(errors, pathPrefix, 'Missing required: name', 'PROFILE_MISSING_NAME')
  }
  if (profileData.name && profileData.name !== profileName) {
    addError(errors, pathPrefix, `Profile name "${profileData.name}" does not match filename "${profileName}"`, 'PROFILE_NAME_MISMATCH')
  }
  if (!profileData.label || typeof profileData.label !== 'string' || !profileData.label.trim()) {
    addError(errors, pathPrefix, 'Missing required: label', 'PROFILE_MISSING_LABEL')
  }
  if (profileData.sidebar !== undefined) {
    if (typeof profileData.sidebar !== 'string' || !profileData.sidebar.trim()) {
      addError(errors, pathPrefix, 'sidebar must be a non-empty string', 'PROFILE_INVALID_SIDEBAR')
    } else if (sidebarIds && !sidebarIds.has(profileData.sidebar as string)) {
      addError(errors, pathPrefix, `Sidebar "${profileData.sidebar}" does not exist in metadata/sidebars/`, 'PROFILE_UNKNOWN_SIDEBAR')
    }
  }
  if (!profileData.objectPermissions || typeof profileData.objectPermissions !== 'object') {
    addError(errors, pathPrefix, 'Missing required: objectPermissions', 'PROFILE_MISSING_OBJECT_PERMISSIONS')
    return
  }
  
  const objectPermissions = profileData.objectPermissions as Record<string, unknown>
  
  // Validate each object permission
  for (const [objectName, objPerm] of Object.entries(objectPermissions)) {
    if (!objectNames.includes(objectName)) {
      addError(errors, pathPrefix, `Object "${objectName}" does not exist in metadata`, 'PROFILE_INVALID_OBJECT')
      continue
    }
    
    if (!objPerm || typeof objPerm !== 'object') {
      addError(errors, pathPrefix, `Invalid objectPermission for "${objectName}"`, 'PROFILE_INVALID_OBJECT_PERMISSION')
      continue
    }
    
    const perm = objPerm as Record<string, unknown>
    const requiredPerms = ['create', 'read', 'update', 'delete']
    for (const permKey of requiredPerms) {
      if (typeof perm[permKey] !== 'boolean') {
        addError(errors, pathPrefix, `objectPermissions.${objectName}.${permKey} must be a boolean`, 'PROFILE_INVALID_PERMISSION_VALUE')
      }
    }
    
    // Validate field permissions if present
    if (perm.fieldPermissions && typeof perm.fieldPermissions === 'object') {
      const fieldPerms = perm.fieldPermissions as Record<string, unknown>
      const validFieldKeys = loadFieldKeysForProfile(objectsPath, objectName)
      
      for (const [fieldKey, fieldPerm] of Object.entries(fieldPerms)) {
        if (!validFieldKeys.includes(fieldKey)) {
          addError(errors, pathPrefix, `Field "${fieldKey}" does not exist on object "${objectName}"`, 'PROFILE_INVALID_FIELD')
          continue
        }
        
        if (!fieldPerm || typeof fieldPerm !== 'object') {
          addError(errors, pathPrefix, `Invalid fieldPermission for "${objectName}.${fieldKey}"`, 'PROFILE_INVALID_FIELD_PERMISSION')
          continue
        }
        
        const fp = fieldPerm as Record<string, unknown>
        if (typeof fp.visible !== 'boolean') {
          addError(errors, pathPrefix, `fieldPermissions.${objectName}.${fieldKey}.visible must be a boolean`, 'PROFILE_INVALID_FIELD_PERMISSION_VALUE')
        }
        if (typeof fp.editable !== 'boolean') {
          addError(errors, pathPrefix, `fieldPermissions.${objectName}.${fieldKey}.editable must be a boolean`, 'PROFILE_INVALID_FIELD_PERMISSION_VALUE')
        }
      }
    }
  }

  // Validate globalActionPermissions if present
  if (profileData.globalActionPermissions !== undefined) {
    if (typeof profileData.globalActionPermissions !== 'object' || profileData.globalActionPermissions === null) {
      addError(errors, pathPrefix, 'globalActionPermissions must be an object', 'PROFILE_INVALID_GLOBAL_ACTION_PERMISSIONS')
    } else if (metadataPath) {
      const validActionIds = loadGlobalActionIds(metadataPath)
      const globalActionPermissions = profileData.globalActionPermissions as Record<string, unknown>
      for (const [actionId, allowed] of Object.entries(globalActionPermissions)) {
        if (!validActionIds.includes(actionId)) {
          addError(errors, pathPrefix, `Global action "${actionId}" does not exist in metadata/global-actions.json`, 'PROFILE_INVALID_GLOBAL_ACTION')
        }
        if (typeof allowed !== 'boolean') {
          addError(errors, pathPrefix, `globalActionPermissions.${actionId} must be a boolean`, 'PROFILE_INVALID_GLOBAL_ACTION_VALUE')
        }
      }
    }
  }
}

/**
 * Validate a profile file - used by API when saving a profile.
 */
export function validateProfile(
  profileName: string,
  profileData: Record<string, unknown>,
  objectsPath: string,
  metadataPath?: string
): ValidationResult {
  const errors: ValidationError[] = []
  const objectNames = getObjectNames(objectsPath)
  const sidebarIds = metadataPath ? getSidebarIds(metadataPath) : undefined
  validateProfileFile(profileName, profileData, objectNames, objectsPath, errors, metadataPath, sidebarIds)
  return { valid: errors.length === 0, errors }
}
