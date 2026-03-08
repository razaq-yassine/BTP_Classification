/**
 * Membre encadrement triggers.
 * Compute scoreCalcule on insert/update, and recompute dossier totalEncadrementScore.
 */
import { db } from '../src/db/index.js'
import { membreEncadrements } from '../src/db/schema.js'
import { eq } from 'drizzle-orm'
import {
  computeMemberScore,
  recomputeDossierEncadrementScore,
} from './helpers/membreEncadrement.js'

export async function afterInsert(
  _oldValue: Record<string, unknown> | undefined,
  newValue: Record<string, unknown>
): Promise<void> {
  const id = newValue?.id as number
  const role = newValue?.role as string
  const anneesExperience = newValue?.anneesExperience as string | number
  const dossierId = newValue?.dossierId as number

  const score = computeMemberScore(role, anneesExperience)

  await db
    .update(membreEncadrements)
    .set({
      scoreCalcule: String(score),
      updatedAt: new Date(),
    })
    .where(eq(membreEncadrements.id, id))

  if (dossierId) {
    await recomputeDossierEncadrementScore(dossierId)
  }
}

export async function afterUpdate(
  _oldValue: Record<string, unknown>,
  newValue: Record<string, unknown>
): Promise<void> {
  await afterInsert(undefined, newValue)
}

export async function afterDelete(
  oldValue: Record<string, unknown>
): Promise<void> {
  const dossierId = oldValue?.dossierId as number
  if (dossierId) {
    await recomputeDossierEncadrementScore(dossierId)
  }
}
