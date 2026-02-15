/**
 * Permission middleware for checking object-level permissions.
 */
import { createMiddleware } from 'hono/factory'
import { getUserProfile, hasObjectPermission } from '../lib/permissions.js'
import { entityRegistry } from '../routes/entity-registry.generated.js'

/**
 * Convert entity path (plural) to object name (singular)
 * e.g., 'orders' -> 'order', 'categories' -> 'category'
 */
function entityPathToObjectName(entityPath: string): string {
  if (entityPath.endsWith('ies')) {
    return entityPath.slice(0, -3) + 'y'
  }
  if (entityPath.endsWith('s') && !entityPath.endsWith('ss') && entityPath !== 'users') {
    return entityPath.slice(0, -1)
  }
  return entityPath
}

/**
 * Middleware to check object-level permission for a specific action.
 * Must be used after authMiddleware (user must be authenticated).
 * Extracts object name from entityPath route parameter.
 * 
 * @param action - The action to check: 'create', 'read', 'update', or 'delete'
 * @returns Middleware that checks permission and returns 403 if denied
 */
export function checkObjectPermission(action: 'create' | 'read' | 'update' | 'delete') {
  return createMiddleware(async (c, next) => {
    const user = c.get('user')
    if (!user || !user.id) {
      return c.json({ message: 'Unauthorized' }, 401)
    }
    
    // Extract entityPath from route parameter
    const entityPath = c.req.param('entityPath') as string | undefined
    if (!entityPath) {
      // Try to extract from path if param not available
      const pathParts = c.req.path.split('/').filter(Boolean)
      const apiIndex = pathParts.indexOf('api')
      if (apiIndex >= 0 && apiIndex < pathParts.length - 1) {
        const pathEntityPath = pathParts[apiIndex + 1]
        if (pathEntityPath && entityRegistry[pathEntityPath as keyof typeof entityRegistry]) {
          const objectName = entityRegistry[pathEntityPath as keyof typeof entityRegistry].objectName
          const profile = await getUserProfile(user.id)
          if (!hasObjectPermission(profile, objectName, action)) {
            return c.json({ message: 'Forbidden' }, 403)
          }
          await next()
          return
        }
      }
      return c.json({ message: 'Invalid route' }, 400)
    }
    
    // Get object name from entity registry
    const config = entityRegistry[entityPath as keyof typeof entityRegistry]
    if (!config) {
      return c.json({ message: 'Invalid entity' }, 400)
    }
    
    const objectName = config.objectName
    const profile = await getUserProfile(user.id)
    if (!hasObjectPermission(profile, objectName, action)) {
      return c.json({ message: 'Forbidden' }, 403)
    }
    
    await next()
  })
}
