# Multi-Org, Multi-Tenant Testing Guide

This guide explains how to test the multi-tenant feature and what to expect in each scenario.

## Setup

The project is configured for `org_and_tenant` mode with:

- **tenant-config.json**: `{"mode":"org_and_tenant"}`
- **Tenant-scoped objects**: customer, order, orderitem (each has `organizationId` and `tenantId`)
- **Platform-wide objects**: product, category, supplier, warehouse (no tenant scope)

## Test Data (after seeding)

### Organizations

| Organization | Slug | Tenants |
|--------------|------|---------|
| Acme Corp | acme | Acme US, Acme EU |
| TechStart | techstart | TechStart US, TechStart UK |

### Test Users

| Username | Password | Org | Tenant | Profile | Scope |
|----------|----------|-----|--------|---------|-------|
| admin | admin123 | — | — | admin | All data |
| acme-org-user | acme123 | Acme Corp | — | org-user | All Acme tenants (US + EU) |
| acme-us-user | acme123 | Acme Corp | Acme US | tenant-user | Acme US only |
| acme-eu-user | acme123 | Acme Corp | Acme EU | tenant-user | Acme EU only |
| tech-org-user | tech123 | TechStart | — | org-user | All TechStart tenants (US + UK) |
| tech-us-user | tech123 | TechStart | TechStart US | tenant-user | TechStart US only |

### Customers & Orders (per tenant)

- **Acme US**: 2 customers (John Doe, Jane Smith), 1 order (ORD-A1-001) with 1 order item
- **Acme EU**: 1 customer (Bob Johnson), 1 order (ORD-A2-001)
- **TechStart US**: 1 customer (Charlie Brown), 1 order (ORD-T1-001)

### Products (platform-wide)

- Widget Pro, Gadget X, Tool Kit

---

## How to Run the Seed

1. Ensure `tenant-config.json` has `"mode":"org_and_tenant"`.
2. Run `db:deploy` (if not already done):
   ```bash
   cd backend && pnpm run db:deploy
   ```
3. Run the multi-tenant seed:
   ```bash
   cd backend && pnpm run db:seed-multi-tenant
   ```

Or start the backend—`initDb` will run the seed automatically on startup when in tenant mode.

---

## Testing Scenarios

### Scenario 1: Admin (Platform Admin)

**Login:** `admin` / `admin123`

**Expected behavior:**
- Sees **Organizations** and **Tenants** in the sidebar (system objects).
- Can list all organizations and tenants.
- Can create/edit/delete organizations and tenants.
- **Customers list**: Sees all customers from all tenants (no filter).
- **Orders list**: Sees all orders from all tenants.
- **Create customer/order**: Must provide `organizationId` and `tenantId` in the form (or API).
- **Reference field lookups**: Customer dropdown on orders shows all customers (no tenant filter).

---

### Scenario 2: Tenant User (acme-us-user)

**Login:** `acme-us-user` / `acme123`

**Expected behavior:**
- Sees **Organizations** and **Tenants** in the sidebar.
- **Customers list**: Sees only customers in **Acme US** tenant.
- **Orders list**: Sees only orders in **Acme US** tenant.
- **Create customer**: Creates in Acme US automatically; `organizationId` and `tenantId` are set from the user.
- **Create order**: Same; customer lookup shows only Acme US customers.
- **Cannot** see or access customers/orders from Acme EU or TechStart.

---

### Scenario 3: Tenant User (acme-eu-user)

**Login:** `acme-eu-user` / `acme123`

**Expected behavior:**
- **Customers list**: Sees only customers in **Acme EU** tenant.
- **Orders list**: Sees only orders in **Acme EU** tenant.
- **Create customer/order**: Creates in Acme EU; customer lookup shows only Acme EU customers.
- **Cannot** see Acme US or TechStart data.

---

### Scenario 4: Tenant User (tech-us-user)

**Login:** `tech-us-user` / `tech123`

**Expected behavior:**
- **Customers list**: Sees only customers in **TechStart US** tenant.
- **Orders list**: Sees only orders in **TechStart US** tenant.
- **Create customer/order**: Creates in TechStart US; customer lookup shows only TechStart US customers.
- **Cannot** see Acme Corp or TechStart UK data.

---

### Scenario 4b: Organization User (acme-org-user)

**Login:** `acme-org-user` / `acme123`

**Expected behavior:**
- **Customers list**: Sees customers from **both Acme US and Acme EU** tenants.
- **Orders list**: Sees orders from both Acme US and Acme EU.
- **Create customer/order**: Must select which tenant (Acme US or Acme EU) to create in.
- **Edit customer/order**: Tenant field is read-only (cannot reassign to another tenant).
- **Cannot** see TechStart data.

---

### Scenario 5: Organization & Tenant Management

**Login:** `admin`

**Expected behavior:**
- **Organizations** (`/organizations`): List all orgs; create Acme Corp, TechStart, etc.
- **Tenants** (`/tenants`): List all tenants; create Acme US, Acme EU under Acme Corp.
- **Tenant detail**: Shows organization reference; tenant-scoped data (e.g. orders) filtered by tenant.

---

### Scenario 6: Products (Platform-Wide)

**Login:** Any user (admin or tenant user)

**Expected behavior:**
- **Products list**: All users see the same products (Widget Pro, Gadget X, Tool Kit).
- **Create order item**: Product lookup shows all products (no tenant filter).
- Products are shared across all tenants.

---

### Scenario 7: API Direct Access

**Admin:**
- `GET /api/customers` → all customers
- `POST /api/customers` → must include `organizationId` and `tenantId`

**Tenant user (acme-us-user):**
- `GET /api/customers` → only Acme US customers (filtered by user's org/tenant)
- `POST /api/customers` → `organizationId` and `tenantId` set from user; client values ignored

---

## Expected Behavior by Scenario (Summary Table)

| Scenario | Sidebar | Customer List | Order List | Customer Detail | Create Customer | Reference Lookups |
|----------|---------|---------------|------------|-----------------|-----------------|------------------|
| **1. Admin** | Organizations, Tenants, all objects | All customers | All orders | Org & Tenant shown | Must provide org + tenant | All records |
| **2. acme-us-user** | Organizations, Tenants, all objects | Acme US only | Acme US only | Org & Tenant shown | Auto-set to Acme US | Acme US only |
| **3. acme-eu-user** | Same | Acme EU only | Acme EU only | Org & Tenant shown | Auto-set to Acme EU | Acme EU only |
| **4. tech-us-user** | Same | TechStart US only | TechStart US only | Org & Tenant shown | Auto-set to TechStart US | TechStart US only |
| **5. Org/Tenant Mgmt** | Admin only | — | — | Tenant detail shows org | — | — |
| **6. Products** | All users | — | — | Platform-wide | — | All products |
| **7. API** | — | Admin: all; Tenant: filtered | Same | Org & Tenant in response | Admin: required; Tenant: auto | Same as UI |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No Organizations/Tenants in sidebar | Ensure `tenant-config.json` has `"mode":"org_and_tenant"` and `showInSidebar: true` in metadata/system/organization and tenant object.json |
| Tenant user sees all data | Check user has `organizationId` and `tenantId` in the database |
| Admin sees no data | Admin has no org/tenant; list endpoints return all for admin |
| Seed says "already exist" | Run `db:seed-multi-tenant` once; it skips if Acme and TechStart exist |
| Migration fails | Ensure DB is clean or use migrations from `backend/drizzle/` |
