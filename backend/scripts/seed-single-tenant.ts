/**
 * Seeds single-tenant mode: one org, one tenant.
 * Run after db:deploy when tenant-config.json mode is single_tenant.
 *
 * Creates:
 * - 1 organization: Default Org
 * - 1 tenant: Default Tenant
 * - Assigns all existing users to that org/tenant (except admin)
 */
import "dotenv/config";
import { fileURLToPath } from "url";
import { db } from "../src/db/index.js";
import {
  organizations,
  tenants,
  users,
  customers,
  orders,
  orderitems,
  products,
} from "../src/db/schema.js";
import { seedNotificationSettings } from "./seed-notification-settings.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export async function seedSingleTenant() {
  const now = new Date();

  // 1. Create single organization
  const orgList = await db.select().from(organizations);
  let org = orgList[0];
  if (!org) {
    await db.insert(organizations).values({
      name: "Default Organization",
      slug: "default",
      createdAt: now,
      updatedAt: now,
    });
    const [inserted] = await db.select().from(organizations).where(eq(organizations.slug, "default"));
    org = inserted!;
    console.log("[seed-single-tenant] Created organization: Default Organization");
  }

  // 2. Create single tenant
  const tenantList = await db.select().from(tenants);
  let tenant = tenantList.find((t) => t.organizationId === org!.id) ?? tenantList[0];
  if (!tenant) {
    await db.insert(tenants).values({
      name: "Default Tenant",
      organizationId: org.id!,
      createdAt: now,
      updatedAt: now,
    });
    const [inserted] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.organizationId, org.id!));
    tenant = inserted!;
    console.log("[seed-single-tenant] Created tenant: Default Tenant");
  }

  // 3. Ensure admin exists (platform admin, no org/tenant)
  const userList = await db.select().from(users);
  if (userList.length === 0) {
    const hash = await bcrypt.hash("admin123", 10);
    await db.insert(users).values({
      username: "admin",
      email: "admin@example.com",
      passwordHash: hash,
      firstName: "Admin",
      lastName: "User",
      profile: "admin",
      isActive: true,
      dateJoined: now,
    });
    console.log("[seed-single-tenant] Created admin user: admin/admin123");
  } else {
    const [adminUser] = await db.select().from(users).where(eq(users.username, "admin"));
    if (adminUser) {
      await db
        .update(users)
        .set({ organizationId: null, tenantId: null, profile: "admin" })
        .where(eq(users.username, "admin"));
    }
  }

  // 4. Assign all non-admin users to the single org/tenant
  const allUsers = await db.select().from(users);
  const toUpdate = allUsers.filter(
    (u) => u.username !== "admin" && (u.organizationId !== org!.id || u.tenantId !== tenant!.id)
  );
  for (const u of toUpdate) {
    await db
      .update(users)
      .set({ organizationId: org!.id, tenantId: tenant!.id })
      .where(eq(users.id, u.id!));
  }
  if (toUpdate.length > 0) {
    console.log(`[seed-single-tenant] Assigned ${toUpdate.length} users to default org/tenant`);
  }

  // 5. Create test user if missing
  const [testUser] = await db.select().from(users).where(eq(users.username, "testuser"));
  if (!testUser) {
    const hash = await bcrypt.hash("test123", 10);
    await db.insert(users).values({
      username: "testuser",
      email: "testuser@example.com",
      passwordHash: hash,
      firstName: "Test",
      lastName: "User",
      profile: "tenant-user",
      isActive: true,
      dateJoined: now,
      organizationId: org.id,
      tenantId: tenant.id,
    });
    console.log("[seed-single-tenant] Created test user: testuser/test123");
  }

  // 6. Products (platform-wide)
  const productCount = await db.select().from(products);
  if (productCount.length === 0) {
    await db.insert(products).values([
      { name: "Widget Pro", sku: "SKU-001", price: "29.99", description: "Premium widget", createdAt: now, updatedAt: now },
      { name: "Gadget X", sku: "SKU-002", price: "49.99", description: "Advanced gadget", createdAt: now, updatedAt: now },
    ] as any);
    console.log("[seed-single-tenant] Created products");
  }

  // 7. Customers and orders (tenant-scoped) if empty
  const customerCount = await db.select().from(customers);
  if (customerCount.length === 0) {
    const prods = await db.select().from(products);
    await db.insert(customers).values({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phone: "+1234567890",
      company: "Acme",
      organizationId: org.id!,
      tenantId: tenant.id!,
      createdAt: now,
      updatedAt: now,
    });
    const [c1] = await db
      .select()
      .from(customers)
      .where(eq(customers.tenantId, tenant.id!));
    if (c1 && prods[0]) {
      await db.insert(orders).values({
        name: "ORD-001",
        status: "CONFIRMED",
        totalAmount: "99.99",
        description: "Sample order",
        orderDate: now,
        organizationId: org.id!,
        tenantId: tenant.id!,
        customerId: c1.id!,
        createdAt: now,
        updatedAt: now,
      } as any);
      const [o1] = await db.select().from(orders).where(eq(orders.tenantId, tenant.id!));
      if (o1) {
        await db.insert(orderitems).values({
          name: "OI-001",
          orderId: o1.id!,
          productId: prods[0].id!,
          quantity: "1",
          unitPrice: "99.99",
          organizationId: org.id!,
          tenantId: tenant.id!,
          createdAt: now,
          updatedAt: now,
        } as any);
      }
    }
    console.log("[seed-single-tenant] Created sample customer and order");
  }

  await seedNotificationSettings();

  console.log("[seed-single-tenant] Done. Users:");
  console.log("  admin / admin123 (platform admin)");
  console.log("  testuser / test123 (tenant user, default org/tenant)");
}

const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1]?.endsWith("seed-single-tenant.ts") ?? false;
if (isMain) {
  seedSingleTenant()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[seed-single-tenant]", err);
      process.exit(1);
    });
}
