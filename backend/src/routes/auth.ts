import { Hono } from 'hono'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { signToken, verifyToken } from '../lib/jwt.js'
import { authMiddleware } from '../middleware/auth.js'

const loginSchema = z.object({ username: z.string(), password: z.string() })

const updateMeSchema = z.object({
  preferredLanguage: z.string().optional().nullable(),
})

export const authRoutes = new Hono()

authRoutes.post('/login', async (c) => {
  const body = await c.req.json()
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ message: 'Username and password required' }, 400)
  }
  const { username, password } = parsed.data

  const [user] = await db.select().from(users).where(eq(users.username, username))
  if (!user || !user.isActive) {
    return c.json({ message: 'Invalid credentials' }, 401)
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return c.json({ message: 'Invalid credentials' }, 401)
  }

  const token = await signToken({ sub: user.username, id: user.id })

  const response: Record<string, unknown> = {
    accessToken: token,
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profile: user.profile || 'standard-user',
  }
  if ('organizationId' in user && user.organizationId != null) response.organizationId = user.organizationId
  if ('tenantId' in user && user.tenantId != null) response.tenantId = user.tenantId
  if ('preferredLanguage' in user) response.preferredLanguage = user.preferredLanguage
  return c.json(response)
})

authRoutes.get('/me', async (c) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ message: 'Unauthorized' }, 401)
  }
  const token = auth.slice(7)
  try {
    const { id } = await verifyToken(token)
    const [user] = await db.select().from(users).where(eq(users.id, id))
    if (!user || !user.isActive) {
      return c.json({ message: 'Unauthorized' }, 401)
    }
    const response: Record<string, unknown> = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profile: user.profile || 'standard-user',
    }
    if ('organizationId' in user && user.organizationId != null) response.organizationId = user.organizationId
    if ('tenantId' in user && user.tenantId != null) response.tenantId = user.tenantId
    if ('preferredLanguage' in user) response.preferredLanguage = user.preferredLanguage
    return c.json(response)
  } catch {
    return c.json({ message: 'Unauthorized' }, 401)
  }
})

authRoutes.patch('/me', authMiddleware, async (c) => {
  const user = c.get('user') as { id: number }
  const body = await c.req.json()
  const parsed = updateMeSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ message: 'Invalid request' }, 400)
  }
  const updates: Record<string, unknown> = {}
  if (parsed.data.preferredLanguage !== undefined) {
    updates.preferredLanguage = parsed.data.preferredLanguage
  }
  if (Object.keys(updates).length === 0) {
    return c.json({ message: 'No updates provided' }, 400)
  }
  await db.update(users).set(updates as any).where(eq(users.id, user.id))
  const [updated] = await db.select().from(users).where(eq(users.id, user.id))
  const response: Record<string, unknown> = {
    id: updated!.id,
    username: updated!.username,
    email: updated!.email,
    firstName: updated!.firstName,
    lastName: updated!.lastName,
    profile: updated!.profile || 'standard-user',
  }
  if ('organizationId' in updated! && updated!.organizationId != null) response.organizationId = updated!.organizationId
  if ('tenantId' in updated! && updated!.tenantId != null) response.tenantId = updated!.tenantId
  if ('preferredLanguage' in updated!) response.preferredLanguage = updated!.preferredLanguage
  return c.json(response)
})
