import "dotenv/config";
/**
 * Verifies that the database schema matches metadata expectations.
 * Run after db:migrate as part of db:deploy. Exits with code 1 if columns are missing.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import { SYSTEM_COLUMNS_SET } from "../../shared/protected-metadata";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..");
const defaultMetadataPath = path.join(
  backendRoot,
  "../frontend/public/metadata"
);
const METADATA_PATH = process.env.METADATA_PATH || defaultMetadataPath;
const OBJECTS_PATH = path.join(METADATA_PATH, "objects");
const SYSTEM_OBJECTS_PATH = path.join(METADATA_PATH, "system");

type TenantMode = "single_tenant" | "multi_tenant" | "org_and_tenant";

function loadTenantConfig(): { mode: TenantMode } {
  const configPath = path.join(METADATA_PATH, "tenant-config.json");
  if (!fs.existsSync(configPath)) return { mode: "single_tenant" };
  try {
    const data = JSON.parse(fs.readFileSync(configPath, "utf-8")) as Record<string, unknown>;
    const raw = (data.mode as string) || "single_tenant";
    const mode: TenantMode =
      raw === "none" ? "single_tenant" : raw === "tenant" ? "multi_tenant" : raw;
    return { mode: ["single_tenant", "multi_tenant", "org_and_tenant"].includes(mode) ? mode : "single_tenant" };
  } catch {
    return { mode: "single_tenant" };
  }
}

function pluralize(name: string): string {
  if (name.endsWith("y")) return name.slice(0, -1) + "ies";
  if (name.endsWith("s")) return name + "es";
  return name + "s";
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`).replace(/^_/, "");
}

function loadColumnsFromObject(objectsPath: string, objectName: string): { tableName: string; cols: Set<string> } | null {
  try {
    const object = JSON.parse(
      fs.readFileSync(path.join(objectsPath, objectName, "object.json"), "utf-8")
    ) as Record<string, unknown>;
    const tableName = (object.tableName as string) || pluralize(objectName);
    const cols = new Set<string>(SYSTEM_COLUMNS_SET);
    const fieldsPath = path.join(objectsPath, objectName, "fields.json");
    if (fs.existsSync(fieldsPath)) {
      const fieldsIndex = JSON.parse(fs.readFileSync(fieldsPath, "utf-8")) as string[];
      for (const key of fieldsIndex) {
        if (key === "id") continue;
        const fieldPath = path.join(objectsPath, objectName, "fields", `${key}.json`);
        if (!fs.existsSync(fieldPath)) continue;
        const fd = JSON.parse(fs.readFileSync(fieldPath, "utf-8")) as {
          key: string;
          type?: string;
          computed?: boolean;
        };
        if (fd.computed || fd.type === "formula") continue;
        if (fd.type === "reference") {
          cols.add(toSnakeCase(key) + "_id");
        } else {
          cols.add(toSnakeCase(key));
        }
      }
    }
    return { tableName, cols };
  } catch {
    return null;
  }
}

/** Returns Map<tableName, Set<columnName>> - expected columns per table from metadata */
function getExpectedColumnsFromMetadata(): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  const tenantConfig = loadTenantConfig();

  // Add tenant system object columns when mode has orgs
  const hasOrgs =
    tenantConfig.mode === "single_tenant" ||
    tenantConfig.mode === "multi_tenant" ||
    tenantConfig.mode === "org_and_tenant";
  const hasTenants =
    tenantConfig.mode === "single_tenant" || tenantConfig.mode === "org_and_tenant";
  if (hasOrgs && fs.existsSync(path.join(SYSTEM_OBJECTS_PATH, "organization", "object.json"))) {
    const loaded = loadColumnsFromObject(SYSTEM_OBJECTS_PATH, "organization");
    if (loaded) result.set(loaded.tableName, loaded.cols);
  }
  if (hasTenants && fs.existsSync(path.join(SYSTEM_OBJECTS_PATH, "tenant", "object.json"))) {
    const loaded = loadColumnsFromObject(SYSTEM_OBJECTS_PATH, "tenant");
    if (loaded) result.set(loaded.tableName, loaded.cols);
  }

  if (!fs.existsSync(OBJECTS_PATH)) return result;

  const objectDirs = fs.readdirSync(OBJECTS_PATH).filter((d) => {
    const p = path.join(OBJECTS_PATH, d);
    return (
      fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, "object.json"))
    );
  });

  for (const objectName of objectDirs) {
    try {
      const object = JSON.parse(
        fs.readFileSync(
          path.join(OBJECTS_PATH, objectName, "object.json"),
          "utf-8"
        )
      ) as Record<string, unknown>;
      const tableName = (object.tableName as string) || pluralize(objectName);

      const cols = new Set<string>(SYSTEM_COLUMNS_SET);
      const fieldsPath = path.join(OBJECTS_PATH, objectName, "fields.json");
      if (fs.existsSync(fieldsPath)) {
        const fieldsIndex = JSON.parse(
          fs.readFileSync(fieldsPath, "utf-8")
        ) as string[];
        for (const key of fieldsIndex) {
          if (key === "id") continue;
          const fieldPath = path.join(
            OBJECTS_PATH,
            objectName,
            "fields",
            `${key}.json`
          );
          if (!fs.existsSync(fieldPath)) continue;
          const fd = JSON.parse(fs.readFileSync(fieldPath, "utf-8")) as {
            key: string;
            type?: string;
            computed?: boolean;
          };
          if (fd.computed || fd.type === "formula") continue;
          if (fd.type === "reference") {
            cols.add(toSnakeCase(key) + "_id");
          } else {
            cols.add(toSnakeCase(key));
          }
        }
      }
      result.set(tableName, cols);
    } catch {
      // Skip invalid objects
    }
  }
  return result;
}

async function getDbColumns(
  conn: mysql.Connection,
  tableName: string
): Promise<Set<string>> {
  const [rows] = await conn.execute<mysql.RowDataPacket[]>(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?",
    [tableName]
  );
  return new Set((rows || []).map((r) => (r.column_name ?? r.COLUMN_NAME) as string));
}

async function main(): Promise<number> {
  if (!fs.existsSync(OBJECTS_PATH)) {
    console.log("[verify-schema] No metadata path, skipping");
    return 0;
  }

  const connectionString =
    process.env.DATABASE_URL || "mysql://root:root@localhost:3306/generic_saas";
  let conn: mysql.Connection;
  try {
    conn = await mysql.createConnection(connectionString);
  } catch {
    console.log("[verify-schema] Could not connect to database, skipping");
    return 0;
  }

  const expectedColumns = getExpectedColumnsFromMetadata();
  const missing: string[] = [];

  for (const [tableName, expectedCols] of expectedColumns) {
    const actualCols = await getDbColumns(conn, tableName);
    for (const col of expectedCols) {
      if (!actualCols.has(col)) {
        missing.push(`${tableName}.${col}`);
      }
    }
  }

  await conn.end();

  if (missing.length > 0) {
    console.error(
      "[verify-schema] Schema mismatch: missing columns in database:"
    );
    missing.forEach((m) => console.error(`  - ${m}`));
    console.error(
      "[verify-schema] Run `pnpm run db:migrate` to apply migrations. See docs/USAGE.md#troubleshooting"
    );
    return 1;
  }

  console.log("[verify-schema] Schema verified OK");
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("[verify-schema]", err);
    process.exit(1);
  });
