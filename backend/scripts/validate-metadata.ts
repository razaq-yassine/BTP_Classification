/**
 * Validates metadata before deployment.
 * Run: pnpm run db:validate-metadata
 *
 * Reads metadata from METADATA_PATH or ../frontend/public/metadata
 * Exits with code 1 if any errors; 0 if valid.
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { validateMetadataFull } from '../src/metadata/validate.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.join(__dirname, '..')
const defaultMetadataPath = path.join(backendRoot, '../frontend/public/metadata')
const METADATA_PATH = process.env.METADATA_PATH || defaultMetadataPath

const result = validateMetadataFull(METADATA_PATH)

if (result.valid) {
  console.log('Metadata validation passed.')
  process.exit(0)
}

console.error('Metadata validation failed (' + result.errors.length + ' error(s)):')
for (const err of result.errors) {
  console.error(`  [${err.path}] ${err.message}`)
}
process.exit(1)
