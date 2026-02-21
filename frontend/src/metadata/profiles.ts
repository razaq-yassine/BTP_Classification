/**
 * Profile loader module.
 * Loads profile definitions from metadata/profiles/ directory.
 */

const METADATA_BASE = '/metadata'

export interface FieldPermission {
  visible: boolean
  editable: boolean
}

export interface ObjectPermission {
  create: boolean
  read: boolean
  update: boolean
  delete: boolean
  fieldPermissions?: Record<string, FieldPermission>
}

export interface Profile {
  name: string
  label: string
  description?: string
  /** Sidebar ID from metadata/sidebars/. If omitted, uses "default". */
  sidebar?: string
  objectPermissions: Record<string, ObjectPermission>
  globalActionPermissions?: Record<string, boolean>
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${METADATA_BASE}${path}`)
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`)
  return res.json()
}

/**
 * Load a profile by name from metadata/profiles/
 */
export async function loadProfile(profileName: string): Promise<Profile> {
  return fetchJson<Profile>(`/profiles/${profileName}.json`)
}

/**
 * Load all profiles from metadata/profiles/
 */
export async function loadAllProfiles(): Promise<Profile[]> {
  try {
    // List all profile files
    const profiles: Profile[] = []
    // Since we don't have an index.json for profiles, we'll need to try common profile names
    // or implement a different approach. For now, we'll try to load known profiles.
    const knownProfiles = ['admin', 'standard-user']
    for (const name of knownProfiles) {
      try {
        const profile = await loadProfile(name)
        profiles.push(profile)
      } catch {
        // Profile doesn't exist, skip
      }
    }
    return profiles
  } catch (err) {
    console.error('Failed to load profiles:', err)
    return []
  }
}
