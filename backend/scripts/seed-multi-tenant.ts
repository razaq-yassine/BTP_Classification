/**
 * Seeds org_and_tenant mode: one org, one tenant.
 * Admin is created by initDb before this runs. This script creates org/tenant only.
 * Run manually: pnpm run db:seed-multi-tenant
 * Or runs automatically on startup when tenant-config.json mode is org_and_tenant.
 */
import "dotenv/config";
import { db } from "../src/db/index.js";
import {
  organizations,
  tenants,
  users,
} from "../src/db/schema.js";
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
  console.log("[seed-multi-tenant] Done. Login: admin/admin123");
}

const isMain = process.argv[1]?.endsWith("seed-multi-tenant.ts") ?? false;
if (isMain) {
  seedMultiTenant()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[seed-multi-tenant]", err);
      process.exit(1);
    });
}
