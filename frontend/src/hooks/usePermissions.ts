/**
 * Permission checking hook.
 * Provides functions to check object-level and field-level permissions based on user's profile.
 */
import { useMemo } from 'react'
import { useAuthStore, selectUser } from '@/stores/authStore'
import { loadProfile, type Profile } from '@/metadata/profiles'
import { useQuery } from '@tanstack/react-query'

/**
 * Hook to check permissions based on user's profile
 */
export function usePermissions() {
  const user = useAuthStore(selectUser)
  const profileName = (user?.profile || 'standard-user').toLowerCase()

  // Load user's profile (skip when not authenticated)
  const { data: profile, isLoading } = useQuery<Profile | null>({
    queryKey: ['profile', profileName],
    queryFn: async () => {
      try {
        return await loadProfile(profileName)
      } catch {
        return null
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  const permissionHelpers = useMemo(() => {
    // Admin profile: full access to everything without needing OLS/FLS in profile
    const isAdmin = profileName === 'admin'

    /**
     * Check if user has permission for an object action
     */
    const hasObjectPermission = (
      objectName: string,
      action: 'create' | 'read' | 'update' | 'delete'
    ): boolean => {
      if (isAdmin) return true
      if (!profile) return false
      const objPerm = profile.objectPermissions[objectName]
      if (!objPerm) return false // Deny by default
      return objPerm[action] === true
    }

    /**
     * Check if user has permission to use a global action (tool, quick create, etc.)
     */
    const canUseGlobalAction = (actionId: string): boolean => {
      if (isAdmin) return true
      if (!profile) return false
      const perms = profile.globalActionPermissions
      if (!perms) return false
      return perms[actionId] === true
    }

    /**
     * Check if user has field permission (visible or editable)
     */
    const hasFieldPermission = (
      objectName: string,
      fieldKey: string,
      permission: 'visible' | 'editable'
    ): boolean => {
      if (isAdmin) return true
      if (!profile) return false
      const objPerm = profile.objectPermissions[objectName]
      if (!objPerm) return false // Deny by default

      // If no fieldPermissions specified, allow all fields (for profiles with broad object perms)
      if (!objPerm.fieldPermissions) {
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

    return {
      profile,
      isLoading,
      hasObjectPermission,
      hasFieldPermission,
      canCreate: (objectName: string) => hasObjectPermission(objectName, 'create'),
      canRead: (objectName: string) => hasObjectPermission(objectName, 'read'),
      canUpdate: (objectName: string) => hasObjectPermission(objectName, 'update'),
      canDelete: (objectName: string) => hasObjectPermission(objectName, 'delete'),
      canUseGlobalAction,
      isFieldVisible: (objectName: string, fieldKey: string) =>
        hasFieldPermission(objectName, fieldKey, 'visible'),
      canEditField: (objectName: string, fieldKey: string) =>
        hasFieldPermission(objectName, fieldKey, 'editable'),
    }
  }, [profile, profileName, isLoading])

  return permissionHelpers
}
