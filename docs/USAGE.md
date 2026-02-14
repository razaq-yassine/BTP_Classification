# Metadata Usage Guide

This project is **metadata-driven**. The UI, API routes, and database schema are generated from JSON metadata files. You configure objects, fields, views, and behavior by editing metadata—no code changes needed for most CRUD features.

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

---

## Overview

- **Metadata location**: `frontend/public/metadata/`
- **Objects index**: `metadata/objects/index.json` (auto-generated)
- **Per-object folder**: `metadata/objects/{objectName}/`

The frontend loads metadata at runtime. The backend generates Drizzle schema and entity routes from metadata via `db:generate-from-metadata` and `db:deploy`.

---

## Metadata Structure

Each object has its own folder with these files:

| File | Required | Description |
|------|----------|-------------|
| `object.json` | Yes | Object definition (name, label, API, navigation) |
| `fields.json` | Yes | Ordered list of field keys |
| `fields/{key}.json` | Yes (per field) | Field definitions |
| `listView.json` | Yes | List view columns and options |
| `detailView.json` | Yes | Detail view sections and layout |
| `header.json` | No | Header actions and calculated data |
| `relatedObjects.json` | No | Related object tables (e.g. Orders on Customer) |

**System fields** (`id`, `createdAt`, `updatedAt`) are automatic—do not add them to `fields.json` or create `fields/*.json` for them.

---

