/**
 * Generates Drizzle schema from metadata.
 * Run: pnpm run db:generate-from-metadata
 *
 * Reads metadata from METADATA_PATH or ../frontend/public/metadata
 * Outputs to src/db/schema.ts
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { SYSTEM_FIELDS, SYSTEM_FIELDS_SET, SYSTEM_FIELD_COLUMN_CONFIG } from '../../shared/protected-metadata'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.join(__dirname, '..')
const defaultMetadataPath = path.join(backendRoot, '../frontend/public/metadata')

const METADATA_PATH = process.env.METADATA_PATH || defaultMetadataPath
const OBJECTS_PATH = path.join(METADATA_PATH, 'objects')

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`).replace(/^_/, '')
}

function pluralize(name: string): string {
  if (name.endsWith('y')) return name.slice(0, -1) + 'ies'
  if (name.endsWith('s')) return name + 'es'
  return name + 's'
}

function singularize(tableName: string): string {
  if (tableName.endsWith('ies')) return tableName.slice(0, -3) + 'y'
  if (tableName.endsWith('es')) return tableName.slice(0, -2)
  if (tableName.endsWith('s')) return tableName.slice(0, -1)
  return tableName
}

type FieldDef = {
  key: string
  type: string
  required?: boolean
  computed?: boolean
  objectName?: string
  unique?: boolean
  computedExpression?: string
  sourceFields?: string[]
  separator?: string
  referenceField?: string
  /** 'masterDetail' = required + cascade delete. Implies deleteOnCascade. */
  relationshipType?: string
  deleteOnCascade?: boolean
}

function mapTypeToSql(field: FieldDef): string {
  const t = field.type.toLowerCase()
  if (t === 'number') return 'real'
  if (t === 'boolean') return 'integer'
  if (t === 'date' || t === 'datetime') return 'integer'
  return 'text'
}

function loadObjectMetadata(objectName: string): { object: Record<string, unknown>; fields: FieldDef[] } {
  const objPath = path.join(OBJECTS_PATH, objectName)
  const object = JSON.parse(fs.readFileSync(path.join(objPath, 'object.json'), 'utf-8')) as Record<string, unknown>
  const fieldsIndex = JSON.parse(fs.readFileSync(path.join(objPath, 'fields.json'), 'utf-8')) as string[]
  const fields: FieldDef[] = []

  for (const key of fieldsIndex) {
    if (SYSTEM_FIELDS_SET.has(key)) continue
    const fieldPath = path.join(objPath, 'fields', `${key}.json`)
    if (!fs.existsSync(fieldPath)) continue
    const fd = JSON.parse(fs.readFileSync(fieldPath, 'utf-8')) as FieldDef
    if (fd.computed || fd.type === 'formula') continue
    fields.push(fd)
  }

  return { object, fields }
}

function loadAllFields(objectName: string): FieldDef[] {
  const objPath = path.join(OBJECTS_PATH, objectName)
  const fieldsIndex = JSON.parse(fs.readFileSync(path.join(objPath, 'fields.json'), 'utf-8')) as string[]
  const fields: FieldDef[] = []
  for (const key of fieldsIndex) {
    if (SYSTEM_FIELDS_SET.has(key)) continue
    const fieldPath = path.join(objPath, 'fields', `${key}.json`)
    if (!fs.existsSync(fieldPath)) continue
    const fd = JSON.parse(fs.readFileSync(fieldPath, 'utf-8')) as FieldDef
    fields.push(fd)
  }
  return fields
}

function loadRelatedObjects(objectName: string): Array<{ name: string; objectDefinition: string; apiEndpoint: string; foreignKey: string }> {
  const relatedPath = path.join(OBJECTS_PATH, objectName, 'relatedObjects.json')
  if (!fs.existsSync(relatedPath)) return []
  const arr = JSON.parse(fs.readFileSync(relatedPath, 'utf-8')) as Array<Record<string, unknown>>
  return arr.map((r) => ({
    name: r.name as string,
    objectDefinition: r.objectDefinition as string,
    apiEndpoint: (r.apiEndpoint as string) || '',
    foreignKey: (r.foreignKey as string) || '',
  }))
}

