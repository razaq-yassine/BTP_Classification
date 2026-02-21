# AI Agent Build Guide

**Before any implementation**, the agent must:

1. **Read `docs/USAGE.md`** in full
2. **Answer and confirm** all planning questions below with the user
3. **Only then** proceed to implementation

---

## Planning Checklist (Answer Before Building)

### 1. Multi-tenancy mode

- Is this a **single tenant** (one org/tenant, platform-wide data), **multi-tenant** (multiple tenants, no org hierarchy), or **org and tenant** (orgs with child tenants)?
- Set `metadata/tenant-config.json` → `mode`: `single_tenant`, `multi_tenant`, or `org_and_tenant`

### 2. Naming: Organization and Tenant

- What should we call the **organization** in the UI? (e.g. "Delivery Company", "Franchise", "Brand")
- What should we call the **tenant** in the UI? (e.g. "Branch", "Store", "Customer", "Seller")
- Update labels in `metadata/system/organization/` and `metadata/system/tenant/` (or system-extensions) so the UI reflects domain terms

### 3. Data models (objects)

- List all **business objects** needed (e.g. Order, Customer, Product, Invoice)
- For each object, decide:
  - `tenantScope`: `null` (platform-wide), `"tenant"`, or `"org_and_tenant"` — must match `tenant-config.json` mode
  - Relationships: reference vs master-detail (parent-child)
  - Which fields, types, required/optional
- Order of creation: create parent objects before children; references must point to existing objects

### 4. Profiles

- How many **profiles** (roles) do we need? Base has admin and standard-user; add more in the business project (e.g. manager, viewer, sales-rep)
- For each profile:
  - Object permissions: create, read, update, delete, list per object
  - Field permissions (optional): restrict which fields are visible/editable
  - Global action permissions: export, quick-create, etc.
  - Sidebar: which sidebar config (or default)
- Admin profile always has full access; ensure at least one admin user exists

### 5. List views per object

- How many **list views** per object? (e.g. "All Orders", "My Orders", "Open Orders")
- For each view:
  - Fields to show
  - Default sort and sort order
  - Filters (e.g. `status: "OPEN"`, `assignedTo: "$currentUser"`)
  - Statistics (count, sum, avg, etc.)
  - **Profiles**: which profiles can see this view? Use `profiles` array; omit = visible to all who can read the object

### 6. Detail view layout and configuration

- **Layout**: `single-column`, `two-column`, or `tabs` — choose per object (e.g. tabs for multi-step workflows)
- **Sections**: Group fields into sections (e.g. "Basic Information", "Company", "System"); decide columns (1 or 2) and `defaultOpen` (expanded vs collapsed)
- **Header calculated data**: Which compact/calculated values in the header? Options: `daysSince` (e.g. Account Age), `fallback`, `currency` — configure in `header.json` → `calculatedData`
- **Header actions**: Primary/secondary actions (edit, delete, mailto, tel); which fields drive mailto/tel (`targetField`)
- **Formula fields**: Which fields use `formulaExpression`? (e.g. `quantity * price`, `daysSince(orderDate)`, `currency(totalAmount)`) — stored in `fields/`, not in DB
- **Computed fields**: Which use `computedExpression`? (`concat`, `join`, `lookup` with `sourceFields`) — no DB column
- **Field render types**: Which fields use `currency`, `statusBadge`, `booleanBadge`, `percent`? Select options: add `color`, `colorHover` for status badges
- **Date format**: `format` for date fields (e.g. `MMM dd, yyyy`)
- **Path**: Which select fields use `useInPath` to drive the detail breadcrumb? (e.g. Order status)
- **Related objects**: Which objects show related tables on detail? Columns, sort, permissions (create/read/update/delete) per related table
- **Side section**: Use built-in History and Files tabs; add custom tabs (e.g. Activity, Notes) if needed

### 7. Create form defaults and validation

- **Default values**: `defaultValue` for selects, booleans, etc.
- **Auto-number**: For `name` field — `autoNumberPattern` (e.g. `OP-{0000}`), `autoNumberStart` when needed
- **Validation**: Required fields, `maxLength` for text, reference constraints

### 8. App config

