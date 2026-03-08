/**
 * Core scoring logic for BTP dossier classification.
 * Computes the highest attainable classe per sector based on classification rules.
 */
import { db } from '../../db/index.js'
import {
  classificationRules,
  resultatSimulations,
} from '../../db/schema.js'
import { eq, and, inArray } from 'drizzle-orm'

export type DossierForClassification = {
  id: number
  organizationId: number
  /** CA max retenu HT in DH (Dirhams). Convert to MDH for rule comparison. */
  caMaxHT?: string | number | null
  capitalSocial?: string | number | null
  masseSalariale?: string | number | null
  totalEncadrementScore?: string | number | null
  sectorsSelected?: string | null
  classificationMethod?: string | null
}

export type ClassificationResult = {
  secteur: string
  classeObtenue: string
  scoreCa: boolean
  scoreCapital: boolean
  scoreEncadrement: boolean
  scoreMasseSalariale: boolean
  scoreMateriel: boolean
  details: string
}

function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0
  return typeof v === 'string' ? parseFloat(v) || 0 : Number(v)
}

/**
 * Parse sectorsSelected: supports comma-separated "A,B,C" or JSON array.
 */
function parseSectors(sectorsSelected: string | null | undefined): string[] {
  if (!sectorsSelected) return []
  const s = String(sectorsSelected).trim()
  if (!s) return []
  try {
    const parsed = JSON.parse(s) as unknown
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
  } catch {
    // fallback: comma-separated
  }
  return s.split(/[,;]/).map((x) => x.trim()).filter(Boolean)
}

/**
 * CA max retenu HT (DH) → MDH for rule comparison.
 * Rules use minCa in MDH; caMaxHT is stored in DH.
 */
function caMaxHTToMDH(dossier: DossierForClassification): number {
  const caDH = toNum(dossier.caMaxHT)
  return caDH / 1_000_000
}

/**
 * masseSalariale / (caMoyen * 1_000_000) * 100
 * caMoyen is in MDH, so caMoyen * 1e6 = CA in DH.
 * Ratio = (masse salariale in DH / CA in DH) * 100 = percentage.
 */
function computeMasseSalarialeRatio(
  masseSalariale: number,
  caMoyenMDH: number
): number {
  if (caMoyenMDH <= 0) return 0
  return (masseSalariale / (caMoyenMDH * 1_000_000)) * 100
}

/**
 * Check if a rule passes for the dossier.
 * Returns { pass, details } per criterion.
 */
function checkRule(
  dossier: DossierForClassification,
  rule: {
    minCa: string | number
    minCapitalSocial: string | number | null
    minEncadrementScore: string | number
    masseSalarialeRatio: string | number
    method: string
  },
  caMoyen: number,
  capitalSocial: number,
  totalEncadrement: number,
  masseSalariale: number
): { scoreCa: boolean; scoreCapital: boolean; scoreEncadrement: boolean; scoreMasseSalariale: boolean; scoreMateriel: boolean; detailsParts: string[] } {
  const minCa = toNum(rule.minCa)
  const minCapital = toNum(rule.minCapitalSocial)
  const minEnc = toNum(rule.minEncadrementScore)
  const minRatio = toNum(rule.masseSalarialeRatio)
  const tableau2 = String(rule.method).toLowerCase() === 'tableau2'

  const scoreCa = caMoyen >= minCa
  const ratio = computeMasseSalarialeRatio(masseSalariale, caMoyen)
  const scoreMasseSalariale = caMoyen > 0 ? ratio >= minRatio : true
  const scoreEncadrement = totalEncadrement >= minEnc
  const scoreCapital = !tableau2 || minCapital === 0 ? true : capitalSocial >= minCapital
  const scoreMateriel = true // MVP: always pass, v2 to implement

  const detailsParts: string[] = []
  detailsParts.push(
    `<strong>CA max retenu HT</strong>: ${caMoyen.toFixed(2)} MDH ${scoreCa ? '✓' : '✗'} (min ${minCa} MDH)`
  )
  if (tableau2 && minCapital > 0) {
    detailsParts.push(
      `<strong>Capital social</strong>: ${capitalSocial.toFixed(2)} MDH ${scoreCapital ? '✓' : '✗'} (min ${minCapital} MDH)`
    )
  }
  detailsParts.push(
    `<strong>Score encadrement</strong>: ${totalEncadrement.toFixed(0)} ${scoreEncadrement ? '✓' : '✗'} (min ${minEnc})`
  )
  detailsParts.push(
    `<strong>Ratio masse salariale</strong>: ${ratio.toFixed(2)}% ${scoreMasseSalariale ? '✓' : '✗'} (min ${minRatio}%)`
  )
  detailsParts.push(`<strong>Matériel</strong>: Non vérifié (MVP) ✓`)

  return {
    scoreCa,
    scoreCapital,
    scoreEncadrement,
    scoreMasseSalariale,
    scoreMateriel,
    detailsParts,
  }
}

/**
 * Compute classification results for a dossier.
 * For each sector in sectorsSelected, finds the HIGHEST classe where all criteria pass.
 */
export async function computeClassification(
  dossier: DossierForClassification
): Promise<ClassificationResult[]> {
  const sectors = parseSectors(dossier.sectorsSelected)
  const rawMethod = String(dossier.classificationMethod || 'tableau1').toLowerCase()
  // Map T1/T2 to tableau1/tableau2 for rule lookup (rules store tableau1/tableau2)
  const method = rawMethod === 't2' ? 'tableau2' : rawMethod === 't1' ? 'tableau1' : rawMethod
  if (sectors.length === 0) return []

  const caMoyen = caMaxHTToMDH(dossier)
  const capitalSocial = toNum(dossier.capitalSocial)
  const totalEncadrement = toNum(dossier.totalEncadrementScore)
  const masseSalariale = toNum(dossier.masseSalariale)

  const rules = await db
    .select()
    .from(classificationRules)
    .where(
      and(
        eq(classificationRules.isActive, true),
        eq(classificationRules.method, method),
        inArray(classificationRules.sector, sectors)
      )
    )

  const results: ClassificationResult[] = []

  for (const sector of sectors) {
    const sectorRules = rules.filter((r) => String(r.sector) === sector)
    if (sectorRules.length === 0) continue

    // Order by classe ascending (1 = highest class)
    const sorted = [...sectorRules].sort(
      (a, b) => parseInt(String(a.classe), 10) - parseInt(String(b.classe), 10)
    )

    let best: ClassificationResult | null = null
    for (const rule of sorted) {
      const {
        scoreCa,
        scoreCapital,
        scoreEncadrement,
        scoreMasseSalariale,
        scoreMateriel,
        detailsParts,
      } = checkRule(
        dossier,
        rule,
        caMoyen,
        capitalSocial,
        totalEncadrement,
        masseSalariale
      )

      const allPass =
        scoreCa && scoreCapital && scoreEncadrement && scoreMasseSalariale && scoreMateriel

      if (allPass) {
        best = {
          secteur: sector,
          classeObtenue: String(rule.classe),
          scoreCa,
          scoreCapital,
          scoreEncadrement,
          scoreMasseSalariale,
          scoreMateriel,
          details: `<ul>${detailsParts.map((p) => `<li>${p}</li>`).join('')}</ul>`,
        }
      }
    }

    if (best) results.push(best)
  }

  return results
}
