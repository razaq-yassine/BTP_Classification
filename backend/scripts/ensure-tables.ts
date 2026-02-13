/**
 * Ensures all tables from metadata exist in the database.
 * Creates any missing tables (e.g. from UI-created objects) when drizzle-kit generate
 * doesn't produce migrations. Run as part of db:deploy.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import { SYSTEM_FIELDS_SET, SYSTEM_FIELD_COLUMN_CONFIG } from '../../shared/protected-metadata'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.join(__dirname, '..')
const defaultMetadataPath = path.join(backendRoot, '../frontend/public/metadata')
const METADATA_PATH = process.env.METADATA_PATH || defaultMetadataPath
const OBJECTS_PATH = path.join(METADATA_PATH, 'objects')

function pluralize(name: string): string {
  if (name.endsWith('y')) return name.slice(0, -1) + 'ies'
  if (name.endsWith('s')) return name + 'es'
  return name + 's'
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`).replace(/^_/, '')
}

type FieldDef = {
  key: string
  type: string
  required?: boolean
  objectName?: string
  unique?: boolean
}

function mapTypeToSql(field: FieldDef): string {
  const t = field.type.toLowerCase()
  if (t === 'number') return 'REAL'
  if (t === 'boolean') return 'INTEGER'
  if (t === 'date' || t === 'datetime') return 'INTEGER'
  return 'TEXT'
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
    if ((fd as { computed?: boolean }).computed) continue
    fields.push(fd)
  }

  return { object, fields }
}

function generateCreateTableSql(tableName: string, fields: FieldDef[]): string {
  const cols: string[] = ['`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL']

  for (const field of fields) {
    const colName = toSnakeCase(field.key)
    const sqlType = mapTypeToSql(field)

    if (field.type === 'reference') {
      cols.push(`\`${colName}_id\` INTEGER NOT NULL`)
    } else {
      const notNull = field.required ? ' NOT NULL' : ''
      const isAutoNum = field.type === 'autoNumber' || field.type === 'autonumber'
      const unique = (field.unique || isAutoNum) ? ' UNIQUE' : ''
      const defaultVal = field.type === 'boolean' ? ' DEFAULT 1' : ''
      cols.push(`\`${colName}\` ${sqlType}${notNull}${unique}${defaultVal}`)
    }
  }

  for (const [key, cfg] of Object.entries(SYSTEM_FIELD_COLUMN_CONFIG)) {
    if (!fields.some((f) => f.key === key)) {
      const def = cfg.sqlDefault ? ` ${cfg.sqlDefault}` : ''
      cols.push(`\`${cfg.col}\` INTEGER${def}`)
    }
  }

  return `CREATE TABLE IF NOT EXISTS \`${tableName}\` (${cols.join(', ')})`
}

function main() {
  if (!fs.existsSync(OBJECTS_PATH)) {
    console.log('[ensure-tables] No metadata path, skipping')
    return
  }

  const objectDirs = fs.readdirSync(OBJECTS_PATH).filter((d) => {
    const p = path.join(OBJECTS_PATH, d)
    return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'object.json'))
  })

  const dbPath = process.env.DATABASE_URL || path.join(backendRoot, 'data.db')
  const db = new Database(dbPath)

  const existingTables = new Set(
    db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r: { name: string }) => r.name)
  )

  let created = 0
  for (const objectName of objectDirs) {
    const { object, fields } = loadObjectMetadata(objectName)
    const tableName = (object.tableName as string) || pluralize(objectName)

    if (existingTables.has(tableName)) continue

    const sql = generateCreateTableSql(tableName, fields)
    try {
      db.exec(sql)
      console.log(`[ensure-tables] Created table: ${tableName}`)
      created++
      existingTables.add(tableName)
    } catch (err) {
      console.error(`[ensure-tables] Failed to create ${tableName}:`, err)
    }
  }

  db.close()
  if (created > 0) {
    console.log(`[ensure-tables] Created ${created} missing table(s)`)
  }
}

main()
