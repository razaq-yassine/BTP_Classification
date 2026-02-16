# Future Features / Backlog

Planned features not yet implemented. Use this doc when implementing them.

---

## Tenant edit for org users + cascade

**Status:** Disabled. Tenant field is read-only for all users (including org users) on edit.

**When re-enabling:**

1. **Metadata**: Add `editableForProfiles: ["org-user"]` to tenant field in `customer`, `order`, `orderitem` (`fields/tenant.json`).

2. **Backend** (`entities.ts` PUT handler): Allow `tenantId` in update payload when `profile?.name === 'org-user'`, validate new tenant belongs to user's org.

3. **Cascade** (required for data integrity):
   - **Order → Order items**: When an order's `tenantId` changes, update all `orderitems` for that order to the new `tenantId`. Otherwise order items stay in old tenant and data is inconsistent.
   - **Customer → Orders** (optional): Decide if changing customer's tenant should cascade to their orders. Depends on business rules (historical orders may stay in original tenant).

4. **References**: `.cursor/rules/tenant-multi-tenancy.mdc`, `.cursor/rules/profile-field-editability.mdc`, `docs/USAGE.md` (editableForProfiles).
