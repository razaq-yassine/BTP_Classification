/**
 * Storage limit enforcement service.
 * Use this for any file upload or generation to ensure we don't exceed org/tenant limits.
 * Call checkStorageLimit BEFORE writing the file to disk or inserting into DB.
 */
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { files, organizations, tenants } from "../db/schema.js";

export interface StorageCheckResult {
  allowed: boolean;
  usedBytes: number;
  maxBytes: number | null;
  message?: string;
}

const STORAGE_LIMIT_EXCEEDED_MESSAGE =
  "Storage limit exceeded. Please increase your storage limit or contact your administrator.";

/**
 * Check if adding a file of the given size would exceed the storage limit.
 * Call this BEFORE writing the file or inserting into the database.
 *
 * @param organizationId - Required. The organization scope.
 * @param tenantId - Optional. If provided, uses tenant's limit; otherwise org's limit.
 * @param sizeToAdd - Size in bytes of the file to add.
 * @param sizeToRemove - Optional. Size in bytes of files being replaced/removed (e.g. when replacing a logo).
 */
export async function checkStorageLimit(
  organizationId: number,
  tenantId: number | null | undefined,
  sizeToAdd: number,
  sizeToRemove: number = 0
): Promise<StorageCheckResult> {
  // Org limit: sum all files in org. Tenant limit: sum files for that tenant only.
  const usageWhere =
    tenantId != null
      ? and(
          eq(files.organizationId, organizationId),
          eq(files.tenantId, tenantId)
        )
      : eq(files.organizationId, organizationId);

  const [usageRow] = await db
    .select({
      usedBytes: sql<number>`COALESCE(SUM(${files.size}), 0)`.as("used_bytes")
    })
    .from(files)
    .where(usageWhere);

  const usedBytes = Number(usageRow?.usedBytes ?? 0);
  let maxBytes: number | null = null;

  if (tenantId != null) {
    const [tenant] = await db
      .select({ maxStorageBytes: tenants.maxStorageBytes })
      .from(tenants)
      .where(eq(tenants.id, tenantId));
    const mb = tenant?.maxStorageBytes;
    if (mb != null && Number(mb) > 0) {
      maxBytes = Math.floor(Number(mb) * 1024 * 1024);
    }
  }
  if (maxBytes == null) {
    const [org] = await db
      .select({ maxStorageBytes: organizations.maxStorageBytes })
      .from(organizations)
      .where(eq(organizations.id, organizationId));
    const mb = org?.maxStorageBytes;
    if (mb != null && Number(mb) > 0) {
      maxBytes = Math.floor(Number(mb) * 1024 * 1024);
    }
  }

  // No limit set = unlimited
  if (maxBytes == null) {
    return { allowed: true, usedBytes, maxBytes: null };
  }

  const effectiveUsed = usedBytes - sizeToRemove;
  const newTotal = effectiveUsed + sizeToAdd;

  if (newTotal > maxBytes) {
    return {
      allowed: false,
      usedBytes: effectiveUsed,
      maxBytes,
      message: STORAGE_LIMIT_EXCEEDED_MESSAGE
    };
  }

  return { allowed: true, usedBytes: effectiveUsed, maxBytes };
}
