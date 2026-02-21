/**
 * Seeds single-tenant mode: one org, one tenant, admin only.
 * Run manually: pnpm run db:seed-single-tenant
 * Or runs automatically on startup when tenant-config.json mode is single_tenant.
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
import bcrypt from "bcrypt";

export async function seedSingleTenant() {
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
    console.log("[seed-single-tenant] Created organization: Default Organization");
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
    console.log("[seed-single-tenant] Created tenant: Default Tenant");
  }

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
      await db.update(users).set({ organizationId: null, tenantId: null, profile: "admin" }).where(eq(users.username, "admin"));
    }
  }

  await seedNotificationSettings();
  console.log("[seed-single-tenant] Done. Login: admin/admin123");
}

const isMain = process.argv[1]?.endsWith("seed-single-tenant.ts") ?? false;
if (isMain) {
  seedSingleTenant()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[seed-single-tenant]", err);
      process.exit(1);
    });
}
