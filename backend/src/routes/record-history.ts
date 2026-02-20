import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { recordHistory } from "../db/schema.js";
import { users } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { entityRegistry, tenantConfig } from "./entity-registry.generated.js";
import { getUserProfile, hasObjectPermission } from "../lib/permissions.js";

type UserWithTenant = {
  id?: number;
  profile?: string | null;
  organizationId?: number | null;
  tenantId?: number | null;
};

function getTenantFilter(
  user: UserWithTenant | undefined,
  tenantScope: string | undefined
): Record<string, number> | null {
  if (!user) return null;
  const mode = tenantConfig.mode as string;
  const hasOrgs = ["single_tenant", "multi_tenant", "org_and_tenant"].includes(mode);
  if (!hasOrgs) return null;
  if (!tenantScope) return null;
  const isAdmin =
    user.profile === "admin" ||
    (user.organizationId == null && user.tenantId == null);
  if (isAdmin) return null;
  if (user.organizationId == null) return null;
  if (tenantScope === "tenant") return { organizationId: user.organizationId };
  if (tenantScope === "org_and_tenant") {
    if (user.tenantId != null)
      return { organizationId: user.organizationId!, tenantId: user.tenantId };
    return { organizationId: user.organizationId! };
  }
  return null;
}

type Variables = { user: UserWithTenant | undefined };
export const recordHistoryRoutes = new Hono<{ Variables: Variables }>();

recordHistoryRoutes.get("/", authMiddleware, async (c) => {
  try {
    const objectName = c.req.query("objectName");
    const recordId = c.req.query("recordId");

    if (!objectName || !recordId) {
      return c.json({ message: "objectName and recordId are required" }, 400);
    }

    const recordIdNum = Number(recordId);
    if (isNaN(recordIdNum)) {
      return c.json({ message: "Invalid recordId" }, 400);
    }

    const user = c.get("user") as UserWithTenant | undefined;
    const profile = user?.id ? await getUserProfile(user.id) : null;
    if (!hasObjectPermission(profile, objectName, "read")) {
      return c.json({ message: "Forbidden" }, 403);
    }

    const config = Object.values(entityRegistry).find(
      (c: { objectName?: string }) => c.objectName === objectName
    ) as { tenantScope?: string } | undefined;
    const tenantScope = config?.tenantScope;
    const tenantFilter = getTenantFilter(user, tenantScope);

    const conds = [
      eq(recordHistory.objectName, objectName),
      eq(recordHistory.recordId, recordIdNum)
    ];
    if (tenantFilter) {
      if (tenantFilter.organizationId != null) {
        conds.push(
          eq(recordHistory.organizationId, tenantFilter.organizationId)
        );
      }
      if (tenantFilter.tenantId != null) {
        conds.push(eq(recordHistory.tenantId, tenantFilter.tenantId));
      }
    }

    const rows = await db
      .select({
        id: recordHistory.id,
        objectName: recordHistory.objectName,
        recordId: recordHistory.recordId,
        fieldKey: recordHistory.fieldKey,
        oldValue: recordHistory.oldValue,
        newValue: recordHistory.newValue,
        changedById: recordHistory.changedById,
        changedAt: recordHistory.changedAt
      })
      .from(recordHistory)
      .where(and(...conds))
      .orderBy(desc(recordHistory.changedAt))
      .limit(100);

    const changedByIds = [
      ...new Set(rows.map((r) => r.changedById).filter(Boolean))
    ] as number[];
    const usersMap = new Map<
      number,
      {
        username?: string | null;
        firstName?: string | null;
        lastName?: string | null;
      }
    >();
    for (const uid of changedByIds) {
      const [u] = await db
        .select({
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName
        })
        .from(users)
        .where(eq(users.id, uid));
      if (u)
        usersMap.set(uid, {
          username: u.username,
          firstName: u.firstName,
          lastName: u.lastName
        });
    }

    const entries = rows.map((r) => {
      const u = r.changedById ? usersMap.get(r.changedById) : null;
      const changedByLabel =
        u?.firstName && u?.lastName
          ? `${u.firstName} ${u.lastName}`
          : u?.username ?? (r.changedById ? `User #${r.changedById}` : null);
      return {
        id: r.id,
        objectName: r.objectName,
        recordId: r.recordId,
        fieldKey: r.fieldKey,
        oldValue: r.oldValue,
        newValue: r.newValue,
        changedById: r.changedById,
        changedBy: changedByLabel,
        changedAt: r.changedAt
      };
    });

    return c.json({ entries });
  } catch (err) {
    console.error("[record-history] GET error:", err);
    return c.json(
      { message: (err as Error).message || "Internal server error" },
      500
    );
  }
});
