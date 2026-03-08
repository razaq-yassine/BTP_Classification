/**
 * Dossier-specific routes (classification preview, etc.)
 */
import { Hono } from 'hono'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { dossiers, caEntries, membreEncadrements, resultatSimulations } from '../db/schema.js'
import { entityRegistry } from './entity-registry.generated.js'
import { authMiddleware } from '../middleware/auth.js'
import {
  computeClassification,
  type DossierInput,
  type MembreInput,
  type CaEntryInput,
} from '../engine/classificationEngine.js'
import { insertRecordHistoryEntry } from '../services/record-history.js'

export const dossiersRoutes = new Hono()
dossiersRoutes.use('*', authMiddleware)

type UserWithTenant = {
  id?: number
  profile?: string | null
  organizationId?: number | null
  tenantId?: number | null
}

function getTenantFilter(
  user: UserWithTenant | undefined,
  tenantScope: string | undefined
): Record<string, number> | null {
  if (!user) return null
  const isAdmin =
    user.profile === 'admin' ||
    (user.organizationId == null && user.tenantId == null)
  if (isAdmin) return null
  if (user.organizationId == null) return null
  if (tenantScope === 'tenant') return { organizationId: user.organizationId }
  return null
}

/**
 * GET /api/dossiers/:id/classification-preview
 * Returns live classification result (read-only, does not save).
 * Used by the recap step for preliminary result display.
 */
