/**
 * BTP classification rule engine.
 * Uses JSON config (rules/) as source of truth.
 * Computes classification from dossier, membres, caEntries — no DB rule lookup.
 */
import { db } from '../db/index.js'
import { classificationRules } from '../db/schema.js'
import {
  getSectorConfig,
  getEncadrementConfig,
  getMasseSalarialeConfig,
  getBonificationConfig,
  getAllSectorConfigs,
} from './rules/config.js'
import type { SectorConfig, ClassRule } from './rules/config.js'

// --- Types ---

export type DossierInput = {
  id: number
  organizationId: number
  sectorsSelected?: string | null
  classificationMethod?: string | null
  capitalSocial?: string | number | null
  masseSalariale?: string | number | null
  totalEncadrementScore?: string | number | null
}

export type MembreInput = {
  id: number
  role: string
  anneesExperience?: string | number | null
  secteurImputation?: string | null
}

export type CaEntryInput = {
  id: number
  secteur: string
  caTTC: string | number
  caHT: string | number
  montantSoustraite?: string | number | null
  isGrosOeuvresSingleLot?: boolean | null
}

export type ClassificationResult = {
  secteur: string
  classeObtenue: string
  scoreCa: boolean
  scoreCapital: boolean
  scoreEncadrement: boolean
  scoreMasseSalariale: boolean
  scoreMateriel: boolean
  encadrementScoreActual: number
  encadrementScoreRequired: number
  caActualMDH: number
  caRequiredMDH: number
  details: string
}

// --- Helpers ---

function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0
  return typeof v === 'string' ? parseFloat(v) || 0 : Number(v)
}

function parseSectors(sectorsSelected: string | null | undefined): string[] {
  if (!sectorsSelected) return []
  const s = String(sectorsSelected).trim()
  if (!s) return []
  try {
    const parsed = JSON.parse(s) as unknown
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
  } catch {
    /* fallback */
  }
  return s.split(/[,;]/).map((x) => x.trim()).filter(Boolean)
}

const CLASSE_ORDER = ['S', '1', '2', '3', '4', '5']

const ENGINEER_ROLES = new Set(['ingenieur', 'master', 'licence'])
const TECHNICIAN_ROLES = new Set(['technicien', 'techbac2', 'deug', 'autrebac2', 'ofppt', 'cadre'])

// --- 1. Compute caMax from caEntries ---

function computeCaForSector(
  sector: string,
  caEntries: CaEntryInput[],
  subcontractingDeducted: boolean
): { caMaxTTC_DH: number; caMaxHT_DH: number } {
  const bySector = caEntries.filter((e) => String(e.secteur).toUpperCase() === sector.toUpperCase())
  if (bySector.length === 0) return { caMaxTTC_DH: 0, caMaxHT_DH: 0 }

  let maxTTC = 0
  let maxHT = 0
  for (const e of bySector) {
    const caTTC = toNum(e.caTTC)
    const caHT = toNum(e.caHT)
    const montant = subcontractingDeducted ? toNum(e.montantSoustraite) : 0
    let caNet = caTTC - montant
    let effectiveHT = Math.max(0, caHT - montant)

    if (sector.toUpperCase() === 'A' && e.isGrosOeuvresSingleLot === true) {
      caNet *= 0.5
      effectiveHT *= 0.5
    }
    if (caNet > maxTTC) maxTTC = caNet
    if (effectiveHT > maxHT) maxHT = effectiveHT
  }
  return { caMaxTTC_DH: maxTTC, caMaxHT_DH: maxHT }
}

// --- 2. Compute encadrement score per sector ---

