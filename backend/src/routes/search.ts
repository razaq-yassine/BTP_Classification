import { Hono } from "hono";
import { eq, desc, like, or, and, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { organizations, tenants } from "../db/schema.js";
import {
  entityRegistry,
  tenantConfig,
  type EntityPath
} from "./entity-registry.generated.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  getUserProfile,
  hasObjectPermission,
  isFieldVisible
} from "../lib/permissions.js";

export const searchRoutes = new Hono();

searchRoutes.use("*", authMiddleware);

type UserWithTenant = {
  id?: number;
  profile?: string | null;
  organizationId?: number | null;
  tenantId?: number | null;
};

type EntityConfig = (typeof entityRegistry)[EntityPath];
type JoinConfig = {
  joinTable: { id: unknown };
  leftColumn: unknown;
  rightColumn: unknown;
};

function getTenantFilter(
  user: UserWithTenant | undefined,
  objectConfig: EntityConfig
): Record<string, number> | null {
  if (!user) return null;
  const mode = tenantConfig.mode;
  if (mode === "none") return null;
  const tenantScope = (objectConfig as { tenantScope?: string }).tenantScope;
  if (!tenantScope) return null;
  const isAdmin =
    user.profile === "admin" ||
    (user.organizationId == null && user.tenantId == null);
  if (isAdmin) return null;
  if (user.organizationId == null) return null;
  if (tenantScope === "tenant") return { organizationId: user.organizationId };
  if (tenantScope === "org_and_tenant") {
    if (user.tenantId != null) {
      return { organizationId: user.organizationId, tenantId: user.tenantId };
    }
    return { organizationId: user.organizationId };
  }
  return null;
}

function buildTenantConditions(
  table: { organizationId?: unknown; tenantId?: unknown },
  tenantFilter: Record<string, number> | null
): ReturnType<typeof eq>[] {
  if (!tenantFilter) return [];
  const conds: ReturnType<typeof eq>[] = [];
  if (tenantFilter.organizationId != null && "organizationId" in table) {
    conds.push(eq((table as any).organizationId, tenantFilter.organizationId));
  }
  if (tenantFilter.tenantId != null && "tenantId" in table) {
    conds.push(eq((table as any).tenantId, tenantFilter.tenantId));
  }
  return conds;
}

function getOrderColumn(table: {
  orderDate?: unknown;
  createdAt?: unknown;
  id?: unknown;
}) {
  return table.orderDate ?? table.createdAt ?? table.id;
}

function toRecord(
  row: Record<string, unknown>,
  joinedRow: Record<string, unknown> | null,
  config: EntityConfig,
  requestedFields: string[] | null,
  profile: Awaited<ReturnType<typeof getUserProfile>> = null
): Record<string, unknown> {
  const base = { ...row } as Record<string, unknown>;
  const objectName = config.objectName;
  const computedFields = config.computedFields;
  if (computedFields) {
    for (const cf of computedFields) {
      if (cf.expression === "concat") {
        const parts = (cf.sourceFields || []).map((f) => String(row[f] ?? ""));
        base[cf.key] = parts.join(cf.separator || " ").trim();
      }
      if (cf.expression === "join" && joinedRow) {
        const parts = (cf.sourceFields || []).map((f) =>
          String(joinedRow[f] ?? "")
        );
        base[cf.key] = parts.join(cf.separator || " ").trim() || null;
      }
    }
  }
  if ("join" in config && config.join && joinedRow) {
    const refKey = config.referenceFields?.[0]?.key;
    if (refKey) {
      base[refKey] =
        joinedRow.id != null ? { id: joinedRow.id, ...joinedRow } : null;
    }
  }

  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(base)) {
    if (key === "id") {
      filtered[key] = value;
      continue;
    }
    if (profile && objectName) {
      if (isFieldVisible(profile, objectName, key)) {
        filtered[key] = value;
      }
    } else {
      filtered[key] = value;
    }
  }

  if (requestedFields) {
    const out: Record<string, unknown> = {};
    for (const f of requestedFields) {
      const key = Object.keys(filtered).find(
        (k) => k.toLowerCase() === f.toLowerCase()
      );
      if (key && filtered[key] !== undefined) out[key] = filtered[key];
    }
    return out.id !== undefined ? out : filtered;
  }
  return filtered;
}

