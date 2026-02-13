/**
 * Central config for protected metadata items.
 * Single source of truth - update here when adding system fields, tables, or objects.
 * Used by: sync-drops, ensure-tables, generate-schema-from-metadata, metadata routes, validate, frontend Object Manager.
 */

/** Tables that must never be dropped (e.g. by sync-drops) */
export const PROTECTED_TABLES = ['users', '__drizzle_migrations', 'sqlite_sequence'] as const
export const PROTECTED_TABLES_SET = new Set<string>(PROTECTED_TABLES)

/** Columns that must never be dropped (primary key, system info) */
export const PROTECTED_COLUMNS = ['id', 'is_active', 'created_at', 'updated_at'] as const
export const PROTECTED_COLUMNS_SET = new Set<string>(PROTECTED_COLUMNS)

/** System field keys (camelCase) - used for validation, defaults, Object Manager */
export const SYSTEM_FIELDS = ['id', 'isActive', 'createdAt', 'updatedAt'] as const
export const SYSTEM_FIELDS_SET = new Set<string>(SYSTEM_FIELDS)

/** System column names (snake_case) - used when building expected columns from metadata */
export const SYSTEM_COLUMNS = ['id', 'is_active', 'created_at', 'updated_at'] as const
export const SYSTEM_COLUMNS_SET = new Set<string>(SYSTEM_COLUMNS)

/** System objects not managed via metadata (permissions, roles, sessions, etc.) */
export const SYSTEM_OBJECTS = [
  'permission',
  'permissions',
  'role',
  'roles',
  'session',
  'sessions',
] as const
export const SYSTEM_OBJECTS_SET = new Set<string>(SYSTEM_OBJECTS)

/** Default "System Information" section fields for new objects */
export const SYSTEM_INFO_SECTION_FIELDS = SYSTEM_FIELDS

/** Config for system fields that are auto-added to object tables (excludes id) */
export const SYSTEM_FIELD_COLUMN_CONFIG = {
  isActive: { col: 'is_active', mode: 'boolean' as const, drizzleDefault: '.default(true)', sqlDefault: 'DEFAULT 1' },
  createdAt: { col: 'created_at', mode: 'timestamp' as const, drizzleDefault: '', sqlDefault: '' },
  updatedAt: { col: 'updated_at', mode: 'timestamp' as const, drizzleDefault: '', sqlDefault: '' },
} as const
