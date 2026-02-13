import { useState, useEffect } from 'react'
import type { ObjectDefinition } from '@/types/object-definition'
import { getObjectDefinition, getObjectNameByPath } from '@/metadata/loader'

export function useObjectDefinition(
  objectNameOrPath: string,
  options?: { resolveFromPath?: boolean }
) {
  const [definition, setDefinition] = useState<ObjectDefinition | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const load = async () => {
      let name = objectNameOrPath
      if (options?.resolveFromPath) {
        const resolved = await getObjectNameByPath(objectNameOrPath)
        if (cancelled) return
        if (!resolved) {
          setError(`Unknown object: ${objectNameOrPath}`)
          setLoading(false)
          return
        }
        name = resolved
      }
      try {
        const def = await getObjectDefinition(name)
        if (!cancelled && def) setDefinition(def)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load object definition')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [objectNameOrPath, options?.resolveFromPath])

  return { definition, loading, error }
}