dossiersRoutes.get('/:id/classification-preview', async (c) => {
  try {
    const user = (c.get as (k: string) => unknown)('user') as UserWithTenant
    const id = Number(c.req.param('id'))
    if (!id || isNaN(id)) {
      return c.json({ message: 'Invalid dossier ID' }, 400)
    }

    const config = entityRegistry.dossiers
    const tenantFilter = getTenantFilter(user, config.tenantScope)

    const whereConds = [eq(dossiers.id, id)] as ReturnType<typeof eq>[]
    if (tenantFilter?.organizationId != null) {
      whereConds.push(eq(dossiers.organizationId, tenantFilter.organizationId))
    }

    const [dossier] = await db
      .select()
      .from(dossiers)
      .where(and(...whereConds))

    if (!dossier) {
      return c.json({ message: 'Dossier not found' }, 404)
    }

    const caEntriesList = await db
      .select()
      .from(caEntries)
      .where(eq(caEntries.dossierId, dossier.id!))

    const membresList = await db
      .select()
      .from(membreEncadrements)
      .where(eq(membreEncadrements.dossierId, dossier.id!))

    const dossierInput: DossierInput = {
      id: dossier.id!,
      organizationId: dossier.organizationId!,
      sectorsSelected: dossier.sectorsSelected,
      classificationMethod: dossier.classificationMethod,
      capitalSocial: dossier.capitalSocial,
      masseSalariale: dossier.masseSalariale,
      totalEncadrementScore: dossier.totalEncadrementScore,
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

    // Parse secteurClasseDemandee for requested classes
    let requestedClasses: Array<{ secteur: string; classe: string }> | undefined
    const scd = dossier.secteurClasseDemandee
    if (scd && typeof scd === 'string') {
      try {
        const parsed = JSON.parse(scd) as Array<{ secteur?: string; classeDemandee?: string }>
        if (Array.isArray(parsed)) {
          requestedClasses = parsed
            .filter((e) => e?.secteur && e?.classeDemandee)
            .map((e) => ({ secteur: String(e.secteur), classe: String(e.classeDemandee) }))
        }
      } catch {
        /* ignore */
      }
    }

    const results = computeClassification(
      dossierInput,
      membresInput,
      caEntriesInput,
      requestedClasses
    )

    return c.json({ results })
  } catch (err) {
    console.error('GET /dossiers/:id/classification-preview error:', err)
    return c.json(
      { message: (err as Error).message || 'Internal server error' },
      500
    )
  }
})

/**
 * GET /api/dossiers/:id/latest-classification-result
 * Returns the latest resultatSimulation records for this dossier (most recent computedAt).
 * Used by the dossier detail page to show classification result inline.
 */
dossiersRoutes.get('/:id/latest-classification-result', async (c) => {
  try {
    const user = (c.get as (k: string) => unknown)('user') as UserWithTenant
    const id = Number(c.req.param('id'))
    if (!id || isNaN(id)) {
      return c.json({ message: 'Invalid dossier ID' }, 400)
    }

    const config = entityRegistry.dossiers
    const tenantFilter = getTenantFilter(user, config.tenantScope)

    const whereConds = [
      eq(resultatSimulations.dossierId, id),
    ] as ReturnType<typeof eq>[]
    if (tenantFilter?.organizationId != null) {
      whereConds.push(eq(resultatSimulations.organizationId, tenantFilter.organizationId))
    }

    const rows = await db
      .select()
      .from(resultatSimulations)
      .where(and(...whereConds))
      .orderBy(desc(resultatSimulations.computedAt))

    if (rows.length === 0) {
      return c.json({ results: [], computedAt: null })
    }

    const latestComputedAt = rows[0]?.computedAt
    const latestRows = latestComputedAt
      ? rows.filter((r) => r.computedAt && new Date(r.computedAt).getTime() === new Date(latestComputedAt).getTime())
      : rows

    // Normalize keys: MySQL driver may return snake_case instead of camelCase
    const get = (r: Record<string, unknown>, camel: string, snake?: string) =>
      r[camel] ?? (snake ? r[snake] : undefined)

    return c.json({
      results: latestRows.map((r) => {
        const row = r as Record<string, unknown>
        return {
          secteur: get(row, 'secteur'),
          classeObtenue: get(row, 'classeObtenue', 'classe_obtenue'),
          caActualDH: get(row, 'caActualDH', 'ca_actual_dh'),
          encadrementScoreActual: get(row, 'encadrementScoreActual', 'encadrement_score_actual'),
          masseSalarialeRatioPercent: get(row, 'masseSalarialeRatioPercent', 'masse_salariale_ratio_percent'),
          computedAt: get(row, 'computedAt', 'computed_at'),
        }
      }),
      computedAt: latestComputedAt,
    })
  } catch (err) {
    console.error('GET /dossiers/:id/latest-classification-result error:', err)
    return c.json(
      { message: (err as Error).message || 'Internal server error' },
      500
    )
  }
})

/**
 * POST /api/dossiers/:id/reopen
 * Reopens a submitted dossier for modification (SOUMIS → IN_PROGRESS).
 * Adds "Dossier rouvert pour modification" to record history.
 */
dossiersRoutes.post('/:id/reopen', async (c) => {
  try {
    const user = (c.get as (k: string) => unknown)('user') as UserWithTenant
    const id = Number(c.req.param('id'))
    if (!id || isNaN(id)) {
      return c.json({ message: 'Invalid dossier ID' }, 400)
    }

    const config = entityRegistry.dossiers
    const tenantFilter = getTenantFilter(user, config.tenantScope)

    const whereConds = [eq(dossiers.id, id)] as ReturnType<typeof eq>[]
    if (tenantFilter?.organizationId != null) {
      whereConds.push(eq(dossiers.organizationId, tenantFilter.organizationId))
    }

    const [dossier] = await db
      .select()
      .from(dossiers)
      .where(and(...whereConds))

    if (!dossier) {
      return c.json({ message: 'Dossier not found' }, 404)
    }

    const status = (dossier as { status?: string }).status
    if (status !== 'SOUMIS') {
      return c.json(
        { message: 'Seuls les dossiers soumis peuvent être rouverts' },
        400
      )
    }

    const oldRow = { ...dossier } as Record<string, unknown>

    await db
      .update(dossiers)
      .set({ status: 'IN_PROGRESS', updatedAt: new Date(), editedById: user?.id ?? null } as any)
      .where(eq(dossiers.id, id))

    await insertRecordHistoryEntry({
      objectName: 'dossier',
      recordId: id,
      fieldKey: '_event',
      oldValue: null,
      newValue: 'Dossier rouvert pour modification',
      changedById: user?.id ?? null,
      organizationId: (oldRow.organizationId as number) ?? null,
      tenantId: (oldRow.tenantId as number) ?? null,
    })

    const [updated] = await db.select().from(dossiers).where(eq(dossiers.id, id))
    return c.json(updated)
  } catch (err) {
    console.error('POST /dossiers/:id/reopen error:', err)
    return c.json(
      { message: (err as Error).message || 'Internal server error' },
      500
    )
  }
})
