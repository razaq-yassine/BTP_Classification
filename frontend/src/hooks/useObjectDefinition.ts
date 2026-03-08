import { useState, useEffect, useMemo } from 'react'
import type { ObjectDefinition } from '@/types/object-definition'
import { getObjectDefinition } from '@/metadata/loader'
import { useObjectDefinitionsQuery } from './useObjectDefinitionsQuery'

export function useObjectDefinition(
  objectNameOrPath: string,
  options?: { resolveFromPath?: boolean }
) {
  const { data: allDefs, isLoading: defsLoading, error: defsError } = useObjectDefinitionsQuery()
  const [fallbackDef, setFallbackDef] = useState<ObjectDefinition | null>(null)
  const [fallbackLoading, setFallbackLoading] = useState(false)
  const [fallbackError, setFallbackError] = useState<string | null>(null)

  const resolvedFromCache = useMemo(() => {
    if (defsLoading || defsError || !allDefs || allDefs.length === 0) {
      return null
    }
    if (options?.resolveFromPath) {
      const normalized = objectNameOrPath.startsWith('/') ? objectNameOrPath : `/${objectNameOrPath}`
      return allDefs.find((d) => d.basePath === normalized || d.basePath === objectNameOrPath) ?? null
    }
    return allDefs.find((d) => d.name === objectNameOrPath) ?? null
  }, [allDefs, defsLoading, defsError, objectNameOrPath, options?.resolveFromPath])

  useEffect(() => {
    if (resolvedFromCache != null) {
      setFallbackDef(null)
      setFallbackLoading(false)
      setFallbackError(null)
      return
    }
    if (options?.resolveFromPath) {
      setFallbackDef(null)
      setFallbackLoading(false)
      setFallbackError(null)
      return
    }
    if (defsLoading || defsError) return

    let cancelled = false
    setFallbackLoading(true)
    setFallbackError(null)

    getObjectDefinition(objectNameOrPath)
      .then((def) => {
        if (!cancelled && def) setFallbackDef(def)
        if (!cancelled && !def) setFallbackError(`Unknown object: ${objectNameOrPath}`)
      })
      .catch((err) => {
        if (!cancelled) setFallbackError(err instanceof Error ? err.message : 'Failed to load object definition')
      })
      .finally(() => {
        if (!cancelled) setFallbackLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [objectNameOrPath, resolvedFromCache, defsLoading, defsError, options?.resolveFromPath])

  const definition = resolvedFromCache ?? fallbackDef
  const loading = defsLoading || fallbackLoading
  let error: string | null = null
  if (defsError) {
    error = defsError instanceof Error ? defsError.message : 'Failed to load object definitions'
  } else if (options?.resolveFromPath && !defsLoading && !resolvedFromCache) {
    error = `Unknown object: ${objectNameOrPath}`
  } else if (!options?.resolveFromPath && !fallbackLoading && !definition) {
    error = fallbackError ?? `Unknown object: ${objectNameOrPath}`
  }

  return { definition, loading, error }
}
