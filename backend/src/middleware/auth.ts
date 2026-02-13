import { createMiddleware } from 'hono/factory'
import { verifyToken } from '../lib/jwt.js'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'

export const authMiddleware = createMiddleware(async (c, next) => {
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
    c.set('user', user)
    await next()
  } catch {
    return c.json({ message: 'Unauthorized' }, 401)
  }
})
