/**
 * Generic pre-migration fix: For any pending migration that only adds columns,
 * if those columns already exist in the DB (e.g. from ensure-tables or manual changes),
 * mark the migration as applied so db:migrate won't fail with "duplicate column name".
 *
 * Works for any table/column — metadata-driven. Run before db:migrate as part of db:deploy.
 *
 * DB abstraction: SQLite uses PRAGMA table_info. For MySQL, swap to INFORMATION_SCHEMA.COLUMNS.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.join(__dirname, '..')
const DRIZZLE_FOLDER = path.join(backendRoot, 'drizzle')
const JOURNAL_PATH = path.join(DRIZZLE_FOLDER, 'meta', '_journal.json')

/** Drizzle/SQLite format: ALTER TABLE `table` ADD `column` ... or ADD COLUMN `column` */
const ADD_COLUMN_RE = /ALTER\s+TABLE\s+[`"]([^`"]+)[`"]\s+ADD\s+(?:COLUMN\s+)?[`"]([^`"]+)[`"]/gi

type DbClient = Database.Database

/** Get column names for a table. SQLite impl; for MySQL use INFORMATION_SCHEMA.COLUMNS. */
function getTableColumns(db: DbClient, tableName: string): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(\`${tableName}\`)`).all() as { name: string }[]
  return new Set(rows.map((r) => r.name))
}

/** Check if table exists. */
function tableExists(db: DbClient, tableName: string): boolean {
  const row = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")
    .get(tableName) as unknown
  return !!row
}

/** Parse migration SQL for ALTER TABLE X ADD COLUMN Y pairs. Returns unique [table, column] pairs. */
function parseAddColumnStatements(sql: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = []
  let m: RegExpExecArray | null
  ADD_COLUMN_RE.lastIndex = 0
  while ((m = ADD_COLUMN_RE.exec(sql)) !== null) {
    pairs.push([m[1], m[2]])
  }
  return [...new Map(pairs.map(([t, c]) => [`${t}.${c}`, [t, c]])).values()]
}

function main(): void {
  const dbPath = process.env.DATABASE_URL || path.join(backendRoot, 'data.db')
  if (!fs.existsSync(dbPath)) return

  if (!fs.existsSync(JOURNAL_PATH)) return

  const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf-8')) as {
    entries: Array<{ tag: string; when: number }>
  }
  const db = new Database(dbPath)

  const appliedHashes = new Set(
    (db.prepare('SELECT hash FROM __drizzle_migrations').all() as { hash: string }[]).map(
      (r) => r.hash
    )
  )

  for (const entry of journal.entries) {
    const migrationPath = path.join(DRIZZLE_FOLDER, `${entry.tag}.sql`)
    if (!fs.existsSync(migrationPath)) continue

    const content = fs.readFileSync(migrationPath, 'utf-8')
    const hash = crypto.createHash('sha256').update(content).digest('hex')
    if (appliedHashes.has(hash)) continue

    const addColumnPairs = parseAddColumnStatements(content)
    if (addColumnPairs.length === 0) continue

    let allExist = true
    for (const [table, column] of addColumnPairs) {
      if (!tableExists(db, table)) {
        allExist = false
        break
      }
      const cols = getTableColumns(db, table)
      if (!cols.has(column)) {
        allExist = false
        break
      }
    }

    if (allExist) {
      db.prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)').run(
        hash,
        entry.when
      )
      console.log(
        `[fix-pending-migrations] Marked ${entry.tag} as applied (columns already exist)`
      )
      appliedHashes.add(hash)
    }
  }

  db.close()
}

main()
