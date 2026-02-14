import { Hono } from 'hono'
import { eq, desc, like, or, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import { entityRegistry, type EntityPath } from './entity-registry.generated.js'
import { authMiddleware } from '../middleware/auth.js'
import { runTrigger } from '../services/trigger-runner.js'

export const entityRoutes = new Hono()

entityRoutes.use('*', authMiddleware)

type EntityConfig = (typeof entityRegistry)[EntityPath]
type JoinConfig = { joinTable: { id: unknown }; leftColumn: unknown; rightColumn: unknown }

/** Generate next autoNumber value: pattern e.g. "OP-{0000}", start e.g. 1 */
function generateNextAutoNumber(
  table: { [k: string]: unknown },
  columnName: string,
  pattern: string,
  start: number
): string {
  const match = pattern.match(/\{0+}/)
  const padLength = match ? match[0].length - 1 : 4 // {0000} -> 4 digits
  const prefix = pattern.split(/\{0+\}/)[0] || ''
  const suffix = pattern.split(/\{0+\}/)[1] || ''
  const regex = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)

  const col = (table as Record<string, unknown>)[columnName]
  if (!col) return `${prefix}${String(start).padStart(padLength, '0')}${suffix}`

  const rows = db.select({ val: col }).from(table as any).all() as { val: string }[]
  let maxNum = start - 1
  for (const row of rows) {
    const m = String(row?.val ?? '').match(regex)
    if (m) {
      const n = parseInt(m[1], 10)
      if (!isNaN(n) && n > maxNum) maxNum = n
    }
  }
  const nextNum = maxNum + 1
  const padded = String(nextNum).padStart(padLength, '0')
  return `${prefix}${padded}${suffix}`
}

function toRecord(
  row: Record<string, unknown>,
  joinedRow: Record<string, unknown> | null,
  config: EntityConfig,
  requestedFields: string[] | null
): Record<string, unknown> {
  const base = { ...row } as Record<string, unknown>
  const computedFields = config.computedFields
  if (computedFields) {
    for (const cf of computedFields) {
      if (cf.expression === 'concat') {
        const parts = (cf.sourceFields || []).map((f) => String(row[f] ?? ''))
        base[cf.key] = parts.join(cf.separator || ' ').trim()
      }
      if (cf.expression === 'join' && joinedRow) {
        const parts = (cf.sourceFields || []).map((f) => String(joinedRow[f] ?? ''))
        base[cf.key] = parts.join(cf.separator || ' ').trim() || null
      }
    }
  }
  if ('join' in config && config.join && joinedRow) {
    const refKey = config.referenceFields?.[0]?.key
    if (refKey) {
      base[refKey] =
        joinedRow.id != null
          ? { id: joinedRow.id, ...joinedRow }
          : null
    }
  }
  if (requestedFields) {
    const out: Record<string, unknown> = {}
    for (const f of requestedFields) {
      const key = Object.keys(base).find((k) => k.toLowerCase() === f.toLowerCase())
      if (key && base[key] !== undefined) out[key] = base[key]
    }
    return out.id !== undefined ? out : base
  }
  return base
}

function buildInsertPayload(
  body: Record<string, unknown>,
  config: EntityConfig,
  defaults?: Record<string, unknown>
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const field of config.insertFields) {
    if (field === 'createdAt' || field === 'updatedAt') {
      payload[field] = new Date()
      continue
    }
    const ref = config.referenceFields?.find((r) => r.idField === field)
    if (ref) {
      const val = (body[ref.key] as { id?: number })?.id ?? body[field]
      payload[field] = val != null ? Number(val) : (defaults as Record<string, unknown>)?.[field]
      continue
    }
    let val = body[field] ?? (defaults as Record<string, unknown>)?.[field]
    if (['orderDate', 'deliveryDate', 'createdAt', 'updatedAt'].includes(field) && typeof val === 'string') {
      val = new Date(val)
    }
    if (val !== undefined) payload[field] = val
  }
  return payload
}

