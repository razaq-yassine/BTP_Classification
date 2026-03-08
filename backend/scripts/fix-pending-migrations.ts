import "dotenv/config";
/**
 * Generic pre-migration fix: For any pending migration that only adds columns,
 * if those columns already exist in the DB (e.g. from ensure-tables or manual changes),
 * mark the migration as applied so db:migrate won't fail with "duplicate column name".
 *
 * Works for any table/column — metadata-driven. Run before db:migrate as part of db:deploy.
 *
 * Uses MySQL INFORMATION_SCHEMA for introspection.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..");
const DRIZZLE_FOLDER = path.join(backendRoot, "drizzle");
const JOURNAL_PATH = path.join(DRIZZLE_FOLDER, "meta", "_journal.json");

/** Drizzle format: ALTER TABLE `table` ADD `column` ... or ADD COLUMN `column` */
const ADD_COLUMN_RE =
  /ALTER\s+TABLE\s+[`"]([^`"]+)[`"]\s+ADD\s+(?:COLUMN\s+)?[`"]([^`"]+)[`"]/gi;

/** Get column names for a table via INFORMATION_SCHEMA. */
async function getTableColumns(
  conn: mysql.Connection,
  tableName: string
): Promise<Set<string>> {
  const [rows] = await conn.execute<mysql.RowDataPacket[]>(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?",
    [tableName]
  );
  return new Set((rows || []).map((r) => (r.column_name ?? r.COLUMN_NAME) as string));
}

/** Check if table exists. */
async function tableExists(
  conn: mysql.Connection,
  tableName: string
): Promise<boolean> {
  const [rows] = await conn.execute<mysql.RowDataPacket[]>(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
    [tableName]
  );
  return (rows?.length ?? 0) > 0;
}

/** Parse migration SQL for ALTER TABLE X ADD COLUMN Y pairs. Returns unique [table, column] pairs. */
function parseAddColumnStatements(sql: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  let m: RegExpExecArray | null;
  ADD_COLUMN_RE.lastIndex = 0;
  while ((m = ADD_COLUMN_RE.exec(sql)) !== null) {
    pairs.push([m[1], m[2]]);
  }
  return [...new Map(pairs.map(([t, c]) => [`${t}.${c}`, [t, c]])).values()];
}

async function main(): Promise<void> {
  if (!fs.existsSync(JOURNAL_PATH)) return;

  const connectionString =
    process.env.DATABASE_URL || "mysql://root:root@localhost:3306/btp_classification_platform";
  const conn = await mysql.createConnection(connectionString);

  const [tables] = await conn.execute<mysql.RowDataPacket[]>(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '__drizzle_migrations'"
  );
  if (!tables?.length) {
    await conn.end();
    return;
  }

  const [appliedRows] = await conn.execute<mysql.RowDataPacket[]>(
    "SELECT hash FROM __drizzle_migrations"
  );
  const appliedHashes = new Set((appliedRows || []).map((r) => r.hash));

  const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, "utf-8")) as {
    entries: Array<{ tag: string; when: number }>;
  };

  for (const entry of journal.entries) {
    const migrationPath = path.join(DRIZZLE_FOLDER, `${entry.tag}.sql`);
    if (!fs.existsSync(migrationPath)) continue;

    const content = fs.readFileSync(migrationPath, "utf-8");
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    if (appliedHashes.has(hash)) continue;

    const addColumnPairs = parseAddColumnStatements(content);
    if (addColumnPairs.length === 0) continue;

    let allExist = true;
    for (const [table, column] of addColumnPairs) {
      if (!(await tableExists(conn, table))) {
        allExist = false;
        break;
      }
      const cols = await getTableColumns(conn, table);
      if (!cols.has(column)) {
        allExist = false;
        break;
      }
    }

    if (allExist) {
      await conn.execute(
        "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
        [hash, entry.when]
      );
      console.log(
        `[fix-pending-migrations] Marked ${entry.tag} as applied (columns already exist)`
      );
      appliedHashes.add(hash);
    }
  }

  await conn.end();
}

main().catch((err) => {
  console.error("[fix-pending-migrations]", err);
  process.exit(1);
});
