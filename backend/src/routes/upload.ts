import { Hono } from "hono";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { eq, and, like } from "drizzle-orm";
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
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
  ".csv",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg"
]);

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg"
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

function getMimeType(filename: string): string {
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

export const uploadRoutes = new Hono();

uploadRoutes.use("*", authMiddleware);

uploadRoutes.post("/:objectName/:recordId/:fieldKey", async (c) => {
  try {
    const objectName = c.req.param("objectName");
    const recordIdParam = c.req.param("recordId");
    const fieldKey = c.req.param("fieldKey");

    if (!objectName || !recordIdParam || !fieldKey) {
      return c.json(
        { message: "objectName, recordId, and fieldKey are required" },
        400
      );
    }

    const isAttachments = fieldKey === "attachments";
    if (
      isAttachments &&
      (recordIdParam.startsWith("temp") || isNaN(Number(recordIdParam)))
    ) {
      return c.json(
        { message: "Save the record first to upload attachments" },
        400
      );
    }

    const recordId: number | string = isAttachments
      ? Number(recordIdParam)
      : recordIdParam;

    let body: Record<string, string | File>;
    try {
      body = await c.req.parseBody();
    } catch {
      return c.json({ message: "Invalid multipart body" }, 400);
    }

    const file = body["file"];
    if (!file || typeof file === "string") {
      return c.json({ message: "No file provided" }, 400);
    }

    const ext = path.extname(file.name).toLowerCase();
    const isLogoField =
      (objectName === "organization" || objectName === "tenant") &&
      fieldKey === "logo";
    const allowedSet = isLogoField ? IMAGE_EXTENSIONS : ALLOWED_EXTENSIONS;
    if (!allowedSet.has(ext)) {
      return c.json(
        {
          message: isLogoField
            ? `Logo must be an image. Allowed: ${[...IMAGE_EXTENSIONS].join(", ")}`
            : `File type not allowed. Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`
        },
        400
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return c.json(
        {
          message: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB`
        },
        400
      );
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

    if (!hasObjectPermission(profile, objName, "update")) {
      return c.json({ message: "Forbidden" }, 403);
    }

    let parentRecord: Record<string, unknown> | undefined;
    const isSavedRecord =
      !recordIdParam.startsWith("temp") && !isNaN(Number(recordIdParam));
    if (isSavedRecord) {
      const tenantFilter = getTenantFilter(user, tenantScope);
      const tenantConds = buildTenantConditions(table, tenantFilter);
      const idCol = (table as { id?: unknown }).id;
      const recordCond = eq(idCol as any, Number(recordIdParam));
      const whereCond =
        tenantConds.length > 0 ? and(recordCond, ...tenantConds) : recordCond;

      const [record] = await db.select().from(table).where(whereCond);
      if (!record) {
        return c.json({ message: "Record not found or access denied" }, 403);
      }
      parentRecord = record as Record<string, unknown>;
    }
    if (isAttachments && !parentRecord) {
      return c.json(
        { message: "Save the record first to upload attachments" },
        400
      );
    }

    const safeObject = objName.replace(/[^a-zA-Z0-9_-]/g, "");
    const safeRecord = String(recordId).replace(/[^a-zA-Z0-9_-]/g, "");
    const numericRecordId =
      typeof recordId === "number" ? recordId : Number(recordIdParam);
    const safeField = fieldKey.replace(/[^a-zA-Z0-9_-]/g, "");
    const safeName = sanitizeFilename(file.name);

    const dir = path.join(UPLOADS_DIR, safeObject, safeRecord, safeField);
    await mkdir(dir, { recursive: true });

    const uuid = isAttachments ? randomUUID() : "";
    const filename = isAttachments
      ? `${uuid}_${safeName}`
      : `${Date.now()}_${safeName}`;
    const filePath = path.join(dir, filename);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filePath, buffer);

    const relativePath = `/uploads/${safeObject}/${safeRecord}/${safeField}/${filename}`;

    if (parentRecord) {
      const isPublic =
        isAttachments &&
        (body["isPublic"] === "true" || body["isPublic"] === true);
      const orgId = parentRecord.organizationId as number | null | undefined;
      const tenantIdVal = parentRecord.tenantId as number | null | undefined;

      if (!isAttachments) {
        const pathPrefix = `/uploads/${safeObject}/${safeRecord}/${safeField}/`;
        await db
          .delete(files)
          .where(
            and(
              eq(files.objectName, safeObject),
              eq(files.recordId, numericRecordId),
              like(files.storagePath, pathPrefix + "%")
            )
          );
      }

      await db.insert(files).values({
        objectName: safeObject,
        recordId: numericRecordId,
        filename: file.name,
        storagePath: relativePath,
        mimeType: getMimeType(file.name),
        size: file.size,
        isPublic: !!isPublic,
        uploadedById: user?.id ?? null,
        uploadedAt: new Date(),
        organizationId: orgId ?? null,
        tenantId: tenantIdVal ?? null
      });

      const [inserted] = await db
        .select({ id: files.id })
        .from(files)
        .where(eq(files.storagePath, relativePath))
        .limit(1);
      const id = inserted?.id;

      if (isAttachments) {
        return c.json({
          id,
          path: relativePath,
          filename: file.name,
          isPublic: !!isPublic
        });
      }
      return c.json({ id, path: relativePath, filename: file.name });
    }

    return c.json({ path: relativePath, filename });
  } catch (err) {
    console.error("[upload] error:", err);
    return c.json({ message: (err as Error).message || "Upload failed" }, 500);
  }
});
