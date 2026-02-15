/**
 * Middleware that requires user to have admin profile.
 * Must be used after authMiddleware (user must be authenticated).
 */
import { createMiddleware } from 'hono/factory'

export const adminOnlyMiddleware = createMiddleware(async (c, next) => {
  const user = c.get('user') as { profile?: string } | undefined
  if (!user || user.profile !== 'admin') {
    return c.json({ message: 'Forbidden: admin access required' }, 403)
  }
  await next()
})
