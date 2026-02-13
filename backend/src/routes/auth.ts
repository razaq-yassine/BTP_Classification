import { Hono } from 'hono'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { signToken, verifyToken } from '../lib/jwt.js'

const loginSchema = z.object({ username: z.string(), password: z.string() })

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

  return c.json({
    accessToken: token,
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  })
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
    return c.json({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    })
  } catch {
    return c.json({ message: 'Unauthorized' }, 401)
  }
})
