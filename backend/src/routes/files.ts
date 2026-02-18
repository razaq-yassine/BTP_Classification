import { Hono } from "hono";
import { stream } from "hono/streaming";
import { eq, and } from "drizzle-orm";
import { createReadStream, existsSync, unlink } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Readable } from "stream";
import { createMiddleware } from "hono/factory";
import { verifyToken } from "../lib/jwt.js";
import { users } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { files } from "../db/schema.js";
import {
  entityRegistry,
  tenantConfig,
  type EntityPath
} from "./entity-registry.generated.js";
import { getUserProfile, hasObjectPermission } from "../lib/permissions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.join(__dirname, "..", "..", "uploads");

function getMimeTypeFromFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml"
  };
  return mimeMap[ext] ?? "application/octet-stream";
}

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
  const mode = tenantConfig.mode;
  const hasOrgs =
    mode === "single_tenant" || mode === "multi_tenant" || mode === "org_and_tenant";
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

const optionalAuthMiddleware = createMiddleware(async (c, next) => {
  const auth = c.req.header("Authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    try {
      const { id } = await verifyToken(token);
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (user && user.isActive) {
        c.set("user", user);
      }
    } catch {
      // ignore
    }
  }
  await next();
});

function buildTenantConditions(
  table: { organizationId?: unknown; tenantId?: unknown },
  tenantFilter: Record<string, number> | null
) {
  if (!tenantFilter) return [];
  const conds = [];
  if (tenantFilter.organizationId != null && "organizationId" in table) {
    conds.push(eq((table as any).organizationId, tenantFilter.organizationId));
  }
  if (tenantFilter.tenantId != null && "tenantId" in table) {
    conds.push(eq((table as any).tenantId, tenantFilter.tenantId));
  }
  return conds;
}

export const fileRoutes = new Hono();

/**
 * Serve field-uploaded files (e.g. logo, file-type fields) with auth.
 * Path format: /uploads/{objectName}/{recordId}/{fieldKey}/{filename}
 * Replaces legacy static /uploads/* which had no protection.
 */
