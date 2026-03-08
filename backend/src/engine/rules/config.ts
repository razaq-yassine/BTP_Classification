/**
 * Loads all rule configs from JSON files at import time.
 * Validates required fields and caches configs in memory.
 * Source of truth for classification rules - version-controlled in git.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RULES_DIR = path.join(__dirname)

// --- Types ---

export type ClassRule = {
  classe: string
  minCaMDH: number | null
  minEngineers: number
  minTechnicians: number
  minGeologues?: number
  minElectromecaniciens?: number
  minEncadrementScore: number
  minCapitalSocialMDH?: number
}

export type ClasseSBonus = {
  description?: string
  pointsPerSlice: number
  sliceMDH: number
  requiresEngineerPerSlice?: boolean
}

export type ClasseBonus = {
  appliesToClasse: string
  pointsPerSlice: number
  sliceMDH: number
  requiresEngineerPerSlice?: boolean
}

export type TableauConfig = {
  classes: ClassRule[]
  classeSBonus?: ClasseSBonus
  classeBonus?: ClasseBonus
}

export type SectorConfig = {
  sector: string
  label: string
  masseSalarialeRatioPercent: number | null
  specialStaffRequirement?: { role: string; label: string; note: string }
  tableau1: TableauConfig
  tableau2?: TableauConfig | null
  note?: string
}

export type EncadrementRole = {
  role: string
  label: string
  score?: number
  scoreLt5?: number
  scoreGte5?: number
  baseScoreAppliesToAllSectors: boolean
  diplomaScoreMaxSectors?: number
}

export type EncadrementConfig = {
  roles: EncadrementRole[]
  rules: Record<string, unknown>
}

export type MasseSalarialeConfig = {
  ratiosBySector: Array<{ sector: string; minRatioPercent: number }>
  rules: Record<string, unknown>
}

export type BonificationConfig = {
  applicableSectors: string[]
  excludedSectors: string[]
  note?: string
  coefficients: Array<{
    sectors: number
    coefficientHighClasses: number
    coefficientLowClasses: number
  }>
  highClasses: string[]
  lowClasses: string[]
}

// --- Load & validate helpers ---

function loadAndParse<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Rule config file not found: ${filePath}`)
  }
  const raw = fs.readFileSync(filePath, 'utf-8')
  try {
    return JSON.parse(raw) as T
  } catch (err) {
    throw new Error(
      `Rule config parse error in ${path.basename(filePath)}: ${(err as Error).message}`
    )
  }
}

function validateSectorConfig(cfg: unknown, file: string): SectorConfig {
  const c = cfg as Record<string, unknown>
  if (!c || typeof c !== 'object') {
    throw new Error(`${file}: config must be an object`)
  }
  if (typeof c.sector !== 'string' || !c.sector.trim()) {
    throw new Error(`${file}: required field "sector" must be a non-empty string`)
  }
  if (typeof c.label !== 'string' || !c.label.trim()) {
    throw new Error(`${file}: required field "label" must be a non-empty string`)
  }
  if (c.masseSalarialeRatioPercent != null && typeof c.masseSalarialeRatioPercent !== 'number') {
    throw new Error(`${file}: field "masseSalarialeRatioPercent" must be a number or null`)
  }
  if (!c.tableau1 || typeof c.tableau1 !== 'object') {
    throw new Error(`${file}: required field "tableau1" must be an object`)
  }
  const t1 = c.tableau1 as Record<string, unknown>
  if (!Array.isArray(t1.classes)) {
    throw new Error(`${file}: tableau1.classes must be an array`)
  }
  for (let i = 0; i < t1.classes.length; i++) {
    const cls = t1.classes[i] as Record<string, unknown>
    if (!cls || typeof cls.classe !== 'string') {
      throw new Error(`${file}: tableau1.classes[${i}].classe must be a string`)
    }
    if (typeof cls.minEncadrementScore !== 'number') {
      throw new Error(`${file}: tableau1.classes[${i}].minEncadrementScore must be a number`)
    }
  }
  return cfg as SectorConfig
}

function validateEncadrementConfig(cfg: unknown): EncadrementConfig {
  const c = cfg as Record<string, unknown>
  if (!c || typeof c !== 'object') {
    throw new Error('encadrement.json: config must be an object')
  }
  if (!Array.isArray(c.roles)) {
    throw new Error('encadrement.json: required field "roles" must be an array')
  }
  for (let i = 0; i < c.roles.length; i++) {
    const r = c.roles[i] as Record<string, unknown>
    if (!r || typeof r.role !== 'string') {
      throw new Error(`encadrement.json: roles[${i}].role must be a string`)
    }
    const hasScore = typeof r.score === 'number'
    const hasLtGte = typeof r.scoreLt5 === 'number' && typeof r.scoreGte5 === 'number'
    if (!hasScore && !hasLtGte) {
      throw new Error(`encadrement.json: roles[${i}] must have either "score" or both "scoreLt5" and "scoreGte5"`)
    }
  }
  if (!c.rules || typeof c.rules !== 'object') {
    throw new Error('encadrement.json: required field "rules" must be an object')
  }
  return cfg as EncadrementConfig
}

function validateMasseSalarialeConfig(cfg: unknown): MasseSalarialeConfig {
  const c = cfg as Record<string, unknown>
  if (!c || typeof c !== 'object') {
    throw new Error('masseSalariale.json: config must be an object')
  }
  if (!Array.isArray(c.ratiosBySector)) {
    throw new Error('masseSalariale.json: required field "ratiosBySector" must be an array')
  }
  for (let i = 0; i < c.ratiosBySector.length; i++) {
    const r = c.ratiosBySector[i] as Record<string, unknown>
    if (!r || typeof r.sector !== 'string') {
      throw new Error(`masseSalariale.json: ratiosBySector[${i}].sector must be a string`)
    }
    if (typeof r.minRatioPercent !== 'number') {
      throw new Error(`masseSalariale.json: ratiosBySector[${i}].minRatioPercent must be a number`)
    }
  }
  return cfg as MasseSalarialeConfig
}

function validateBonificationConfig(cfg: unknown): BonificationConfig {
  const c = cfg as Record<string, unknown>
  if (!c || typeof c !== 'object') {
    throw new Error('bonification.json: config must be an object')
  }
  if (!Array.isArray(c.applicableSectors)) {
    throw new Error('bonification.json: required field "applicableSectors" must be an array')
  }
  if (!Array.isArray(c.excludedSectors)) {
    throw new Error('bonification.json: required field "excludedSectors" must be an array')
  }
  if (!Array.isArray(c.coefficients)) {
    throw new Error('bonification.json: required field "coefficients" must be an array')
  }
  for (let i = 0; i < c.coefficients.length; i++) {
    const co = c.coefficients[i] as Record<string, unknown>
    if (typeof co?.sectors !== 'number') {
      throw new Error(`bonification.json: coefficients[${i}].sectors must be a number`)
    }
    if (typeof co?.coefficientHighClasses !== 'number') {
      throw new Error(`bonification.json: coefficients[${i}].coefficientHighClasses must be a number`)
    }
    if (typeof co?.coefficientLowClasses !== 'number') {
      throw new Error(`bonification.json: coefficients[${i}].coefficientLowClasses must be a number`)
    }
  }
  if (!Array.isArray(c.highClasses)) {
    throw new Error('bonification.json: required field "highClasses" must be an array')
  }
  if (!Array.isArray(c.lowClasses)) {
    throw new Error('bonification.json: required field "lowClasses" must be an array')
  }
  return cfg as BonificationConfig
}

// --- Load at import time and cache ---

const SECTOR_FILES = [
  'sectorA.json',
  'sectorB.json',
  'sectorC.json',
  'sectorD.json',
  'sectorE.json',
  'sectorF.json',
  'sectorG.json',
  'sectorH.json',
  'sectorI.json',
  'sectorY.json',
] as const

const _sectorConfigsMap = new Map<string, SectorConfig>()
for (const file of SECTOR_FILES) {
  const filePath = path.join(RULES_DIR, file)
  const raw = loadAndParse<unknown>(filePath)
  const validated = validateSectorConfig(raw, file)
  _sectorConfigsMap.set(validated.sector, validated)
}

const _encadrementConfig = validateEncadrementConfig(
  loadAndParse<unknown>(path.join(RULES_DIR, 'encadrement.json'))
)

const _masseSalarialeConfig = validateMasseSalarialeConfig(
  loadAndParse<unknown>(path.join(RULES_DIR, 'masseSalariale.json'))
)

const _bonificationConfig = validateBonificationConfig(
  loadAndParse<unknown>(path.join(RULES_DIR, 'bonification.json'))
)

// --- Exports ---

/** Get sector config by sector id (e.g. 'A', 'B', 'H'). Returns undefined if not found. */
export function getSectorConfig(sector: string): SectorConfig | undefined {
  return _sectorConfigsMap.get(String(sector).trim().toUpperCase())
}

export function getEncadrementConfig(): EncadrementConfig {
  return _encadrementConfig
}

export function getMasseSalarialeConfig(): MasseSalarialeConfig {
  return _masseSalarialeConfig
}

export function getBonificationConfig(): BonificationConfig {
  return _bonificationConfig
}

/** Get all sector configs (for iterating). Used by classification engine. */
export function getAllSectorConfigs(): SectorConfig[] {
  return [..._sectorConfigsMap.values()].sort((a, b) =>
    a.sector.localeCompare(b.sector)
  )
}
