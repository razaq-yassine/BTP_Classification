/**
 * One-time script: recompute totalEncadrementScore and caMax/caMaxHT
 * for dossier DOS-00003.
 *
 * Run: pnpm exec tsx scripts/recompute-dossier-dos-00003.ts
 */
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db } from '../src/db/index.js'
import { dossiers, caEntries, membreEncadrements } from '../src/db/schema.js'
import { recomputeDossierEncadrementScore, computeMemberScore } from '../triggers/helpers/membreEncadrement.js'

function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0
  return typeof v === 'string' ? parseFloat(v) || 0 : Number(v)
}

function parseSectors(s: string | null | undefined): string[] {
  if (!s || !String(s).trim()) return []
  try {
    const p = JSON.parse(s) as unknown
    if (Array.isArray(p)) return p.map(String).filter(Boolean)
  } catch {
    /* fallback */
  }
  return String(s).split(/[,;]/).map((x) => x.trim()).filter(Boolean)
}

async function computeAndSaveCaMax(dossierId: number): Promise<{ caMax: number; caMaxHT: number }> {
  const [dossier] = await db.select().from(dossiers).where(eq(dossiers.id, dossierId))
  if (!dossier) throw new Error(`Dossier ${dossierId} not found`)

  const caEntriesList = await db
    .select()
    .from(caEntries)
    .where(eq(caEntries.dossierId, dossierId))

  const sectors = parseSectors(dossier.sectorsSelected)
  let caMaxTTC = 0
  let caMaxHT = 0

  for (const sector of sectors) {
    const bySector = caEntriesList.filter(
      (e) => String(e.secteur).toUpperCase() === sector.toUpperCase()
    )
    for (const e of bySector) {
      const caTTC = toNum(e.caTTC)
      const caHT = toNum(e.caHT)
      const montant = toNum(e.montantSoustraite)
      let caNet = caTTC - montant
      let effHT = Math.max(0, caHT - montant)
      if (sector.toUpperCase() === 'A' && e.isGrosOeuvresSingleLot === true) {
        caNet *= 0.5
        effHT *= 0.5
      }
      if (caNet > caMaxTTC) caMaxTTC = caNet
      if (effHT > caMaxHT) caMaxHT = effHT
    }
  }

  const now = new Date()
  await db
    .update(dossiers)
    .set({
      caMax: caMaxTTC > 0 ? String(caMaxTTC) : null,
      caMaxHT: caMaxHT > 0 ? String(caMaxHT) : null,
      updatedAt: now,
    })
    .where(eq(dossiers.id, dossierId))

  return { caMax: caMaxTTC, caMaxHT }
}

async function syncMemberScores(dossierId: number): Promise<void> {
  const members = await db
    .select()
    .from(membreEncadrements)
    .where(eq(membreEncadrements.dossierId, dossierId))

  for (const m of members) {
    const score = computeMemberScore(String(m.role), m.anneesExperience ?? 0)
    await db
      .update(membreEncadrements)
      .set({ scoreCalcule: String(score), updatedAt: new Date() })
      .where(eq(membreEncadrements.id, m.id!))
  }
}

async function main() {
  const [dossier] = await db
    .select()
    .from(dossiers)
    .where(eq(dossiers.name, 'DOS-00003'))

  if (!dossier) {
    console.error('Dossier DOS-00003 not found')
    process.exit(1)
  }

  const dossierId = dossier.id!
  console.log(`Found dossier DOS-00003 (id=${dossierId})`)

  // 1. Sync member scoreCalcule, then recompute totalEncadrementScore
  console.log('\n1. Syncing member scores and recomputing totalEncadrementScore...')
  await syncMemberScores(dossierId)
  await recomputeDossierEncadrementScore(dossierId)

  // 2. Compute and save caMax, caMaxHT
  console.log('2. Computing and saving caMax, caMaxHT from caEntries...')
  const { caMax, caMaxHT } = await computeAndSaveCaMax(dossierId)

  // 3. Confirm in DB
  const [updated] = await db
    .select({
      id: dossiers.id,
      name: dossiers.name,
      totalEncadrementScore: dossiers.totalEncadrementScore,
      caMax: dossiers.caMax,
      caMaxHT: dossiers.caMaxHT,
    })
    .from(dossiers)
    .where(eq(dossiers.id, dossierId))

  console.log('\n3. Result (from DB):')
  console.log('   totalEncadrementScore:', updated?.totalEncadrementScore ?? '(null)')
  console.log('   caMax:', updated?.caMax ?? '(null)')
  console.log('   caMaxHT:', updated?.caMaxHT ?? '(null)')
  console.log('\n   Computed caMax:', caMax)
  console.log('   Computed caMaxHT:', caMaxHT)

  const expectedScore = 13 + 25 + 6
  const actualScore = toNum(updated?.totalEncadrementScore)
  if (actualScore === expectedScore) {
    console.log(`\n   ✓ totalEncadrementScore matches expected: ${expectedScore}`)
  } else {
    console.log(`\n   ⚠ totalEncadrementScore: expected ${expectedScore}, got ${actualScore}`)
  }

  console.log('\nDone.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
