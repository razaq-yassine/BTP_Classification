/**
 * Filter list views by user profile.
 * Views with no profiles or empty profiles are visible to all.
 * Views with profiles are visible only to users whose profile is in the array.
 */
export function filterViewsByProfile<T extends { profiles?: string[] }>(
  views: T[],
  profileName: string,
  isAdmin: boolean
): T[] {
  if (isAdmin) return views
  return views.filter((v) => {
    if (!v.profiles || v.profiles.length === 0) return true
    return v.profiles.includes(profileName)
  })
}
