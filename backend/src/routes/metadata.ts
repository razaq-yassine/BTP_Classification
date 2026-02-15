import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import {
  validateObject,
  validateFieldsIndex,
  validateListView,
  validateDetailView,
  validateRelatedObjects,
  validateField,
  getObjectNamesForValidation,
  validateMetadataFull,
  validateProfile,
} from '../metadata/validate.js'
import { SYSTEM_FIELDS_SET, SYSTEM_OBJECTS_SET, SYSTEM_INFO_SECTION_FIELDS } from '../../../shared/dist/protected-metadata.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.join(__dirname, '..', '..')
const defaultMetadataPath = path.join(backendRoot, '../frontend/public/metadata')
const METADATA_PATH = process.env.METADATA_PATH || defaultMetadataPath
const OBJECTS_PATH = path.join(METADATA_PATH, 'objects')
const PROFILES_PATH = path.join(METADATA_PATH, 'profiles')

const ALLOWED_FILES = ['object.json', 'listView.json', 'detailView.json', 'fields.json', 'header.json', 'relatedObjects.json']

function filterSystemObjects(names: string[]): string[] {
  return names.filter((name) => !SYSTEM_OBJECTS_SET.has(name.toLowerCase()))
}

function pluralize(name: string): string {
  if (name.endsWith('y')) return name.slice(0, -1) + 'ies'
  if (name.endsWith('s')) return name + 'es'
  return name + 's'
}

function updateObjectIndex(names: string[]): void {
  const indexPath = path.join(OBJECTS_PATH, 'index.json')
  fs.writeFileSync(indexPath, JSON.stringify(names, null, 2))
}

function getObjectsPath() {
  return OBJECTS_PATH
}

function loadFieldKeys(objectName: string): string[] {
  const fieldsPath = path.join(OBJECTS_PATH, objectName, 'fields.json')
  if (!fs.existsSync(fieldsPath)) return []
  try {
    const data = JSON.parse(fs.readFileSync(fieldsPath, 'utf-8'))
    if (!Array.isArray(data)) return []
    return data.filter((k: string) => typeof k === 'string' && !SYSTEM_FIELDS_SET.has(k))
  } catch {
    return []
  }
}

function getVersionPath() {
  return path.join(METADATA_PATH, 'version.json')
}

function bumpVersion() {
  const versionPath = getVersionPath()
  fs.writeFileSync(versionPath, JSON.stringify({ version: Date.now() }, null, 2))
}

// Debouncing for auto-deploy to prevent multiple simultaneous runs
let deployTimeout: NodeJS.Timeout | null = null
let isDeploying = false
const DEPLOY_DEBOUNCE_MS = 2000 // Wait 2 seconds after last save before deploying

/**
 * Triggers db:deploy automatically after metadata changes.
 * Uses debouncing to batch multiple rapid changes into a single deploy.
 * Runs asynchronously and doesn't block the HTTP response.
 */
function triggerAutoDeploy() {
  // Clear existing timeout
  if (deployTimeout) {
    clearTimeout(deployTimeout)
  }

  // Set new timeout
  deployTimeout = setTimeout(async () => {
    if (isDeploying) {
      console.log('[Auto-deploy] Deploy already in progress, skipping...')
      return
    }

    isDeploying = true
    console.log('[Auto-deploy] Starting automatic db:deploy...')

    try {
      const deployProcess = spawn('pnpm', ['run', 'db:deploy'], {
        cwd: backendRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      })

      let stdout = ''
      let stderr = ''

      deployProcess.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      deployProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      await new Promise<void>((resolve, reject) => {
        deployProcess.on('close', (code) => {
          if (code === 0) {
            console.log('[Auto-deploy] ✅ Successfully deployed database schema')
            console.log('[Auto-deploy] Schema and entity registry updated. Server will auto-reload if using `tsx watch`.')
            console.log(stdout)
            resolve()
          } else {
            console.error('[Auto-deploy] ❌ Failed to deploy database schema')
            console.error(stderr)
            // Don't reject - we don't want to fail the HTTP request
            // Just log the error
            resolve()
          }
        })

        deployProcess.on('error', (err) => {
          console.error('[Auto-deploy] Error spawning deploy process:', err)
          // Don't reject - just log
          resolve()
        })
      })
    } catch (err) {
      console.error('[Auto-deploy] Unexpected error:', err)
    } finally {
      isDeploying = false
    }
  }, DEPLOY_DEBOUNCE_MS)
}

