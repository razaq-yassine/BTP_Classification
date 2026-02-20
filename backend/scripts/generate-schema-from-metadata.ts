/**
 * Generates Drizzle schema from metadata.
 * Run: pnpm run db:generate-from-metadata
 *
 * Reads metadata from METADATA_PATH or ../frontend/public/metadata
 * Outputs to src/db/schema.ts
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  SYSTEM_FIELDS,
  SYSTEM_FIELDS_SET,
  SYSTEM_FIELD_COLUMN_CONFIG,
  SYSTEM_OBJECTS_WITH_EXTENSIONS,
  SYSTEM_OBJECT_BASE_FIELDS,
  SYSTEM_USER_REFERENCE_INSERT_FIELDS,
  SYSTEM_USER_REFERENCE_UPDATE_FIELDS,
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
const SYSTEM_EXTENSIONS_PATH = path.join(METADATA_PATH, "system-extensions");

type TenantMode = "single_tenant" | "multi_tenant" | "org_and_tenant";

function loadTenantConfig(): { mode: TenantMode } {
  const configPath = path.join(METADATA_PATH, "tenant-config.json");
  if (!fs.existsSync(configPath)) return { mode: "single_tenant" };
  try {
    const data = JSON.parse(fs.readFileSync(configPath, "utf-8")) as Record<
      string,
      unknown
    >;
    const raw = (data.mode as string) || "single_tenant";
    const mode =
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

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`).replace(/^_/, "");
}

function pluralize(name: string): string {
  if (name.endsWith("y")) return name.slice(0, -1) + "ies";
  if (name.endsWith("s")) return name + "es";
  return name + "s";
}

function singularize(tableName: string): string {
  if (tableName.endsWith("ies")) return tableName.slice(0, -3) + "y";
  if (tableName.endsWith("es")) return tableName.slice(0, -2);
  if (tableName.endsWith("s")) return tableName.slice(0, -1);
  return tableName;
}

type FieldDef = {
  key: string;
  type: string;
  required?: boolean;
  computed?: boolean;
  objectName?: string;
  unique?: boolean;
  computedExpression?: string;
  sourceFields?: string[];
  separator?: string;
  referenceField?: string;
  /** 'masterDetail' = required + cascade delete. Implies deleteOnCascade. */
  relationshipType?: string;
  deleteOnCascade?: boolean;
};

function mapTypeToSql(field: FieldDef): string {
  const t = field.type.toLowerCase();
  if (t === "number") return "real";
  if (t === "boolean") return "integer";
  if (t === "date" || t === "datetime") return "integer";
  return "text";
}

type Dialect = "sqlite" | "mysql";

function getDialect(): Dialect {
  const arg = process.argv.find((a) => a.startsWith("--dialect="));
  if (arg) {
    const d = arg.split("=")[1]?.toLowerCase();
    if (d === "mysql" || d === "sqlite") return d;
  }
  return "mysql";
}

function loadObjectMetadata(objectName: string): {
  object: Record<string, unknown>;
  fields: FieldDef[];
} {
  const objPath = path.join(OBJECTS_PATH, objectName);
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
    if (fd.computed || fd.type === "formula") continue;
    fields.push(fd);
  }

  return { object, fields };
}

function loadAllFields(objectName: string): FieldDef[] {
  const objPath = path.join(OBJECTS_PATH, objectName);
  const fieldsIndex = JSON.parse(
    fs.readFileSync(path.join(objPath, "fields.json"), "utf-8")
  ) as string[];
  const fields: FieldDef[] = [];
  for (const key of fieldsIndex) {
    if (SYSTEM_FIELDS_SET.has(key)) continue;
    const fieldPath = path.join(objPath, "fields", `${key}.json`);
    if (!fs.existsSync(fieldPath)) continue;
    const fd = JSON.parse(fs.readFileSync(fieldPath, "utf-8")) as FieldDef;
    fields.push(fd);
  }
  return fields;
}

function loadRelatedObjects(
  objectName: string,
  objectsPath: string = OBJECTS_PATH
): Array<{
  name: string;
  objectDefinition: string;
  apiEndpoint: string;
  foreignKey: string;
}> {
  const relatedPath = path.join(objectsPath, objectName, "relatedObjects.json");
  if (!fs.existsSync(relatedPath)) return [];
  const arr = JSON.parse(fs.readFileSync(relatedPath, "utf-8")) as Array<
    Record<string, unknown>
  >;
  return arr.map((r) => ({
    name: r.name as string,
    objectDefinition: r.objectDefinition as string,
    apiEndpoint: (r.apiEndpoint as string) || "",
    foreignKey: (r.foreignKey as string) || ""
  }));
}

function loadSystemObjectMetadata(objectName: string): {
  object: Record<string, unknown>;
  fields: FieldDef[];
} {
  const objPath = path.join(SYSTEM_OBJECTS_PATH, objectName);
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
    if (fd.computed || fd.type === "formula") continue;
    fields.push(fd);
  }

  return { object, fields };
}

function loadAllSystemFields(objectName: string): FieldDef[] {
  const objPath = path.join(SYSTEM_OBJECTS_PATH, objectName);
  const fieldsIndex = JSON.parse(
    fs.readFileSync(path.join(objPath, "fields.json"), "utf-8")
  ) as string[];
  const fields: FieldDef[] = [];
  for (const key of fieldsIndex) {
    if (SYSTEM_FIELDS_SET.has(key)) continue;
    const fieldPath = path.join(objPath, "fields", `${key}.json`);
    if (!fs.existsSync(fieldPath)) continue;
    const fd = JSON.parse(fs.readFileSync(fieldPath, "utf-8")) as FieldDef;
    fields.push(fd);
  }
  return fields;
}

