/**
 * Order triggers. Add logic as needed. Use helpers/order.ts for object-specific logic.
 */
import { db } from "../src/db/index.js";
import { customers } from "../src/db/schema.js";
import { eq } from "drizzle-orm";
import { maybeSendNotification } from "./helpers/email.js";

type Record = { [key: string]: unknown }

export function beforeInsert(_oldValue: Record | undefined, newValue: Record): Record {
  return newValue
}

export async function afterInsert(_oldValue: Record | undefined, newValue: Record): Promise<void> {
  const customerId = newValue.customerId as number | undefined;
  let customer: Record<string, unknown> | null = null;
  if (customerId) {
    const [row] = await db.select().from(customers).where(eq(customers.id, customerId));
    if (row) customer = row as unknown as Record<string, unknown>;
  }
  await maybeSendNotification("order_created", newValue as Record<string, unknown>, {
    customer: customer ?? {},
  });
}

export function beforeUpdate(_oldValue: Record, newValue: Record): Record {
  return newValue
}

export function afterUpdate(_oldValue: Record, _newValue: Record): void {
  // audit
}

export function beforeDelete(_oldValue: Record): void {
  // throw if cannot delete
}

export function afterDelete(_oldValue: Record): void {
  // cleanup
}
