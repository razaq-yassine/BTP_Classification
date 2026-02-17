/**
 * Profile loader module.
 * Loads profile definitions from metadata/profiles/ directory.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.join(__dirname, '..', '..')
const defaultMetadataPath = path.join(backendRoot, '../frontend/public/metadata')
const METADATA_PATH = process.env.METADATA_PATH || defaultMetadataPath
const PROFILES_PATH = path.join(METADATA_PATH, 'profiles')

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
  objectPermissions: Record<string, ObjectPermission>
  globalActionPermissions?: Record<string, boolean>
}

/**
 * Load a profile by name from metadata/profiles/
 */
export function loadProfile(profileName: string): Profile | null {
  try {
    const profilePath = path.join(PROFILES_PATH, `${profileName}.json`)
    if (!fs.existsSync(profilePath)) {
      return null
    }
    const data = JSON.parse(fs.readFileSync(profilePath, 'utf-8')) as Profile
    return data
  } catch (err) {
    console.error(`Failed to load profile ${profileName}:`, err)
    return null
  }
}

/**
 * Load all profiles from metadata/profiles/
 */
export function loadAllProfiles(): Profile[] {
  try {
    if (!fs.existsSync(PROFILES_PATH)) {
      return []
    }
    const files = fs.readdirSync(PROFILES_PATH)
    const profiles: Profile[] = []
    for (const file of files) {
      if (file.endsWith('.json')) {
        const profileName = file.slice(0, -5) // Remove .json extension
        const profile = loadProfile(profileName)
        if (profile) {
          profiles.push(profile)
        }
      }
    }
    return profiles
  } catch (err) {
    console.error('Failed to load profiles:', err)
    return []
  }
}
