import "dotenv/config";
/**
 * Introspects the MySQL database and generates metadata JSON files for tables
 * that are not system-managed. Use for back-office when onboarding existing databases.
 *
 * Run: pnpm run db:retrieve
 * Options: --overwrite (overwrite existing metadata), --tables=orders,customers (filter)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import {
  PROTECTED_TABLES_SET,
  TENANT_SYSTEM_OBJECTS_SET
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
      raw === "none"
        ? "single_tenant"
        : raw === "tenant"
          ? "multi_tenant"
          : (raw as TenantMode);
    return { mode: ["single_tenant", "multi_tenant", "org_and_tenant"].includes(mode) ? mode : "single_tenant" };
  } catch {
    return { mode: "single_tenant" };
  }
}

/** Tables to skip (system + internal) */
const SKIP_TABLES = new Set([
  ...PROTECTED_TABLES_SET,
  "invite_tokens"
]);

type ColumnInfo = {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_key: string;
};

type FkInfo = {
  column_name: string;
  referenced_table_name: string;
};

function parseArgs(): { overwrite: boolean; tablesFilter: string[] | null } {
  const args = process.argv.slice(2);
  let overwrite = false;
  let tablesFilter: string[] | null = null;
  for (const arg of args) {
    if (arg === "--overwrite") overwrite = true;
    else if (arg.startsWith("--tables=")) {
      tablesFilter = arg.slice(9).split(",").map((t) => t.trim()).filter(Boolean);
    }
  }
  return { overwrite, tablesFilter };
}

function singularize(tableName: string): string {
  if (tableName.endsWith("ies")) return tableName.slice(0, -3) + "y";
  if (tableName.endsWith("es")) return tableName.slice(0, -2);
  if (tableName.endsWith("s")) return tableName.slice(0, -1);
  return tableName;
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function tableToObjectName(tableName: string): string {
  const singular = singularize(tableName);
  return toCamelCase(singular);
}

function columnToFieldKey(columnName: string, isReference: boolean): string {
  if (columnName.endsWith("_id") && isReference) {
    const base = columnName.slice(0, -3);
    return toCamelCase(base);
  }
  if (columnName.endsWith("_id")) {
    const base = columnName.slice(0, -3);
    return toCamelCase(base) + "Id";
  }
  return toCamelCase(columnName);
}

function mysqlTypeToFieldType(
  dataType: string,
  columnName: string,
  fkMap: Map<string, string>
): string {
  const ref = fkMap.get(columnName);
  if (ref) return "reference";

  const lower = dataType.toLowerCase();
  if (lower === "int" || lower === "bigint" || lower === "smallint" || lower === "mediumint") {
    return "number";
  }
  if (lower === "decimal" || lower === "float" || lower === "double") return "number";
  if (lower === "tinyint") return "boolean";
  if (lower === "datetime" || lower === "timestamp") return "datetime";
  if (lower === "date") return "date";
  if (lower === "text" || lower === "longtext" || lower === "mediumtext") return "text";
  if (lower === "varchar" || lower === "char") return "string";
  return "string";
}

function getReferencedObjectName(referencedTable: string): string {
  return tableToObjectName(referencedTable);
}

async function getTables(conn: mysql.Connection): Promise<string[]> {
  const [rows] = await conn.execute<mysql.RowDataPacket[]>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'"
  );
  return (rows || []).map((r) => (r.table_name ?? r.TABLE_NAME) as string);
}

async function getColumns(
  conn: mysql.Connection,
  tableName: string
): Promise<ColumnInfo[]> {
  const [rows] = await conn.execute<mysql.RowDataPacket[]>(
    "SELECT column_name, data_type, is_nullable, column_key FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? ORDER BY ordinal_position",
    [tableName]
  );
  return (rows || []).map((r) => ({
    column_name: (r.column_name ?? r.COLUMN_NAME) as string,
    data_type: (r.data_type ?? r.DATA_TYPE) as string,
    is_nullable: (r.is_nullable ?? r.IS_NULLABLE) as string,
    column_key: (r.column_key ?? r.COLUMN_KEY) as string
  }));
}

