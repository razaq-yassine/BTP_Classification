/**
 * Storage usage and limits API.
 * GET /api/storage/usage - Returns usedBytes and maxBytes for org/tenant scope.
 */
import { Hono } from "hono";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { files, organizations, tenants } from "../db/schema.js";
import { getUserProfile } from "../lib/permissions.js";
import { tenantConfig } from "./entity-registry.generated.js";

type UserWithTenant = {
  id?: number;
  profile?: string | null;
  organizationId?: number | null;
  tenantId?: number | null;
};

type StorageScope =
  | { isAll: true }
  | { organizationId: number; tenantId?: number };

async function getStorageScope(
  user: UserWithTenant | undefined,
  queryOrgId?: string | null,
  queryTenantId?: string | null
): Promise<StorageScope | null> {
  if (!user) return null;
  const isAdmin =
    user.profile === "admin" ||
    (user.organizationId == null && user.tenantId == null);

  if (isAdmin) {
    const orgId = queryOrgId ? Number(queryOrgId) : null;
    const tenantId = queryTenantId ? Number(queryTenantId) : null;
    if (orgId != null && !isNaN(orgId)) {
      return tenantId != null && !isNaN(tenantId)
        ? { organizationId: orgId, tenantId }
        : { organizationId: orgId };
    }
    return { isAll: true };
  }

  const mode = tenantConfig.mode as string;
  const hasTenants = ["single_tenant", "org_and_tenant"].includes(mode);

  if (user.tenantId != null && hasTenants) {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, user.tenantId));
    if (!tenant) return null;
    const [isOwner] = await db
      .select()
      .from(tenants)
      .where(
        and(eq(tenants.id, user.tenantId), eq(tenants.ownerId, user.id!))
      );
    if (!isOwner) return null;
    return {
      organizationId: tenant.organizationId,
      tenantId: user.tenantId
    };
  }

  if (user.organizationId != null) {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.organizationId));
    if (!org) return null;
    const [isOwner] = await db
      .select()
      .from(organizations)
      .where(
        and(
          eq(organizations.id, user.organizationId),
          eq(organizations.ownerId, user.id!)
        )
      );
    if (!isOwner) return null;
    return { organizationId: user.organizationId };
  }

  return null;
}

type Variables = { user: UserWithTenant };
export const storageRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /api/storage/usage/all - Platform-wide total storage (admin only).
 * Returns sum of all file sizes across the platform.
 */
storageRoutes.get("/usage/all", authMiddleware, async (c) => {
  const user = c.get("user") as UserWithTenant;
  const isAdmin =
    user?.profile === "admin" ||
    (user?.organizationId == null && user?.tenantId == null);
  if (!isAdmin) {
    return c.json({ message: "Forbidden" }, 403);
  }

  const [row] = await db
    .select({
      usedBytes: sql<number>`COALESCE(SUM(${files.size}), 0)`.as("used_bytes")
    })
    .from(files);

  return c.json({
    usedBytes: Number(row?.usedBytes ?? 0),
    maxBytes: null
  });
});

storageRoutes.get("/usage", authMiddleware, async (c) => {
  const user = c.get("user") as UserWithTenant;
  const profile = await getUserProfile(user?.id ?? 0);
  if (!profile) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const orgIdParam = c.req.query("organizationId");
  const tenantIdParam = c.req.query("tenantId");
  const scope = await getStorageScope(user, orgIdParam, tenantIdParam);
  if (!scope) {
    return c.json(
      { message: "organizationId (and optionally tenantId) required" },
      400
    );
  }

  if ("isAll" in scope && scope.isAll) {
    const [row] = await db
      .select({
        usedBytes: sql<number>`COALESCE(SUM(${files.size}), 0)`.as("used_bytes")
      })
      .from(files);
    return c.json({
      usedBytes: Number(row?.usedBytes ?? 0),
      maxBytes: null
    });
  }

  const orgScope = scope as { organizationId: number; tenantId?: number };
  const usageWhere =
    orgScope.tenantId != null
      ? and(
          eq(files.organizationId, orgScope.organizationId),
          eq(files.tenantId, orgScope.tenantId)
        )
      : eq(files.organizationId, orgScope.organizationId);

  const [usageRow] = await db
    .select({
      usedBytes: sql<number>`COALESCE(SUM(${files.size}), 0)`.as("used_bytes")
    })
    .from(files)
    .where(usageWhere);

  const usedBytes = Number(usageRow?.usedBytes ?? 0);

  let maxBytes: number | null = null;
  if (orgScope.tenantId != null) {
    const [tenant] = await db
      .select({ maxStorageBytes: tenants.maxStorageBytes })
      .from(tenants)
      .where(eq(tenants.id, orgScope.tenantId));
    const mb = tenant?.maxStorageBytes;
    if (mb != null && Number(mb) > 0) {
      maxBytes = Math.floor(Number(mb) * 1024 * 1024);
    }
  } else {
    const [org] = await db
      .select({ maxStorageBytes: organizations.maxStorageBytes })
      .from(organizations)
      .where(eq(organizations.id, orgScope.organizationId));
    const mb = org?.maxStorageBytes;
    if (mb != null && Number(mb) > 0) {
      maxBytes = Math.floor(Number(mb) * 1024 * 1024);
    }
  }

  return c.json({ usedBytes, maxBytes });
});