## Adding a New Object

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

   | Property | Required | Description |
   |----------|----------|-------------|
   | `name` | Yes | Must match folder name |
   | `label` | Yes | Singular display name |
   | `labelPlural` | Yes | Plural display name |
   | `apiEndpoint` | Yes | Base API path (e.g. `/api/products`) |
   | `basePath` | No | List URL path (defaults from name) |
   | `detailPath` | No | Detail URL template |
   | `icon` | No | Lucide icon name (PascalCase, e.g. `IconPackage`) |
   | `color` | No | Theme color |
   | `trigger` | No | Object name for triggers (see [Triggers](#triggers)) |
   | `sidebar` | No | `showInSidebar`, `group`, `parent` |

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

| Type | Description | DB Column | Notes |
|------|--------------|-----------|-------|
| `string` | Short text | text | |
| `text` | Long text | text | |
| `number` | Numeric | real | |
| `boolean` | True/false | integer | |
| `date` | Date only | integer (timestamp) | |
| `datetime` | Date and time | integer (timestamp) | |
| `email` | Email address | text | |
| `phone` | Phone number | text | |
| `url` | URL | text | |
| `select` | Single choice | text | Requires `options` array |
| `multiselect` | Multiple choices | text (JSON array) | Requires `options` array |
| `reference` | Link to another object | `{key}Id` integer | Requires `objectName` |
| `lookup` | Alias for `reference` | same as reference | |
| `autoNumber` | Auto-incrementing ID | text | Requires `autoNumberPattern`, `autoNumberStart` |
| `formula` | Computed from expression | (no DB column) | Requires `formulaExpression`, `editable: false` |

**Computed fields** (`computed: true`) are not stored in the database. Use `computedExpression`: `concat`, `join`, or `lookup` with `sourceFields`.

---

## Field Properties

| Property | Type | Description |
|----------|------|-------------|
| `key` | string | Required. Must match filename. |
| `label` | string | Required. Display label. |
| `type` | string | Required. One of the field types above. |
| `required` | boolean | Validation |
| `editable` | boolean | Can user edit? (default true) |
| `sortable` | boolean | Show in list sort options |
| `searchable` | boolean | Include in search |
| `format` | string | e.g. `MMM dd, yyyy` for dates |
| `maxLength` | number | Max length for text |
| `options` | array | For select/multiselect: `[{value, label, color?, colorHover?}]` |
| `objectName` | string | For reference: target object name |
| `relationshipType` | string | `reference` or `masterDetail` (cascade delete) |
| `deleteOnCascade` | boolean | Parent delete cascades to children |
| `useInPath` | boolean | For select: drives Path component on detail view |
| `defaultValue` | string/number/boolean/string[] | Pre-fill on create |
| `render` | string | `currency`, `statusBadge`, `booleanBadge`, `percent` |
| `autoNumberPattern` | string | e.g. `OP-{0000}` for autoNumber |
| `autoNumberStart` | number | Starting value for autoNumber |
| `formulaExpression` | string | For formula fields |
| `computed` | boolean | Not stored; computed from `sourceFields` |
| `computedExpression` | string | `concat`, `join`, `lookup` |
| `sourceFields` | string[] | For computed fields |

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

For **master-detail** (e.g. order items under order):

```json
{
  "key": "order",
  "label": "Order",
  "type": "reference",
  "objectName": "order",
  "relationshipType": "masterDetail",
  "required": true
}
```

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
    {"value": "PENDING", "label": "Pending", "color": "#eab308"},
    {"value": "CONFIRMED", "label": "Confirmed", "color": "#0284c7"}
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
  "fields": ["orderNumber", "customer", "status", "totalAmount", "orderDate"],
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
      {"key": "orderNumber", "label": "Order Number", "type": "string"},
      {"key": "status", "label": "Status", "type": "string", "render": "statusBadge"},
      {"key": "totalAmount", "label": "Total Amount", "type": "number", "render": "currency"}
    ],
    "defaultSort": "orderDate",
    "defaultSortOrder": "desc",
    "pageSize": 10,
    "permissions": {"create": true, "read": true, "update": true, "delete": false}
  }
]
```

---

## Triggers

Triggers are the **automation layer** of the project. They run before and after create, update, and delete operations, letting you validate data, transform payloads, or run side effects (audit logs, emails, webhooks).

### Location

Triggers live in `triggers/{objectName}.ts`. The file name must match the object name (e.g. `triggers/customer.ts` for the `customer` object).

### Optional: `trigger` in object.json

You can add `"trigger": "customer"` to `object.json` for reference. The backend loads triggers by object name, so this is mainly for documentation or future tooling.

### Available Events

| Event | When | Return value |
|-------|------|--------------|
| `beforeInsert` | Before creating a record | Modified payload (or throw to abort) |
| `afterInsert` | After creating a record | void |
| `beforeUpdate` | Before updating a record | Modified payload (or throw to abort) |
| `afterUpdate` | After updating a record | void |
| `beforeDelete` | Before deleting a record | void (throw to abort) |
| `afterDelete` | After deleting a record | void |

**Before** hooks receive `(oldValue?, newValue?)` and can return a modified object that will be used for the DB operation. **After** hooks run after the operation and are for side effects only.

### Adding a Trigger for a New Object

1. Create `triggers/{objectName}.ts`:
   ```typescript
   type Record = { [key: string]: unknown }

   export function beforeInsert(newValue: Record): Record {
     return newValue
   }

   export function afterInsert(_newValue: Record): void {
     // Side effects
   }

   export function beforeUpdate(_oldValue: Record, newValue: Record): Record {
     return newValue
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

3. **Helpers**: Put reusable logic in `triggers/helpers/` and import it in your hooks. This keeps trigger files lean and lets you share validation, audit, or other logic across different events in that trigger, the best practice is to have one helper per object, and using Utils helper inside other helpers when something very general and can be reused accross helpers.

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

1. **Validate metadata** — Checks all JSON files for schema compliance
2. **Generate schema from metadata** — Writes `drizzle-temp/db/schema.ts` from your metadata
3. **Generate migrations** — Drizzle-kit compares schema to DB, writes new migrations to `backend/drizzle/`
4. **Fix pending migrations** — For any migration that adds columns, if those columns already exist (e.g. from ensure-tables or manual changes), marks it as applied to avoid "duplicate column" errors
5. **Run migrations** — Applies `backend/drizzle/*.sql` to `backend/data.db`
6. **Verify schema** — Confirms DB columns match metadata expectations
7. **Sync drops** — Removes tables/columns that no longer exist in metadata
8. **Copy generated files** — Updates `schema.ts` and `entity-registry.generated.ts`
9. **Ensure tables** — Creates any missing tables from metadata

**Important**: Migrations are stored in `backend/drizzle/`. Both the schema generator and the migrate script use this folder. Do not create a separate `drizzle/` folder at the project root.

### Verifying Deployment

After `db:deploy`, verify the database schema matches your metadata:

```bash
cd backend && sqlite3 data.db ".schema <table_name>"
```

Replace `<table_name>` with any table from your metadata (e.g. `customers`, `orders`). You should see the columns defined in your metadata.

### Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `no such column: X` | Migrations not applied to database | Run `cd backend && pnpm run db:migrate`. If migrations exist in `backend/drizzle/`, they should apply. Verify with `sqlite3 data.db ".schema <table>"`. |
| `table X already exists` | Wrong migration folder or conflicting migration history | Ensure only `backend/drizzle/` exists. Do not use a project-root `drizzle/` folder. |
| `duplicate column name: X` | A migration tries to add columns that already exist (e.g. from ensure-tables or manual changes) | Run `pnpm run db:fix-pending-migrations` before `db:migrate`, or run full `db:deploy` (which includes the fix). |
| `Metadata validation failed` | Invalid JSON or schema violation | Run `pnpm run db:validate-metadata` for details. Check `.cursor/rules/metadata-validation.mdc` for the full checklist. |
| `500 Internal Server Error` on list/detail | Schema mismatch (code expects columns not in DB) | Run `db:deploy` and restart the backend. Check backend logs for the specific error message. |

**Key validation rules**:
- `name` field must exist and have `required: true`, `editable: false`
- Reference fields require `objectName` pointing to an existing object
- Select/multiselect require `options` array
- Formula fields require `formulaExpression` and `editable: false`
- `masterDetail` reference requires `required: true`

See `.cursor/rules/metadata-validation.mdc` for the full checklist when adding new metadata features.
