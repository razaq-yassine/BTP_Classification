import "dotenv/config";
/**
 * Ensures all tables from metadata exist in the database.
 * Creates any missing tables (e.g. from UI-created objects) when drizzle-kit generate
 * doesn't produce migrations. Run as part of db:deploy.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import {
  SYSTEM_FIELDS_SET,
  SYSTEM_FIELD_COLUMN_CONFIG
} from "../../shared/protected-metadata";

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

type FieldDef = {
  key: string;
  type: string;
  required?: boolean;
  objectName?: string;
  unique?: boolean;
};

function mapTypeToMySQL(field: FieldDef): string {
  const t = field.type.toLowerCase();
  if (t === "number") return "DECIMAL(10,2)";
  if (t === "boolean") return "TINYINT(1) DEFAULT 1";
  if (t === "date" || t === "datetime") return "DATETIME";
  if (t === "text") return "TEXT";
  return "VARCHAR(255)";
}

function loadObjectMetadata(objectName: string, objectsPath: string = OBJECTS_PATH): {
  object: Record<string, unknown>;
  fields: FieldDef[];
} {
  const objPath = path.join(objectsPath, objectName);
  const object = JSON.parse(
    fs.readFileSync(path.join(objPath, "object.json"), "utf-8")
  ) as Record<string, unknown>;
  const fieldsIndex = JSON.parse(
    fs.readFileSync(path.join(objPath, "fields.json"), "utf-8")
  ) as string[];
  const fields: FieldDef[] = [];

  for (const key of fieldsIndex) {
    if (SYSTEM_FIELDS_SET.has(key)) continue;
    const fieldPath = path.join(objPath, "fields", `${key}.json`);
    if (!fs.existsSync(fieldPath)) continue;
    const fd = JSON.parse(fs.readFileSync(fieldPath, "utf-8")) as FieldDef;
    if ((fd as { computed?: boolean; type?: string }).computed || (fd as { type?: string }).type === "formula") continue;
    fields.push(fd);
  }

  return { object, fields };
}

function generateCreateTableSql(tableName: string, fields: FieldDef[]): string {
  const cols: string[] = ["`id` INT PRIMARY KEY AUTO_INCREMENT NOT NULL"];

  for (const field of fields) {
    const colName = toSnakeCase(field.key);
    const sqlType = mapTypeToMySQL(field);

    if (field.type === "reference") {
      const refNotNull = field.required ? " NOT NULL" : "";
      cols.push(`\`${colName}_id\` INT${refNotNull}`);
    } else {
      const notNull = field.required ? " NOT NULL" : "";
      const isAutoNum =
        field.type === "autoNumber" || field.type === "autonumber";
      const unique = field.unique || isAutoNum ? " UNIQUE" : "";
      const defaultVal = field.type === "boolean" ? " DEFAULT 1" : "";
      cols.push(`\`${colName}\` ${sqlType}${notNull}${unique}${defaultVal}`);
    }
  }

  for (const [key, cfg] of Object.entries(SYSTEM_FIELD_COLUMN_CONFIG)) {
    if (!fields.some((f) => f.key === key)) {
      if ("mode" in cfg && cfg.mode === "reference") {
        const refCfg = cfg as { col: string };
        cols.push(`\`${refCfg.col}\` INT`);
      } else {
        const def = (cfg as { sqlDefault?: string }).sqlDefault
          ? ` ${(cfg as { sqlDefault: string }).sqlDefault}`
          : "";
        cols.push(`\`${(cfg as { col: string }).col}\` DATETIME${def}`);
      }
    }
  }

  return `CREATE TABLE IF NOT EXISTS \`${tableName}\` (${cols.join(", ")})`;
}

async function main() {
  if (!fs.existsSync(OBJECTS_PATH)) {
    console.log("[ensure-tables] No metadata path, skipping");
    return;
  }

  const tenantConfig = loadTenantConfig();
  const objectDirs = fs.readdirSync(OBJECTS_PATH).filter((d) => {
    const p = path.join(OBJECTS_PATH, d);
    return (
      fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, "object.json"))
    );
  });

  // Add tenant system objects when mode has orgs/tenants (load from metadata/system/)
  const systemObjects: string[] = [];
  const hasOrgs =
    tenantConfig.mode === "single_tenant" ||
    tenantConfig.mode === "multi_tenant" ||
    tenantConfig.mode === "org_and_tenant";
  const hasTenants =
    tenantConfig.mode === "single_tenant" || tenantConfig.mode === "org_and_tenant";
  if (hasOrgs && fs.existsSync(path.join(SYSTEM_OBJECTS_PATH, "organization", "object.json"))) {
    systemObjects.push("organization");
  }
  if (hasTenants && fs.existsSync(path.join(SYSTEM_OBJECTS_PATH, "tenant", "object.json"))) {
    systemObjects.push("tenant");
  }
  const allObjectNames = [...systemObjects, ...objectDirs];

  const connectionString =
    process.env.DATABASE_URL || "mysql://root:root@localhost:3306/generic_saas";
  let conn: mysql.Connection;
  try {
    conn = await mysql.createConnection(connectionString);
  } catch {
    console.log("[ensure-tables] Could not connect to database, skipping");
    return;
  }

  const [tableRows] = await conn.execute<mysql.RowDataPacket[]>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'"
  );
  const existingTables = new Set((tableRows || []).map((r) => (r.table_name ?? r.TABLE_NAME) as string));

  let created = 0;
  for (const objectName of allObjectNames) {
    const objectsPath = systemObjects.includes(objectName) ? SYSTEM_OBJECTS_PATH : OBJECTS_PATH;
    const { object, fields } = loadObjectMetadata(objectName, objectsPath);
    const tableName = (object.tableName as string) || pluralize(objectName);

    if (existingTables.has(tableName)) continue;

    const sql = generateCreateTableSql(tableName, fields);
    try {
      await conn.execute(sql);
      console.log(`[ensure-tables] Created table: ${tableName}`);
      created++;
      existingTables.add(tableName);
    } catch (err) {
      console.error(`[ensure-tables] Failed to create ${tableName}:`, err);
    }
  }

  await conn.end();
  if (created > 0) {
    console.log(`[ensure-tables] Created ${created} missing table(s)`);
  }
}

main().catch((err) => {
  console.error("[ensure-tables]", err);
  process.exit(1);
});
