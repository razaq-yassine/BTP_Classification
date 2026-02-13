/**
 * Compares metadata with database and drops tables/columns that no longer exist in metadata.
 * Run as part of db:deploy. Protects system tables (users, __drizzle_migrations).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import { PROTECTED_TABLES_SET, PROTECTED_COLUMNS_SET, SYSTEM_COLUMNS_SET } from '../../shared/protected-metadata'

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

function getExpectedTablesFromMetadata(): Set<string> {
  const expected = new Set<string>(['users']) // users is not in metadata objects
  if (!fs.existsSync(OBJECTS_PATH)) return expected

  const objectDirs = fs.readdirSync(OBJECTS_PATH).filter((d) => {
    const p = path.join(OBJECTS_PATH, d)
    return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'object.json'))
  })

  for (const objectName of objectDirs) {
    try {
      const object = JSON.parse(
        fs.readFileSync(path.join(OBJECTS_PATH, objectName, 'object.json'), 'utf-8')
      ) as Record<string, unknown>
      const tableName = (object.tableName as string) || pluralize(objectName)
      expected.add(tableName)
    } catch {
      // Skip invalid objects
    }
  }
  return expected
}

/** Returns Map<tableName, Set<columnName>> - expected columns per table from metadata */
function getExpectedColumnsFromMetadata(): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>()
  if (!fs.existsSync(OBJECTS_PATH)) return result

  const objectDirs = fs.readdirSync(OBJECTS_PATH).filter((d) => {
    const p = path.join(OBJECTS_PATH, d)
    return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'object.json'))
  })

  for (const objectName of objectDirs) {
    try {
      const object = JSON.parse(
        fs.readFileSync(path.join(OBJECTS_PATH, objectName, 'object.json'), 'utf-8')
      ) as Record<string, unknown>
      const tableName = (object.tableName as string) || pluralize(objectName)

      const cols = new Set<string>(SYSTEM_COLUMNS_SET)
      const fieldsPath = path.join(OBJECTS_PATH, objectName, 'fields.json')
      if (fs.existsSync(fieldsPath)) {
        const fieldsIndex = JSON.parse(fs.readFileSync(fieldsPath, 'utf-8')) as string[]
        for (const key of fieldsIndex) {
          if (key === 'id') continue
          const fieldPath = path.join(OBJECTS_PATH, objectName, 'fields', `${key}.json`)
          if (!fs.existsSync(fieldPath)) continue
          const fd = JSON.parse(fs.readFileSync(fieldPath, 'utf-8')) as { key: string; type?: string; computed?: boolean }
          if (fd.computed) continue
          if (fd.type === 'reference') {
            cols.add(toSnakeCase(key) + '_id')
          } else {
            cols.add(toSnakeCase(key))
          }
        }
      }
      result.set(tableName, cols)
    } catch {
      // Skip invalid objects
    }
  }
  return result
}

function getDbTables(db: Database.Database): string[] {
  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
  return rows.map((r) => r.name)
}

function getDbColumns(db: Database.Database, tableName: string): string[] {
  const rows = db.prepare(`PRAGMA table_info(\`${tableName}\`)`).all() as { name: string }[]
  return rows.map((r) => r.name)
}

function main() {
  const expectedTables = getExpectedTablesFromMetadata()
  const expectedColumns = getExpectedColumnsFromMetadata()
  const dbPath = process.env.DATABASE_URL || path.join(backendRoot, 'data.db')

  if (!fs.existsSync(dbPath)) {
    console.log('[sync-drops] No database file, skipping')
    return
  }

  const db = new Database(dbPath)
  const dbTables = getDbTables(db)

  let tablesDropped = 0
  const toDropTables = dbTables.filter(
    (t) => !PROTECTED_TABLES_SET.has(t) && !expectedTables.has(t)
  )

  for (const table of toDropTables) {
    try {
      db.exec(`DROP TABLE IF EXISTS \`${table}\``)
      console.log(`[sync-drops] Dropped table: ${table}`)
      tablesDropped++
    } catch (err) {
      console.error(`[sync-drops] Failed to drop table ${table}:`, err)
    }
  }

  // Drop columns that exist in DB but not in metadata (SQLite 3.35+)
  for (const tableName of expectedTables) {
    if (PROTECTED_TABLES_SET.has(tableName) || !dbTables.includes(tableName)) continue
    const expected = expectedColumns.get(tableName)
    if (!expected) continue

    const actualColumns = getDbColumns(db, tableName)
    const toDropCols = actualColumns.filter(
      (c) => !PROTECTED_COLUMNS_SET.has(c) && !expected.has(c)
    )

    for (const col of toDropCols) {
      try {
        db.exec(`ALTER TABLE \`${tableName}\` DROP COLUMN \`${col}\``)
        console.log(`[sync-drops] Dropped column ${tableName}.${col}`)
      } catch (err) {
        // SQLite < 3.35 doesn't support DROP COLUMN - skip silently
      }
    }
  }

  db.close()
  if (tablesDropped > 0) {
    console.log(`[sync-drops] Dropped ${tablesDropped} table(s) not in metadata`)
  }
}

main()
