/**
 * Record history service - captures field-level changes on entity updates.
 */
import { db } from "../db/index.js";
import { recordHistory } from "../db/schema.js";

export type RecordHistoryInsert = {
  objectName: string;
  recordId: number;
  fieldKey: string;
  oldValue: string | null;
  newValue: string | null;
  changedById: number | null;
  organizationId: number | null;
  tenantId: number | null;
};

function stringifyValue(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

/**
 * Insert record history entries for changed fields.
 * Skips id, createdAt, updatedAt.
 */
export async function insertRecordHistory(
  objectName: string,
  recordId: number,
  oldRow: Record<string, unknown>,
  newRow: Record<string, unknown>,
  changedById: number | null,
  organizationId: number | null,
  tenantId: number | null,
  updateFields: readonly string[]
): Promise<void> {
  const skipFields = new Set(["id", "createdAt", "updatedAt"]);
  const entries: RecordHistoryInsert[] = [];

  for (const field of updateFields) {
    if (skipFields.has(field)) continue;
    const oldVal = oldRow[field];
    const newVal = newRow[field];
    if (oldVal === newVal) continue;
    entries.push({
      objectName,
      recordId,
      fieldKey: field,
      oldValue: stringifyValue(oldVal),
      newValue: stringifyValue(newVal),
      changedById,
      organizationId,
      tenantId
    });
  }

  if (entries.length === 0) return;

  const now = new Date();
  await db.insert(recordHistory).values(
    entries.map((e) => ({
      objectName: e.objectName,
      recordId: e.recordId,
      fieldKey: e.fieldKey,
      oldValue: e.oldValue,
      newValue: e.newValue,
      changedById: e.changedById,
      changedAt: now,
      organizationId: e.organizationId,
      tenantId: e.tenantId
    }))
  );
}

/**
 * Insert a single custom record history entry (e.g. "Dossier rouvert pour modification").
 */
export async function insertRecordHistoryEntry(entry: RecordHistoryInsert): Promise<void> {
  await db.insert(recordHistory).values({
    objectName: entry.objectName,
    recordId: entry.recordId,
    fieldKey: entry.fieldKey,
    oldValue: entry.oldValue,
    newValue: entry.newValue,
    changedById: entry.changedById,
    changedAt: new Date(),
    organizationId: entry.organizationId,
    tenantId: entry.tenantId
  });
}