export const metadataRoutes = new Hono()

metadataRoutes.use('*', authMiddleware)

metadataRoutes.get('/objects', (c) => {
  try {
    const indexPath = path.join(OBJECTS_PATH, 'index.json')
    let names: string[] = []
    if (fs.existsSync(indexPath)) {
      const data = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
      names = Array.isArray(data) ? data : []
    } else if (fs.existsSync(OBJECTS_PATH)) {
      names = fs.readdirSync(OBJECTS_PATH).filter((d) => {
        const p = path.join(OBJECTS_PATH, d)
        return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'object.json'))
      })
    }
    return c.json(filterSystemObjects(names))
  } catch (err) {
    console.error('Metadata list error:', err)
    return c.json({ message: 'Failed to list objects' }, 500)
  }
})

metadataRoutes.post('/objects', async (c) => {
  try {
    const body = (await c.req.json()) as { name?: string }
    const name = typeof body?.name === 'string' ? body.name.trim().toLowerCase() : ''
    if (!name || !/^[a-z][a-z0-9]*$/.test(name)) {
      return c.json({ message: 'Invalid object name. Use lowercase letters and numbers only (e.g. product, orderItem).' }, 400)
    }
    const objPath = path.join(OBJECTS_PATH, name)
    if (fs.existsSync(objPath)) {
      return c.json({ message: `Object "${name}" already exists.` }, 409)
    }
    if (SYSTEM_OBJECTS_SET.has(name)) {
      return c.json({ message: `"${name}" is a reserved system object name.` }, 400)
    }

    const plural = pluralize(name)
    const label = name.charAt(0).toUpperCase() + name.slice(1)
    const labelPlural = plural.charAt(0).toUpperCase() + plural.slice(1)

    const objectJson = {
      name,
      label,
      labelPlural,
      description: '',
      apiEndpoint: `/api/${plural}`,
      basePath: `/${plural}`,
      detailPath: `/${plural}/$${name}Id`,
      icon: 'Layers',
      color: 'blue',
      sidebar: { showInSidebar: true, group: 'Data' },
    }

    const fieldsIndex = ['name']
    const listViewJson = { fields: ['name', 'createdAt'], defaultSort: 'createdAt', defaultSortOrder: 'desc', pageSize: 10 }
    const detailViewJson = {
      layout: 'two-column',
      sections: [
        { title: 'Basic Information', columns: 2, defaultOpen: true, fields: ['name'] },
        { title: 'System Information', columns: 2, defaultOpen: false, fields: [...SYSTEM_INFO_SECTION_FIELDS] },
      ],
    }
    const relatedObjectsJson: unknown[] = []

    const nameFieldDef = {
      key: 'name',
      label: 'Name',
      type: 'string',
      required: true,
      editable: false,
      sortable: true,
      searchable: true,
    }

    fs.mkdirSync(path.join(objPath, 'fields'), { recursive: true })
    fs.writeFileSync(path.join(objPath, 'object.json'), JSON.stringify(objectJson, null, 2))
    fs.writeFileSync(path.join(objPath, 'fields.json'), JSON.stringify(fieldsIndex, null, 2))
    fs.writeFileSync(path.join(objPath, 'listView.json'), JSON.stringify(listViewJson, null, 2))
    fs.writeFileSync(path.join(objPath, 'detailView.json'), JSON.stringify(detailViewJson, null, 2))
    fs.writeFileSync(path.join(objPath, 'relatedObjects.json'), JSON.stringify(relatedObjectsJson, null, 2))
    fs.writeFileSync(
      path.join(objPath, 'fields', 'name.json'),
      JSON.stringify(nameFieldDef, null, 2)
    )

    const names = fs.readdirSync(OBJECTS_PATH).filter((d) => {
      const p = path.join(OBJECTS_PATH, d)
      return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'object.json'))
    })
    names.sort()
    updateObjectIndex(names)
    bumpVersion()

    // Trigger auto-deploy after creating a new object
    triggerAutoDeploy()

    return c.json({ success: true, name }, 201)
  } catch (err) {
    console.error('Metadata create object error:', err)
    return c.json({ message: 'Failed to create object' }, 500)
  }
})

