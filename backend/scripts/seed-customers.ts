/**
 * Seeds 35 customers for mass data testing.
 * Run: pnpm run db:seed-customers
 *
 * Idempotent: skips if 30+ customers already exist.
 */
import { db } from '../src/db/index.js'
import { customers } from '../src/db/schema.js'

const TARGET_COUNT = 35
const MIN_TO_SKIP = 30

function generateCustomers(count: number) {
  const now = new Date()
  const result = []
  const priorities = ['high', 'medium', 'low']
  const tags = ['vip', 'enterprise', 'startup', 'retail', null]

  for (let i = 1; i <= count; i++) {
    result.push({
      firstName: 'Customer',
      lastName: String(i),
      email: `customer${i}@test.com`,
      phone: `+1555000${String(i).padStart(3, '0')}`,
      company: `Company ${i}`,
      address: `${100 + i} Test Street, City ${i}`,
      notes: i % 3 === 0 ? `Notes for customer ${i}` : null,
      tags: tags[i % tags.length],
      priority: priorities[i % priorities.length],
      createdAt: now,
      updatedAt: now,
    })
  }
  return result
}

async function main() {
  const existing = await db.select().from(customers)
  if (existing.length >= MIN_TO_SKIP) {
    console.log(`Already have ${existing.length} customers (>= ${MIN_TO_SKIP}). Skipping seed.`)
    process.exit(0)
    return
  }

  const toInsert = TARGET_COUNT - existing.length
  const batch = generateCustomers(toInsert)

  // Insert in batches of 10
  const BATCH_SIZE = 10
  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    const chunk = batch.slice(i, i + BATCH_SIZE)
    await db.insert(customers).values(chunk)
    console.log(`Inserted ${chunk.length} customers (${i + chunk.length}/${toInsert})`)
  }

  const total = await db.select().from(customers)
  console.log(`Done. Total customers: ${total.length}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