function generateTable(objectName: string, tableName: string, fields: FieldDef[], references: Map<string, string>): string {
  const lines: string[] = []
  lines.push(`export const ${tableName} = sqliteTable('${tableName}', {`)
  lines.push(`  id: integer('id').primaryKey({ autoIncrement: true }),`)

  for (const field of fields) {
    const colName = toSnakeCase(field.key)
    const sqlType = mapTypeToSql(field)
    const typeFn = sqlType === 'real' ? 'real' : sqlType === 'integer' ? 'integer' : 'text'

    if (field.type === 'reference') {
      const refTable = references.get(field.key) || pluralize(field.key)
      const cascade = field.relationshipType === 'masterDetail' || field.deleteOnCascade === true
      const refCall = cascade
        ? `references(() => ${refTable}.id, { onDelete: 'cascade' })`
        : `references(() => ${refTable}.id)`
      lines.push(`  ${field.key}Id: integer('${colName}_id').notNull().${refCall},`)
    } else {
      const notNull = field.required ? '.notNull()' : ''
      const isAutoNum = field.type === 'autoNumber' || field.type === 'autonumber'
      const unique = (field.unique || isAutoNum) ? '.unique()' : ''
      const tsMode = field.type === 'boolean' ? ", { mode: 'boolean' }" : (field.type === 'date' || field.type === 'datetime') ? ", { mode: 'timestamp' }" : ''
      if (field.type === 'boolean') {
        lines.push(`  ${field.key}: integer('${colName}'${tsMode}).default(true),`)
      } else if (field.type === 'date' || field.type === 'datetime') {
        lines.push(`  ${field.key}: integer('${colName}', { mode: 'timestamp' })${notNull}${unique},`)
      } else {
        lines.push(`  ${field.key}: ${typeFn}('${colName}')${notNull}${unique},`)
      }
    }
  }

  // Standard columns (from protected-metadata, exclude id)
  for (const fk of SYSTEM_FIELDS) {
    if (fk === 'id') continue
    const cfg = SYSTEM_FIELD_COLUMN_CONFIG[fk as keyof typeof SYSTEM_FIELD_COLUMN_CONFIG]
    if (cfg && !fields.some((f) => f.key === fk)) {
      const modeStr = cfg.mode === 'boolean' ? "mode: 'boolean'" : "mode: 'timestamp'"
      lines.push(`  ${fk}: integer('${cfg.col}', { ${modeStr} })${cfg.drizzleDefault},`)
    }
  }

  lines.push('})')
  return lines.join('\n')
}

const TEMP_DIR = process.argv.includes('--temp-dir')
  ? path.join(backendRoot, 'drizzle-temp')
  : null

function main() {
  if (!fs.existsSync(OBJECTS_PATH)) {
    console.error('Metadata path not found:', OBJECTS_PATH)
    process.exit(1)
  }

  const objectDirs = fs.readdirSync(OBJECTS_PATH).filter((d) => {
    const p = path.join(OBJECTS_PATH, d)
    return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'object.json'))
  })

  const usersTable = `export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  dateJoined: integer('date_joined', { mode: 'timestamp' }),
})`

  const tables: string[] = [usersTable]
  const tableNames: string[] = ['users']
  const refs = new Map<string, string>()

  for (const objectName of objectDirs) {
    const { object, fields } = loadObjectMetadata(objectName)
    const tableName = (object.tableName as string) || pluralize(objectName)

    for (const f of fields) {
      if (f.type === 'reference') {
        refs.set(f.key, tableName)
      }
    }

    const refMap = new Map<string, string>()
    for (const f of fields) {
      if (f.type === 'reference') {
        refMap.set(f.key, pluralize(f.objectName || f.key))
      }
    }

    const tableCode = generateTable(objectName, tableName, fields, refMap)
    tables.push(tableCode)
    tableNames.push(tableName)
  }

  const schemaContent = `import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

${tables.join('\n\n')}

export type User = typeof users.$inferSelect
${tableNames.filter((t) => t !== 'users').map((t) => `export type ${singularize(t).charAt(0).toUpperCase() + singularize(t).slice(1)} = typeof ${t}.$inferSelect`).join('\n')}
`

  const schemaPath = TEMP_DIR
    ? path.join(TEMP_DIR, 'db', 'schema.ts')
    : path.join(backendRoot, 'src/db/schema.ts')
  if (TEMP_DIR) fs.mkdirSync(path.dirname(schemaPath), { recursive: true })
  fs.writeFileSync(schemaPath, schemaContent)
  console.log('Generated schema from metadata:', schemaPath)

  // Write object index for frontend loader
  const indexPath = path.join(METADATA_PATH, 'objects', 'index.json')
  const indexContent = JSON.stringify(objectDirs, null, 2)
  fs.writeFileSync(indexPath, indexContent)
  console.log('Updated object index:', indexPath)

  // Write version for frontend cache invalidation (no restart needed for frontend to pick up changes)
  const versionPath = path.join(METADATA_PATH, 'version.json')
  fs.writeFileSync(versionPath, JSON.stringify({ version: Date.now() }, null, 2))
  console.log('Updated metadata version:', versionPath)

  // Generate entity registry for generic routes
  generateEntityRegistry(objectDirs)
}