- **Default currency**: `defaultCurrency`, `currencySymbol` in `app-config.json`
- **Tenant/org inheritance**: Currency, timezone, language — which levels override (tenant vs org vs app)

### 9. Reports

- Do we need **reports**? (aggregations, charts, saved filters)
- If yes:
  - What reports? (e.g. Sales by Month, Orders by Status, Top Customers)
  - Where do they live? (Dashboard tabs, dedicated Reports section, or both)
  - Who can see each report? (profile-based)

### 10. Other features

- **Triggers**: Any before/after insert/update/delete logic? (e.g. auto-number, email on status change)
- **Notification events**: Which events send emails? Add to `metadata/notification-events.json`, wire in triggers
- **Global actions**: Quick-create buttons, Export, Sync — who gets them?
- **File attachments**: Which objects support attachments?

### 11. Dashboard

- Use **tabs** in `metadata/dashboards/{profileName}.json` for multiple reports/dashboards per profile
- For each profile that needs a custom dashboard:
  - Define `tabs` array: `{ key, label, default? }`
  - Example: Overview, Analytics, Reports, Notifications
- Specify which **reports** go in which tab and for which profile
- When no dashboard metadata exists for a profile, default tabs are used

### 12. Sidebar

- Which objects appear in the sidebar? (`object.json` → `sidebar.showInSidebar`, `group`, `parent`)
- Group structure: e.g. "Catalog" (Products, Categories), "Sales" (Orders, Invoices)
- Per-profile sidebar: assign `sidebar` in `metadata/profiles/{name}.json` if different from default

### 13. Translations (last step)

- Translate everything to **all available locales** in `metadata/translations/{locale}/`
- Namespaces: `common.json`, `navigation.json`, `objects.json`, `settings.json`, `errors.json`
- For new objects: add `objects.{objectName}.label`, `objects.{objectName}.labelPlural`, `objects.{objectName}.fields.{fieldKey}` for each locale
- Run `pnpm run translation-report` to find missing keys

### 14. Custom buttons per object

- For each object, decide which **header actions** to add (`header.json` → `primaryActions`, `secondaryActions`):
  - Built-in: `edit`, `delete`, `mailto`, `tel` (with `targetField` for email/phone)
  - Custom actions: require handlers in `action-registry.ts` or component wiring (e.g. "Mark as Shipped", "Send Invoice", "Duplicate", "Create from template")
- Per-object examples:
  - **Order**: Mark as Shipped, Send Invoice, Duplicate Order, Cancel
  - **Customer**: Create Order, Send Welcome Email, Merge
  - **Invoice**: Send, Mark Paid, Download PDF
  - **Product**: Duplicate, Copy to Catalog
- Which profiles see which buttons? (tied to object permissions or custom checks)
- Add custom action types to `action-registry.ts` and wire in `GenericObjectDetailViewMainSection` or header renderer

### 15. Useful tools and custom interfaces

- **Detail view side section**: Beyond History and Files — add custom tabs (e.g. Activity feed, Notes, Map, Document preview, Timeline)
- **Embedded tools**: Map viewer (for address fields), PDF preview, image gallery, calendar for date ranges
- **Bulk actions**: List view — select multiple records, run action (e.g. Bulk status change, Bulk assign, Bulk export)
- **Quick links**: External integrations (e.g. "Open in Google Maps", "View in CRM", "Sync to accounting")
- **Data tools**: Import wizard, template download, mass update — who can use them, which objects
- **Custom widgets**: Inline calculators, status workflows, approval flows — add to detail sections or side tabs
- Extend `GenericObjectDetailViewSideSection.tsx` for custom tabs; add route/API for custom tools

---

## Implementation order

1. Set `tenant-config.json` mode
2. Update org/tenant labels if needed
3. Create objects (metadata + `db:deploy`)
4. Create profiles and assign permissions
5. Configure list views (including profile-specific views)
6. Configure detail views (layout, sections, header, formula/computed fields, related objects)
7. Set create form defaults, validation, app config
8. Add triggers, notification events, related objects
9. Configure global actions and sidebar
10. Add custom buttons per object (header actions)
11. Add useful tools and custom interfaces (side tabs, embedded widgets, bulk actions)
12. Build dashboard tabs and reports per profile
13. Translate to all locales