fileRoutes.get("/serve", authMiddleware, async (c) => {
  const pathParam = c.req.query("path");
  if (!pathParam || typeof pathParam !== "string") {
    return c.json({ message: "path query parameter is required" }, 400);
  }
  const normalizedPath = pathParam.startsWith("/") ? pathParam : `/${pathParam}`;
  if (!normalizedPath.startsWith("/uploads/")) {
    return c.json({ message: "Invalid path" }, 400);
  }
  const parts = normalizedPath.replace(/^\/uploads\//, "").split("/");
  if (parts.length < 4) {
    return c.json({ message: "Invalid path format" }, 400);
  }
  const [objectName, recordIdStr, fieldKey] = parts;
  const recordId = Number(recordIdStr);
  if (isNaN(recordId)) {
    return c.json({ message: "Invalid recordId" }, 400);
  }

  const entityEntry = Object.entries(entityRegistry).find(
    ([key, config]) =>
      config.objectName === objectName || key === objectName
  );
  if (!entityEntry) {
    return c.json({ message: "Unknown object" }, 400);
  }
  const [entityPath, config] = entityEntry as [
    EntityPath,
    (typeof entityRegistry)[EntityPath]
  ];
  const {
    table,
    objectName: objName,
    tenantScope
  } = config as { table: any; objectName: string; tenantScope?: string };

  const user = c.get("user") as UserWithTenant;
  const profile = await getUserProfile(user?.id ?? 0);
  if (!profile) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  if (!hasObjectPermission(profile, objName, "read")) {
    return c.json({ message: "Forbidden" }, 403);
  }

  const isAdmin =
    user?.profile === "admin" ||
    (user?.organizationId == null && user?.tenantId == null);

  const tenantFilter = getTenantFilter(user, tenantScope);
  let tenantConds = buildTenantConditions(table, tenantFilter);
  if (entityPath === "organizations" && !isAdmin && user?.organizationId != null) {
    tenantConds = [...tenantConds, eq((table as any).id, user.organizationId)];
  }
  if (entityPath === "tenants" && !isAdmin && user?.tenantId != null) {
    tenantConds = [...tenantConds, eq((table as any).id, user.tenantId)];
  }
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

  const idCol = (table as { id?: unknown }).id;
  const recordCond = eq(idCol as any, recordId);
  const whereCond =
    tenantConds.length > 0 ? and(recordCond, ...tenantConds) : recordCond;

  const [parentRecord] = await db.select().from(table).where(whereCond);
  if (!parentRecord) {
    return c.json({ message: "Record not found or access denied" }, 403);
  }

  const diskPath = path.join(UPLOADS_ROOT, normalizedPath.replace(/^\/uploads\//, ""));
  if (!existsSync(diskPath)) {
    return c.json({ message: "File not found" }, 404);
  }

  const filename = parts[parts.length - 1];
  const statResult = await stat(diskPath);
  const readStream = createReadStream(diskPath);
  const webStream = Readable.toWeb(readStream) as ReadableStream;
  return stream(
    c,
    async (s) => {
      await s.pipe(webStream);
    },
    undefined,
    {
      status: 200,
      headers: {
        "Content-Type": getMimeTypeFromFilename(filename),
        "Content-Length": String(statResult.size),
        "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`
      }
    }
  );
});

fileRoutes.get("/", authMiddleware, async (c) => {
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

    const user = c.get("user") as UserWithTenant;
    const profile = await getUserProfile(user?.id ?? 0);
    if (!profile) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const entityEntry = Object.entries(entityRegistry).find(
      ([key, config]) => config.objectName === objectName || key === objectName
    );
    if (!entityEntry) {
      return c.json({ message: `Unknown object: ${objectName}` }, 400);
    }
    const [, config] = entityEntry as [
      EntityPath,
      (typeof entityRegistry)[EntityPath]
    ];
    const {
      table,
      objectName: objName,
      tenantScope
    } = config as { table: any; objectName: string; tenantScope?: string };

    if (!hasObjectPermission(profile, objName, "read")) {
      return c.json({ message: "Forbidden" }, 403);
    }

    const tenantFilter = getTenantFilter(user, tenantScope);
    const tenantConds = buildTenantConditions(table, tenantFilter);
    const idCol = (table as { id?: unknown }).id;
    const recordCond = eq(idCol as any, recordIdNum);
    const whereCond =
      tenantConds.length > 0 ? and(recordCond, ...tenantConds) : recordCond;

    const [parentRecord] = await db.select().from(table).where(whereCond);
    if (!parentRecord) {
      return c.json({ message: "Record not found or access denied" }, 403);
    }

    const orgId = (parentRecord as Record<string, unknown>).organizationId as
      | number
      | null
      | undefined;
    const tenantIdVal = (parentRecord as Record<string, unknown>).tenantId as
      | number
      | null
      | undefined;

    for (const [key, val] of Object.entries(
      parentRecord as Record<string, unknown>
    )) {
      const pathStr = typeof val === "string" ? val.trim() : "";
      if (
        !pathStr ||
        (!pathStr.startsWith("/uploads/") && !pathStr.startsWith("uploads/"))
      )
        continue;
      const normalizedPath = pathStr.startsWith("/") ? pathStr : `/${pathStr}`;
      const diskPath = path.join(
        UPLOADS_ROOT,
        normalizedPath.replace(/^\/uploads\//, "")
      );
      if (!existsSync(diskPath)) continue;
      const [existing] = await db
        .select()
        .from(files)
        .where(eq(files.storagePath, normalizedPath))
        .limit(1);
      if (existing) continue;
      try {
        const statResult = await stat(diskPath);
        const filename = path.basename(normalizedPath);
        await db.insert(files).values({
          objectName: objName,
          recordId: recordIdNum,
          filename,
          storagePath: normalizedPath,
          mimeType: getMimeTypeFromFilename(filename),
          size: statResult.size,
          isPublic: false,
          uploadedById: null,
          uploadedAt: new Date(),
          organizationId: orgId ?? null,
          tenantId: tenantIdVal ?? null
        });
      } catch {
        // skip on error
      }
    }

    const rows = await db
      .select()
      .from(files)
      .where(
        and(eq(files.objectName, objName), eq(files.recordId, recordIdNum))
      );

    return c.json({ files: rows });
  } catch (err) {
    console.error("[files] GET list error:", err);
    return c.json(
      { message: (err as Error).message || "Internal server error" },
      500
    );
  }
});

fileRoutes.get("/download/:fileId", optionalAuthMiddleware, async (c) => {
  const fileId = c.req.param("fileId");
  const fileIdNum = Number(fileId);
  if (isNaN(fileIdNum)) {
    return c.json({ message: "Invalid fileId" }, 400);
  }

  const [fileRow] = await db
    .select()
    .from(files)
    .where(eq(files.id, fileIdNum));
  if (!fileRow) {
    return c.json({ message: "File not found" }, 404);
  }

  const filePath = path.join(
    UPLOADS_ROOT,
    fileRow.storagePath.replace(/^\/uploads\//, "")
  );
  if (!existsSync(filePath)) {
    return c.json({ message: "File not found on disk" }, 404);
  }

  if (fileRow.isPublic) {
    const statResult = await stat(filePath);
    const readStream = createReadStream(filePath);
    const webStream = Readable.toWeb(readStream) as ReadableStream;
    return stream(
      c,
      async (s) => {
        await s.pipe(webStream);
      },
      undefined,
      {
        status: 200,
        headers: {
          "Content-Type": fileRow.mimeType ?? "application/octet-stream",
          "Content-Length": String(statResult.size),
          "Content-Disposition": `inline; filename="${encodeURIComponent(
            fileRow.filename
          )}"`
        }
      }
    );
  }

  const user = c.get("user") as UserWithTenant | undefined;
  if (!user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const profile = await getUserProfile(user?.id ?? 0);
  if (!profile) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const entityEntry = Object.entries(entityRegistry).find(
    ([, config]) => config.objectName === fileRow.objectName
  );
  if (!entityEntry) {
    return c.json({ message: "Unknown object" }, 400);
  }
  const [, config] = entityEntry as [
    EntityPath,
    (typeof entityRegistry)[EntityPath]
  ];
  const {
    table,
    objectName: objName,
    tenantScope
  } = config as { table: any; objectName: string; tenantScope?: string };

  if (!hasObjectPermission(profile, objName, "read")) {
    return c.json({ message: "Forbidden" }, 403);
  }

  const tenantFilter = getTenantFilter(user, tenantScope);
  const tenantConds = buildTenantConditions(table, tenantFilter);
  const idCol = (table as { id?: unknown }).id;
  const recordCond = eq(idCol as any, fileRow.recordId);
  const whereCond =
    tenantConds.length > 0 ? and(recordCond, ...tenantConds) : recordCond;

  const [parentRecord] = await db.select().from(table).where(whereCond);
  if (!parentRecord) {
    return c.json({ message: "Record not found or access denied" }, 403);
  }

  const statResult = await stat(filePath);
  const readStream = createReadStream(filePath);
  const webStream = Readable.toWeb(readStream) as ReadableStream;
  return stream(
    c,
    async (s) => {
      await s.pipe(webStream);
    },
    undefined,
    {
      status: 200,
      headers: {
        "Content-Type": fileRow.mimeType ?? "application/octet-stream",
        "Content-Length": String(statResult.size),
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          fileRow.filename
        )}"`
      }
    }
  );
});

fileRoutes.patch("/:fileId", authMiddleware, async (c) => {
  const fileId = c.req.param("fileId");
  const fileIdNum = Number(fileId);
  if (isNaN(fileIdNum)) {
    return c.json({ message: "Invalid fileId" }, 400);
  }

  const [fileRow] = await db
    .select()
    .from(files)
    .where(eq(files.id, fileIdNum));
  if (!fileRow) {
    return c.json({ message: "File not found" }, 404);
  }

  const user = c.get("user") as UserWithTenant;
  const profile = await getUserProfile(user?.id ?? 0);
  if (!profile) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const entityEntry = Object.entries(entityRegistry).find(
    ([, config]) => config.objectName === fileRow.objectName
  );
  if (!entityEntry) {
    return c.json({ message: "Unknown object" }, 400);
  }
  const [, config] = entityEntry as [
    EntityPath,
    (typeof entityRegistry)[EntityPath]
  ];
  const {
    table,
    objectName: objName,
    tenantScope
  } = config as { table: any; objectName: string; tenantScope?: string };

  if (!hasObjectPermission(profile, objName, "update")) {
    return c.json({ message: "Forbidden" }, 403);
  }

  const tenantFilter = getTenantFilter(user, tenantScope);
  const tenantConds = buildTenantConditions(table, tenantFilter);
  const idCol = (table as { id?: unknown }).id;
  const recordCond = eq(idCol as any, fileRow.recordId);
  const whereCond =
    tenantConds.length > 0 ? and(recordCond, ...tenantConds) : recordCond;

  const [parentRecord] = await db.select().from(table).where(whereCond);
  if (!parentRecord) {
    return c.json({ message: "Record not found or access denied" }, 403);
  }

  let body: { isPublic?: boolean };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ message: "Invalid JSON body" }, 400);
  }

  if (typeof body.isPublic !== "boolean") {
    return c.json({ message: "isPublic must be a boolean" }, 400);
  }

  await db
    .update(files)
    .set({ isPublic: body.isPublic })
    .where(eq(files.id, fileIdNum));
  return c.json({ isPublic: body.isPublic });
});