metadataRoutes.delete('/objects/:name', async (c) => {
  try {
    const name = c.req.param('name')
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '')
    if (!safeName) {
      return c.json({ message: 'Invalid object name' }, 400)
    }
    if (SYSTEM_OBJECTS_SET.has(safeName.toLowerCase())) {
      return c.json({ message: `"${safeName}" is a reserved system object and cannot be deleted.` }, 400)
    }

    const objPath = path.join(OBJECTS_PATH, safeName)
    if (!fs.existsSync(objPath)) {
      return c.json({ message: `Object "${safeName}" not found` }, 404)
    }
    if (!path.resolve(objPath).startsWith(path.resolve(OBJECTS_PATH))) {
      return c.json({ message: 'Invalid path' }, 400)
    }

    fs.rmSync(objPath, { recursive: true })

    const names = fs.readdirSync(OBJECTS_PATH).filter((d) => {
      const p = path.join(OBJECTS_PATH, d)
      return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'object.json'))
    })
    names.sort()
    updateObjectIndex(names)
    bumpVersion()

    triggerAutoDeploy()

    return c.json({ success: true })
  } catch (err) {
    console.error('Metadata delete object error:', err)
    return c.json({ message: 'Failed to delete object' }, 500)
  }
})

metadataRoutes.get('/objects/:name/:file', (c) => {
  const name = c.req.param('name')
  const file = c.req.param('file')
  if (!ALLOWED_FILES.includes(file)) {
    return c.json({ message: 'Invalid file' }, 400)
  }
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '')
  const filePath = path.join(OBJECTS_PATH, safeName, file)
  if (!path.resolve(filePath).startsWith(path.resolve(OBJECTS_PATH))) {
    return c.json({ message: 'Invalid path' }, 400)
  }
  try {
    if (!fs.existsSync(filePath)) {
      return c.json({ message: 'Not found' }, 404)
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return c.json(data)
  } catch (err) {
    console.error('Metadata read error:', err)
    return c.json({ message: 'Failed to read file' }, 500)
  }
})

metadataRoutes.put('/objects/:name/:file', async (c) => {
  const name = c.req.param('name')
  const file = c.req.param('file')
  if (!ALLOWED_FILES.includes(file)) {
    return c.json({ message: 'Invalid file' }, 400)
  }
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '')
  const filePath = path.join(OBJECTS_PATH, safeName, file)
  if (!path.resolve(filePath).startsWith(path.resolve(OBJECTS_PATH))) {
    return c.json({ message: 'Invalid path' }, 400)
  }
  try {
    const body = await c.req.json()
    let result: { valid: boolean; errors: Array<{ path: string; message: string; code?: string }> }
    if (file === 'object.json') {
      result = validateObject(safeName, body as Record<string, unknown>)
    } else if (file === 'fields.json') {
      result = validateFieldsIndex(safeName, body)
    } else if (file === 'listView.json') {
      const fieldKeys = loadFieldKeys(safeName)
      result = validateListView(safeName, body as Record<string, unknown>, fieldKeys)
    } else if (file === 'detailView.json') {
      const fieldKeys = loadFieldKeys(safeName)
      result = validateDetailView(safeName, body as Record<string, unknown>, fieldKeys)
    } else if (file === 'relatedObjects.json') {
      const objectNames = getObjectNamesForValidation(OBJECTS_PATH)
      result = validateRelatedObjects(safeName, body, objectNames)
    } else {
      result = { valid: true, errors: [] }
    }
    if (!result.valid) {
      const message = result.errors[0]?.message ?? 'Validation failed'
      return c.json({ message, errors: result.errors }, 400)
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(body, null, 2))
    bumpVersion()
    
    // Trigger auto-deploy after updating metadata files
    // Only deploy for files that affect schema (object.json, fields.json, relatedObjects.json)
    if (file === 'object.json' || file === 'fields.json' || file === 'relatedObjects.json') {
      triggerAutoDeploy()
    }
    
    return c.json({ success: true })
  } catch (err) {
    console.error('Metadata write error:', err)
    return c.json({ message: 'Failed to write file' }, 500)
  }
})