function computeEncadrementScoreForSector(
  sector: string,
  membres: MembreInput[],
  encadrementCfg: ReturnType<typeof getEncadrementConfig>
): number {
  const roleMap = new Map(encadrementCfg.roles.map((r) => [r.role.toLowerCase(), r]))
  let total = 0
  let gerantDiplomaUsed = false

  for (const m of membres) {
    const role = String(m.role || '').toLowerCase().trim()
    const imp = String(m.secteurImputation || '').toUpperCase().trim()
    const years = toNum(m.anneesExperience)
    const def = roleMap.get(role)
    if (!def) continue

    const score = typeof def.score === 'number'
      ? def.score
      : (years < 5 ? (def.scoreLt5 ?? 0) : (def.scoreGte5 ?? 0))

    if (def.baseScoreAppliesToAllSectors) {
      total += score
      if (def.diplomaScoreMaxSectors === 1 && imp && imp !== 'ALL') {
        gerantDiplomaUsed = true
      }
      continue
    }

    if (imp === sector.toUpperCase() || imp === 'ALL') {
      if (def.diplomaScoreMaxSectors === 1) {
        if (!gerantDiplomaUsed) {
          total += score
          gerantDiplomaUsed = true
        }
      } else {
        total += score
      }
    }
  }
  return total
}

// --- 3. Bonification coefficient ---

function getBonificationCoefficient(
  secteur: string,
  classe: string,
  sectorsSelected: string[],
  bonif: ReturnType<typeof getBonificationConfig>
): number {
  if (bonif.excludedSectors.includes(secteur)) return 1
  const bonifiable = sectorsSelected.filter((s) => bonif.applicableSectors.includes(s))
  const count = Math.min(bonifiable.length, 4)
  const coefRow = bonif.coefficients.find((c) => c.sectors === count) ?? bonif.coefficients[0]
  const isHigh = bonif.highClasses.includes(classe)
  return isHigh ? coefRow.coefficientHighClasses : coefRow.coefficientLowClasses
}

// --- 4. Count staff per sector ---

function countStaffForSector(
  sector: string,
  membres: MembreInput[],
  sectorConfig: SectorConfig
): { engineers: number; technicians: number; geologues: number; electromecaniciens: number } {
  let engineers = 0
  let technicians = 0
  let geologues = 0
  let electromecaniciens = 0

  for (const m of membres) {
    const role = String(m.role || '').toLowerCase().trim()
    const imp = String(m.secteurImputation || '').toUpperCase().trim()
    if (imp !== sector.toUpperCase() && imp !== 'ALL') continue

    if (role === 'gerant') continue // gérant scores but not counted as engineer/technician
    if (ENGINEER_ROLES.has(role)) engineers++
    else if (TECHNICIAN_ROLES.has(role)) technicians++
    else if (role === 'geologue' && sector.toUpperCase() === 'G') geologues++
    else if (role === 'electromecanicien' && sector.toUpperCase() === 'I') electromecaniciens++
  }
  return { engineers, technicians, geologues, electromecaniciens }
}

// --- 5. Masse salariale ratio ---

function getMasseSalarialeRatioForSector(
  sector: string,
  masseCfg: ReturnType<typeof getMasseSalarialeConfig>
): number {
  const entry = masseCfg.ratiosBySector.find((r) => r.sector === sector)
  return entry?.minRatioPercent ?? 9
}

// --- Main classification ---

function classeRank(classe: string): number {
  const i = CLASSE_ORDER.indexOf(classe)
  return i >= 0 ? i : 999
}

export type ClassificationPreviewResult = ClassificationResult & {
  ratioActual?: number
  ratioRequired?: number
  requestedClasse?: string
}

/**
 * Compute classification results for a dossier.
 * Uses dossier, membres, caEntries — no DB lookup for rules.
 * When requestedClasses is provided and result is NON_ELIGIBLE, fills encadrementScoreRequired and caRequiredMDH from the requested class rule.
 */
