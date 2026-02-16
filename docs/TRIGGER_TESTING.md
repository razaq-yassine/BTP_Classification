# Trigger Testing Scenario

Triggers run before/after create, update, and delete. Use this guide to verify they work.

## Setup

1. Ensure the backend is running: `cd backend && pnpm run dev`
2. A sample trigger exists at `backend/triggers/customer.ts` — it logs to the console and appends `[Triggered]` to the notes field on create.

## Test Scenario 1: beforeInsert / afterInsert

**Goal:** Verify triggers run when creating a customer.

**Steps:**

1. Log in as **admin** (or any user with customer create permission).
2. Create a new customer:
   - First name: `Trigger`
   - Last name: `Test`
   - Email: `trigger-test@example.com` (must be unique)
   - Notes: `Created via UI`
3. Save.

**Expected:**

- **Backend console** shows:
  ```
  [Trigger:customer] beforeInsert ...
  [Trigger:customer] afterInsert ...
  ```
- **Customer detail** shows Notes: `Created via UI [Triggered]` (trigger modified the payload).

---

## Test Scenario 2: beforeUpdate / afterUpdate

**Goal:** Verify triggers run when updating a customer.

**Steps:**

1. Open an existing customer (e.g. the one from Scenario 1).
2. Edit any field (e.g. change Notes to `Updated via UI`).
3. Save.

**Expected:**

- **Backend console** shows:
  ```
  [Trigger:customer] beforeUpdate { id: <number>, email: '...' }
  [Trigger:customer] afterUpdate { id: <number> }
  ```

---

## Test Scenario 3: beforeDelete / afterDelete

**Goal:** Verify triggers run when deleting a customer.

**Steps:**

1. Create a disposable customer (e.g. `delete-test@example.com`).
2. Delete that customer from the detail view or list.

**Expected:**

- **Backend console** shows:
  ```
  [Trigger:customer] beforeDelete { id: <number> }
  [Trigger:customer] afterDelete { id: <number> }
  ```

---

## Test Scenario 4: beforeInsert abort (optional)

**Goal:** Verify a trigger can abort create by throwing.

**Steps:**

1. Temporarily edit `backend/triggers/customer.ts`:
   ```ts
   export function beforeInsert(_oldValue: Record | undefined, newValue: Record): Record {
     if ((newValue.email as string)?.includes('block')) {
       throw new Error('Blocked by trigger: email contains "block"')
     }
     return newValue
   }
   ```
2. Create a customer with email `block-me@example.com`.
3. Save.

**Expected:** Request fails with 500; error message includes "Blocked by trigger".

4. Revert the trigger change when done.

---

## API Testing (curl)

If you prefer API over UI:

```bash
# Get auth token first (login)
TOKEN="<your-jwt-token>"

# Create customer (triggers beforeInsert, afterInsert)
curl -X POST http://localhost:8000/api/customers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"API","lastName":"Trigger","email":"api-trigger@example.com","notes":"From API","organizationId":1,"tenantId":1}'

# Update customer (triggers beforeUpdate, afterUpdate)
curl -X PUT http://localhost:8000/api/customers/<id> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"API","lastName":"Trigger","notes":"Updated from API",...}'

# Delete customer (triggers beforeDelete, afterDelete)
curl -X DELETE http://localhost:8000/api/customers/<id> \
  -H "Authorization: Bearer $TOKEN"
```

---

## Objects with triggers

| Object   | Trigger file                      | Notes                                      |
|----------|-----------------------------------|--------------------------------------------|
| customer | `backend/triggers/customer.ts`     | Sample trigger for testing                 |
| order    | `backend/triggers/order.ts`       | Add logic as needed                        |
| warehouse| `backend/triggers/warehouse.ts`    | Add if needed                              |

If a trigger file is missing, the backend silently skips (no error). Add `backend/triggers/{objectName}.ts` to enable.