function loadExtensionFields(objectName: string): FieldDef[] {
  if (
    !SYSTEM_OBJECTS_WITH_EXTENSIONS.includes(
      objectName as "user" | "organization" | "tenant"
    )
  )
    return [];
  const extPath = path.join(SYSTEM_EXTENSIONS_PATH, objectName);
  if (!fs.existsSync(extPath)) return [];
  const fieldsPath = path.join(extPath, "fields.json");
  if (!fs.existsSync(fieldsPath)) return [];
  const baseFields = SYSTEM_OBJECT_BASE_FIELDS[objectName];
  if (!baseFields) return [];
  const fieldsIndex = JSON.parse(
    fs.readFileSync(fieldsPath, "utf-8")
  ) as string[];
  const fields: FieldDef[] = [];
  for (const key of fieldsIndex) {
    if (baseFields.has(key)) continue;
    const fieldPath = path.join(extPath, "fields", `${key}.json`);
    if (!fs.existsSync(fieldPath)) continue;
    const fd = JSON.parse(fs.readFileSync(fieldPath, "utf-8")) as FieldDef;
    if (fd.computed || fd.type === "formula") continue;
    fields.push(fd);
  }
  return fields;
}

function generateExtensionColumnLines(
  fields: FieldDef[],
  dialect: Dialect
): string {
  if (fields.length === 0) return "";
  const lines: string[] = [];
  for (const field of fields) {
    const colName = toSnakeCase(field.key);
    const notNull = field.required ? ".notNull()" : "";
    if (field.type === "reference" || field.type === "masterDetail") {
      const refTable = pluralize(field.objectName || field.key);
      const cascade =
        field.type === "masterDetail" ||
        field.relationshipType === "masterDetail" ||
        field.deleteOnCascade === true;
      const refCall = cascade
        ? `references(() => ${refTable}.id, { onDelete: 'cascade' })`
        : `references(() => ${refTable}.id, { onDelete: 'set null' })`;
      const refNotNull =
        field.type === "masterDetail" || field.required ? ".notNull()" : "";
      lines.push(
        `  ${field.key}Id: ${
          dialect === "mysql" ? "int" : "integer"
        }('${colName}_id')${refNotNull}.${refCall},`
      );
    } else if (dialect === "mysql") {
      if (field.type === "boolean") {
        lines.push(`  ${field.key}: boolean('${colName}').default(true),`);
      } else if (field.type === "date" || field.type === "datetime") {
        lines.push(`  ${field.key}: datetime('${colName}')${notNull},`);
      } else if (field.type === "number") {
        lines.push(
          `  ${field.key}: decimal('${colName}', { precision: 10, scale: 2 })${notNull},`
        );
      } else if (field.type === "text") {
        lines.push(`  ${field.key}: text('${colName}')${notNull},`);
      } else {
        lines.push(
          `  ${field.key}: varchar('${colName}', { length: 255 })${notNull},`
        );
      }
    } else {
      if (field.type === "boolean") {
        lines.push(
          `  ${field.key}: integer('${colName}', { mode: 'boolean' }).default(true),`
        );
      } else if (field.type === "date" || field.type === "datetime") {
        lines.push(
          `  ${field.key}: integer('${colName}', { mode: 'timestamp' })${notNull},`
        );
      } else if (field.type === "number") {
        lines.push(`  ${field.key}: real('${colName}')${notNull},`);
      } else {
        lines.push(`  ${field.key}: text('${colName}')${notNull},`);
      }
    }
  }
  return lines.length > 0 ? "\n  " + lines.join("\n  ") : "";
}