export function computeClassification(
  dossier: DossierInput,
  membres: MembreInput[],
  caEntries: CaEntryInput[],
  requestedClasses?: Array<{ secteur: string; classe: string }>
): ClassificationPreviewResult[] {
  const sectors = parseSectors(dossier.sectorsSelected)
  if (sectors.length === 0) return []

  const method = String(dossier.classificationMethod || 'tableau1').toLowerCase()
  const useTableau2 = method === 'tableau2' || method === 't2'
  const capitalSocial = toNum(dossier.capitalSocial)
  const masseSalariale = toNum(dossier.masseSalariale)

  const encadrementCfg = getEncadrementConfig()
  const masseCfg = getMasseSalarialeConfig()
  const bonifCfg = getBonificationConfig()
  const subcontractingDeducted = masseCfg.rules.subcontractingDeducted === true

  const results: ClassificationPreviewResult[] = []

  for (const sector of sectors) {
    const sectorConfig = getSectorConfig(sector)
    if (!sectorConfig) continue

    const { caMaxTTC_DH, caMaxHT_DH } = computeCaForSector(sector, caEntries, subcontractingDeducted)
    const caActualMDH = caMaxHT_DH / 1_000_000 // DH → MDH
    const encadrementScore = computeEncadrementScoreForSector(sector, membres, encadrementCfg)
    const { engineers, technicians, geologues, electromecaniciens } = countStaffForSector(sector, membres, sectorConfig)
    const minRatio = sectorConfig.masseSalarialeRatioPercent != null
      ? getMasseSalarialeRatioForSector(sector, masseCfg)
      : 0
    const ratio = caMaxHT_DH > 0 ? (masseSalariale / caMaxHT_DH) * 100 : 0
    const scoreMasseSalariale = sectorConfig.masseSalarialeRatioPercent == null ? true : ratio >= minRatio

    const tableau = sector.toUpperCase() === 'H' ? sectorConfig.tableau1 : (useTableau2 && sectorConfig.tableau2?.classes?.length ? sectorConfig.tableau2 : sectorConfig.tableau1)
    const classes = [...(tableau?.classes ?? [])].sort((a, b) => classeRank(a.classe) - classeRank(b.classe))

    const classeBonus = tableau?.classeBonus ?? tableau?.classeSBonus
      ? {
          appliesToClasse: (tableau?.classeBonus as { appliesToClasse?: string })?.appliesToClasse ?? 'S',
          pointsPerSlice: (tableau?.classeBonus ?? tableau?.classeSBonus)!.pointsPerSlice,
          sliceMDH: (tableau?.classeBonus ?? tableau?.classeSBonus)!.sliceMDH,
          requiresEngineerPerSlice: (tableau?.classeBonus as { requiresEngineerPerSlice?: boolean })?.requiresEngineerPerSlice ?? false,
        }
      : null

    let best: ClassificationPreviewResult | null = null
    for (const rule of classes) {
      const coef = getBonificationCoefficient(sector, rule.classe, sectors, bonifCfg)
      let adjEnc = Math.ceil((rule.minEncadrementScore ?? 0) * coef)
      let adjEng = Math.ceil((rule.minEngineers ?? 0) * coef)
      const adjTech = Math.ceil((rule.minTechnicians ?? 0) * coef)
      const minCa = rule.minCaMDH ?? 0
      const minCap = rule.minCapitalSocialMDH ?? 0

      if (classeBonus && rule.classe === classeBonus.appliesToClasse && minCa > 0 && caActualMDH >= minCa) {
        const extraSlices = Math.floor((caActualMDH - minCa) / classeBonus.sliceMDH)
        const bonusPoints = extraSlices * classeBonus.pointsPerSlice
        const bonusEngineers = classeBonus.requiresEngineerPerSlice ? extraSlices : 0
        adjEnc += bonusPoints
        adjEng += bonusEngineers
      }

      const scoreCa = caActualMDH >= minCa
      const scoreCapital = !useTableau2 || minCap === 0 ? true : capitalSocial >= minCap
      const scoreEncadrement = encadrementScore >= adjEnc
      const minGeol = rule.minGeologues ?? 0
      const minElec = rule.minElectromecaniciens ?? 0
      const scoreEngineers = sector.toUpperCase() === 'G' && minGeol > 0
        ? engineers >= adjEng && geologues >= minGeol
        : sector.toUpperCase() === 'I' && minElec > 0
        ? engineers >= adjEng && electromecaniciens >= minElec
        : engineers >= adjEng
      const scoreTechnicians = technicians >= adjTech

      const detailsParts: string[] = []
      detailsParts.push(
        `<strong>CA max retenu HT</strong>: ${caActualMDH.toFixed(2)} MDH ${scoreCa ? '✓' : '✗'} (min ${minCa} MDH)`
      )
      if (useTableau2 && minCap > 0) {
        detailsParts.push(
          `<strong>Capital social</strong>: ${capitalSocial.toFixed(2)} MDH ${scoreCapital ? '✓' : '✗'} (min ${minCap} MDH)`
        )
      }
      detailsParts.push(
        `<strong>Score encadrement</strong>: ${encadrementScore} ${scoreEncadrement ? '✓' : '✗'} (min ${adjEnc})`
      )
      detailsParts.push(
        `<strong>Ingénieurs</strong>: ${engineers} ${scoreEngineers ? '✓' : '✗'} (min ${adjEng})`
      )
      detailsParts.push(
        `<strong>Techniciens</strong>: ${technicians} ${scoreTechnicians ? '✓' : '✗'} (min ${adjTech})`
      )
      if (sector.toUpperCase() === 'G' && (rule.minGeologues ?? 0) > 0) {
        detailsParts.push(
          `<strong>Géologues</strong>: ${geologues} ${geologues >= (rule.minGeologues ?? 0) ? '✓' : '✗'} (min ${rule.minGeologues})`
        )
      }
      if (sector.toUpperCase() === 'I' && (rule.minElectromecaniciens ?? 0) > 0) {
        detailsParts.push(
          `<strong>Électromécaniciens</strong>: ${electromecaniciens} ${electromecaniciens >= (rule.minElectromecaniciens ?? 0) ? '✓' : '✗'} (min ${rule.minElectromecaniciens})`
        )
      }
      detailsParts.push(
        sectorConfig.masseSalarialeRatioPercent == null
          ? `<strong>Ratio masse salariale</strong>: Non applicable ✓`
          : `<strong>Ratio masse salariale</strong>: ${ratio.toFixed(2)}% ${scoreMasseSalariale ? '✓' : '✗'} (min ${minRatio}%)`
      )
      detailsParts.push(`<strong>Matériel</strong>: Non vérifié (MVP) ✓`)

      const allPass =
        scoreCa &&
        scoreCapital &&
        scoreEncadrement &&
        scoreEngineers &&
        scoreTechnicians &&
        scoreMasseSalariale

      if (allPass) {
        best = {
          secteur: sector,
          classeObtenue: rule.classe,
          scoreCa,
          scoreCapital,
          scoreEncadrement,
          scoreMasseSalariale,
          scoreMateriel: true,
          encadrementScoreActual: encadrementScore,
          encadrementScoreRequired: adjEnc,
          caActualMDH,
          caRequiredMDH: minCa,
          ratioActual: sectorConfig.masseSalarialeRatioPercent != null ? ratio : undefined,
          ratioRequired: sectorConfig.masseSalarialeRatioPercent != null ? minRatio : undefined,
          requestedClasse: rule.classe,
          details: `<ul>${detailsParts.map((p) => `<li>${p}</li>`).join('')}</ul>`,
        }
        break
      }
    }

    if (best) {
      results.push(best)
    } else {
      let encReq = 0
      let caReq = 0
      let reqClasse = ''
      const rc = requestedClasses?.find((r) => r.secteur.toUpperCase() === sector.toUpperCase())
      if (rc) {
        reqClasse = rc.classe
        const reqRule = classes.find((r) => r.classe === rc.classe)
        if (reqRule) {
          const coefReq = getBonificationCoefficient(sector, reqRule.classe, sectors, bonifCfg)
          let adjEncReq = Math.ceil((reqRule.minEncadrementScore ?? 0) * coefReq)
          if (
            classeBonus &&
            reqRule.classe === classeBonus.appliesToClasse &&
            (reqRule.minCaMDH ?? 0) > 0 &&
            caActualMDH >= (reqRule.minCaMDH ?? 0)
          ) {
            const extraSlices = Math.floor((caActualMDH - (reqRule.minCaMDH ?? 0)) / classeBonus.sliceMDH)
            adjEncReq += extraSlices * classeBonus.pointsPerSlice
          }
          encReq = adjEncReq
          caReq = reqRule.minCaMDH ?? 0
        }
      }
      const nonEligible: ClassificationPreviewResult = {
        secteur: sector,
        classeObtenue: 'NON_ELIGIBLE',
        scoreCa: false,
        scoreCapital: false,
        scoreEncadrement: false,
        scoreMasseSalariale: false,
        scoreMateriel: true,
        encadrementScoreActual: encadrementScore,
        encadrementScoreRequired: encReq,
        caActualMDH,
        caRequiredMDH: caReq,
        ratioActual: sectorConfig.masseSalarialeRatioPercent != null ? ratio : undefined,
        ratioRequired: sectorConfig.masseSalarialeRatioPercent != null ? minRatio : undefined,
        requestedClasse: reqClasse || undefined,
        details: `<p>Aucune classe obtenue pour le secteur ${sector}.</p>`,
      }
      results.push(nonEligible)
    }
  }

  return results
}