metadataRoutes.get('/objects/:name/fields/:fieldKey', (c) => {
  const name = c.req.param('name')
  const fieldKey = c.req.param('fieldKey')
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '')
  const safeFieldKey = fieldKey.replace(/[^a-zA-Z0-9_-]/g, '')
  const filePath = path.join(OBJECTS_PATH, safeName, 'fields', `${safeFieldKey}.json`)
  if (!path.resolve(filePath).startsWith(path.resolve(OBJECTS_PATH))) {
    return c.json({ message: 'Invalid path' }, 400)
  }
  try {
    if (!fs.existsSync(filePath)) {
      return c.json({ message: 'Not found' }, 404)
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return c.json(data)
  } catch (err) {
    console.error('Metadata field read error:', err)
    return c.json({ message: 'Failed to read field' }, 500)
  }
})

metadataRoutes.put('/objects/:name/fields/:fieldKey', async (c) => {
  const name = c.req.param('name')
  const fieldKey = c.req.param('fieldKey')
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '')
  const safeFieldKey = fieldKey.replace(/[^a-zA-Z0-9_-]/g, '')
  if (SYSTEM_FIELDS_SET.has(safeFieldKey)) {
    return c.json({ message: 'System fields cannot be edited' }, 400)
  }
  const fieldsDir = path.join(OBJECTS_PATH, safeName, 'fields')
  const filePath = path.join(fieldsDir, `${safeFieldKey}.json`)
  if (!path.resolve(filePath).startsWith(path.resolve(OBJECTS_PATH))) {
    return c.json({ message: 'Invalid path' }, 400)
  }
  const isNewField = !fs.existsSync(filePath)
  if (isNewField && safeFieldKey === 'name') {
    return c.json({ message: 'Name field is reserved' }, 400)
  }
  if (isNewField && !/^[a-z][a-z0-9_]*$/.test(safeFieldKey)) {
    return c.json({ message: 'Field key must start with a letter and contain only lowercase letters, numbers, and underscores' }, 400)
  }
  try {
    const body = (await c.req.json()) as Record<string, unknown>
    if (safeFieldKey === 'name') {
      body.required = true
      body.editable = false
    }
    const objectNames = getObjectNamesForValidation(OBJECTS_PATH)
    const fieldKeys = loadFieldKeys(safeName)
    const result = validateField(safeName, safeFieldKey, body, objectNames, {
      objectsPath: OBJECTS_PATH,
      fieldKeys,
    })
    if (!result.valid) {
      const message = result.errors[0]?.message ?? 'Validation failed'
      return c.json({ message, errors: result.errors }, 400)
    }
    fs.mkdirSync(fieldsDir, { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(body, null, 2))
    bumpVersion()
    
    // Trigger auto-deploy after creating/updating fields (affects schema)
    triggerAutoDeploy()
    
    return c.json({ success: true })
  } catch (err) {
    console.error('Metadata field write error:', err)
    return c.json({ message: 'Failed to write field' }, 500)
  }
})