function generateTable(
  objectName: string,
  tableName: string,
  fields: FieldDef[],
  references: Map<string, string>,
  dialect: Dialect,
  tenantScope: string | null | undefined,
  tenantMode: TenantMode
): string {
  const tableFn = dialect === "mysql" ? "mysqlTable" : "sqliteTable";
  const lines: string[] = [];
  lines.push(`export const ${tableName} = ${tableFn}('${tableName}', {`);
  lines.push(
    dialect === "mysql"
      ? `  id: int('id').autoincrement().primaryKey(),`
      : `  id: integer('id').primaryKey({ autoIncrement: true }),`
  );

  // Tenant scope columns (skip for master objects: organization, tenant)
  const isMaster = objectName === "organization" || objectName === "tenant";
  const hasOrgsForTable =
    tenantMode === "single_tenant" || tenantMode === "multi_tenant" || tenantMode === "org_and_tenant";
  if (
    !isMaster &&
    hasOrgsForTable &&
    tenantScope &&
    (tenantScope === "tenant" || tenantScope === "org_and_tenant")
  ) {
    const orgRef =
      dialect === "mysql"
        ? "int('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull()"
        : "integer('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull()";
    lines.push(`  organizationId: ${orgRef},`);
    if (tenantScope === "org_and_tenant") {
      const tenantRef =
        dialect === "mysql"
          ? "int('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull()"
          : "integer('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull()";
      lines.push(`  tenantId: ${tenantRef},`);
    }
  }

  for (const field of fields) {
    const colName = toSnakeCase(field.key);
    const refTable = references.get(field.key) || pluralize(field.key);
    const cascade =
      field.type === "masterDetail" ||
      field.relationshipType === "masterDetail" ||
      field.deleteOnCascade === true;
    const refCall = cascade
      ? `references(() => ${refTable}.id, { onDelete: 'cascade' })`
      : `references(() => ${refTable}.id, { onDelete: 'set null' })`;
    const notNull = field.required ? ".notNull()" : "";
    const isAutoNum =
      field.type === "autoNumber" || field.type === "autonumber";
    const unique = field.unique || isAutoNum ? ".unique()" : "";

    if (field.type === "reference" || field.type === "masterDetail") {
      // Skip organization/tenant columns - already added by tenant scope
      const isTenantScopeRef =
        (field.key === "organization" || field.key === "tenant") &&
        tenantScope &&
        hasOrgsForTable &&
        !isMaster;
      if (isTenantScopeRef) continue;
      const refNotNull =
        field.type === "masterDetail" || field.required ? ".notNull()" : "";
      lines.push(
        `  ${field.key}Id: ${
          dialect === "mysql" ? "int" : "integer"
        }('${colName}_id')${refNotNull}.${refCall},`
      );
    } else if (dialect === "mysql") {
      if (field.type === "boolean") {
        lines.push(`  ${field.key}: boolean('${colName}').default(true),`);
      } else if (field.type === "date" || field.type === "datetime") {
        lines.push(
          `  ${field.key}: datetime('${colName}')${notNull}${unique},`
        );
      } else if (field.type === "number") {
        lines.push(
          `  ${field.key}: decimal('${colName}', { precision: 10, scale: 2 })${notNull}${unique},`
        );
      } else if (
        field.type === "text" ||
        field.type === "geolocation" ||
        field.type === "address" ||
        field.type === "richText" ||
        field.type === "file"
      ) {
        lines.push(`  ${field.key}: text('${colName}')${notNull}${unique},`);
      } else {
        lines.push(
          `  ${field.key}: varchar('${colName}', { length: 255 })${notNull}${unique},`
        );
      }
    } else {
      const sqlType = mapTypeToSql(field);
      const typeFn =
        sqlType === "real"
          ? "real"
          : sqlType === "integer"
            ? "integer"
            : "text";
      const tsMode =
        field.type === "boolean"
          ? ", { mode: 'boolean' }"
          : field.type === "date" || field.type === "datetime"
            ? ", { mode: 'timestamp' }"
            : "";
      if (field.type === "boolean") {
        lines.push(
          `  ${field.key}: integer('${colName}'${tsMode}).default(true),`
        );
      } else if (field.type === "date" || field.type === "datetime") {
        lines.push(
          `  ${field.key}: integer('${colName}', { mode: 'timestamp' })${notNull}${unique},`
        );
      } else {
        lines.push(
          `  ${field.key}: ${typeFn}('${colName}')${notNull}${unique},`
        );
      }
    }
  }

  // Standard columns (from protected-metadata, exclude id)
  for (const fk of SYSTEM_FIELDS) {
    if (fk === "id") continue;
    const cfg =
      SYSTEM_FIELD_COLUMN_CONFIG[fk as keyof typeof SYSTEM_FIELD_COLUMN_CONFIG];
    if (cfg && !fields.some((f) => f.key === fk)) {
      if ("mode" in cfg && cfg.mode === "reference") {
        const refCfg = cfg as {
          col: string;
          idField: string;
          refTable: string;
        };
        const intType = dialect === "mysql" ? "int" : "integer";
        lines.push(
          `  ${refCfg.idField}: ${intType}('${refCfg.col}').references(() => users.id, { onDelete: 'set null' }),`
        );
      } else if (dialect === "mysql") {
        const colType =
          cfg.mode === "boolean"
            ? `boolean('${cfg.col}')`
            : `datetime('${cfg.col}')`;
        lines.push(`  ${fk}: ${colType}${cfg.drizzleDefault},`);
      } else {
        const modeStr =
          cfg.mode === "boolean" ? "mode: 'boolean'" : "mode: 'timestamp'";
        lines.push(
          `  ${fk}: integer('${cfg.col}', { ${modeStr} })${cfg.drizzleDefault},`
        );
      }
    }
  }

  lines.push("})");
  return lines.join("\n");
}

const TEMP_DIR = process.argv.includes("--temp-dir")
  ? path.join(backendRoot, "drizzle-temp")
  : null;

