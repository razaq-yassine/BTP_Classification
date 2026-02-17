import api from './api'
import type { RecentlyViewedEntry } from '@/utils/recently-viewed'

export interface SearchResults {
  results: Record<string, Record<string, unknown>[]>
  counts: Record<string, number>
  total: number
}

/**
 * Search across all readable objects
 * @param q - Search query string
 * @param limit - Max results per object type (default 5)
 */
export async function searchObjects(q: string, limit = 5): Promise<SearchResults> {
  const params = new URLSearchParams({ q: q.trim(), limit: String(limit) })
  const { data } = await api.get<SearchResults>(`/api/search?${params}`)
  return data
}

/**
 * Fetch recently viewed records by ID
 * @param records - List of { objectName, recordId } from getGlobalRecentlyViewed
 * @param limit - Max records to fetch (default 20)
 */
export async function getRecentRecords(
  records: RecentlyViewedEntry[],
  limit = 20
): Promise<SearchResults> {
  const limited = records.slice(0, limit)
  const { data } = await api.post<SearchResults>('/api/search/recent', {
    records: limited.map((r) => ({ objectName: r.objectName, recordId: r.recordId }))
  })
  return data
}
