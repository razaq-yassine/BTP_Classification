/**
 * Utilities for membre encadrement scoring and dossier total score recomputation.
 * Scoring uses encadrement.json via config.ts.
 */
import { db } from '../../src/db/index.js'
import { membreEncadrements, dossiers } from '../../src/db/schema.js'
import { eq } from 'drizzle-orm'
import { getEncadrementConfig } from '../../src/engine/rules/config.js'

function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0
  return typeof v === 'string' ? parseFloat(v) || 0 : Number(v)
}

/**
 * Compute the score for a single encadrement member based on role and years of experience.
 * Uses encadrement.json: scoreLt5 when years < 5, scoreGte5 otherwise.
 */
export function computeMemberScore(
  role: string,
  anneesExperience: string | number
): number {
  const r = String(role || '').toLowerCase().trim()
  const years = toNum(anneesExperience)
  const encadrementCfg = getEncadrementConfig()
  const def = encadrementCfg.roles.find((x) => x.role.toLowerCase() === r)
  if (!def) return 0
  if (typeof def.score === 'number') return def.score
  const lt = def.scoreLt5 ?? 0
  const gte = def.scoreGte5 ?? 0
  return years < 5 ? lt : gte
}

/**
 * Sum all scoreCalcule for members with the given dossierId,
 * then update dossier.totalEncadrementScore.
 */
export async function recomputeDossierEncadrementScore(
  dossierId: number
): Promise<void> {
  const members = await db
    .select({ scoreCalcule: membreEncadrements.scoreCalcule })
    .from(membreEncadrements)
    .where(eq(membreEncadrements.dossierId, dossierId))

  const total = members.reduce(
    (sum, m) => sum + toNum(m.scoreCalcule),
    0
  )

  await db
    .update(dossiers)
    .set({
      totalEncadrementScore: String(total),
      updatedAt: new Date(),
    })
    .where(eq(dossiers.id, dossierId))
}
