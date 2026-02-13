import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { invalidateObjectDefinitions } from '@/hooks/useObjectDefinitionsQuery'

const POLL_INTERVAL_MS = 15_000 // 15 seconds - balance between responsiveness and load
const VERSION_URL = '/metadata/version.json'

type VersionFile = { version: number }

/**
 * Polls metadata/version.json. When the version changes (e.g. after admin saves
 * metadata via UI or runs db:generate-from-metadata), invalidates object definitions
 * so the app picks up changes without a full page reload.
 */
export function useMetadataVersionPolling() {
  const queryClient = useQueryClient()
  const lastVersion = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function check() {
      if (cancelled) return
      try {
        const res = await fetch(`${VERSION_URL}?t=${Date.now()}`)
        if (!res.ok || cancelled) return
        const data = (await res.json()) as VersionFile
        const v = typeof data.version === 'number' ? data.version : 0
        if (lastVersion.current !== null && lastVersion.current !== v) {
          invalidateObjectDefinitions(queryClient)
        }
        lastVersion.current = v
      } catch {
        // Ignore fetch errors (e.g. dev server restart)
      }
    }

    void check()
    const id = setInterval(check, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [queryClient])
}
