/**
 * Config routes - tenant config, etc.
 * GET /api/config/tenant-config returns tenant-config.json for frontend.
 */
import { Hono } from 'hono'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { authMiddleware } from '../middleware/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.join(__dirname, '..', '..')
const defaultMetadataPath = path.join(backendRoot, '../frontend/public/metadata')
const METADATA_PATH = process.env.METADATA_PATH || defaultMetadataPath

export const configRoutes = new Hono()

configRoutes.use('*', authMiddleware)

configRoutes.get('/tenant-config', (c) => {
  const configPath = path.join(METADATA_PATH, 'tenant-config.json')
  if (!fs.existsSync(configPath)) {
    return c.json({ mode: 'none' })
  }
  try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    return c.json(data)
  } catch {
    return c.json({ mode: 'none' })
  }
})