function main() {
  const dialect = getDialect();

  if (!fs.existsSync(OBJECTS_PATH)) {
    console.error("Metadata path not found:", OBJECTS_PATH);
    process.exit(1);
  }

  const tenantConfig = loadTenantConfig();
  const tenantMode = tenantConfig.mode;

  let objectDirs = fs.readdirSync(OBJECTS_PATH).filter((d) => {
    const p = path.join(OBJECTS_PATH, d);
    return (
      fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, "object.json"))
    );
  });
  // Exclude tenant system objects - they are emitted from metadata/system/, not objects/
  objectDirs = objectDirs.filter((d) => !TENANT_SYSTEM_OBJECTS_SET.has(d));

  const hasOrgs = tenantMode === "single_tenant" || tenantMode === "multi_tenant" || tenantMode === "org_and_tenant";
  const hasTenants = tenantMode === "single_tenant" || tenantMode === "org_and_tenant";
  const userOrgCol =
    hasOrgs
      ? dialect === "mysql"
        ? "\n  organizationId: int('organization_id').references(() => organizations.id),"
        : "\n  organizationId: integer('organization_id').references(() => organizations.id),"
      : "";
  const userTenantCol =
    hasTenants
      ? dialect === "mysql"
        ? "\n  tenantId: int('tenant_id').references(() => tenants.id),"
        : "\n  tenantId: integer('tenant_id').references(() => tenants.id),"
      : "";
  const userExtCols = generateExtensionColumnLines(
    loadExtensionFields("user"),
    dialect
  );

  const usersTable =
    dialect === "mysql"
      ? `export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  profile: varchar('profile', { length: 255 }).default('standard-user'),
  isActive: boolean('is_active').default(true),
  dateJoined: datetime('date_joined'),${userOrgCol}${userTenantCol}
  emailVerified: boolean('email_verified').default(false),
  emailVerificationToken: varchar('email_verification_token', { length: 255 }),
  emailVerificationTokenExpires: datetime('email_verification_token_expires'),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  twoFactorCode: varchar('two_factor_code', { length: 10 }),
  twoFactorCodeExpires: datetime('two_factor_code_expires'),
  pendingEmail: varchar('pending_email', { length: 255 }),
  pendingEmailToken: varchar('pending_email_token', { length: 255 }),
  pendingEmailTokenExpires: datetime('pending_email_token_expires'),${userExtCols}
})`
      : `export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  profile: text('profile').default('standard-user'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  dateJoined: integer('date_joined', { mode: 'timestamp' }),${userOrgCol}${userTenantCol}
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  emailVerificationToken: text('email_verification_token'),
  emailVerificationTokenExpires: integer('email_verification_token_expires', { mode: 'timestamp' }),
  twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' }).default(false),
  twoFactorCode: text('two_factor_code'),
  twoFactorCodeExpires: integer('two_factor_code_expires', { mode: 'timestamp' }),
  pendingEmail: text('pending_email'),
  pendingEmailToken: text('pending_email_token'),
  pendingEmailTokenExpires: integer('pending_email_token_expires', { mode: 'timestamp' }),${userExtCols}
})`;

  const tables: string[] = [usersTable];
  const tableNames: string[] = ["users"];

  // Emit organizations table when tenant mode has orgs (system object, not from metadata/objects)
  if (hasOrgs) {
    const orgExtCols = generateExtensionColumnLines(
      loadExtensionFields("organization"),
      dialect
    );
    const orgUserRefCols =
      dialect === "mysql"
        ? `
  createdById: int('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  ownerId: int('owner_id').references(() => users.id, { onDelete: 'set null' }),
  editedById: int('edited_by_id').references(() => users.id, { onDelete: 'set null' }),`
        : `
  createdById: integer('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  ownerId: integer('owner_id').references(() => users.id, { onDelete: 'set null' }),
  editedById: integer('edited_by_id').references(() => users.id, { onDelete: 'set null' }),`;
    const orgTable =
      dialect === "mysql"
        ? `export const organizations = mysqlTable('organizations', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),${orgUserRefCols}${orgExtCols}
})`
        : `export const organizations = sqliteTable('organizations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),${orgUserRefCols}${orgExtCols}
})`;
    tables.push(orgTable);
    tableNames.push("organizations");
  }

  // Emit tenants table when tenant mode has tenants (single_tenant or org_and_tenant)
  if (hasTenants) {
    const tenantExtCols = generateExtensionColumnLines(
      loadExtensionFields("tenant"),
      dialect
    );
    const tenantUserRefCols =
      dialect === "mysql"
        ? `
  createdById: int('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  ownerId: int('owner_id').references(() => users.id, { onDelete: 'set null' }),
  editedById: int('edited_by_id').references(() => users.id, { onDelete: 'set null' }),`
        : `
  createdById: integer('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  ownerId: integer('owner_id').references(() => users.id, { onDelete: 'set null' }),
  editedById: integer('edited_by_id').references(() => users.id, { onDelete: 'set null' }),`;
    const tenantTable =
      dialect === "mysql"
        ? `export const tenants = mysqlTable('tenants', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  organizationId: int('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),${tenantUserRefCols}${tenantExtCols}
})`
        : `export const tenants = sqliteTable('tenants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  organizationId: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),${tenantUserRefCols}${tenantExtCols}
})`;
    tables.push(tenantTable);
    tableNames.push("tenants");
  }

  // Internal files table (no metadata, managed via upload/download APIs)
  const filesOrgRef =
    hasOrgs && dialect === "mysql"
      ? "int('organization_id').references(() => organizations.id, { onDelete: 'set null' })"
      : hasOrgs && dialect === "sqlite"
        ? "integer('organization_id').references(() => organizations.id, { onDelete: 'set null' })"
        : dialect === "mysql"
          ? "int('organization_id')"
          : "integer('organization_id')";
  const filesTenantRef =
    hasTenants && dialect === "mysql"
      ? "int('tenant_id').references(() => tenants.id, { onDelete: 'set null' })"
      : hasTenants && dialect === "sqlite"
        ? "integer('tenant_id').references(() => tenants.id, { onDelete: 'set null' })"
        : dialect === "mysql"
          ? "int('tenant_id')"
          : "integer('tenant_id')";
  const filesTable =
    dialect === "mysql"
      ? `export const files = mysqlTable('files', {
  id: int('id').autoincrement().primaryKey(),
  objectName: varchar('object_name', { length: 255 }).notNull(),
  recordId: int('record_id').notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  storagePath: varchar('storage_path', { length: 512 }).notNull(),
  mimeType: varchar('mime_type', { length: 128 }),
  size: int('size').notNull(),
  isPublic: boolean('is_public').default(false).notNull(),
  uploadedById: int('uploaded_by_id').references(() => users.id, { onDelete: 'set null' }),
  uploadedAt: datetime('uploaded_at'),
  organizationId: ${filesOrgRef},
  tenantId: ${filesTenantRef},
})`
      : `export const files = sqliteTable('files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  objectName: text('object_name').notNull(),
  recordId: integer('record_id').notNull(),
  filename: text('filename').notNull(),
  storagePath: text('storage_path').notNull(),
  mimeType: text('mime_type'),
  size: integer('size').notNull(),
  isPublic: integer('is_public', { mode: 'boolean' }).default(false).notNull(),
  uploadedById: integer('uploaded_by_id').references(() => users.id, { onDelete: 'set null' }),
  uploadedAt: integer('uploaded_at', { mode: 'timestamp' }),
  organizationId: ${filesOrgRef},
  tenantId: ${filesTenantRef},
})`;
  tables.push(filesTable);
  tableNames.push("files");

  // Internal record_history table (field-level audit trail, no metadata)
  const recordHistoryOrgRef =
    hasOrgs && dialect === "mysql"
      ? "int('organization_id').references(() => organizations.id, { onDelete: 'set null' })"
      : hasOrgs && dialect === "sqlite"
        ? "integer('organization_id').references(() => organizations.id, { onDelete: 'set null' })"
        : dialect === "mysql"
          ? "int('organization_id')"
          : "integer('organization_id')";
  const recordHistoryTenantRef =
    hasTenants && dialect === "mysql"
      ? "int('tenant_id').references(() => tenants.id, { onDelete: 'set null' })"
      : hasTenants && dialect === "sqlite"
        ? "integer('tenant_id').references(() => tenants.id, { onDelete: 'set null' })"
        : dialect === "mysql"
          ? "int('tenant_id')"
          : "integer('tenant_id')";
  const recordHistoryTable =
    dialect === "mysql"
      ? `export const recordHistory = mysqlTable('record_history', {
  id: int('id').autoincrement().primaryKey(),
  objectName: varchar('object_name', { length: 255 }).notNull(),
  recordId: int('record_id').notNull(),
  fieldKey: varchar('field_key', { length: 255 }).notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  changedById: int('changed_by_id').references(() => users.id, { onDelete: 'set null' }),
  changedAt: datetime('changed_at'),
  organizationId: ${recordHistoryOrgRef},
  tenantId: ${recordHistoryTenantRef},
})`
      : `export const recordHistory = sqliteTable('record_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  objectName: text('object_name').notNull(),
  recordId: integer('record_id').notNull(),
  fieldKey: text('field_key').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  changedById: integer('changed_by_id').references(() => users.id, { onDelete: 'set null' }),
  changedAt: integer('changed_at', { mode: 'timestamp' }),
  organizationId: ${recordHistoryOrgRef},
  tenantId: ${recordHistoryTenantRef},
})`;
  tables.push(recordHistoryTable);
  tableNames.push("recordHistory");

  // Internal notification_settings table (admin toggles + template per event)
  const notificationSettingsTable =
    dialect === "mysql"
      ? `export const notificationSettings = mysqlTable('notification_settings', {
  id: int('id').autoincrement().primaryKey(),
  eventKey: varchar('event_key', { length: 255 }).notNull().unique(),
  enabled: boolean('enabled').default(false).notNull(),
  templateKey: varchar('template_key', { length: 255 }).notNull(),
})`
      : `export const notificationSettings = sqliteTable('notification_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventKey: text('event_key').notNull().unique(),
  enabled: integer('enabled', { mode: 'boolean' }).default(false).notNull(),
  templateKey: text('template_key').notNull(),
})`;
  tables.push(notificationSettingsTable);
  tableNames.push("notificationSettings");

  // Internal invite_tokens table (invite-based signup)
  const inviteTokensTable =
    dialect === "mysql"
      ? `export const inviteTokens = mysqlTable('invite_tokens', {
  id: int('id').autoincrement().primaryKey(),
  token: varchar('token', { length: 64 }).notNull().unique(),
  organizationId: int('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  tenantId: int('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }),
  profile: varchar('profile', { length: 255 }).default('standard-user'),
  invitedById: int('invited_by_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: datetime('expires_at').notNull(),
  usedAt: datetime('used_at'),
})`
      : `export const inviteTokens = sqliteTable('invite_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  token: text('token').notNull().unique(),
  organizationId: integer('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  tenantId: integer('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  email: text('email'),
  profile: text('profile').default('standard-user'),
  invitedById: integer('invited_by_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  usedAt: integer('used_at', { mode: 'timestamp' }),
})`;
  tables.push(inviteTokensTable);
  tableNames.push("inviteTokens");

  const refs = new Map<string, string>();

  for (const objectName of objectDirs) {
    const { object, fields } = loadObjectMetadata(objectName);
    const tableName = (object.tableName as string) || pluralize(objectName);
    const tenantScope =
      (object.tenantScope as string | null | undefined) ?? null;

    for (const f of fields) {
      if (f.type === "reference" || f.type === "masterDetail") {
        refs.set(f.key, tableName);
      }
    }

    const refMap = new Map<string, string>();
    for (const f of fields) {
      if (f.type === "reference" || f.type === "masterDetail") {
        refMap.set(f.key, pluralize(f.objectName || f.key));
      }
    }

    const tableCode = generateTable(
      objectName,
      tableName,
      fields,
      refMap,
      dialect,
      tenantScope,
      tenantMode
    );
    tables.push(tableCode);
    tableNames.push(tableName);
  }

  const schemaImports =
    dialect === "mysql"
      ? `import { mysqlTable, int, varchar, text, decimal, boolean, datetime } from 'drizzle-orm/mysql-core'`
      : `import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'`;

  const schemaContent = `${schemaImports}

${tables.join("\n\n")}

export type User = typeof users.$inferSelect
${tableNames
  .filter((t) => t !== "users")
  .map(
    (t) =>
      `export type ${
        singularize(t).charAt(0).toUpperCase() + singularize(t).slice(1)
      } = typeof ${t}.$inferSelect`
  )
  .join("\n")}
`;

  const schemaPath = TEMP_DIR
    ? path.join(TEMP_DIR, "db", "schema.ts")
    : path.join(backendRoot, "src/db/schema.ts");
  if (TEMP_DIR) fs.mkdirSync(path.dirname(schemaPath), { recursive: true });
  fs.writeFileSync(schemaPath, schemaContent);
  console.log("Generated schema from metadata:", schemaPath);

  // Write object index for frontend loader (include tenant system objects when mode != none)
  const indexPath = path.join(METADATA_PATH, "objects", "index.json");
  const indexNames = [
    ...objectDirs,
    ...(hasOrgs ? ["organization"] : []),
    ...(hasTenants ? ["tenant"] : [])
  ];
  const indexContent = JSON.stringify(indexNames, null, 2);
  fs.writeFileSync(indexPath, indexContent);
  console.log("Updated object index:", indexPath);

  // Write version for frontend cache invalidation (no restart needed for frontend to pick up changes)
  const versionPath = path.join(METADATA_PATH, "version.json");
  fs.writeFileSync(
    versionPath,
    JSON.stringify({ version: Date.now() }, null, 2)
  );
  console.log("Updated metadata version:", versionPath);

  // Generate entity registry for generic routes (includes system objects when mode != none)
  generateEntityRegistry(objectDirs, tenantMode);
}