// ============ Profiles API ============
metadataRoutes.get('/profiles', (c) => {
  try {
    if (!fs.existsSync(PROFILES_PATH)) {
      return c.json([])
    }
    const files = fs.readdirSync(PROFILES_PATH)
    const names = files
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''))
      .sort()
    return c.json(names)
  } catch (err) {
    console.error('Profiles list error:', err)
    return c.json({ message: 'Failed to list profiles' }, 500)
  }
})

metadataRoutes.get('/profiles/:name', (c) => {
  const name = c.req.param('name')
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '')
  const filePath = path.join(PROFILES_PATH, `${safeName}.json`)
  if (!path.resolve(filePath).startsWith(path.resolve(PROFILES_PATH))) {
    return c.json({ message: 'Invalid path' }, 400)
  }
  try {
    if (!fs.existsSync(filePath)) {
      return c.json({ message: 'Profile not found' }, 404)
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return c.json(data)
  } catch (err) {
    console.error('Profile read error:', err)
    return c.json({ message: 'Failed to read profile' }, 500)
  }
})

metadataRoutes.post('/profiles', async (c) => {
  try {
    const body = (await c.req.json()) as Record<string, unknown>
    const name = typeof body?.name === 'string' ? body.name.trim().toLowerCase().replace(/\s+/g, '-') : ''
    if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
      return c.json({ message: 'Invalid profile name. Use lowercase letters, numbers, and hyphens (e.g. sales-rep).' }, 400)
    }
    const filePath = path.join(PROFILES_PATH, `${name}.json`)
    if (fs.existsSync(filePath)) {
      return c.json({ message: `Profile "${name}" already exists.` }, 409)
    }
    fs.mkdirSync(PROFILES_PATH, { recursive: true })
    const profileData = {
      name,
      label: body.label || name,
      description: body.description || '',
      objectPermissions: body.objectPermissions || {},
    }
    const result = validateProfile(name, profileData, OBJECTS_PATH)
    if (!result.valid) {
      const message = result.errors[0]?.message ?? 'Validation failed'
      return c.json({ message, errors: result.errors }, 400)
    }
    fs.writeFileSync(filePath, JSON.stringify(profileData, null, 2))
    bumpVersion()
    return c.json(profileData, 201)
  } catch (err) {
    console.error('Profile create error:', err)
    return c.json({ message: 'Failed to create profile' }, 500)
  }
})

metadataRoutes.put('/profiles/:name', async (c) => {
  const name = c.req.param('name')
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '')
  const filePath = path.join(PROFILES_PATH, `${safeName}.json`)
  if (!path.resolve(filePath).startsWith(path.resolve(PROFILES_PATH))) {
    return c.json({ message: 'Invalid path' }, 400)
  }
  try {
    if (!fs.existsSync(filePath)) {
      return c.json({ message: 'Profile not found' }, 404)
    }
    const body = (await c.req.json()) as Record<string, unknown>
    if (body.name && body.name !== safeName) {
      return c.json({ message: 'Profile name cannot be changed' }, 400)
    }
    const profileData = { ...body, name: safeName }
    const result = validateProfile(safeName, profileData, OBJECTS_PATH)
    if (!result.valid) {
      const message = result.errors[0]?.message ?? 'Validation failed'
      return c.json({ message, errors: result.errors }, 400)
    }
    fs.writeFileSync(filePath, JSON.stringify(profileData, null, 2))
    bumpVersion()
    return c.json({ success: true })
  } catch (err) {
    console.error('Profile update error:', err)
    return c.json({ message: 'Failed to update profile' }, 500)
  }
})

metadataRoutes.post('/validate', (c) => {
  try {
    const result = validateMetadataFull(METADATA_PATH)
    return c.json({ valid: result.valid, errors: result.errors })
  } catch (err) {
    console.error('Metadata validate error:', err)
    return c.json({ message: 'Failed to validate metadata' }, 500)
  }
})

metadataRoutes.post('/bump-version', (c) => {
  try {
    bumpVersion()
    return c.json({ success: true })
  } catch (err) {
    console.error('Bump version error:', err)
    return c.json({ message: 'Failed to bump version' }, 500)
  }
})
