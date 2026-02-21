# Metadata Usage Guide

This project is **metadata-driven**. For AI-assisted builds, see [AGENT_BUILD_GUIDE.md](./AGENT_BUILD_GUIDE.md) — the agent must read USAGE.md and confirm planning questions before implementing. The UI, API routes, and database schema are generated from JSON metadata files. You configure objects, fields, views, and behavior by editing metadata—no code changes needed for most CRUD features.

---

## Quick Start

1. **Prerequisites**: Node 18+, pnpm, MySQL
2. **Clone & install**: `pnpm install` in project root (or `frontend` and `backend` separately)
3. **Environment**: Copy `backend/.env.example` to `backend/.env`. Set `DATABASE_URL` (e.g. `mysql://user:pass@localhost:3306/dbname`) and `JWT_SECRET` (min 32 chars).
4. **Deploy**: `cd backend && pnpm run db:deploy` — validates metadata, generates schema, runs migrations. For **fresh install** (empty DB): use `pnpm run db:fresh` instead — drops DB, creates schema via push, seeds admin.
5. **Start**: `pnpm run dev` in backend and frontend (or from root if configured). Backend seeds admin on first run.
6. **Login**: `admin` / `admin123`

---

## Table of Contents

1. [Overview](#overview)
2. [Metadata Structure](#metadata-structure)
3. [Adding a New Object](#adding-a-new-object)
4. [Adding a Field](#adding-a-field)
5. [Field Types Reference](#field-types-reference)
6. [Field Properties](#field-properties)
7. [List View Configuration](#list-view-configuration)
8. [Detail View Configuration](#detail-view-configuration)
9. [Header Configuration](#header-configuration)
10. [Related Objects](#related-objects)
11. [Triggers](#triggers)
12. [Validation & Deployment](#validation--deployment)
13. [System Objects](#system-objects)
14. [Multi-Tenancy (Org/Tenant)](#multi-tenancy-orgtenant)
15. [File Attachments](#file-attachments)
16. [Default Currency](#default-currency)
17. [Record History](#record-history)
18. [Detail View Side Section](#detail-view-side-section)
19. [Global Actions Bar](#global-actions-bar)
20. [Sidebars](#sidebars)
21. [Dashboard](#dashboard)
22. [Email and Notifications](#email-and-notifications)
23. [Translations and Localization](#translations-and-localization)

---

## Overview

- **Metadata location**: `frontend/public/metadata/`
- **Environment**: See `backend/.env.example`. Required: `DATABASE_URL`, `JWT_SECRET`. Optional: SMTP vars for email.
- **Objects index**: `metadata/objects/index.json` (auto-generated)
- **Per-object folder**: `metadata/objects/{objectName}/`

The frontend loads metadata at runtime. The backend generates Drizzle schema and entity routes from metadata via `db:generate-from-metadata` and `db:deploy`.

---

## Metadata Structure

Each object has its own folder with these files:

| File                  | Required        | Description                                      |
| --------------------- | --------------- | ------------------------------------------------ |
| `object.json`         | Yes             | Object definition (name, label, API, navigation) |
| `fields.json`         | Yes             | Ordered list of field keys                       |
| `fields/{key}.json`   | Yes (per field) | Field definitions                                |
| `listView.json`       | Yes             | List view columns and options                    |
| `detailView.json`     | Yes             | Detail view sections and layout                  |
| `header.json`         | No              | Header actions and calculated data               |
| `relatedObjects.json` | No              | Related object tables (e.g. Orders on Customer)  |

**System fields** (`id`, `createdAt`, `updatedAt`, `createdBy`, `ownerId`, `editedBy`) are automatic—do not add them to `fields.json` or create `fields/*.json` for them. `createdBy` and `ownerId` are set on create from the current user; `editedBy` is set on update. `ownerId` can be reassigned; `createdBy` is immutable.

---

## Adding a New Object

**Checklist:**

1. Create object folder and metadata (`object.json`, `fields.json`, `listView.json`, `detailView.json`)
2. Add profile permissions for non-admin users (see step 8 below)
3. Add translations to `metadata/translations/{locale}/objects.json` for each locale
4. Add triggers (optional) — `backend/triggers/{objectName}.ts`
5. Run `db:deploy`

---

1. **Create the object folder**:

   ```
   frontend/public/metadata/objects/{objectName}/
   ```

2. **Add `object.json`**:

   ```json
   {
     "name": "product",
     "label": "Product",
     "labelPlural": "Products",
     "description": "Manage product catalog",
     "apiEndpoint": "/api/products",
     "basePath": "/products",
     "detailPath": "/products/$productId",
     "icon": "IconPackage",
     "color": "blue",
     "sidebar": {
       "showInSidebar": true,
       "group": "Data",
       "parent": "Catalog"
     }
   }
   ```

   | Property      | Required | Description                                          |
   | ------------- | -------- | ---------------------------------------------------- |
   | `name`        | Yes      | Must match folder name                               |
   | `label`       | Yes      | Singular display name                                |
   | `labelPlural` | Yes      | Plural display name                                  |
   | `apiEndpoint` | Yes      | Base API path (e.g. `/api/products`)                 |
   | `basePath`    | No       | List URL path (defaults from name)                   |
   | `detailPath`  | No       | Detail URL template                                  |
   | `icon`        | No       | Lucide icon name (PascalCase, e.g. `IconPackage`)    |
   | `color`       | No       | Theme color                                          |
   | `trigger`     | No       | Object name for triggers (see [Triggers](#triggers)) |
   | `sidebar`     | No       | `showInSidebar`, `group`, `parent`                   |
   | `tenantScope` | No       | `null` (platform-wide), `"tenant"`, or `"org_and_tenant"`. Must match `tenant-config.json` mode. Omit = platform-wide. |

3. **Add `fields.json`** (must include `name`):

   ```json
   ["name", "sku", "description", "price"]
   ```

4. **Add field definitions** in `fields/` (see [Adding a Field](#adding-a-field)).

5. **Add `listView.json`**:

   ```json
   {
     "fields": ["name", "sku", "price"],
     "defaultSort": "name",
     "defaultSortOrder": "asc",
     "pageSize": 10
   }
   ```

6. **Add `detailView.json`**:

   ```json
   {
     "layout": "two-column",
     "sections": [
       {
         "title": "Basic Information",
         "columns": 2,
         "defaultOpen": true,
         "fields": ["name", "sku", "description", "price"]
       },
       {
         "title": "System Information",
         "columns": 2,
         "defaultOpen": false,
         "fields": ["id", "createdAt", "updatedAt"]
       }
     ]
   }
   ```

7. **Run deployment** to generate schema and routes:

   ```bash
   cd backend && pnpm run db:deploy
   ```

   This validates metadata, generates schema, runs migrations, and updates `objects/index.json`.

8. **Add profile permissions** (for non-admin users): Add the object to `objectPermissions` in `metadata/profiles/{profile}.json` for each profile that should access it (e.g. `tenant-user`, `org-user`, `sales-rep`). For example:

   ```json
   "objectPermissions": {
     "product": { "create": true, "read": true, "update": true, "delete": false }
   }
   ```

   The **admin** profile has full access automatically and does not need to be updated.

---

## Adding a Field

1. **Add the field key** to `fields.json` (in desired order):

   ```json
   ["name", "email", "phone", "company"]
   ```

2. **Create `fields/{key}.json`**:

   ```json
   {
     "key": "email",
     "label": "Email",
     "type": "email",
     "required": true,
     "editable": true,
     "sortable": true,
     "searchable": true
   }
   ```

3. **Update `listView.json`** and `detailView.json` to include the new field if you want it visible.

4. **Run `pnpm run db:deploy`** in the backend to regenerate schema and apply migrations.

---

## Field Types Reference

| Type          | Description              | DB Column           | Notes                                                                                                                                                                 |
| ------------- | ------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `string`      | Short text               | text                |                                                                                                                                                                       |
| `text`        | Long text                | text                |                                                                                                                                                                       |
| `number`      | Numeric                  | real                |                                                                                                                                                                       |
| `boolean`     | True/false               | integer             |                                                                                                                                                                       |
| `date`        | Date only                | integer (timestamp) |                                                                                                                                                                       |
| `datetime`    | Date and time            | integer (timestamp) |                                                                                                                                                                       |
| `email`       | Email address            | text                |                                                                                                                                                                       |
| `phone`       | Phone number             | text                |                                                                                                                                                                       |
| `url`         | URL                      | text                | Validated as URL                                                                                                                                                      |
| `color`       | Hex color                 | varchar             | Color picker + hex input; stored as hex (e.g. `#3b82f6`)                                                                                                              |
| `password`    | Masked input             | varchar             | Displayed as •••••••• in view mode                                                                                                                                    |
| `geolocation` | Lat/long                 | text (JSON)         | `{latitude, longitude}`; link to maps in view                                                                                                                         |
| `address`     | Compound address         | text (JSON)         | `{street, city, state, zip, country}`                                                                                                                                 |
| `richText`    | Rich text (HTML)         | text                | Tiptap editor; sanitized on display                                                                                                                                   |
| `file`        | File attachment          | text                | Path to uploaded file; POST to `/api/upload/:objectName/:recordId/:fieldKey`. See [File Attachments](#file-attachments) for multi-file attachments via the Files tab. |
| `select`      | Single choice            | text                | Requires `options` array                                                                                                                                              |
| `multiselect` | Multiple choices         | text (JSON array)   | Requires `options` array                                                                                                                                              |
| `reference`   | Optional link to another object | `{key}Id` integer   | Requires `objectName`. ON DELETE SET NULL when parent deleted.                                                                                                                                       |
| `masterDetail`| Required child (junction/detail)| `{key}Id` integer   | Requires `objectName`. Use for junction/detail objects. Always required. ON DELETE CASCADE when parent deleted. Parent references in junction objects must use this type.                           |
| `lookup`      | Alias for `reference`    | same as reference   |                                                                                                                                                                       |
| `autoNumber`  | Auto-incrementing ID     | text                | **Only allowed for the name field.** Requires `autoNumberPattern`, `autoNumberStart`, `editable: false`                                                               |
| `formula`     | Computed from expression | (no DB column)      | Requires `formulaExpression`, `editable: false`                                                                                                                       |

**Computed fields** (`computed: true`) are not stored in the database. Use `computedExpression`: `concat`, `join`, or `lookup` with `sourceFields`.

### Name field (required)

Every object must have a `name` field. It serves as the primary identifier for reference display (RecordLookup, list views).

- **Type**: `string` or `autoNumber` only. No other field may use `autoNumber`.
- **When `autoNumber`**: Use for generated identifiers (e.g. Order ORD-001, Order Item OI-0001). Requires `editable: false`, `autoNumberPattern`, `autoNumberStart`. Stored as string.
- **When `string`**: Use for user-entered names (e.g. Product, Category). May have `editable: true` or `false`.
- **Label**: Can vary (e.g. "Order Number", "Product Name") — the key is always `name`.

---

## Field Properties

| Property              | Type                           | Description                                                                                                                                                                   |
| --------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`                 | string                         | Required. Must match filename.                                                                                                                                                |
| `label`               | string                         | Required. Display label.                                                                                                                                                      |
| `type`                | string                         | Required. One of the field types above.                                                                                                                                       |
| `required`            | boolean                        | Validation                                                                                                                                                                    |
| `editable`            | boolean                        | Can user edit? (default true)                                                                                                                                                 |
| `editableForProfiles` | string[]                       | Profile names that can edit this field even when `editable: false`. Use for profile-specific overrides (e.g. `["org-user"]` for tenant field so org users can change tenant). |
| `sortable`            | boolean                        | Show in list sort options                                                                                                                                                     |
| `searchable`          | boolean                        | Include in search                                                                                                                                                             |
| `format`              | string                         | e.g. `MMM dd, yyyy` for dates                                                                                                                                                 |
| `maxLength`           | number                         | Max length for text                                                                                                                                                           |
| `options`             | array                          | For select/multiselect: `[{value, label, color?, colorHover?}]`                                                                                                               |
| `objectName`          | string                         | For reference/masterDetail: target object name                                                                                                                                 |
| `relationshipType`    | string                         | Deprecated. Use `type: "masterDetail"` instead. For backward compat: `reference` or `masterDetail` on reference fields.                                                      |
| `deleteOnCascade`     | boolean                        | Parent delete cascades to children                                                                                                                                            |
| `useInPath`           | boolean                        | For select: drives Path component on detail view                                                                                                                              |
| `defaultValue`        | string/number/boolean/string[] | Pre-fill on create                                                                                                                                                            |
| `render`              | string                         | `currency`, `statusBadge`, `booleanBadge`, `percent`                                                                                                                          |
| `autoNumberPattern`   | string                         | e.g. `OP-{0000}` for autoNumber                                                                                                                                               |
| `autoNumberStart`     | number                         | Starting value for autoNumber                                                                                                                                                 |
| `formulaExpression`   | string                         | For formula fields                                                                                                                                                            |
| `accept`              | string                         | For file fields: accepted file types (e.g. `image/*` or `.jpg,.jpeg,.png,.gif,.webp,.svg`)                                                                                   |
| `suggestedColors`     | string[]                       | For color fields: hex values shown as quick-pick swatches (e.g. light theme presets for sidebar)                                                                             |
| `computed`            | boolean                        | Not stored; computed from `sourceFields`                                                                                                                                      |
| `computedExpression`  | string                         | `concat`, `join`, `lookup`                                                                                                                                                    |
| `sourceFields`        | string[]                       | For computed fields                                                                                                                                                           |

### Reference fields

```json
{
  "key": "customer",
  "label": "Customer",
  "type": "reference",
  "objectName": "customer",
  "editable": true
}
```

For **master-detail** (e.g. order items under order, junction objects):

```json
{
  "key": "order",
  "label": "Order",
  "type": "masterDetail",
  "objectName": "order",
  "required": true
}
```

**Junction object rule**: When an object appears in another object's `relatedObjects` with a `foreignKey` (e.g. `order.id`), the child object's field (e.g. `order` on orderitem) must use `type: "masterDetail"`, not `reference`.

### Profile-specific editability (editableForProfiles)

Use `editableForProfiles` when a field should be read-only for most users but editable for specific profiles. Example pattern (tenant edit for org users is currently disabled; see `docs/FUTURE.md`):

```json
{
  "key": "tenant",
  "label": "Tenant",
  "type": "reference",
  "objectName": "tenant",
  "basePath": "/tenants",
  "editable": false,
  "editableForProfiles": ["org-user"]
}
```

- `editable: false` — Default: field is read-only
- `editableForProfiles: ["profile-name"]` — Users with these profiles can edit even when `editable` is false
- Re-enabling tenant edit for org users requires cascade logic (order → order items). See `docs/FUTURE.md`.

### Select fields with Path

```json
{
  "key": "status",
  "label": "Status",
  "type": "select",
  "required": true,
  "useInPath": true,
  "defaultValue": "PENDING",
  "options": [
    { "value": "PENDING", "label": "Pending", "color": "#eab308" },
    { "value": "CONFIRMED", "label": "Confirmed", "color": "#0284c7" }
  ]
}
```

### AutoNumber (for `name` field)

```json
{
  "key": "name",
  "label": "Name",
  "type": "autoNumber",
  "required": true,
  "editable": false,
  "autoNumberPattern": "OP-{0000}",
  "autoNumberStart": 1
}
```

### Formula field

```json
{
  "key": "total",
  "label": "Total",
  "type": "formula",
  "editable": false,
  "formulaExpression": "quantity * price"
}
```

---

## List View Configuration

`listView.json`:

```json
{
  "fields": ["name", "customer", "status", "totalAmount", "orderDate"],
  "defaultSort": "orderDate",
  "defaultSortOrder": "desc",
  "pageSize": 10,
  "statistics": [
    {
      "key": "totalOrders",
      "label": "Total Orders",
      "type": "count",
      "icon": "ShoppingCart"
    },
    {
      "key": "totalRevenue",
      "label": "Total Revenue",
      "type": "sum",
      "field": "totalAmount",
      "format": "currency",
      "icon": "DollarSign"
    }
  ]
}
```

**Statistics types**: `count`, `sum`, `avg`, `min`, `max`. For `sum`, `avg`, `min`, `max`, `field` is required.

### Multiple list views

You can define multiple list views per object using the `views` array. Each view has its own fields, filters, statistics, and sort. Use `defaultView` to specify which view loads first.

**Profile-specific views**: Add `profiles` to a view to restrict visibility. When omitted, the view is visible to all users who can read the object. When set, only users with one of those profiles see the view.

| Property   | Type     | Description                                                                 |
| ---------- | -------- | --------------------------------------------------------------------------- |
| `profiles` | string[] | Optional. Profile names (e.g. `org-user`, `tenant-user`). Omit = visible to all. |

Example:

```json
{
  "defaultView": "all",
  "views": [
    {
      "key": "all",
      "label": "All Orders",
      "fields": ["name", "customer", "status", "totalAmount", "orderDate"],
      "profiles": ["org-user", "admin"]
    },
    {
      "key": "myOrders",
      "label": "My Orders",
      "fields": ["name", "customer", "status", "totalAmount"],
      "filters": { "assignedTo": "$currentUser" },
      "profiles": ["tenant-user"]
    },
    {
      "key": "recentlyViewed",
      "label": "Recently Viewed",
      "type": "recentlyViewed",
      "fields": ["name", "customer", "status"]
    }
  ]
}
```

Views with no `profiles` (e.g. `recentlyViewed` above) are visible to everyone. List views support deep-linking via `?view=openOrders` in the URL.

---

## Detail View Configuration

`detailView.json`:

```json
{
  "layout": "two-column",
  "sections": [
    {
      "title": "Basic Information",
      "columns": 2,
      "defaultOpen": true,
      "fields": ["firstName", "lastName", "email", "phone"]
    },
    {
      "title": "Company Information",
      "columns": 1,
      "defaultOpen": true,
      "fields": ["company", "address"]
    }
  ]
}
```

**Layout**: `single-column`, `two-column`, `tabs`.

---

## Header Configuration

`header.json` (optional):

```json
{
  "primaryActions": [
    {
      "key": "edit",
      "label": "Edit",
      "type": "edit",
      "icon": "Edit",
      "variant": "outline"
    },
    {
      "key": "contact",
      "label": "Contact",
      "type": "mailto",
      "targetField": "email",
      "icon": "Mail",
      "variant": "default"
    }
  ],
  "secondaryActions": [
    {
      "key": "call",
      "label": "Call",
      "type": "tel",
      "targetField": "phone",
      "icon": "Phone",
      "variant": "ghost"
    }
  ],
  "calculatedData": [
    {
      "key": "account_age",
      "label": "Account Age",
      "formula": "daysSince",
      "sourceField": "createdAt",
      "icon": "Calendar",
      "format": "text"
    }
  ]
}
```

**Action types**: `edit`, `delete`, `mailto`, `tel`.

**Calculated formulas**: `daysSince`, `fallback`, `currency` (see `action-registry.ts`).

---

## Related Objects

`relatedObjects.json` defines related record tables on the detail view (e.g. Orders on Customer):

```json
[
  {
    "name": "orders",
    "label": "Order",
    "labelPlural": "Orders",
    "objectDefinition": "order",
    "relationshipType": "one-to-many",
    "foreignKey": "customer.id",
    "apiEndpoint": "/api/orders/customer",
    "fields": [
      { "key": "name", "label": "Order Number", "type": "string" },
      {
        "key": "status",
        "label": "Status",
        "type": "string",
        "render": "statusBadge"
      },
      {
        "key": "totalAmount",
        "label": "Total Amount",
        "type": "number",
        "render": "currency"
      }
    ],
    "defaultSort": "orderDate",
    "defaultSortOrder": "desc",
    "pageSize": 10,
    "permissions": {
      "create": true,
      "read": true,
      "update": true,
      "delete": false
    }
  }
]
```

---

## Triggers

Triggers are the **automation layer** of the project. They run before and after create, update, and delete operations, letting you validate data, transform payloads, or run side effects (audit logs, emails, webhooks).

### Location

Triggers live in `backend/triggers/{objectName}.ts`. The file name must match the object name (e.g. `backend/triggers/customer.ts` for the `customer` object). The path is fixed relative to the backend; it does not depend on `process.cwd()`.

### Optional: `trigger` in object.json

You can add `"trigger": "customer"` to `object.json` for reference. The backend loads triggers by object name, so this is mainly for documentation or future tooling.

### Available Events

| Event          | When                     | Return value                         |
| -------------- | ------------------------ | ------------------------------------ |
| `beforeInsert` | Before creating a record | Modified payload (or throw to abort) |
| `afterInsert`  | After creating a record  | void                                 |
| `beforeUpdate` | Before updating a record | Modified payload (or throw to abort) |
| `afterUpdate`  | After updating a record  | void                                 |
| `beforeDelete` | Before deleting a record | void (throw to abort)                |
| `afterDelete`  | After deleting a record  | void                                 |

**Before** hooks receive `(oldValue?, newValue?)` and can return a modified object that will be used for the DB operation. **After** hooks run after the operation and are for side effects only.

### Helpers (one per object)

Put reusable logic in `backend/triggers/helpers/` and import it in your trigger hooks. **Best practice: one helper per object** (e.g. `helpers/customer.ts` for customer-specific logic). Use `helpers/utils.ts` for general logic that can be reused across helpers (e.g. `validateEmail`).

### Adding a Trigger for a New Object

1. Create `backend/triggers/{objectName}.ts`:

   ```typescript
   type Record = { [key: string]: unknown };

   export function beforeInsert(
     _oldValue: Record | undefined,
     newValue: Record
   ): Record {
     return newValue;
   }

   export function afterInsert(
     _oldValue: Record | undefined,
     _newValue: Record
   ): void {
     // Side effects
   }

   export function beforeUpdate(_oldValue: Record, newValue: Record): Record {
     return newValue;
   }

   export function afterUpdate(_oldValue: Record, _newValue: Record): void {
     // Side effects
   }

   export function beforeDelete(_oldValue: Record): void {
     // throw to abort
   }

   export function afterDelete(_oldValue: Record): void {
     // Cleanup
   }
   ```

2. Implement only the hooks you need. Missing hooks are ignored.

3. Create `backend/triggers/helpers/{objectName}.ts` for object-specific logic. Import from `helpers/utils.ts` for general utilities.

---

## Validation & Deployment

- **Validate metadata** (no deploy):

  ```bash
  cd backend && pnpm run db:validate-metadata
  ```

- **Full deploy** (validate → generate schema → migrate → sync):

  ```bash
  cd backend && pnpm run db:deploy
  ```

- **Lint-staged**: Metadata JSON files trigger validation on commit.

### Deployment Flow

`db:deploy` runs these steps in order:

1. **Validate metadata** — Checks all JSON files for schema compliance (fails if `name` missing or invalid)
2. **Generate schema from metadata** — Writes `drizzle-temp/db/schema.ts` from your metadata
3. **Generate migrations** — Drizzle-kit compares schema to DB, writes migration SQL to `backend/drizzle/`
4. **Fix pending migrations** — For migrations that add columns, if columns already exist, marks as applied
5. **Run migrations** — Applies `backend/drizzle/*.sql` to the MySQL database
6. **Ensure tables** — Creates any missing tables from metadata (e.g. when migrations don't create them)
7. **Verify schema** — Confirms DB columns match metadata expectations
8. **Sync drops** — Removes tables/columns that no longer exist in metadata
9. **Copy generated files** — Updates `schema.ts` and `entity-registry.generated.ts`

**Never create schema or migrations manually.** All artifacts flow from metadata. See `.cursor/rules/metadata-driven.mdc`.

**Formula and computed fields** do not create DB columns—they are evaluated at runtime. `sync-drops` and `ensure-tables` skip them when building expected columns, so they are never dropped or created as columns.

**Important**: Migrations are stored in `backend/drizzle/`. Both the schema generator and the migrate script use this folder. Do not create a separate `drizzle/` folder at the project root.

**DATABASE_URL**: Set to a MySQL connection string, e.g. `mysql://user:password@localhost:3306/database_name`. Create the database before running deploy (e.g. `CREATE DATABASE generic_saas`).

### Verifying Deployment

After `db:deploy`, verify the database schema matches your metadata:

```bash
mysql -u user -p -e "DESCRIBE dbname.table_name"
```

Replace `dbname` with your database name and `table_name` with any table from your metadata (e.g. `customers`, `orders`). You should see the columns defined in your metadata.

### Profiles

Profiles live in `metadata/profiles/{profileId}.json`. Each file defines `objectPermissions` (per-object `create`, `read`, `update`, `delete`, `list`) and optional `fieldPermissions`. Admin has full access without being in profile metadata. Assign profile via user's `profile` field (e.g. `admin`, `tenant-user`).

### Mandatory: Admin Profile

The platform requires at least one user with `profile: 'admin'`. The admin profile is special: it has full access to all objects and settings without being defined in profile metadata. Seed scripts ensure an admin user exists on startup. If the admin user is missing or has the wrong profile, `initDb` will create or update it.

### Testing Permissions

The minimal seed creates only the admin user. Login: `admin` / `admin123`.

**To test permissions:**

1. **Apply migrations** (if not already done):

   ```bash
   cd backend && pnpm run db:migrate
   ```

2. **Start the backend** — `initDb` runs on startup and creates the admin user if missing.

3. **Log in as admin** — You should see all objects, create/edit/delete buttons, and all fields.

4. **Test other profiles** — Create a user via Settings → Users, assign a non-admin profile, then log in to verify restricted access.

5. **Create a custom profile** — Add `metadata/profiles/sales-rep.json` with object/field permissions, assign to a user.

### Troubleshooting

| Error                                      | Cause                                                                                           | Fix                                                                                                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `no such column: X`                        | Migrations not applied to database                                                              | Run `cd backend && pnpm run db:migrate`. If migrations exist in `backend/drizzle/`, they should apply. Verify with `mysql -e "DESCRIBE dbname.table"`. |
| `table X already exists`                   | Wrong migration folder or conflicting migration history                                         | Ensure only `backend/drizzle/` exists. Do not use a project-root `drizzle/` folder.                                                                    |
| `duplicate column name: X`                 | A migration tries to add columns that already exist (e.g. from ensure-tables or manual changes) | Run `pnpm run db:fix-pending-migrations` before `db:migrate`, or run full `db:deploy` (which includes the fix).                                        |
| `Metadata validation failed`               | Invalid JSON or schema violation                                                                | Run `pnpm run db:validate-metadata` for details. Check `.cursor/rules/metadata-validation.mdc` for the full checklist.                                 |
| `500 Internal Server Error` on list/detail | Schema mismatch (code expects columns not in DB)                                                | Run `db:deploy` and restart the backend. Check backend logs for the specific error message.                                                            |
| `ECONNREFUSED` / `Connection refused`      | MySQL not running or wrong host/port                                                            | Ensure MySQL is running. Check `DATABASE_URL` (host, port, credentials).                                                                               |
| `ER_ACCESS_DENIED_ERROR`                   | Wrong MySQL credentials                                                                         | Verify username and password in `DATABASE_URL`.                                                                                                        |

**Key validation rules**:

- `name` field must exist and have `required: true`. When `type` is `autoNumber`, `editable` must be `false`; when `type` is `string`, `editable` may be `true` or `false`
- `autoNumber` type is only allowed for the `name` field
- Reference fields require `objectName` pointing to an existing object
- Select/multiselect require `options` array
- Formula fields require `formulaExpression` and `editable: false`
- `masterDetail` type implies `required: true`; parent references in junction objects must use `masterDetail`
- `tableName` must be unique across objects (validation fails if two objects use the same table)

See `.cursor/rules/metadata-validation.mdc` for the full checklist when adding new metadata features.

---

## System Objects

**User**, **organization**, and **tenant** are system objects—they are not in `metadata/objects/` and cannot be created or edited via Object Manager.

| Object       | When present                                       | Metadata location                                                     |
| ------------ | -------------------------------------------------- | --------------------------------------------------------------------- |
| user         | Always                                             | Hardcoded in schema; extensions in `metadata/system-extensions/user/` |
| organization | When `tenant-config.json` mode is `single_tenant`, `multi_tenant`, or `org_and_tenant` | `metadata/system/organization/` (read-only UI)                        |
| tenant       | When `tenant-config.json` mode is `single_tenant` or `org_and_tenant` | `metadata/system/tenant/` (read-only UI)                              |

- **`metadata/system/`** — Read-only UI definitions for organization and tenant (listView, detailView, fields). Shipped with the app.
- **`metadata/system-extensions/`** — Add-only extension fields for user, organization, and tenant. You can add new fields but cannot remove or override base fields.

### Object Manager

Settings → Administration → **Object Manager** (admin only). Create and edit metadata objects via UI: object.json, fields, listView, detailView. Changes persist to metadata files. Run `db:deploy` after schema changes.

### Adding Extension Fields to System Objects

1. Add the field key to `metadata/system-extensions/{objectName}/fields.json` (e.g. `["phone", "department"]` for user).
2. Create `metadata/system-extensions/{objectName}/fields/{fieldKey}.json` with the field definition (same schema as regular fields).
3. Run `db:deploy` to regenerate schema and apply migrations.

**Rules:**

- Extension field keys must not overlap with base fields (see `SYSTEM_OBJECT_BASE_FIELDS` in `shared/protected-metadata.ts`).
- Extensions are add-only—you cannot remove fields once added.
- Use the Admin Metadata API: `PUT /api/admin/metadata/objects/system-extensions/{objectName}/fields.json` and `PUT .../fields/{fieldKey}`.

---

## Multi-Tenancy (Org/Tenant)

Organization and tenant are **system objects** (see [System Objects](#system-objects)). They live in `metadata/system/` for UI and are not editable via Object Manager. Configure multi-tenancy via `metadata/tenant-config.json`.

See `.cursor/rules/tenant-multi-tenancy.mdc` for mode, tenantScope, and enforcement rules.

**Org users** (organizationId set, tenantId null) see data across all tenants in their org. They must select tenant when creating records. Tenant editing on existing records is disabled (see `docs/FUTURE.md`).

### Sidebar branding (logo and theme)

The sidebar displays the current tenant or organization context. Edit the tenant or organization record to customize:

- **Logo**: Upload an image (tenant/org logo field). The logo appears in the sidebar header. Only image files (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`) are accepted.
- **Sidebar theme**: Set the **Sidebar Theme** field using the color picker (hex, e.g. `#3b82f6`). This controls the full sidebar background, primary color, and accent in **light mode only**. In dark mode, the default sidebar styling is used. Leave empty to use the default theme. When the chosen color is dark, text automatically switches to white for better visibility. Use the **Light themes** quick-pick swatches for colors that work well with black text.

### Org-to-child tenant configuration inheritance

When using mode `org_and_tenant`, organization settings are inherited by child tenants:

- **New tenant creation**: When creating a new tenant, any fields left empty (logo, address, defaultCurrency, currencySymbol, timezone, defaultPreferredLanguage, sidebarTheme) inherit the parent organization's values. Fill a field to override.
- **Org update cascade**: When updating an organization's settings, child tenants whose values are empty receive the new org values. Tenants with explicit overrides (non-empty values) are left unchanged.

---

## File Attachments

Files are stored in the internal `files` table, linked to records via `objectName` and `recordId`. Multiple files per record are supported. Attachments appear in the **Files** tab on the record detail view.

### Overview

- **Storage**: Files are stored under `uploads/{objectName}/{recordId}/attachments/` with a UUID-prefixed filename.
- **Table**: Internal `files` table (no metadata, no Object Manager). Managed only via upload/download APIs.

### Upload

- **Endpoint**: `POST /api/upload/:objectName/:recordId/attachments`
- **Body**: `multipart/form-data` with `file` and optional `isPublic` (boolean)
- **Permissions**: Requires auth and `update` permission on the parent record
- **Max size**: 10MB
- **Allowed types**: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.txt`, `.csv`, `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`

### Download

- **Private files**: `GET /api/files/download/:fileId` with `Authorization: Bearer <token>`. Requires read permission on the parent record.
- **Public files**: `GET /api/files/download/:fileId` (no auth required)

### isPublic Column

- **Set at upload**: Use the "Make new uploads public" checkbox when uploading.
- **Toggle per-file**: Users with update permission can toggle the "Public" checkbox for each file in the list. Uses `PATCH /api/files/:fileId` with `{ isPublic: boolean }`.
- **Public files**: Accessible without authentication. Use for shareable links.

### List, Update, and Delete

- **List**: `GET /api/files?objectName=X&recordId=Y` — Returns files for a record. Requires auth and read permission.
- **Update**: `PATCH /api/files/:fileId` — Update `isPublic` only. Body: `{ isPublic: boolean }`. Requires auth and update permission on the parent record.
- **Delete**: `DELETE /api/files/:fileId` — Deletes file record and disk file. Requires auth and update permission on the parent record.

### Preview

- **PDF and images**: In-app preview in a dialog (iframe for PDF, `<img>` for images)
- **Other types**: Download button only

---

## Default Currency

Admins can set the default currency symbol used when displaying currency fields (number fields with `render: "currency"`).

- **Settings**: Settings → Administration → Default Currency (admin only)
- **Config**: Stored in `metadata/app-config.json` with `defaultCurrency` (e.g. "USD") and `currencySymbol` (e.g. "$", "€", "£")
- **API**: `GET /api/config/app-config` (auth required), `PUT /api/config/app-config` (admin only)

---

## Email and Notifications

The platform supports transactional emails via SMTP. Admins configure SMTP settings, edit email templates, and toggle which events send emails.

### SMTP Configuration

- **Settings**: Settings → Administration → Email (admin only)
- **Storage**: `metadata/app-config.json` under `emailConfig`
- **Fields**: `enabled`, `fromEmail`, `fromName`, `smtpHost`, `smtpPort`, `smtpSecure`, `smtpUser`, `smtpPassword`
- **API**: Same as Default Currency; `emailConfig` is included in `GET/PUT /api/config/app-config`

### Email Templates

- **Location**: `metadata/email-templates/{templateKey}.json`
- **Structure**: `key`, `label`, `subject`, `bodyHtml`, `variables` (array of variable paths)
- **Variable syntax**: `{{path}}` (e.g. `{{customer.firstName}}`, `{{order.name}}`)
- **API**: `GET /api/email/templates`, `GET /api/email/templates/:key`, `PUT /api/email/templates/:key` (admin), `POST /api/email/preview`
- **UI**: Settings → Administration → Email Templates — list, edit, preview

### Notification Settings

- **Table**: `notification_settings` (eventKey, enabled, templateKey)
- **Event catalog**: `metadata/notification-events.json` — defines available events and default templates
- **Seed**: `notification_settings` is seeded from the event catalog in `seed-single-tenant`, `seed-multi-tenant`, and `initDb`
- **API**: `GET /api/email/notification-settings`, `PUT /api/email/notification-settings` (admin)
- **UI**: Settings → Administration → Notification Settings — toggle events, select template per event

### Trigger Integration

Triggers call `maybeSendNotification(eventKey, record, context)` from `backend/triggers/helpers/email.ts`. The helper checks `notification_settings`, resolves the recipient, and enqueues the email via `setImmediate` (non-blocking). For production, consider a proper queue (Redis/BullMQ).

**Adding events**: Add entry to `metadata/notification-events.json` (`eventKey`, `label`, `defaultTemplateKey`). Seed or initDb populates `notification_settings`. Wire triggers to call `maybeSendNotification(eventKey, record, context)`.

---

## Translations and Localization

The platform supports multiple languages via metadata-driven translations. The effective language is resolved in this order: **user preferred language** → **tenant default** → **org default** → **app default** → **English**.

### Translation File Structure

Translations live under `metadata/translations/{locale}/`:

| Namespace   | Purpose                                      |
| ----------- | -------------------------------------------- |
| `common.json`     | Buttons, generic labels (Save, Cancel, Create) |
| `navigation.json` | Sidebar, menu items, Dashboard, Settings     |
| `settings.json`   | Settings page labels and messages             |
| `errors.json`     | Error messages, validation                   |
| `objects.json`    | Object and field labels (nested by object)    |

**Key convention for objects**: `objects.{objectName}.label`, `objects.{objectName}.labelPlural`, `objects.{objectName}.fields.{fieldKey}`.

### Effective Language Resolution

1. **User** — `preferredLanguage` (Settings → Display). Overrides all.
2. **Tenant** — `defaultPreferredLanguage` on tenant record (tenant users).
3. **Organization** — `defaultPreferredLanguage` on org record (org users).
4. **App** — `defaultPreferredLanguage` in `app-config.json` (users with no tenant/org).
5. **Fallback** — English (`en`).

New users inherit the tenant or org default until they set a personal preference.

### Admin UI

- **Settings** → Administration → **Translations** (admin only)
- Select locale and namespace, edit key-value pairs, save
- API: `GET/PUT /api/admin/metadata/translations/:locale/:namespace`

### Translation Coverage Report

Use the translation report to find untranslated elements until all locales are fully translated:

- **CLI**: Run `pnpm run translation-report` (or `cd backend && pnpm run translation-report`) to print a coverage report to the console. Use `--verify order` to inspect a specific object's keys, or `--output report.md` to write to a file.
- **Admin dashboard**: In **Settings** → **Translations**, the coverage panel shows donut charts per locale. Click **Generate report** to load it, then use the eye icon next to "Missing" or "Empty" to view the list of untranslated keys in a modal.

The report does two checks:

1. **Key coverage**: Compares each locale's translation files to the reference (`en`). Lists missing keys and empty values.
2. **Hardcoded strings**: Scans frontend source for user-facing strings that are not yet converted to translation keys (e.g. `errorMessage: '...'`, `toast.error('...')`, etc.). These should be replaced with `t('namespace:key', { defaultValue: '...' })` and the key added to each locale.

Add missing keys, fill empty values, and convert hardcoded strings until the report shows 100% for all locales and no hardcoded strings.

### Adding a New Locale

1. Create `metadata/translations/{locale}/` (e.g. `es`, `fr`, `ar`).
2. Copy all namespace files from `en/` and translate values.
3. Add the locale to `LANGUAGE_OPTIONS` in `display-form.tsx` if it should appear in the language selector.
4. For **RTL languages** (e.g. Arabic `ar`): ensure `useEffectiveLanguage` sets `document.documentElement.dir = 'rtl'` when the locale is RTL (already implemented for `ar`).
5. Ensure `defaultPreferredLanguage` is available in org/tenant/app config for users to select it.

### Adding Translations for New Metadata

When adding a new object or field:

1. Add entry to `metadata/translations/{locale}/objects.json` for each supported locale.
2. Structure: `{ "objectName": { "label": "...", "labelPlural": "...", "fields": { "fieldKey": "..." } } }`.

### Cursor Rule

See `.cursor/rules/translations.mdc` — when adding new UI strings or metadata, always add translations for all supported locales.

---

## Record History

Record history tracks field-level changes on entity updates. Each change is stored with the field key, old value, new value, who made the change, and when.

- **Table**: Internal `record_history` table (no metadata, no Object Manager). Populated automatically on entity updates.
- **API**: `GET /api/record-history?objectName=X&recordId=Y` — Returns history entries for a record, ordered by `changedAt` desc. Requires auth and read permission on the object.
- **UI**: The **History** tab on the record detail view displays the change timeline.

---

## Detail View Side Section

The detail view side section (right column on large screens) has two built-in tabs:

- **History** — Field change tracking (see [Record History](#record-history))
- **Files** — File attachments (see [File Attachments](#file-attachments))

These sections are designed to be **extensible**. Projects can add custom tabs or replace content by modifying `frontend/src/components/generic/GenericObjectDetailViewSideSection.tsx`.

**Recommended**: Use these slots for domain-specific features (e.g., custom activity feeds, related documents, notes). The History and Files tabs provide a consistent baseline; additional tabs or content can be added as needed. It's recommended to add a new section on top of the section that has attachments and history.

---

## Global Actions Bar

The top header bar (between the sidebar collapse button and the search bar) has a **Global Actions Bar** slot. This area is reserved for **custom global actions**—project-specific shortcuts that are commonly used across the app.

### Purpose

Use this area for:

- **Quick create** — e.g. "New Order", "New Customer", "New Invoice"
- **Frequently used actions** — e.g. "Export", "Sync", "Refresh"
- **Contextual shortcuts** — e.g. "Go to Dashboard", "Open Command Menu"

### Responsive behavior

On **mobile and tablet** (below 768px, same as sidebar), or when there are **more than 4 actions**, global actions collapse into a **star icon button**. Clicking it opens a dropdown with all available actions. On desktop with few actions, they display inline as buttons.

### Implementation

Edit `frontend/src/components/layout/global-actions.tsx` to add actions. The `GlobalActions` component computes the actions array (filtered by permissions) and passes them to `GlobalActionsBar`. Add entries to `QUICK_CREATE_CONFIG`:

```tsx
const QUICK_CREATE_CONFIG = [
  { actionId: 'quick-create-order', objectName: 'order', label: 'New Order' },
  { actionId: 'quick-create-customer', objectName: 'customer', label: 'New Customer' },
  // ...
]

// GlobalActions computes actions and renders:
<GlobalActionsBar actions={actions}>
  {dialogs}
</GlobalActionsBar>
```

The layout uses `<GlobalActions />` in [authenticated-layout.tsx](frontend/src/components/layout/authenticated-layout.tsx).

### Global action permissions

Global actions are **not** tied to objects—they can be tools (Export, Sync) or quick-create shortcuts. Permissions are managed separately via **global action permissions** in Profiles.

1. **Define actions** in `metadata/global-actions.json`:

   ```json
   {
     "actions": [
       { "id": "quick-create-order", "label": "Quick create order", "description": "Create a new order from the header bar" },
       { "id": "export-data", "label": "Export data", "description": "Export list view data to CSV" }
     ]
   }
   ```

2. **Configure per profile** — Settings → Administration → Profiles → [Profile] → Global action permissions. Toggle each action on or off per profile.

3. **Frontend** — Use `canUseGlobalAction(actionId)` from `usePermissions()`:

   ```tsx
   const { canUseGlobalAction } = usePermissions()
   {canUseGlobalAction('quick-create-order') && (
     <Button asChild><Link to="/orders/new">New Order</Link></Button>
   )}
   ```

4. **Backend** — For endpoints that perform global actions (e.g. export, sync), use `hasGlobalActionPermission(profile, actionId)` from `backend/src/lib/permissions.ts`.

**Export**: List export uses `export-data` global action. Define in `metadata/global-actions.json`; grant via Profiles → Global action permissions. Export uses current list view columns and filters.

### Security summary

| Action type | Frontend check | Backend |
|-------------|----------------|---------|
| Object create (e.g. New Order) | `canCreate(objectName)` or `canUseGlobalAction('quick-create-order')` | Entity API + optional global action check |
| Tool (Export, Sync) | `canUseGlobalAction(actionId)` | `hasGlobalActionPermission(profile, actionId)` |
| Admin-only | `user?.profile === 'admin'` | `adminOnlyMiddleware` |

See `.cursor/rules/global-actions-bar.mdc` for AI guidance when adding global actions.

---

## Sidebars

The sidebar shows three types of items in a single list (no group separations):

1. **Dashboard** — Top link. Routes to `/dashboard`.
2. **Data** — Object list links (Orders, Customers, etc.) built from object definitions and `canRead` permissions.
3. **Settings** — Bottom link. Routes to `/settings`.

### Sidebar metadata

Sidebar metadata lives in `metadata/sidebars/`. Each profile can reference a sidebar via `sidebar` in `metadata/profiles/{name}.json`. Sidebar files can have empty `navGroups` when only Dashboard, Data, and Settings are needed.

| Property   | Required | Description                                      |
| --------- | -------- | ------------------------------------------------ |
| `id`      | Yes      | Must match filename (e.g. `default`, `admin`)   |
| `label`   | Yes      | Display label for the sidebar                    |
| `navGroups` | Yes    | Array of navigation groups (can be empty)        |

When `navGroups` is non-empty, each group can add custom links. See sidebar validation in `backend/src/metadata/validate.ts` for the full schema.

### Profile link

Add `sidebar` to a profile to use a specific sidebar:

```json
{
  "name": "admin",
  "label": "Administrator",
  "sidebar": "admin",
  "objectPermissions": { ... }
}
```

- If `sidebar` is omitted, the profile uses `default`.
- The sidebar ID must exist in `metadata/sidebars/` (validated on deploy).

### Data items

Data items (object list links) are built automatically from object definitions and `canRead` permissions. Object visibility is controlled by `object.json` → `sidebar.showInSidebar` and profile object permissions.

---

## Dashboard

The dashboard is a **single page** at `/dashboard`. Content can vary by profile.

### Profile-driven content

Each profile can have its own dashboard configuration via `metadata/dashboards/{profileName}.json` (optional). When no dashboard metadata exists for a profile, a default tab set is used.

### Tabs for multiple dashboards and reports

Use the **top tabs** to provide multiple dashboards and reports for a single profile. For example, a sales rep might have:

- **Overview** — Summary cards and recent activity
- **Analytics** — Charts and trends
- **Reports** — Saved reports list

Configure tabs in dashboard metadata:

```json
{
  "profile": "sales-rep",
  "tabs": [
    { "key": "overview", "label": "Overview", "default": true },
    { "key": "analytics", "label": "Analytics" },
    { "key": "reports", "label": "Reports" }
  ],
  "defaultTab": "overview"
}
```

| Property     | Required | Description                                  |
| ----------- | -------- | -------------------------------------------- |
| `profile`   | Yes      | Profile name (must match filename)           |
| `tabs`      | Yes      | Array of `{ key, label, default? }`          |
| `defaultTab`| No       | Key of the initial tab (defaults to first)   |

When `metadata/dashboards/{profile}.json` does not exist, the dashboard uses built-in default tabs (e.g. Overview, Analytics, Reports, Notifications).
