/**
 * Seeds org_and_tenant mode: one org, one tenant, admin only.
 * Run on startup when tenant-config.json mode is org_and_tenant.
 */
import "dotenv/config";
import { db } from "./index.js";
import {
  organizations,
  tenants,
  users,
} from "./schema.js";
import { seedNotificationSettings } from "./seed-notification-settings.js";
import { eq } from "drizzle-orm";

export async function seedMultiTenant() {
  const now = new Date();

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
    console.log("[seed-multi-tenant] Created organization: Default Organization");
  }

  const tenantList = await db.select().from(tenants);
  let tenant = tenantList.find((t) => t.organizationId === org!.id) ?? tenantList[0];
  if (!tenant) {
    await db.insert(tenants).values({
      name: "Default Tenant",
      organizationId: org.id!,
      createdAt: now,
      updatedAt: now,
    });
    const [inserted] = await db.select().from(tenants).where(eq(tenants.organizationId, org.id!));
    tenant = inserted!;
    console.log("[seed-multi-tenant] Created tenant: Default Tenant");
  }

  const [adminUser] = await db.select().from(users).where(eq(users.username, "admin"));
  if (adminUser && (adminUser.organizationId != null || adminUser.tenantId != null)) {
    await db.update(users).set({ organizationId: null, tenantId: null }).where(eq(users.username, "admin"));
    console.log("[seed-multi-tenant] Cleared admin org/tenant (platform admin)");
  }

  await seedNotificationSettings();
  console.log("[seed-multi-tenant] Done.");
}