function buildUpdatePayload(
  body: Record<string, unknown>,
  oldRow: Record<string, unknown>,
  config: EntityConfig
): Record<string, unknown> {
  const payload: Record<string, unknown> = { updatedAt: new Date() }
  for (const field of config.updateFields) {
    if (field === 'updatedAt') continue
    const ref = config.referenceFields?.find((r) => r.idField === field)
    if (ref) {
      const val = (body[ref.key] as { id?: number })?.id ?? body[field] ?? oldRow[field]
      payload[field] = val != null ? Number(val) : oldRow[field]
      continue
    }
    let val = body[field]
    if (val === undefined) val = oldRow[field]
    if (['orderDate', 'deliveryDate'].includes(field) && typeof val === 'string') val = new Date(val)
    if (val !== undefined) payload[field] = val
  }
  return payload
}

function getOrderColumn(table: { orderDate?: unknown; createdAt?: unknown; id?: unknown }) {
  return table.orderDate ?? table.createdAt ?? table.id
}

for (const entityPath of Object.keys(entityRegistry) as EntityPath[]) {
  const config = entityRegistry[entityPath]
  const { table, objectName, searchFields, relatedListPaths } = config
  const join = 'join' in config ? (config.join as JoinConfig | undefined) : undefined
  const orderCol = getOrderColumn(table as { orderDate?: unknown; createdAt?: unknown; id?: unknown })
  const idCol = (table as { id?: unknown }).id

  if (relatedListPaths) {
    for (const [subPath, { filterColumn }] of Object.entries(relatedListPaths)) {
      const filterCol = (table as any)[filterColumn]
      entityRoutes.get(`/${entityPath}/${subPath}/:parentId`, async (c) => {
        try {
        const parentId = Number(c.req.param('parentId'))
        const page = Math.max(0, Number(c.req.query('page')) || 0)
        const size = Math.min(100, Math.max(1, Number(c.req.query('size')) || 10))
        const search = c.req.query('search')?.trim()
        const fieldsParam = c.req.query('fields')
        const requestedFields = fieldsParam ? fieldsParam.split(',').map((f) => f.trim().toLowerCase()) : null

        let rows: Array<{ main?: Record<string, unknown>; joined?: Record<string, unknown> } | Record<string, unknown>>

        if (join) {
          const j = join as JoinConfig
          const result = await db
            .select({ main: table, joined: j.joinTable as any })
            .from(table)
            .leftJoin(j.joinTable as any, eq(j.leftColumn as any, j.rightColumn as any))
            .where(eq(filterCol as any, parentId))
            .orderBy(desc(orderCol as any))
          rows = result as any
        } else {
          rows = (await db
            .select()
            .from(table)
            .where(eq(filterCol as any, parentId))
            .orderBy(desc(orderCol as any))) as any
        }

        let filtered = rows
        if (search && join) {
          const s = search.toLowerCase()
          filtered = (rows as Array<{ main?: Record<string, unknown>; joined?: Record<string, unknown> }>).filter(
            (r) =>
              Object.values(r.main || r).some((v) => String(v ?? '').toLowerCase().includes(s)) ||
              (r.joined && Object.values(r.joined).some((v) => String(v ?? '').toLowerCase().includes(s)))
          )
        } else if (search && searchFields.length > 0) {
          const s = search.toLowerCase()
          filtered = rows.filter((r: Record<string, unknown>) => {
            const row = join ? (r as { main?: Record<string, unknown> }).main ?? r : r
            return searchFields.some(() => Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(s)))
          })
        }

        const total = filtered.length
        const totalPages = Math.ceil(total / size)
        const slice = filtered.slice(page * size, page * size + size)

        const result = join
          ? (slice as Array<{ main?: Record<string, unknown>; joined?: Record<string, unknown> }>).map((r) =>
              toRecord(r.main || (r as Record<string, unknown>), r.joined || null, config, requestedFields)
            )
          : (slice as Record<string, unknown>[]).map((r) => toRecord(r, null, config, requestedFields))

        return c.json({ [entityPath]: result, count: total, totalPages, currentPage: page })
        } catch (err) {
          console.error(`GET ${entityPath}/${subPath}/:parentId error:`, err)
          return c.json({ message: (err as Error).message || 'Internal server error' }, 500)
        }
      })
    }
  }

  entityRoutes.get(`/${entityPath}`, async (c) => {
    try {
      const page = Math.max(0, Number(c.req.query('page')) || 0)
      const size = Math.min(100, Math.max(1, Number(c.req.query('size')) || 10))
      const search = c.req.query('search')?.trim()
      const fieldsParam = c.req.query('fields')
      const requestedFields = fieldsParam ? fieldsParam.split(',').map((f) => f.trim().toLowerCase()) : null

      let rows: unknown[]

      if (join) {
        const j = join as JoinConfig
        const result = await db
          .select({ main: table, joined: j.joinTable as any })
          .from(table)
          .leftJoin(j.joinTable as any, eq(j.leftColumn as any, j.rightColumn as any))
          .orderBy(desc(orderCol as any))
        rows = result as any
      } else {
        const whereCond = search && searchFields.length > 0 ? or(...searchFields.map((f: any) => like(f, `%${search}%`)))! : undefined
        const q = db.select().from(table).orderBy(desc(orderCol as any))
        rows = (await (whereCond ? q.where(whereCond) : q)) as any
      }

      let filtered = rows
      if (search && join) {
        const s = search.toLowerCase()
        filtered = (rows as Array<{ main?: Record<string, unknown>; joined?: Record<string, unknown> }>).filter(
          (r) =>
            Object.values(r.main || r).some((v) => String(v ?? '').toLowerCase().includes(s)) ||
            (r.joined && Object.values(r.joined).some((v) => String(v ?? '').toLowerCase().includes(s)))
        )
      }

      const total = filtered.length
      const totalPages = Math.ceil(total / size)
      const slice = filtered.slice(page * size, page * size + size)

      const result = join
        ? (slice as Array<{ main?: Record<string, unknown>; joined?: Record<string, unknown> }>).map((r) =>
            toRecord(r.main || (r as Record<string, unknown>), r.joined || null, config, requestedFields)
          )
        : (slice as Record<string, unknown>[]).map((r) => toRecord(r, null, config, requestedFields))

      return c.json({ [entityPath]: result, count: total, totalPages, currentPage: page })
    } catch (err) {
      console.error(`GET ${entityPath} error:`, err)
      return c.json(
        { message: (err as Error).message || 'Internal server error' },
        500
      )
    }
  })

  entityRoutes.get(`/${entityPath}/:id`, async (c) => {
    try {
      const id = Number(c.req.param('id'))
      if (Number.isNaN(id)) return c.json({ message: 'Invalid ID' }, 400)
      if (join) {
        const j = join as JoinConfig
        const [row] = (await db
          .select({ main: table, joined: j.joinTable as any })
          .from(table)
          .leftJoin(j.joinTable as any, eq(j.leftColumn as any, j.rightColumn as any))
          .where(eq(idCol as any, id))) as Array<{ main?: Record<string, unknown>; joined?: Record<string, unknown> }>
        if (!row?.main) return c.json({ message: 'Not found' }, 404)
        return c.json(toRecord(row.main, row.joined || null, config, null))
      }
      const [row] = await db.select().from(table).where(eq(idCol as any, id))
      if (!row) return c.json({ message: 'Not found' }, 404)
      return c.json(toRecord(row as Record<string, unknown>, null, config, null))
    } catch (err) {
      console.error(`GET ${entityPath}/:id error:`, err)
      return c.json(
        { message: (err as Error).message || 'Internal server error' },
        500
      )
    }
  })

  entityRoutes.post(`/${entityPath}`, async (c) => {
    const body = (await c.req.json()) as Record<string, unknown>
    const hasRequiredRef = config.referenceFields?.every((ref) => body[ref.idField] ?? (body[ref.key] as { id?: number })?.id)
    if (config.referenceFields?.length && !hasRequiredRef) {
      const refLabel = config.referenceFields?.[0]?.key
      return c.json({ message: `Required reference field${refLabel ? ` (${refLabel})` : ''} missing` }, 400)
    }

    const autoNumberFields = (config as { autoNumberFields?: Record<string, { pattern: string; start: number }> }).autoNumberFields
    const requiredIdFields = ['name', 'orderNumber'].filter(
      (f) => config.insertFields.includes(f) && !(autoNumberFields && f in autoNumberFields)
    )
    for (const field of requiredIdFields) {
      const val = body[field]
      if (val == null || String(val).trim() === '') {
        const label = field === 'orderNumber' ? 'Order number' : 'Name'
        return c.json({ message: `${label} is required` }, 400)
      }
    }

    let insertBody = { ...body }
    if (autoNumberFields) {
      for (const [fieldKey, { pattern, start }] of Object.entries(autoNumberFields)) {
        const generated = generateNextAutoNumber(table as any, fieldKey, pattern, start)
        insertBody = { ...insertBody, [fieldKey]: generated }
      }
    }

    const payload = buildInsertPayload(insertBody, config, {})
    const modified = (await runTrigger(objectName, 'beforeInsert', undefined, payload)) ?? payload
    const [inserted] = await db.insert(table).values(modified).returning()
    await runTrigger(objectName, 'afterInsert', undefined, inserted as Record<string, unknown>)
    if (join && inserted) {
      const ref = config.referenceFields?.[0]
      if (ref && (inserted as any)[ref.idField]) {
        const j = join as JoinConfig
        const [cust] = await db.select().from(j.joinTable as any).where(eq((j.joinTable as any).id, (inserted as any)[ref.idField]))
        return c.json(toRecord(inserted as Record<string, unknown>, cust as Record<string, unknown>, config, null), 201)
      }
    }
    return c.json(toRecord(inserted as Record<string, unknown>, null, config, null), 201)
  })

  entityRoutes.put(`/${entityPath}/:id`, async (c) => {
    const id = Number(c.req.param('id'))
    const [oldRow] = await db.select().from(table).where(eq(idCol as any, id))
    if (!oldRow) return c.json({ message: 'Not found' }, 404)
    const body = (await c.req.json()) as Record<string, unknown>
    const newPayload = buildUpdatePayload(body, oldRow as Record<string, unknown>, config)
    const modified = (await runTrigger(objectName, 'beforeUpdate', oldRow as Record<string, unknown>, newPayload)) ?? newPayload
    const [updated] = await db.update(table).set(modified).where(eq(idCol as any, id)).returning()
    await runTrigger(objectName, 'afterUpdate', oldRow as Record<string, unknown>, updated as Record<string, unknown>)
    if (join && updated) {
      const ref = config.referenceFields?.[0]
      if (ref && (updated as any)[ref.idField]) {
        const j = join as JoinConfig
        const [cust] = await db.select().from(j.joinTable as any).where(eq((j.joinTable as any).id, (updated as any)[ref.idField]))
        return c.json(toRecord(updated as Record<string, unknown>, cust as Record<string, unknown>, config, null))
      }
    }
    return c.json(toRecord(updated as Record<string, unknown>, null, config, null))
  })

  entityRoutes.delete(`/${entityPath}/:id`, async (c) => {
    const id = Number(c.req.param('id'))
    const [oldRow] = await db.select().from(table).where(eq(idCol as any, id))
    if (!oldRow) return c.json({ message: 'Not found' }, 404)
    await runTrigger(objectName, 'beforeDelete', oldRow as Record<string, unknown>)
    await db.delete(table).where(eq(idCol as any, id))
    await runTrigger(objectName, 'afterDelete', oldRow as Record<string, unknown>)
    return c.json({})
  })
}
