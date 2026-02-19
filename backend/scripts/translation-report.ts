/**
 * Translation coverage report.
 * Detects which strings are missing or empty for each locale compared to the reference (en).
 *
 * Run: pnpm run translation-report
 * Or:  pnpm run translation-report -- --output report.md
 * Or:  pnpm run translation-report -- --verify order   (show Order keys + values per locale)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.join(__dirname, '..')
const defaultTranslationsPath = path.join(backendRoot, '../frontend/public/metadata/translations')
const TRANSLATIONS_PATH = process.env.TRANSLATIONS_PATH || defaultTranslationsPath

const REFERENCE_LOCALE = 'en'
const NAMESPACES = ['common', 'navigation', 'settings', 'errors', 'objects'] as const

type Flattened = Record<string, string>

function flattenObject(obj: unknown, prefix = ''): Flattened {
  const result: Flattened = {}
  if (obj === null || obj === undefined) return result
  if (typeof obj !== 'object') return result

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, fullKey))
    } else {
      result[fullKey] = typeof value === 'string' ? value : String(value ?? '')
    }
  }
  return result
}

function loadJson(filePath: string): Record<string, unknown> | null {
  try {
    if (!fs.existsSync(filePath)) return null
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

function getLocales(): string[] {
  if (!fs.existsSync(TRANSLATIONS_PATH)) return []
  return fs.readdirSync(TRANSLATIONS_PATH).filter((name) => {
    const p = path.join(TRANSLATIONS_PATH, name)
    return fs.statSync(p).isDirectory()
  })
}

function getNamespaceKeys(locale: string, ns: string): Flattened {
  const filePath = path.join(TRANSLATIONS_PATH, locale, `${ns}.json`)
  const data = loadJson(filePath)
  return data ? flattenObject(data) : {}
}

function generateVerifyReport(objectName: string): string {
  const locales = getLocales()
  const refKeys = getNamespaceKeys(REFERENCE_LOCALE, 'objects')
  const orderKeys = Object.keys(refKeys)
    .filter((k) => k.startsWith(`${objectName}.`))
    .sort()

  if (orderKeys.length === 0) {
    return `# Verify: objects.${objectName}\n\nNo keys found for "${objectName}" in ${REFERENCE_LOCALE}/objects.json.\n`
  }

  const lines: string[] = []
  lines.push(`# Verify: objects.${objectName}`)
  lines.push('')
  lines.push('Keys used by the app for list views, statistics, and fields:')
  lines.push('')

  const colWidth = 50
  const header = ['Key', ...locales].map((h, i) => (i === 0 ? h.padEnd(45) : h.padEnd(colWidth))).join('')
  lines.push('```')
  lines.push(header)
  lines.push('-'.repeat(header.length))

  for (const key of orderKeys) {
    const shortKey = key.replace(`${objectName}.`, '')
    const refVal = refKeys[key] ?? ''
    const cells: string[] = [shortKey]
    for (const locale of locales) {
      const locKeys = getNamespaceKeys(locale, 'objects')
      const val = locKeys[key] ?? ''
      const status = !(key in locKeys) ? 'MISSING' : val.trim() === '' ? 'EMPTY' : val
      cells.push(String(status).slice(0, colWidth - 1))
    }
    lines.push(cells.map((c, i) => (i === 0 ? c.padEnd(45) : c.padEnd(colWidth))).join(''))
  }
  lines.push('```')
  lines.push('')
  lines.push('If you see MISSING/EMPTY but the UI shows English, the app falls back to metadata labels.')
  lines.push('If you see translated values but the UI shows English, check: language switcher, preferred language in settings.')
  lines.push('')
  return lines.join('\n')
}

function generateReport(): string {
  const locales = getLocales()
  if (!locales.includes(REFERENCE_LOCALE)) {
    return `# Translation Report\n\nError: Reference locale "${REFERENCE_LOCALE}" not found in ${TRANSLATIONS_PATH}\n`
  }

  const otherLocales = locales.filter((l) => l !== REFERENCE_LOCALE).sort()
  const lines: string[] = []

  lines.push('# Translation Coverage Report')
  lines.push('')
  lines.push(`Generated from \`${TRANSLATIONS_PATH}\``)
  lines.push(`Reference locale: **${REFERENCE_LOCALE}**`)
  lines.push(`Other locales: ${otherLocales.join(', ') || '(none)'}`)
  lines.push('')

  if (otherLocales.length === 0) {
    lines.push('No other locales to compare.')
    return lines.join('\n')
  }

  let totalMissing = 0
  let totalEmpty = 0

  for (const locale of otherLocales) {
    lines.push(`## ${locale}`)
    lines.push('')

    let localeMissing = 0
    let localeEmpty = 0

    for (const ns of NAMESPACES) {
      const refKeys = getNamespaceKeys(REFERENCE_LOCALE, ns)
      const locKeys = getNamespaceKeys(locale, ns)

      const missing: string[] = []
      const empty: string[] = []

      for (const [key, refVal] of Object.entries(refKeys)) {
        if (!(key in locKeys)) {
          missing.push(key)
        } else if (locKeys[key].trim() === '') {
          empty.push(key)
        }
      }

      const nsMissing = missing.length
      const nsEmpty = empty.length
      localeMissing += nsMissing
      localeEmpty += nsEmpty
      totalMissing += nsMissing
      totalEmpty += nsEmpty

      if (nsMissing === 0 && nsEmpty === 0) {
        lines.push(`### ${ns}`)
        lines.push('✅ All keys translated.')
        lines.push('')
        continue
      }

      lines.push(`### ${ns}`)
      if (nsMissing > 0) {
        lines.push(`**Missing (${nsMissing}):**`)
        missing.sort().forEach((k) => lines.push(`- \`${k}\` → ref: "${(refKeys[k] ?? '').slice(0, 60)}${(refKeys[k] ?? '').length > 60 ? '...' : ''}"`))
        lines.push('')
      }
      if (nsEmpty > 0) {
        lines.push(`**Empty (${nsEmpty}):**`)
        empty.sort().forEach((k) => lines.push(`- \`${k}\``))
        lines.push('')
      }
    }

    lines.push(`**Summary for ${locale}:** ${localeMissing} missing, ${localeEmpty} empty`)
    lines.push('')
  }

  lines.push('---')
  lines.push(`**Total:** ${totalMissing} missing, ${totalEmpty} empty across all locales`)
  lines.push('')

  return lines.join('\n')
}

function main(): void {
  const args = process.argv.slice(2)
  const outputIdx = args.indexOf('--output')
  const outputFile = outputIdx >= 0 ? args[outputIdx + 1] : null
  const verifyIdx = args.indexOf('--verify')
  const verifyObject = verifyIdx >= 0 ? args[verifyIdx + 1] : null

  const report = verifyObject ? generateVerifyReport(verifyObject) : generateReport()

  if (outputFile) {
    fs.writeFileSync(outputFile, report, 'utf-8')
    console.log(`Report written to ${outputFile}`)
  } else {
    console.log(report)
  }
}

main()
