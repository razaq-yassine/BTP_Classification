/**
 * One-time script: run full classification for dossier DOS-00003
 * and verify resultatSimulations.
 *
 * Run: pnpm exec tsx scripts/run-classification-dos-00003.ts
 */
import 'dotenv/config'
import { eq, desc } from 'drizzle-orm'
import { db } from '../src/db/index.js'
import {
  dossiers,
  caEntries,
  membreEncadrements,
  resultatSimulations,
} from '../src/db/schema.js'
import {
  computeClassification,
  type ClassificationResult,
  type DossierInput,
  type MembreInput,
  type CaEntryInput,
} from '../src/engine/classificationEngine.js'
import { recomputeDossierEncadrementScore } from '../triggers/helpers/membreEncadrement.js'

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

/** Always INSERT (no upsert). Matches trigger behavior. */
async function insertResultatSimulation(
  dossierId: number,
  organizationId: number,
  result: ClassificationResult & { encadrementScoreActual?: number; caActualMDH?: number; ratioActual?: number },
  computedAt: Date
): Promise<void> {
  const caActualDH = result.caActualMDH != null ? result.caActualMDH * 1_000_000 : null
  const name = `RES-D${dossierId}-S${result.secteur}-${computedAt.getTime()}`
  await db.insert(resultatSimulations).values({
    name,
    secteur: result.secteur,
    classeObtenue: result.classeObtenue,
    scoreCa: result.scoreCa,
    scoreCapital: result.scoreCapital,
    scoreEncadrement: result.scoreEncadrement,
    scoreMasseSalariale: result.scoreMasseSalariale,
    scoreMateriel: result.scoreMateriel,
    caActualDH,
    encadrementScoreActual: result.encadrementScoreActual ?? null,
    masseSalarialeRatioPercent: result.ratioActual != null ? result.ratioActual / 100 : null,
    details: result.details,
    computedAt,
    dossierId,
    organizationId,
    createdAt: computedAt,
    updatedAt: computedAt,
    createdById: null,
    ownerId: null,
    editedById: null,
  })
  console.log(`   Inserted resultatSimulation: Secteur ${result.secteur} → ${result.classeObtenue}`)
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
  const organizationId = dossier.organizationId!
  console.log(`Found dossier DOS-00003 (id=${dossierId})`)
  console.log('  totalEncadrementScore:', dossier.totalEncadrementScore)
  console.log('  caMaxHT:', dossier.caMaxHT)
  console.log('  masseSalariale:', dossier.masseSalariale)
  console.log('  sectorsSelected:', dossier.sectorsSelected)
  console.log('  classificationMethod:', dossier.classificationMethod)

  // 1. Ensure totalEncadrementScore is up to date
  console.log('\n1. Recomputing totalEncadrementScore...')
  await recomputeDossierEncadrementScore(dossierId)

  // Refetch dossier to get updated totalEncadrementScore
  const [dossierUpdated] = await db.select().from(dossiers).where(eq(dossiers.id, dossierId))
  const dossierRow = dossierUpdated ?? dossier

  // 2. Load caEntries and membres
  const caEntriesList = await db
    .select()
    .from(caEntries)
    .where(eq(caEntries.dossierId, dossierId))

  const membresList = await db
    .select()
    .from(membreEncadrements)
    .where(eq(membreEncadrements.dossierId, dossierId))

  const dossierInput: DossierInput = {
    id: dossierId,
    organizationId,
    sectorsSelected: dossierRow.sectorsSelected,
    classificationMethod: dossierRow.classificationMethod,
    capitalSocial: dossierRow.capitalSocial,
    masseSalariale: dossierRow.masseSalariale,
    totalEncadrementScore: dossierRow.totalEncadrementScore,
  }

  const caEntriesInput: CaEntryInput[] = caEntriesList.map((e) => ({
    id: e.id!,
    secteur: String(e.secteur),
    caTTC: e.caTTC ?? 0,
    caHT: e.caHT ?? 0,
    montantSoustraite: e.montantSoustraite,
    isGrosOeuvresSingleLot: e.isGrosOeuvresSingleLot ?? false,
  }))

  const membresInput: MembreInput[] = membresList.map((m) => ({
    id: m.id!,
    role: String(m.role),
    anneesExperience: m.anneesExperience,
    secteurImputation: m.secteurImputation,
  }))

  // 3. Run classification
  console.log('\n2. Running computeClassification...')
  const results = computeClassification(dossierInput, membresInput, caEntriesInput)
  console.log(`   Results: ${results.length} sector(s)`)

  // 4. Insert resultatSimulations (always append, never override)
  console.log('\n3. Inserting resultatSimulations...')
  const now = new Date()
  for (const r of results) {
    await insertResultatSimulation(dossierId, organizationId, r, now)
  }

  // 5. Update caMax/caMaxHT
  const sectors = parseSectors(dossierRow.sectorsSelected)
  let caMaxTTC = 0
  let caMaxHT = 0
  for (const sector of sectors) {
    const bySector = caEntriesInput.filter(
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
  await db
    .update(dossiers)
    .set({
      caMax: caMaxTTC > 0 ? String(caMaxTTC) : null,
      caMaxHT: caMaxHT > 0 ? String(caMaxHT) : null,
      updatedAt: now,
    })
    .where(eq(dossiers.id, dossierId))

  // 6. Query and verify resultatSimulations (latest first)
  const sims = await db
    .select()
    .from(resultatSimulations)
    .where(eq(resultatSimulations.dossierId, dossierId))
    .orderBy(desc(resultatSimulations.computedAt))

  console.log('\n4. Résultats de simulation (from DB, latest first):')
  for (const s of sims) {
    const at = s.computedAt ? new Date(s.computedAt).toISOString() : '(null)'
    console.log(`   Secteur ${s.secteur}: ${s.classeObtenue ?? '(null)'} @ ${at}`)
  }

  const secteurA = sims.find((s) => s.secteur === 'A')
  if (secteurA) {
    console.log('\n   ✓ Secteur A result:', secteurA.classeObtenue)
  } else {
    console.log('\n   ⚠ No Secteur A result found')
  }

  console.log('\n5. Classification engine output (Secteur A):')
  const resA = results.find((r) => r.secteur === 'A')
  if (resA) {
    console.log('   classeObtenue:', resA.classeObtenue)
    console.log('   scoreCa:', resA.scoreCa)
    console.log('   scoreEncadrement:', resA.scoreEncadrement)
    console.log('   scoreMasseSalariale:', resA.scoreMasseSalariale)
    console.log('   caActualMDH:', resA.caActualMDH)
    console.log('   encadrementScoreActual:', resA.encadrementScoreActual)
  }

  console.log('\nDone.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
