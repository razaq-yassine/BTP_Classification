/**
 * Detects hardcoded user-facing strings in frontend source that should be
 * converted to translation keys. Used by the coverage API and CLI report.
 */
import fs from 'fs'
import path from 'path'

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

function getNamespaceKeys(translationsPath: string, locale: string, ns: string): Flattened {
  const filePath = path.join(translationsPath, locale, `${ns}.json`)
  const data = loadJson(filePath)
  return data ? flattenObject(data) : {}
}

function getAllEnTranslationValues(translationsPath: string): Set<string> {
  const values = new Set<string>()
  for (const ns of NAMESPACES) {
    const keys = getNamespaceKeys(translationsPath, REFERENCE_LOCALE, ns)
    for (const v of Object.values(keys)) {
      if (typeof v === 'string' && v.trim()) values.add(v.trim())
    }
  }
  return values
}

export interface HardcodedString {
  str: string
  file: string
  line: number
}

export function findHardcodedStrings(
  translationsPath: string,
  frontendSrcPath: string
): HardcodedString[] {
  const enValues = getAllEnTranslationValues(translationsPath)
  const results: HardcodedString[] = []
  const seen = new Set<string>()

  if (!fs.existsSync(frontendSrcPath)) return results

  function isFalsePositive(str: string): boolean {
    if (str.length > 150) return true
    // CSS / Tailwind
    if (/^(flex|grid|items-|justify-|text-|bg-|border|rounded|p-|m-|gap-|w-|h-|min-|max-|dark:|shrink|overflow)/.test(str)) return true
    // Date formats
    if (/^(dd|MM|yyyy|HH|mm|ss|EEE|MMM)/.test(str) || /\/.*\//.test(str)) return true
    // CSS-like class names
    if (/^[a-z-]+(\s[a-z-]+)*$/.test(str) && str.includes('-')) return true
    // SVG path data (d="M12 2v20..." or path commands - M,L,H,V,C,S,Q,T,A,Z + numbers)
    if (/^[MLHVCSQTAZ][\d\s.,\-MLHVCSQTAZmlhvcsqtaz]+$/i.test(str) && str.length > 8) return true
    if (/^[\d\s.,\-]+$/.test(str) && str.length > 15) return true
    // Hex colors
    if (/^#[0-9a-fA-F]{3,8}$/.test(str)) return true
    // Template/interpolation placeholders
    if (/^\{[^}]*\}$/.test(str)) return true
    // Malformed: captured t() or JSX expression
    if (/\{[^}]*t\s*\(|defaultValue\s*:|\bt\s*\(['"]/.test(str)) return true
    // Example/placeholder emails and hosts
    if (/@?example\.com|noreply@|smtp\./.test(str) && str.length < 50) return true
    // Placeholder values (not user-facing labels)
    if (/^(admin|\*+)$/.test(str)) return true
    // Developer debug messages (toast/console style)
    if (/\b(toggled|inserted|executed)!?\s*$/.test(str)) return true
    if (/^.*toggled:\s*$/.test(str)) return true
    // React/framework error messages (contain JSX-like tags)
    if (/<[A-Za-z][A-Za-z0-9]*\s*\/?>/.test(str)) return true
    return false
  }

  function isFalsePositiveShort(str: string): boolean {
    if (str.length < 2) return true
    if (/^[a-z]+$/.test(str) && str.length < 4) return true
    if (/^[A-Z][a-z]+$/.test(str) && str.length < 4) return true
    return false
  }

  function addResult(str: string, file: string, line: number, minLen: number): void {
    const s = str.replace(/\s+/g, ' ').trim()
    if (!s || s.length < minLen) return
    if (isFalsePositive(s)) return
    if (minLen <= 4 && isFalsePositiveShort(s)) return
    if (enValues.has(s)) return
    if (seen.has(s)) return
    seen.add(s)
    results.push({ str: s, file, line })
  }

  function scanFile(filePath: string): void {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    const relPath = path.relative(frontendSrcPath, filePath)

    if (/^(debug-utils|network-debug|test-api|quick-fix|refresh-token)\.(js|ts)$/.test(path.basename(filePath))) return

    const propPatterns: Array<{ regex: RegExp; group: number; minLen: number }> = [
      { regex: /(?:^|\s)(?:title|desc|label)\s*=\s*['"]([^'"]+)['"]/g, group: 1, minLen: 3 },
      { regex: /(?:^|\s)placeholder\s*=\s*['"]([^'"]+)['"]/g, group: 1, minLen: 3 },
      { regex: /errorMessage:\s*['"]([^'"]+)['"]/g, group: 1, minLen: 10 },
      { regex: /description:\s*['"]([^'"]+)['"]/g, group: 1, minLen: 10 },
      { regex: /setError\s*\(\s*['"]([^'"]+)['"]/g, group: 1, minLen: 10 },
      { regex: /toast\.(error|success|info)\s*\(\s*['"]([^'"]+)['"]/g, group: 2, minLen: 10 },
    ]

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (/translateFieldLabel|translateObjectLabel|translateListViewLabel|translateStatisticLabel|translateSectionTitle/.test(line)) continue

      for (const { regex, group, minLen } of propPatterns) {
        const re = new RegExp(regex.source, regex.flags)
        let m: RegExpExecArray | null
        while ((m = re.exec(line)) !== null) {
          const str = m[group]?.trim()
          if (str && !/\bt\s*\(/.test(line)) addResult(str, relPath, i + 1, minLen)
        }
      }

      const jsxTextPatterns: Array<{ regex: RegExp; group: number }> = [
        { regex: /<FormLabel[^>]*>([^<{]+)<\/FormLabel>/g, group: 1 },
        { regex: /<Button[^>]*>([^<{]+)<\/Button>/g, group: 1 },
        { regex: /<CommandEmpty[^>]*>([^<]+)<\/CommandEmpty>/g, group: 1 },
        { regex: /<CardTitle[^>]*>([^<{]+)<\/CardTitle>/g, group: 1 },
        { regex: /<Label[^>]*>([^<{]+)<\/Label>/g, group: 1 },
      ]
      for (const { regex, group } of jsxTextPatterns) {
        if (group === 0) continue
        const re = new RegExp(regex.source, regex.flags)
        let m: RegExpExecArray | null
        while ((m = re.exec(line)) !== null) {
          const str = m[group]?.trim().replace(/\s+/g, ' ')
          if (str && !/\bt\s*\(/.test(line)) addResult(str, relPath, i + 1, 2)
        }
      }

      const literalRegex = /['"]([A-Z][^'"]{14,100})['"]/g
      let m: RegExpExecArray | null
      while ((m = literalRegex.exec(line)) !== null) {
        const str = m[1]?.trim()
        if (!str || !/\s/.test(str)) continue
        if (isFalsePositive(str)) continue
        if (enValues.has(str)) continue
        if (seen.has(str)) continue
        if (/\b(className|style|data-|aria-|placeholder)=\s*\{/.test(line)) continue
        if (/\bt\s*\(/.test(line)) continue
        seen.add(str)
        results.push({ str, file: relPath, line: i + 1 })
      }
    }

    const fullContent = content.replace(/\r\n/g, '\n')
    const multiLinePatterns: Array<{ regex: RegExp; group: number }> = [
      { regex: /(?:^|\s)desc\s*=\s*['"]([^'"]*(?:\n\s*[^'"]*)*?)['"]/gm, group: 1 },
      { regex: /(?:^|\s)title\s*=\s*['"]([^'"]*(?:\n\s*[^'"]*)*?)['"]/gm, group: 1 },
      { regex: /<FormDescription[^>]*>([\s\S]*?)<\/FormDescription>/g, group: 1 },
    ]
    for (const { regex, group } of multiLinePatterns) {
      let m: RegExpExecArray | null
      while ((m = regex.exec(fullContent)) !== null) {
        const str = m[group]?.replace(/\s+/g, ' ').trim()
        if (!str || str.length < 3) continue
        // Skip JSX expressions (e.g. {t('key')} inside FormDescription)
        if (str.includes('{') && str.includes('}')) continue
        if (enValues.has(str) || seen.has(str)) continue
        const lineNum = fullContent.slice(0, m.index).split('\n').length
        if (!isFalsePositive(str)) {
          seen.add(str)
          results.push({ str, file: relPath, line: lineNum })
        }
      }
    }
  }

  function walk(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) {
        if (e.name !== 'node_modules' && e.name !== '.git') walk(full)
      } else if (/\.(tsx?|jsx?)$/.test(e.name)) {
        scanFile(full)
      }
    }
  }

  walk(frontendSrcPath)
  return results.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
}