async function getForeignKeys(
  conn: mysql.Connection,
  tableName: string
): Promise<FkInfo[]> {
  const [rows] = await conn.execute<mysql.RowDataPacket[]>(
    `SELECT column_name, referenced_table_name
     FROM information_schema.key_column_usage
     WHERE table_schema = DATABASE() AND table_name = ? AND referenced_table_name IS NOT NULL`,
    [tableName]
  );
  return (rows || []).map((r) => ({
    column_name: (r.column_name ?? r.COLUMN_NAME) as string,
    referenced_table_name: (r.referenced_table_name ?? r.REFERENCED_TABLE_NAME) as string
  }));
}

function inferTenantScope(columnNames: Set<string>): string | null {
  if (columnNames.has("organization_id") && columnNames.has("tenant_id")) {
    return "org_and_tenant";
  }
  if (columnNames.has("organization_id")) return "tenant";
  return null;
}

async function main(): Promise<void> {
  const { overwrite, tablesFilter } = parseArgs();

  if (!fs.existsSync(path.dirname(OBJECTS_PATH))) {
    fs.mkdirSync(path.dirname(OBJECTS_PATH), { recursive: true });
  }
  if (!fs.existsSync(OBJECTS_PATH)) {
    fs.mkdirSync(OBJECTS_PATH, { recursive: true });
  }

  const connectionString =
    process.env.DATABASE_URL || "mysql://root:root@localhost:3306/generic_saas";
  let conn: mysql.Connection;
  try {
    conn = await mysql.createConnection(connectionString);
  } catch (err) {
    console.error("[db:retrieve] Could not connect to database:", (err as Error).message);
    process.exit(1);
  }

  const allTables = await getTables(conn);
  const tables = allTables.filter((t) => {
    if (SKIP_TABLES.has(t)) return false;
    if (tablesFilter && !tablesFilter.includes(t)) return false;
    return true;
  });

  if (tables.length === 0) {
    console.log("[db:retrieve] No tables to retrieve (filtered or all skipped)");
    await conn.end();
    return;
  }

  const created: string[] = [];
  const skipped: string[] = [];

  for (const tableName of tables) {
    const objectName = tableToObjectName(tableName);
    const objPath = path.join(OBJECTS_PATH, objectName);
    const objectJsonPath = path.join(objPath, "object.json");

    if (fs.existsSync(objectJsonPath) && !overwrite) {
      skipped.push(tableName);
      continue;
    }

    const columns = await getColumns(conn, tableName);
    const fks = await getForeignKeys(conn, tableName);
    const fkMap = new Map(fks.map((f) => [f.column_name, f.referenced_table_name]));
    const columnNames = new Set(columns.map((c) => c.column_name));

    const tenantScope = inferTenantScope(columnNames);

    const fieldsIndex: string[] = [];
    const fieldDefs: Array<Record<string, unknown>> = [];
    let hasNameField = false;

    for (const col of columns) {
      if (col.column_name === "id") continue;
      if (
        ["created_at", "updated_at", "created_by_id", "owner_id", "edited_by_id"].includes(
          col.column_name
        )
      )
        continue;
      if (tenantScope && ["organization_id", "tenant_id"].includes(col.column_name)) continue;

      const refTable = fkMap.get(col.column_name);
      const key = columnToFieldKey(col.column_name, !!refTable);
      const fieldType = mysqlTypeToFieldType(col.data_type, col.column_name, fkMap);
      const required = col.is_nullable === "NO";

      const label = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (c) => c.toUpperCase())
        .trim();

      const fieldDef: Record<string, unknown> = {
        key,
        label,
        type: fieldType,
        required,
        editable: true,
        sortable: true,
        searchable: fieldType !== "reference" && fieldType !== "masterDetail"
      };
      if (refTable) {
        fieldDef.objectName = getReferencedObjectName(refTable);
      }
      fieldDefs.push(fieldDef);
      fieldsIndex.push(key);
      if (key === "name") hasNameField = true;
    }

    if (!hasNameField) {
      const nameDef: Record<string, unknown> = {
        key: "name",
        label: "Name",
        type: "string",
        required: true,
        editable: false,
        sortable: true,
        searchable: true
      };
      fieldDefs.unshift(nameDef);
      fieldsIndex.unshift("name");
    }

    const plural = tableName;
    const label = objectName.charAt(0).toUpperCase() + objectName.slice(1).replace(/([A-Z])/g, " $1").trim();
    const labelPlural = label + (label.endsWith("s") ? "es" : "s");

    const objectJson: Record<string, unknown> = {
      name: objectName,
      label,
      labelPlural,
      tableName: tableName,
      apiEndpoint: `/api/${plural}`,
      basePath: `/${plural}`,
      detailPath: `/${plural}/$${objectName}Id`
    };
    if (tenantScope) objectJson.tenantScope = tenantScope;
    if (!hasNameField) {
      objectJson.description =
        "Retrieved from database. No name column found - add name column and backfill, or use trigger. See docs/BACK_OFFICE.md.";
    }

    const listViewFields = ["name", ...fieldsIndex.filter((f) => f !== "name").slice(0, 4)];
    if (columnNames.has("created_at")) listViewFields.push("createdAt");
    const listViewJson = {
      fields: listViewFields,
      defaultSort: "createdAt",
      defaultSortOrder: "desc" as const,
      pageSize: 10
    };

    const detailSections = [
      { title: "Basic Information", columns: 2, defaultOpen: true, fields: fieldsIndex },
      {
        title: "System Information",
        columns: 2,
        defaultOpen: false,
        fields: ["id", "createdAt", "updatedAt", "createdBy", "ownerId", "editedBy"]
      }
    ];
    const detailViewJson = {
      layout: "two-column" as const,
      sections: detailSections
    };

    fs.mkdirSync(path.join(objPath, "fields"), { recursive: true });
    fs.writeFileSync(objectJsonPath, JSON.stringify(objectJson, null, 2));
    fs.writeFileSync(
      path.join(objPath, "fields.json"),
      JSON.stringify(fieldsIndex, null, 2)
    );
    fs.writeFileSync(
      path.join(objPath, "listView.json"),
      JSON.stringify(listViewJson, null, 2)
    );
    fs.writeFileSync(
      path.join(objPath, "detailView.json"),
      JSON.stringify(detailViewJson, null, 2)
    );
    fs.writeFileSync(
      path.join(objPath, "relatedObjects.json"),
      JSON.stringify([], null, 2)
    );

    for (const fd of fieldDefs) {
      fs.writeFileSync(
        path.join(objPath, "fields", `${fd.key as string}.json`),
        JSON.stringify(fd, null, 2)
      );
    }

    created.push(tableName);
    console.log(`[db:retrieve] Created metadata for ${tableName} -> ${objectName}`);
  }

  if (created.length > 0) {
    const objectDirs = fs.readdirSync(OBJECTS_PATH).filter((d) => {
      const p = path.join(OBJECTS_PATH, d);
      return (
        fs.statSync(p).isDirectory() &&
        fs.existsSync(path.join(p, "object.json")) &&
        !TENANT_SYSTEM_OBJECTS_SET.has(d)
      );
    });
    objectDirs.sort();
    const tenantConfig = loadTenantConfig();
    const hasOrgs =
      tenantConfig.mode === "single_tenant" ||
      tenantConfig.mode === "multi_tenant" ||
      tenantConfig.mode === "org_and_tenant";
    const hasTenants =
      tenantConfig.mode === "single_tenant" || tenantConfig.mode === "org_and_tenant";
    const indexNames = [
      ...objectDirs,
      ...(hasOrgs && fs.existsSync(path.join(SYSTEM_OBJECTS_PATH, "organization", "object.json"))
        ? ["organization"]
        : []),
      ...(hasTenants && fs.existsSync(path.join(SYSTEM_OBJECTS_PATH, "tenant", "object.json"))
        ? ["tenant"]
        : [])
    ];
    const indexPath = path.join(METADATA_PATH, "objects", "index.json");
    fs.writeFileSync(indexPath, JSON.stringify(indexNames, null, 2));
    console.log(`[db:retrieve] Updated ${indexPath}`);
  }

  await conn.end();

  console.log(`[db:retrieve] Done. Created: ${created.length}, Skipped: ${skipped.length}`);
  if (skipped.length > 0) {
    console.log(`[db:retrieve] Skipped (use --overwrite to replace): ${skipped.join(", ")}`);
  }
}

main().catch((err) => {
  console.error("[db:retrieve]", err);
  process.exit(1);
});