fileRoutes.delete("/:fileId", authMiddleware, async (c) => {
  const fileId = c.req.param("fileId");
  const fileIdNum = Number(fileId);
  if (isNaN(fileIdNum)) {
    return c.json({ message: "Invalid fileId" }, 400);
  }

  const [fileRow] = await db
    .select()
    .from(files)
    .where(eq(files.id, fileIdNum));
  if (!fileRow) {
    return c.json({ message: "File not found" }, 404);
  }

  const user = c.get("user") as UserWithTenant;
  const profile = await getUserProfile(user?.id ?? 0);
  if (!profile) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const entityEntry = Object.entries(entityRegistry).find(
    ([, config]) => config.objectName === fileRow.objectName
  );
  if (!entityEntry) {
    return c.json({ message: "Unknown object" }, 400);
  }
  const [, config] = entityEntry as [
    EntityPath,
    (typeof entityRegistry)[EntityPath]
  ];
  const {
    table,
    objectName: objName,
    tenantScope
  } = config as { table: any; objectName: string; tenantScope?: string };

  if (!hasObjectPermission(profile, objName, "update")) {
    return c.json({ message: "Forbidden" }, 403);
  }

  const tenantFilter = getTenantFilter(user, tenantScope);
  const tenantConds = buildTenantConditions(table, tenantFilter);
  const idCol = (table as { id?: unknown }).id;
  const recordCond = eq(idCol as any, fileRow.recordId);
  const whereCond =
    tenantConds.length > 0 ? and(recordCond, ...tenantConds) : recordCond;

  const [parentRecord] = await db.select().from(table).where(whereCond);
  if (!parentRecord) {
    return c.json({ message: "Record not found or access denied" }, 403);
  }

  const filePath = path.join(
    UPLOADS_ROOT,
    fileRow.storagePath.replace(/^\/uploads\//, "")
  );
  if (existsSync(filePath)) {
    unlink(filePath, () => {});
  }

  await db.delete(files).where(eq(files.id, fileIdNum));
  return c.json({});
});
