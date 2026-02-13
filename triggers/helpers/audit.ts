export function auditLog(
  objectName: string,
  oldRecord: Record<string, unknown>,
  newRecord: Record<string, unknown>
): void {
  // Placeholder for audit logging - implement when backend supports it
  console.log(`[Audit] ${objectName} changed:`, { oldRecord, newRecord })
}
