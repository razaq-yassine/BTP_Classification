/**
 * Central config for protected metadata items.
 * Single source of truth - update here when adding system fields, tables, or objects.
 * Used by: sync-drops, ensure-tables, generate-schema-from-metadata, metadata routes, validate, frontend Object Manager.
 */
/** Tables that must never be dropped (e.g. by sync-drops) */
export declare const PROTECTED_TABLES: readonly ["users", "organizations", "tenants", "files", "record_history", "notification_settings", "__drizzle_migrations"];
export declare const PROTECTED_TABLES_SET: Set<string>;
/** Columns that must never be dropped (primary key, system info) */
export declare const PROTECTED_COLUMNS: readonly ["id", "created_at", "updated_at", "created_by_id", "owner_id", "edited_by_id"];
export declare const PROTECTED_COLUMNS_SET: Set<string>;
/** System field keys (camelCase) - used for validation, defaults, Object Manager */
export declare const SYSTEM_FIELDS: readonly ["id", "createdAt", "updatedAt", "createdBy", "ownerId", "editedBy"];
export declare const SYSTEM_FIELDS_SET: Set<string>;
/** Human-readable labels for system fields (used when no field JSON exists) */
export declare const SYSTEM_FIELD_LABELS: Record<string, string>;
/** System column names (snake_case) - used when building expected columns from metadata */
export declare const SYSTEM_COLUMNS: readonly ["id", "created_at", "updated_at", "created_by_id", "owner_id", "edited_by_id"];
export declare const SYSTEM_COLUMNS_SET: Set<string>;
/** System objects not managed via metadata (permissions, roles, sessions, org, tenant, user) */
export declare const SYSTEM_OBJECTS: readonly ["permission", "permissions", "role", "roles", "session", "sessions", "organization", "organizations", "tenant", "tenants", "user", "users"];
export declare const SYSTEM_OBJECTS_SET: Set<string>;
/** Tenant system objects - exist when tenant mode != none (org) or org_and_tenant (tenant) */
export declare const TENANT_SYSTEM_OBJECTS: readonly ["organization", "tenant"];
export declare const TENANT_SYSTEM_OBJECTS_SET: Set<string>;
/** System objects that support add-only extensions */
export declare const SYSTEM_OBJECTS_WITH_EXTENSIONS: readonly ["user", "organization", "tenant"];
/** Base field keys per system object - cannot be overridden by extensions */
export declare const SYSTEM_OBJECT_BASE_FIELDS: Record<string, Set<string>>;
/** Default "System Information" section fields for new objects */
export declare const SYSTEM_INFO_SECTION_FIELDS: readonly ["id", "createdAt", "updatedAt", "createdBy", "ownerId", "editedBy"];
/** System user reference fields for insert (createdBy, ownerId) */
export declare const SYSTEM_USER_REFERENCE_INSERT_FIELDS: readonly ["createdById", "ownerId"];
/** System user reference fields for update (editedBy, ownerId) */
export declare const SYSTEM_USER_REFERENCE_UPDATE_FIELDS: readonly ["editedById", "ownerId"];
/** Config for system fields that are auto-added to object tables (excludes id) */
export declare const SYSTEM_FIELD_COLUMN_CONFIG: {
    readonly createdAt: {
        readonly col: "created_at";
        readonly mode: "timestamp";
        readonly drizzleDefault: "";
        readonly sqlDefault: "";
    };
    readonly updatedAt: {
        readonly col: "updated_at";
        readonly mode: "timestamp";
        readonly drizzleDefault: "";
        readonly sqlDefault: "";
    };
    readonly createdBy: {
        readonly col: "created_by_id";
        readonly mode: "reference";
        readonly refTable: "users";
        readonly idField: "createdById";
    };
    readonly ownerId: {
        readonly col: "owner_id";
        readonly mode: "reference";
        readonly refTable: "users";
        readonly idField: "ownerId";
    };
    readonly editedBy: {
        readonly col: "edited_by_id";
        readonly mode: "reference";
        readonly refTable: "users";
        readonly idField: "editedById";
    };
};
//# sourceMappingURL=protected-metadata.d.ts.map