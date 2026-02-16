/**
 * Permission checking utilities.
 * Provides functions to check object-level and field-level permissions based on user profiles.
 */
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { loadProfile, type Profile, type ObjectPermission, type FieldPermission } from '../metadata/profiles.js'

type FieldDefinition = { key: string; [k: string]: unknown }

/** Synthetic admin profile - full access, no OLS/FLS needed */
const ADMIN_PROFILE: Profile = {
  name: 'admin',
  label: 'Administrator',
  description: 'Full access to all objects and fields',
  objectPermissions: {},
}

/**
 * Get user's profile by user ID.
 * Admin users get full access without needing profile file or OLS/FLS.
 */
export async function getUserProfile(userId: number): Promise<Profile | null> {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId))
    if (!user || !user.profile) {
      return loadProfile('standard-user') // Default to standard-user if no profile set
    }
    if (user.profile === 'admin') {
      return ADMIN_PROFILE
    }
    return loadProfile(user.profile)
  } catch (err) {
    console.error(`Failed to get user profile for user ${userId}:`, err)
    return loadProfile('standard-user') // Fallback to standard-user on error
  }
}

/**
 * Check if profile has permission for an object action.
 * Admin profile bypasses all checks and has full access to everything.
 */
export function hasObjectPermission(
  profile: Profile | null,
  objectName: string,
  action: 'create' | 'read' | 'update' | 'delete'
): boolean {
  if (!profile) return false
  if (profile.name === 'admin') return true

  const objPerm = profile.objectPermissions[objectName]
  if (!objPerm) return false // Deny by default

  return objPerm[action] === true
}

/**
 * Check if profile has field permission (visible or editable).
 * Admin profile bypasses all checks and has full access to all fields.
 */
export function hasFieldPermission(
  profile: Profile | null,
  objectName: string,
  fieldKey: string,
  permission: 'visible' | 'editable'
): boolean {
  if (!profile) return false
  if (profile.name === 'admin') return true

  const objPerm = profile.objectPermissions[objectName]
  if (!objPerm) return false // Deny by default

  // If no fieldPermissions specified, allow all fields (for profiles with broad object perms)
  if (!objPerm.fieldPermissions) {
    // Check object-level permission first
    if (permission === 'visible') {
      return objPerm.read === true
    }
    if (permission === 'editable') {
      return objPerm.update === true
    }
    return false
  }
  
  const fieldPerm = objPerm.fieldPermissions[fieldKey]
  if (!fieldPerm) return false // Deny by default
  
  // Field permissions require object-level permissions
  if (permission === 'visible') {
    return objPerm.read === true && fieldPerm.visible === true
  }
  if (permission === 'editable') {
    return objPerm.update === true && fieldPerm.editable === true
  }
  
  return false
}

/**
 * Filter fields based on profile permissions (for visible permission).
 * Admin profile sees all fields.
 */
export function filterFieldsByPermissions(
  profile: Profile | null,
  objectName: string,
  fields: FieldDefinition[]
): FieldDefinition[] {
  if (!profile) return []
  if (profile.name === 'admin') return fields

  const objPerm = profile.objectPermissions[objectName]
  if (!objPerm || objPerm.read !== true) {
    return [] // Can't read object, return no fields
  }
  
  // If no fieldPermissions specified, return all fields (admin case)
  if (!objPerm.fieldPermissions) {
    return fields
  }
  
  // Filter to only visible fields
  return fields.filter((field) => {
    const fieldPerm = objPerm.fieldPermissions![field.key]
    if (!fieldPerm) return false // Deny by default
    return fieldPerm.visible === true
  })
}

/**
 * Check if a field can be edited based on profile permissions
 */
export function canEditField(
  profile: Profile | null,
  objectName: string,
  fieldKey: string
): boolean {
  return hasFieldPermission(profile, objectName, fieldKey, 'editable')
}

/**
 * Check if a field is visible based on profile permissions
 */
export function isFieldVisible(
  profile: Profile | null,
  objectName: string,
  fieldKey: string
): boolean {
  return hasFieldPermission(profile, objectName, fieldKey, 'visible')
}