async function enrichWithTenantScope(
  record: Record<string, unknown>,
  config: EntityConfig
): Promise<Record<string, unknown>> {
  const tenantScope = (config as { tenantScope?: string }).tenantScope;
  if (!tenantScope || (tenantConfig as { mode: string }).mode === "none")
    return record;
  const out = { ...record };
  const orgId = record.organizationId as number | undefined;
  const tenantId = record.tenantId as number | undefined;
  if (orgId != null) {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId));
    out.organization = org ? { ...org } : null;
  }
  if (tenantId != null && tenantScope === "org_and_tenant") {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId));
    out.tenant = tenant ? { ...tenant } : null;
  }
  return out;
}

async function searchOneEntity(
  entityPath: EntityPath,
  config: EntityConfig,
  user: UserWithTenant | undefined,
  profile: Awaited<ReturnType<typeof getUserProfile>>,
  searchQuery: string,
  limit: number
): Promise<Record<string, unknown>[]> {
  const { table, objectName, searchFields } = config;
  if (!hasObjectPermission(profile, objectName, "read")) return [];
  if (!searchFields || (searchFields as unknown[]).length === 0) return [];

  const tenantFilter = getTenantFilter(user, config);
  let tenantConds = buildTenantConditions(table as any, tenantFilter);
  if (
    entityPath === "tenants" &&
    user?.organizationId != null &&
    user?.tenantId == null
  ) {
    tenantConds = [
      ...tenantConds,
      eq((table as any).organizationId, user.organizationId)
    ];
  }

  const orderCol = getOrderColumn(
    table as { orderDate?: unknown; createdAt?: unknown; id?: unknown }
  );
  const join = "join" in config ? (config.join as JoinConfig | undefined) : undefined;

  const searchCond = or(
    ...searchFields.map((f: any) => like(f, `%${searchQuery}%`))
  )!;
  const allConds = [...tenantConds, searchCond];
  const whereCond = and(...allConds);

  let rows: unknown[];

  if (join) {
    const j = join;
    const result = await db
      .select({ main: table, joined: j.joinTable as any })
      .from(table)
      .leftJoin(
        j.joinTable as any,
        eq(j.leftColumn as any, j.rightColumn as any)
      )
      .where(whereCond)
      .orderBy(desc(orderCol as any))
      .limit(limit);
    const s = searchQuery.toLowerCase();
    rows = (result as any[]).filter(
      (r: { main?: Record<string, unknown>; joined?: Record<string, unknown> }) =>
        Object.values(r.main || r).some((v) =>
          String(v ?? "").toLowerCase().includes(s)
        ) ||
        (r.joined &&
          Object.values(r.joined).some((v) =>
            String(v ?? "").toLowerCase().includes(s)
          ))
    );
  } else {
    rows = (await db
      .select()
      .from(table)
      .where(whereCond)
      .orderBy(desc(orderCol as any))
      .limit(limit)) as any;
  }

  const rawResult = Array.isArray(rows)
    ? (join
        ? (rows as Array<{ main?: Record<string, unknown>; joined?: Record<string, unknown> }>).map(
            (r) =>
              toRecord(
                r.main || (r as Record<string, unknown>),
                r.joined || null,
                config,
                null,
                profile
              )
          )
        : (rows as Record<string, unknown>[]).map((r) =>
            toRecord(r, null, config, null, profile)
          ))
    : [];

  return Promise.all(rawResult.map((r) => enrichWithTenantScope(r, config)));
}

