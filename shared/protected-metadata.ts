/**
 * Central config for protected metadata items.
 * Single source of truth - update here when adding system fields, tables, or objects.
 * Used by: sync-drops, ensure-tables, generate-schema-from-metadata, metadata routes, validate, frontend Object Manager.
 */

/** Tables that must never be dropped (e.g. by sync-drops) */
export const PROTECTED_TABLES = [
  "users",
  "organizations",
  "tenants",
  "__drizzle_migrations"
] as const;
export const PROTECTED_TABLES_SET = new Set<string>(PROTECTED_TABLES);

/** Columns that must never be dropped (primary key, system info) */
export const PROTECTED_COLUMNS = ["id", "created_at", "updated_at"] as const;
export const PROTECTED_COLUMNS_SET = new Set<string>(PROTECTED_COLUMNS);

/** System field keys (camelCase) - used for validation, defaults, Object Manager */
export const SYSTEM_FIELDS = ["id", "createdAt", "updatedAt"] as const;
export const SYSTEM_FIELDS_SET = new Set<string>(SYSTEM_FIELDS);

/** Human-readable labels for system fields (used when no field JSON exists) */
export const SYSTEM_FIELD_LABELS: Record<string, string> = {
  id: "ID",
  createdAt: "Created At",
  updatedAt: "Updated At"
};

/** System column names (snake_case) - used when building expected columns from metadata */
export const SYSTEM_COLUMNS = ["id", "created_at", "updated_at"] as const;
export const SYSTEM_COLUMNS_SET = new Set<string>(SYSTEM_COLUMNS);

/** System objects not managed via metadata (permissions, roles, sessions, org, tenant, user) */
export const SYSTEM_OBJECTS = [
  "permission",
  "permissions",
  "role",
  "roles",
  "session",
  "sessions",
  "organization",
  "organizations",
  "tenant",
  "tenants",
  "user",
  "users"
] as const;
export const SYSTEM_OBJECTS_SET = new Set<string>(SYSTEM_OBJECTS);

/** Tenant system objects - exist when tenant mode != none (org) or org_and_tenant (tenant) */
export const TENANT_SYSTEM_OBJECTS = ["organization", "tenant"] as const;
export const TENANT_SYSTEM_OBJECTS_SET = new Set<string>(TENANT_SYSTEM_OBJECTS);

/** System objects that support add-only extensions */
export const SYSTEM_OBJECTS_WITH_EXTENSIONS = ["user", "organization", "tenant"] as const;

/** Base field keys per system object - cannot be overridden by extensions */
export const SYSTEM_OBJECT_BASE_FIELDS: Record<string, Set<string>> = {
  user: new Set([
    "id",
    "username",
    "email",
    "passwordHash",
    "firstName",
    "lastName",
    "profile",
    "isActive",
    "dateJoined",
    "organizationId",
    "tenantId",
    "createdAt",
    "updatedAt"
  ]),
  organization: new Set(["id", "name", "slug", "createdAt", "updatedAt"]),
  tenant: new Set([
    "id",
    "name",
    "organizationId",
    "createdAt",
    "updatedAt"
  ])
};

/** Default "System Information" section fields for new objects */
export const SYSTEM_INFO_SECTION_FIELDS = SYSTEM_FIELDS;

/** Config for system fields that are auto-added to object tables (excludes id) */
export const SYSTEM_FIELD_COLUMN_CONFIG = {
  createdAt: {
    col: "created_at",
    mode: "timestamp" as const,
    drizzleDefault: "",
    sqlDefault: ""
  },
  updatedAt: {
    col: "updated_at",
    mode: "timestamp" as const,
    drizzleDefault: "",
    sqlDefault: ""
  }
} as const;