// --- DB sync (for classificationRules mirror) ---

export type FlatRule = {
  name: string
  sector: string
  classe: string
  method: 'tableau1' | 'tableau2'
  minCa: number
  minCapitalSocial: number | null
  minEngineers: number
  minTechnicians: number
  minEncadrementScore: number
  masseSalarialeRatio: number
}

function classToFlatRules(
  sector: string,
  ratio: number,
  classes: ClassRule[],
  method: 'tableau1' | 'tableau2'
): FlatRule[] {
  return classes.map((c) => ({
    name: '',
    sector,
    classe: c.classe,
    method,
    minCa: c.minCaMDH ?? 0,
    minCapitalSocial: c.minCapitalSocialMDH ?? null,
    minEngineers: c.minEngineers ?? 0,
    minTechnicians: c.minTechnicians ?? 0,
    minEncadrementScore: c.minEncadrementScore,
    masseSalarialeRatio: ratio,
  }))
}

function flattenConfigToRules(config: SectorConfig): FlatRule[] {
  const ratio = config.masseSalarialeRatioPercent ?? 0
  const rules: FlatRule[] = []
  rules.push(...classToFlatRules(config.sector, ratio, config.tableau1.classes, 'tableau1'))
  if (config.tableau2?.classes?.length) {
    rules.push(...classToFlatRules(config.sector, ratio, config.tableau2!.classes, 'tableau2'))
  }
  return rules
}

export function buildRulesFromConfig(): FlatRule[] {
  const configs = getAllSectorConfigs()
  const all: FlatRule[] = []
  for (const cfg of configs) all.push(...flattenConfigToRules(cfg))
  return all
}

export async function syncClassificationRulesToDb(): Promise<number> {
  const flatRules = buildRulesFromConfig()
  if (flatRules.length === 0) return 0
  const now = new Date()
  let seq = 1
  const values = flatRules.map((r) => {
    const name = `RULE-${String(seq++).padStart(4, '0')}`
    return {
      name,
      sector: r.sector,
      classe: r.classe,
      method: r.method,
      minCa: String(r.minCa),
      minCapitalSocial: r.minCapitalSocial != null ? String(r.minCapitalSocial) : null,
      minEngineers: String(r.minEngineers),
      minTechnicians: String(r.minTechnicians),
      minEncadrementScore: String(r.minEncadrementScore),
      masseSalarialeRatio: String(r.masseSalarialeRatio),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }
  })
  await db.delete(classificationRules)
  if (values.length > 0) await db.insert(classificationRules).values(values)
  return values.length
}
