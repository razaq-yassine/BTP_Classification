import type { QueryClient } from '@tanstack/react-query'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { clearObjectCache, getAllObjectDefinitions } from '@/metadata/loader'

export const OBJECT_DEFINITIONS_QUERY_KEY = ['objectDefinitions'] as const

export function useObjectDefinitionsQuery() {
  return useQuery({
    queryKey: OBJECT_DEFINITIONS_QUERY_KEY,
    queryFn: getAllObjectDefinitions,
    staleTime: 5 * 60 * 1000, // 5 minutes - metadata rarely changes
    refetchOnWindowFocus: true, // Refetch when user returns to tab (picks up metadata changes)
  })
}

export function useInvalidateObjectDefinitions() {
  const queryClient = useQueryClient()
  return () => {
    clearObjectCache()
    return queryClient.invalidateQueries({ queryKey: OBJECT_DEFINITIONS_QUERY_KEY })
  }
}

/** Call to invalidate and refetch object definitions (e.g. after metadata regeneration) */
export function invalidateObjectDefinitions(queryClient: QueryClient) {
  clearObjectCache()
  return queryClient.invalidateQueries({ queryKey: OBJECT_DEFINITIONS_QUERY_KEY })
}

/** Prefetch object definitions for instant sidebar display */
export function prefetchObjectDefinitions(queryClient: QueryClient) {
  return queryClient.prefetchQuery({
    queryKey: OBJECT_DEFINITIONS_QUERY_KEY,
    queryFn: getAllObjectDefinitions,
  })
}
