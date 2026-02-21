# Back Office on Existing Database

This guide covers using generic_saas as a **back-office admin platform** when your main application already owns the database. The main app creates and manages tables; generic_saas provides an admin UI to view and manage that data.

**If you are building greenfield** (metadata → schema → DB), use the main [USAGE.md](./USAGE.md) guide instead.

---

## When to Use This Guide

- Your main app has its own database with existing tables
- generic_saas is used only as an admin UI to manage that data
- You need to create metadata that **matches** the existing schema, not the other way around

---

## Flow Overview

1. **Inspect** the existing database schema (tables, columns, types)
2. **Create metadata** that describes each table (object.json, fields.json, listView, detailView)
3. **Add `name` column** if tables don't have one (see [Name Field](#name-field) below)
4. **Backfill** existing rows with `name` values
5. **Use triggers** to auto-populate `name` for new inserts (when not using autoNumber)
6. **Deploy** — run `db:deploy` only after metadata matches the existing schema

---

## Name Field (Required)

Every object in generic_saas must have a `name` field. The main app's tables may use different identifiers (`order_number`, `email`, `code`, etc.). You have two options:

### Option A: autoNumber

Use when a sequential ID fits (e.g. `ORD-0001`, `INV-00001`):

- Add `name` to metadata with `type: "autoNumber"`
- Set `editable: false`, `autoNumberPattern` (e.g. `ORD-{0000}`), `autoNumberStart`
- The platform generates values on insert; no trigger needed
- Add a `name` column to the table if it doesn't exist, then backfill existing rows

### Option B: Derived from Other Fields

Use when the main app uses `order_number`, `email`, `code`, or similar:

- Add `name` to metadata with `type: "string"`, `editable: false`
- Add a `name` column to the table if it doesn't exist
- **Backfill** existing rows with a script (see below)
- **Trigger** — use `beforeInsert` to populate `name` from other fields for new records

The required `name` check runs **after** the `beforeInsert` trigger, so the trigger can populate `name` when the client omits it.

---

## Backfill Script (Existing Data)

Run a one-time script to populate `name` for existing rows. Adapt to your table and source fields:

```sql
-- Example: orders table with order_number
UPDATE orders
SET name = COALESCE(order_number, CONCAT('ORD-', id))
WHERE name IS NULL OR name = '';

-- Example: customers with email
UPDATE customers
SET name = COALESCE(email, CONCAT('Customer-', id))
WHERE name IS NULL OR name = '';

-- Example: junction table (order_items) - use parent + line
UPDATE order_items oi
JOIN orders o ON oi.order_id = o.id
SET oi.name = CONCAT(o.order_number, '-L', oi.line_number)
WHERE oi.name IS NULL OR oi.name = '';
```

---

## Trigger: Auto-populate Name for New Inserts

Create `backend/triggers/{objectName}.ts` to populate `name` when the client doesn't send it:

```typescript
type Record = { [key: string]: unknown };

export function beforeInsert(
  _oldValue: Record | undefined,
  newValue: Record
): Record {
  // Populate name from other fields when missing
  if (!newValue.name || String(newValue.name).trim() === '') {
    newValue.name =
      newValue.order_number ??
      newValue.email ??
      newValue.code ??
      newValue.orderNumber ??
      `Record-${Date.now()}`;
  }
  return newValue;
}
```

Adjust the fallback chain to match your table's columns. Use camelCase for field keys (the API uses camelCase; the DB stores snake_case).

---

## Metadata Creation Checklist

For each existing table:

1. **object.json** — Use `tableName` if the table name differs from pluralized object name (e.g. `order` object → `orders` table)
2. **fields.json** — Include all columns you want to expose. **Must include `name`**
3. **fields/{key}.json** — Map each column to a field type. Use `toSnakeCase(fieldKey)` for column names (e.g. `orderNumber` → `order_number`)
4. **tenantScope** — Set only if the table has `organization_id` and/or `tenant_id`. If the main app doesn't use them, use `tenantScope: null` (platform-wide)
5. **System columns** — generic_saas expects `id`, `created_at`, `updated_at`, `created_by_id`, `owner_id`, `edited_by_id`. If the main app uses different names or omits some, you may need to add them or document the mismatch

---

## Deploy Cautions

`db:deploy` includes **sync-drops**, which removes tables/columns that are no longer in metadata. For back-office on shared DB:

- **Ensure metadata is complete** before running full deploy
- **Avoid removing objects** from metadata for tables the main app still uses — sync-drops would drop those tables
- Consider running deploy steps selectively (e.g. validate + generate, then manual migration review) if the DB is shared and changes are risky

---

## Table Name Override

If the main app uses a different table name, set `tableName` in `object.json`:

```json
{
  "name": "order",
  "label": "Order",
  "tableName": "orders",
  "apiEndpoint": "/api/orders",
  ...
}
```

---

## Reference

- [USAGE.md](./USAGE.md) — Main metadata guide (greenfield flow)
- [AGENT_BUILD_GUIDE.md](./AGENT_BUILD_GUIDE.md) — AI planning checklist
- [Triggers](./USAGE.md#triggers) — Trigger events and helpers
