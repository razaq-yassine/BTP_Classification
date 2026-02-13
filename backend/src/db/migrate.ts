import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import path from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function runMigrations() {
  const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), 'data.db')
  const sqlite = new Database(dbPath)
  const db = drizzle(sqlite)
  const migrationsFolder = path.join(process.cwd(), 'drizzle')
  migrate(db, { migrationsFolder })
  sqlite.close()
}

// CLI: tsx src/db/migrate.ts
if (process.argv[1]?.endsWith('migrate.ts')) {
  runMigrations().then(() => {
    console.log('Migrations complete')
    process.exit(0)
  })
}