function generateEntityRegistry(objectDirs: string[]) {
  const relatedListPathsByEntity = new Map<string, Record<string, { filterColumn: string }>>()
  for (const objectName of objectDirs) {
    const related = loadRelatedObjects(objectName)
    for (const rel of related) {
      const apiEndpoint = rel.apiEndpoint.replace(/^\/api\//, '')
      const parts = apiEndpoint.split('/')
      if (parts.length >= 2) {
        const entityPath = parts[0]
        const subPath = parts[1]
        const fkMatch = rel.foreignKey.match(/^(\w+)\.id$/)
        const filterColumn = fkMatch ? `${fkMatch[1]}Id` : 'id'
        const existing = relatedListPathsByEntity.get(entityPath) || {}
        existing[subPath] = { filterColumn }
        relatedListPathsByEntity.set(entityPath, existing)
      }
    }
  }

  const entityConfigs: string[] = []
  const imports = new Set<string>()
  for (const objectName of objectDirs) {
    const { object, fields } = loadObjectMetadata(objectName)
    const allFields = loadAllFields(objectName)
    const tableName = (object.tableName as string) || pluralize(objectName)
    imports.add(tableName)

    const searchableFields = fields.filter((f) => f.type !== 'reference' && f.type !== 'formula')
    const searchFieldRefs = searchableFields
      .filter((f) => (f as any).searchable !== false)
      .map((f) => `${tableName}.${f.key}`)
    const searchFieldsArr = searchFieldRefs.length > 0 ? searchFieldRefs : [`${tableName}.id`]

    const insertFields = fields.filter((f) => f.type !== 'reference').map((f) => f.key)
    const referenceFields = fields.filter((f) => f.type === 'reference')
    const systemInsertFields = SYSTEM_FIELDS.filter((f) => f !== 'id')
    const insertFieldsArr = [...new Set([
      ...insertFields,
      ...referenceFields.map((f) => `${f.key}Id`),
      ...systemInsertFields,
    ])]
    const updateFieldsArr = insertFieldsArr.filter((f) => f !== 'createdAt')

    let joinConfig = ''
    if (referenceFields.length > 0) {
      const ref = referenceFields[0]
      const refTable = pluralize(ref.objectName || ref.key)
      imports.add(refTable)
      joinConfig = `join: { joinTable: ${refTable}, leftColumn: ${tableName}.${ref.key}Id, rightColumn: ${refTable}.id }`
    }

    const computedFields = allFields.filter((f) => f.computed && f.computedExpression)
    let computedConfig = 'undefined'
    if (computedFields.length > 0) {
      const computedArr = computedFields
        .map((f) => {
          if (f.computedExpression === 'concat') {
            const sep = (f.separator || ' ').replace(/'/g, "\\'")
            return `{ key: '${f.key}', expression: 'concat', sourceFields: [${(f.sourceFields || []).map((s) => `'${s}'`).join(', ')}], separator: '${sep}' }`
          }
          if (f.computedExpression === 'join') {
            const sep = (f.separator || ' ').replace(/'/g, "\\'")
            return `{ key: '${f.key}', expression: 'join', referenceField: '${f.referenceField || ''}', sourceFields: [${(f.sourceFields || []).map((s) => `'${s}'`).join(', ')}], separator: '${sep}' }`
          }
          return null
        })
        .filter(Boolean)
      computedConfig = `[${computedArr.join(', ')}]`
    }

    const relatedPaths = relatedListPathsByEntity.get(tableName)
    const relatedPathsStr = relatedPaths && Object.keys(relatedPaths).length > 0 ? JSON.stringify(relatedPaths) : 'undefined'

    const autoNumberFields = allFields
      .filter((f) => (f.type === 'autoNumber' || f.type === 'autonumber') && f.key)
      .map((f) => {
        const pattern = ((f as any).autoNumberPattern || '{0000}').replace(/'/g, "\\'")
        const start = (f as any).autoNumberStart ?? 1
        return `'${f.key}': { pattern: '${pattern}', start: ${start} }`
      })
    const autoNumberConfig = autoNumberFields.length > 0 ? `autoNumberFields: { ${autoNumberFields.join(', ')} }` : ''

    const configParts = [
      `table: ${tableName}`,
      `objectName: '${objectName}'`,
      `searchFields: [${searchFieldsArr.join(', ')}]`,
      `insertFields: [${insertFieldsArr.map((s) => `'${s}'`).join(', ')}]`,
      `updateFields: [${updateFieldsArr.map((s) => `'${s}'`).join(', ')}]`,
      `referenceFields: [${referenceFields.map((f) => `{ key: '${f.key}', idField: '${f.key}Id', refTable: '${pluralize(f.objectName || f.key)}' }`).join(', ')}]`,
      joinConfig,
      `computedFields: ${computedConfig}`,
      `relatedListPaths: ${relatedPathsStr}`,
      autoNumberConfig,
    ].filter(Boolean)

    entityConfigs.push(`  '${tableName}': { ${configParts.join(', ')} },`)
  }

  const registryContent = `/**
 * Auto-generated by db:generate-from-metadata. Do not edit manually.
 */
import { ${[...imports].join(', ')} } from '../db/schema.js'

export const entityRegistry = {
${entityConfigs.join('\n')}
} as const

export type EntityPath = keyof typeof entityRegistry
`
  const registryPath = TEMP_DIR
    ? path.join(TEMP_DIR, 'routes', 'entity-registry.generated.ts')
    : path.join(backendRoot, 'src/routes/entity-registry.generated.ts')
  if (TEMP_DIR) fs.mkdirSync(path.dirname(registryPath), { recursive: true })
  fs.writeFileSync(registryPath, registryContent)
  console.log('Generated entity registry:', registryPath)
}

main()
