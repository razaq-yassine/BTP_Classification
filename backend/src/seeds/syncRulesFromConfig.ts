/**
 * Sync classification rules from JSON config to DB.
 * Upserts by (sector, classe, method); deletes records no longer in config.
 * Run: pnpm run sync:rules
 */
import 'dotenv/config'
import { db } from '../db/index.js'
import { classificationRules } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { buildRulesFromConfig } from '../engine/classificationEngine.js'

export async function syncRulesFromConfig(): Promise<void> {
  const flatRules = buildRulesFromConfig()
  const now = new Date()
  const key = (r: { sector: string; classe: string; method: string }) =>
    `${r.sector}|${r.classe}|${r.method}`

  const configKeys = new Set(flatRules.map((r) => key(r)))
  const existing = await db.select().from(classificationRules)

  let inserted = 0
  let updated = 0

  for (const r of flatRules) {
    const k = key(r)
    const match = existing.find(
      (e) =>
        String(e.sector) === r.sector &&
        String(e.classe) === r.classe &&
        String(e.method) === r.method
    )

    const row = {
      sector: r.sector,
      classe: r.classe,
      method: r.method,
      minCa: String(r.minCa),
      minCapitalSocial: r.minCapitalSocial != null ? String(r.minCapitalSocial) : null,
      minEngineers: String(r.minEngineers),
      minTechnicians: String(r.minTechnicians),
      minEncadrementScore: String(r.minEncadrementScore),
      masseSalarialeRatio: String(r.masseSalarialeRatio),
      isActive: true,
      updatedAt: now,
    }

    if (match) {
      await db
        .update(classificationRules)
        .set({ ...row, updatedAt: now })
        .where(eq(classificationRules.id, match.id!))
      updated++
    } else {
      const name = `CONFIG-${r.sector}-${r.classe}-${r.method}`
      await db.insert(classificationRules).values({
        ...row,
        name,
        createdAt: now,
        updatedAt: now,
      })
      inserted++
    }
  }

  const toDelete = existing.filter((e) => !configKeys.has(key(e)))
  for (const r of toDelete) {
    await db.delete(classificationRules).where(eq(classificationRules.id, r.id!))
  }
  const deleted = toDelete.length

  const total = inserted + updated
  console.log(
    `✅ Synced ${total} rules from config (${inserted} inserted, ${updated} updated, ${deleted} deleted)`
  )
}

if (process.argv[1]?.includes('syncRulesFromConfig')) {
  syncRulesFromConfig().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