async function fetchRecordsByIds(
  records: { objectName: string; recordId: string | number }[],
  user: UserWithTenant | undefined,
  profile: Awaited<ReturnType<typeof getUserProfile>>
): Promise<Record<string, Record<string, unknown>[]>> {
  const results: Record<string, Record<string, unknown>[]> = {};
  const byEntity = new Map<
    EntityPath,
    { config: EntityConfig; ids: number[]; indices: number[] }
  >();

  for (const entityPath of Object.keys(entityRegistry) as EntityPath[]) {
    const config = entityRegistry[entityPath];
    const objectName = config.objectName;
    if (!hasObjectPermission(profile, objectName, "read")) continue;

    const ids: number[] = [];
    const indices: number[] = [];
    records.forEach((r, i) => {
      if (r.objectName === objectName) {
        const id = Number(r.recordId);
        if (!Number.isNaN(id)) {
          ids.push(id);
          indices.push(i);
        }
      }
    });
    if (ids.length > 0) {
      byEntity.set(entityPath, { config, ids, indices });
    }
  }

  await Promise.all(
    Array.from(byEntity.entries()).map(async ([entityPath, { config, ids }]) => {
      const { table } = config;
      const idCol = (table as { id?: unknown }).id;
      const tenantFilter = getTenantFilter(user, config);
      let tenantConds = buildTenantConditions(table as any, tenantFilter);
      if (
        entityPath === "tenants" &&
        user?.organizationId != null &&
        user?.tenantId == null
      ) {
        tenantConds = [
          ...tenantConds,
          eq((table as any).organizationId, user.organizationId)
        ];
      }

      const orderCol = getOrderColumn(
        table as { orderDate?: unknown; createdAt?: unknown; id?: unknown }
      );
      const join =
        "join" in config ? (config.join as JoinConfig | undefined) : undefined;

      const idCond = inArray(idCol as any, ids);
      const whereCond =
        tenantConds.length > 0 ? and(idCond, ...tenantConds) : idCond;

      let rows: unknown[];

      if (join) {
        const j = join;
        const result = await db
          .select({ main: table, joined: j.joinTable as any })
          .from(table)
          .leftJoin(
            j.joinTable as any,
            eq(j.leftColumn as any, j.rightColumn as any)
          )
          .where(whereCond)
          .orderBy(desc(orderCol as any));
        rows = result as any;
      } else {
        rows = (await db
          .select()
          .from(table)
          .where(whereCond)
          .orderBy(desc(orderCol as any))) as any;
      }

      const rawResult = Array.isArray(rows)
        ? (join
            ? (
                rows as Array<{
                  main?: Record<string, unknown>;
                  joined?: Record<string, unknown>;
                }>
              ).map((r) =>
                toRecord(
                  r.main || (r as Record<string, unknown>),
                  r.joined || null,
                  config,
                  null,
                  profile
                )
              )
            : (rows as Record<string, unknown>[]).map((r) =>
                toRecord(r, null, config, null, profile)
              ))
        : [];

      const enriched = await Promise.all(
        rawResult.map((r) => enrichWithTenantScope(r, config))
      );

      results[entityPath] = enriched;
    })
  );

  return results;
}

searchRoutes.get("/", async (c) => {
  try {
    const user = (c.get as (k: string) => unknown)("user") as
      | UserWithTenant
      | undefined;
    if (!user?.id) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const profile = await getUserProfile(user.id);
    const q = c.req.query("q")?.trim();
    const limit = Math.min(20, Math.max(1, Number(c.req.query("limit")) || 5));
    const recent = c.req.query("recent") === "true";

    if (recent || !q) {
      return c.json({
        results: {},
        counts: {},
        total: 0
      });
    }

    const entityPaths = Object.keys(entityRegistry) as EntityPath[];
    const searchPromises = entityPaths.map(async (entityPath) => {
      const config = entityRegistry[entityPath];
      const results = await searchOneEntity(
        entityPath,
        config,
        user,
        profile,
        q,
        limit
      );
      return { entityPath, results };
    });

    const searchResults = await Promise.all(searchPromises);
    const results: Record<string, Record<string, unknown>[]> = {};
    const counts: Record<string, number> = {};
    let total = 0;

    for (const { entityPath, results: entityResults } of searchResults) {
      if (entityResults.length > 0) {
        results[entityPath] = entityResults;
        counts[entityPath] = entityResults.length;
        total += entityResults.length;
      }
    }

    return c.json({ results, counts, total });
  } catch (err) {
    console.error("Search error:", err);
    return c.json({ results: {}, counts: {}, total: 0 });
  }
});

searchRoutes.post("/recent", async (c) => {
  try {
    const user = (c.get as (k: string) => unknown)("user") as
      | UserWithTenant
      | undefined;
    if (!user?.id) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const profile = await getUserProfile(user.id);
    const body = (await c.req.json()) as {
      records?: { objectName: string; recordId: string | number }[];
    };
    const records = body?.records ?? [];
    const limit = Math.min(50, Math.max(1, records.length || 20));

    const limited = records.slice(0, limit);
    const results = await fetchRecordsByIds(limited, user, profile);

    const counts: Record<string, number> = {};
    let total = 0;
    for (const [entityPath, arr] of Object.entries(results)) {
      counts[entityPath] = arr.length;
      total += arr.length;
    }

    return c.json({ results, counts, total });
  } catch (err) {
    console.error("Recent records error:", err);
    return c.json({ results: {}, counts: {}, total: 0 });
  }
});