function generateEntityRegistry(objectDirs: string[], tenantMode: TenantMode) {
  const hasOrgs =
    tenantMode === "single_tenant" ||
    tenantMode === "multi_tenant" ||
    tenantMode === "org_and_tenant";
  const relatedListPathsByEntity = new Map<
    string,
    Record<string, { filterColumn: string }>
  >();
  for (const objectName of objectDirs) {
    const related = loadRelatedObjects(objectName, OBJECTS_PATH);
    for (const rel of related) {
      const apiEndpoint = rel.apiEndpoint.replace(/^\/api\//, "");
      const parts = apiEndpoint.split("/");
      if (parts.length >= 2) {
        const entityPath = parts[0];
        const subPath = parts[1];
        const fkMatch = rel.foreignKey.match(/^(\w+)\.id$/);
        const filterColumn = fkMatch ? `${fkMatch[1]}Id` : "id";
        const existing = relatedListPathsByEntity.get(entityPath) || {};
        existing[subPath] = { filterColumn };
        relatedListPathsByEntity.set(entityPath, existing);
      }
    }
  }

  // Also load related objects from system objects (organization, tenant) for relatedListPaths
  const hasTenants =
    tenantMode === "single_tenant" || tenantMode === "org_and_tenant";
  const systemObjectsForRelated = hasOrgs ? ["organization"] : [];
  if (hasTenants) systemObjectsForRelated.push("tenant");
  for (const objectName of systemObjectsForRelated) {
    const related = loadRelatedObjects(objectName, SYSTEM_OBJECTS_PATH);
    for (const rel of related) {
      const apiEndpoint = rel.apiEndpoint.replace(/^\/api\//, "");
      const parts = apiEndpoint.split("/");
      if (parts.length >= 2) {
        const entityPath = parts[0];
        const subPath = parts[1];
        const fkMatch = rel.foreignKey.match(/^(\w+)\.id$/);
        const filterColumn = fkMatch ? `${fkMatch[1]}Id` : "id";
        const existing = relatedListPathsByEntity.get(entityPath) || {};
        existing[subPath] = { filterColumn };
        relatedListPathsByEntity.set(entityPath, existing);
      }
    }
  }

  const entityConfigs: string[] = [];
  const imports = new Set<string>();
  const tenantConfig = loadTenantConfig();
  for (const objectName of objectDirs) {
    const { object, fields } = loadObjectMetadata(objectName);
    const allFields = loadAllFields(objectName);
    const tableName = (object.tableName as string) || pluralize(objectName);
    const tenantScope =
      (object.tenantScope as string | null | undefined) ?? null;
    imports.add(tableName);

    const searchableFields = fields.filter(
      (f) =>
        f.type !== "reference" &&
        f.type !== "masterDetail" &&
        f.type !== "formula"
    );
    const searchFieldRefs = searchableFields
      .filter((f) => (f as any).searchable !== false)
      .map((f) => `${tableName}.${f.key}`);
    const searchFieldsArr =
      searchFieldRefs.length > 0 ? searchFieldRefs : [`${tableName}.id`];

    const insertFields = fields
      .filter(
        (f) => f.type !== "reference" && f.type !== "masterDetail"
      )
      .map((f) => f.key);
    const referenceFields = fields.filter(
      (f) => f.type === "reference" || f.type === "masterDetail"
    );
    const systemUserRefFields = [
      { key: "createdBy", idField: "createdById", refTable: "users" },
      { key: "owner", idField: "ownerId", refTable: "users" },
      { key: "editedBy", idField: "editedById", refTable: "users" }
    ];
    const allReferenceFields = [
      ...referenceFields.map((f) => ({
        key: f.key,
        idField: `${f.key}Id`,
        refTable: pluralize(f.objectName || f.key)
      })),
      ...systemUserRefFields
    ];
    const systemInsertFields = SYSTEM_FIELDS.filter(
      (f) => f !== "id" && f !== "editedBy"
    ).flatMap((f) => {
      const cfg =
        SYSTEM_FIELD_COLUMN_CONFIG[f as keyof typeof SYSTEM_FIELD_COLUMN_CONFIG];
      if (cfg && "idField" in cfg)
        return [(cfg as { idField: string }).idField];
      return [f];
    });
    const tenantScopeFields: string[] = [];
    if (
      tenantScope &&
      hasOrgs &&
      objectName !== "organization" &&
      objectName !== "tenant"
    ) {
      tenantScopeFields.push("organizationId");
      if (tenantScope === "org_and_tenant") tenantScopeFields.push("tenantId");
    }
    const insertFieldsArr = [
      ...new Set([
        ...insertFields,
        ...referenceFields.map((f) => `${f.key}Id`),
        ...tenantScopeFields,
        ...systemInsertFields,
        ...SYSTEM_USER_REFERENCE_INSERT_FIELDS
      ])
    ];
    const updateFieldsArr = [
      ...new Set([
        ...insertFieldsArr.filter(
          (f) =>
            f !== "createdAt" &&
            f !== "createdById" &&
            !tenantScopeFields.includes(f)
        ),
        ...SYSTEM_USER_REFERENCE_UPDATE_FIELDS
      ])
    ];

    let joinConfig = "";
    if (referenceFields.length > 0) {
      const ref = referenceFields[0];
      const refTable = pluralize(ref.objectName || ref.key);
      imports.add(refTable);
      joinConfig = `join: { joinTable: ${refTable}, leftColumn: ${tableName}.${ref.key}Id, rightColumn: ${refTable}.id }`;
    }
    imports.add("users");

    const computedFields = allFields.filter(
      (f) => f.computed && f.computedExpression
    );
    let computedConfig = "undefined";
    if (computedFields.length > 0) {
      const computedArr = computedFields
        .map((f) => {
          if (f.computedExpression === "concat") {
            const sep = (f.separator || " ").replace(/'/g, "\\'");
            return `{ key: '${f.key}', expression: 'concat', sourceFields: [${(
              f.sourceFields || []
            )
              .map((s) => `'${s}'`)
              .join(", ")}], separator: '${sep}' }`;
          }
          if (f.computedExpression === "join") {
            const sep = (f.separator || " ").replace(/'/g, "\\'");
            return `{ key: '${f.key}', expression: 'join', referenceField: '${
              f.referenceField || ""
            }', sourceFields: [${(f.sourceFields || [])
              .map((s) => `'${s}'`)
              .join(", ")}], separator: '${sep}' }`;
          }
          return null;
        })
        .filter(Boolean);
      computedConfig = `[${computedArr.join(", ")}]`;
    }

    const relatedPaths = relatedListPathsByEntity.get(tableName);
    const relatedPathsStr =
      relatedPaths && Object.keys(relatedPaths).length > 0
        ? JSON.stringify(relatedPaths)
        : "undefined";

    const richTextFields = allFields
      .filter((f) => f.type === "richText" && f.key)
      .map((f) => f.key);
    const richTextFieldsConfig =
      richTextFields.length > 0
        ? `richTextFields: [${richTextFields.map((s) => `'${s}'`).join(", ")}]`
        : "";

    const autoNumberFields = allFields
      .filter(
        (f) => (f.type === "autoNumber" || f.type === "autonumber") && f.key
      )
      .map((f) => {
        const pattern = ((f as any).autoNumberPattern || "{0000}").replace(
          /'/g,
          "\\'"
        );
        const start = (f as any).autoNumberStart ?? 1;
        return `'${f.key}': { pattern: '${pattern}', start: ${start} }`;
      });
    const autoNumberConfig =
      autoNumberFields.length > 0
        ? `autoNumberFields: { ${autoNumberFields.join(", ")} }`
        : "";

    const requiredRefIdFields = referenceFields
      .filter((f) => f.required)
      .map((f) => `${f.key}Id`);
    const requiredRefsConfig =
      requiredRefIdFields.length > 0
        ? `requiredRefIdFields: [${requiredRefIdFields
            .map((s) => `'${s}'`)
            .join(", ")}]`
        : "";

    const dateFields = fields
      .filter((f) => f.type === "date" || f.type === "datetime")
      .map((f) => f.key);
    const dateFieldsConfig =
      dateFields.length > 0
        ? `dateFields: [${dateFields.map((s) => `'${s}'`).join(", ")}]`
        : "";

    const tenantScopeConfig =
      tenantScope && hasOrgs ? `tenantScope: '${tenantScope}'` : "";

    const configParts = [
      `table: ${tableName}`,
      `objectName: '${objectName}'`,
      tenantScopeConfig,
      richTextFieldsConfig,
      `searchFields: [${searchFieldsArr.join(", ")}]`,
      `insertFields: [${insertFieldsArr.map((s) => `'${s}'`).join(", ")}]`,
      `updateFields: [${updateFieldsArr.map((s) => `'${s}'`).join(", ")}]`,
      `referenceFields: [${allReferenceFields
        .map(
          (f) =>
            `{ key: '${f.key}', idField: '${f.idField}', refTable: '${f.refTable}' }`
        )
        .join(", ")}]`,
      requiredRefsConfig,
      dateFieldsConfig,
      joinConfig,
      `computedFields: ${computedConfig}`,
      `relatedListPaths: ${relatedPathsStr}`,
      autoNumberConfig
    ].filter(Boolean);

    entityConfigs.push(`  '${tableName}': { ${configParts.join(", ")} },`);
  }

  // Add organization and tenant entity configs when tenant mode has orgs/tenants (system objects from metadata/system/)
  const systemObjectsToAdd: string[] = [];
  if (
    tenantMode === "single_tenant" ||
    tenantMode === "multi_tenant" ||
    tenantMode === "org_and_tenant"
  )
    systemObjectsToAdd.push("organization");
  if (tenantMode === "single_tenant" || tenantMode === "org_and_tenant")
    systemObjectsToAdd.push("tenant");

  for (const objectName of systemObjectsToAdd) {
    if (
      !fs.existsSync(path.join(SYSTEM_OBJECTS_PATH, objectName, "object.json"))
    )
      continue;
    const { object, fields } = loadSystemObjectMetadata(objectName);
    const extFields = loadExtensionFields(objectName);
    const combinedFields = [...fields, ...extFields];
    const tableName = pluralize(objectName);
    imports.add(tableName);

    const searchableFields = combinedFields.filter(
      (f) =>
        f.type !== "reference" &&
        f.type !== "masterDetail" &&
        f.type !== "formula"
    );
    const searchFieldRefs = searchableFields
      .filter((f) => (f as any).searchable !== false)
      .map((f) => `${tableName}.${f.key}`);
    const searchFieldsArr =
      searchFieldRefs.length > 0 ? searchFieldRefs : [`${tableName}.id`];

    const insertFields = combinedFields
      .filter(
        (f) => f.type !== "reference" && f.type !== "masterDetail"
      )
      .map((f) => f.key);
    const referenceFields = combinedFields.filter(
      (f) => f.type === "reference" || f.type === "masterDetail"
    );
    const systemUserRefFields = [
      { key: "createdBy", idField: "createdById", refTable: "users" },
      { key: "owner", idField: "ownerId", refTable: "users" },
      { key: "editedBy", idField: "editedById", refTable: "users" }
    ];
    const allReferenceFields = [
      ...referenceFields.map((f) => ({
        key: f.key,
        idField: `${f.key}Id`,
        refTable: pluralize(f.objectName || f.key)
      })),
      ...systemUserRefFields
    ];
    const systemInsertFields = SYSTEM_FIELDS.filter(
      (f) => f !== "id" && f !== "editedBy"
    ).flatMap((f) => {
      const cfg =
        SYSTEM_FIELD_COLUMN_CONFIG[f as keyof typeof SYSTEM_FIELD_COLUMN_CONFIG];
      if (cfg && "idField" in cfg)
        return [(cfg as { idField: string }).idField];
      return [f];
    });
    const tenantScopeFields: string[] = [];
    const insertFieldsArr = [
      ...new Set([
        ...insertFields,
        ...referenceFields.map((f) => `${f.key}Id`),
        ...tenantScopeFields,
        ...systemInsertFields,
        ...SYSTEM_USER_REFERENCE_INSERT_FIELDS
      ])
    ];
    const updateFieldsArr = [
      ...new Set([
        ...insertFieldsArr.filter(
          (f) =>
            f !== "createdAt" &&
            f !== "createdById" &&
            !tenantScopeFields.includes(f)
        ),
        ...SYSTEM_USER_REFERENCE_UPDATE_FIELDS
      ])
    ];

    let joinConfig = "";
    if (referenceFields.length > 0) {
      const ref = referenceFields[0];
      const refTable = pluralize(ref.objectName || ref.key);
      imports.add(refTable);
      joinConfig = `join: { joinTable: ${refTable}, leftColumn: ${tableName}.${ref.key}Id, rightColumn: ${refTable}.id }`;
    }
    imports.add("users");

    const requiredRefIdFields = referenceFields
      .filter((f) => f.required)
      .map((f) => `${f.key}Id`);
    const requiredRefsConfig =
      requiredRefIdFields.length > 0
        ? `requiredRefIdFields: [${requiredRefIdFields
            .map((s) => `'${s}'`)
            .join(", ")}]`
        : "";

    const dateFields = combinedFields
      .filter((f) => f.type === "date" || f.type === "datetime")
      .map((f) => f.key);
    const dateFieldsConfig =
      dateFields.length > 0
        ? `dateFields: [${dateFields.map((s) => `'${s}'`).join(", ")}]`
        : "";

    const systemRichTextFields = combinedFields
      .filter((f) => f.type === "richText" && f.key)
      .map((f) => f.key);
    const systemRichTextFieldsConfig =
      systemRichTextFields.length > 0
        ? `richTextFields: [${systemRichTextFields.map((s) => `'${s}'`).join(", ")}]`
        : "";

    const relatedPaths = relatedListPathsByEntity.get(tableName);
    const relatedPathsStr =
      relatedPaths && Object.keys(relatedPaths).length > 0
        ? JSON.stringify(relatedPaths)
        : "undefined";

    const configParts = [
      `table: ${tableName}`,
      `objectName: '${objectName}'`,
      systemRichTextFieldsConfig,
      `searchFields: [${searchFieldsArr.join(", ")}]`,
      `insertFields: [${insertFieldsArr.map((s) => `'${s}'`).join(", ")}]`,
      `updateFields: [${updateFieldsArr.map((s) => `'${s}'`).join(", ")}]`,
      `referenceFields: [${allReferenceFields
        .map(
          (f) =>
            `{ key: '${f.key}', idField: '${f.idField}', refTable: '${f.refTable}' }`
        )
        .join(", ")}]`,
      requiredRefsConfig,
      dateFieldsConfig,
      joinConfig,
      `computedFields: undefined`,
      `relatedListPaths: ${relatedPathsStr}`
    ].filter(Boolean);

    entityConfigs.push(`  '${tableName}': { ${configParts.join(", ")} },`);
  }

  const registryContent = `/**
 * Auto-generated by db:generate-from-metadata. Do not edit manually.
 */
import { ${[...imports].join(", ")} } from '../db/schema.js'

export const tenantConfig = { mode: '${tenantConfig.mode}' } as const

export const entityRegistry = {
${entityConfigs.join("\n")}
} as const

export type EntityPath = keyof typeof entityRegistry
`;
  const registryPath = TEMP_DIR
    ? path.join(TEMP_DIR, "routes", "entity-registry.generated.ts")
    : path.join(backendRoot, "src/routes/entity-registry.generated.ts");
  if (TEMP_DIR) fs.mkdirSync(path.dirname(registryPath), { recursive: true });
  fs.writeFileSync(registryPath, registryContent);
  console.log("Generated entity registry:", registryPath);
}

main();
