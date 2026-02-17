/**
 * Utility functions for tracking and retrieving recently viewed records
 * All functions are user-specific - data is stored per user ID
 */

/**
 * Get recently viewed record IDs for an object (most recent first)
 * @param objectName - The object type name (e.g., 'order', 'customer')
 * @param userId - The current user's ID
 */
export function getRecentlyViewedIds(objectName: string, userId: number | null | undefined): string[] {
  if (!userId) return []
  
  try {
    const key = `recentlyViewed_${userId}_${objectName}`
    const stored = localStorage.getItem(key)
    if (!stored) return []
    const recentIds = JSON.parse(stored)
    // Return in reverse order (most recent first)
    return Array.isArray(recentIds) ? [...recentIds].reverse() : []
  } catch {
    return []
  }
}

export interface RecentlyViewedEntry {
  objectName: string
  recordId: string | number
  viewedAt?: number
}

/**
 * Get globally recently viewed records across all objects (most recent first)
 * Aggregates from per-object storage and optional global storage
 * @param userId - The current user's ID
 * @param limit - Max number of entries to return (default 20)
 */
export function getGlobalRecentlyViewed(
  userId: number | null | undefined,
  limit = 20
): RecentlyViewedEntry[] {
  if (!userId) return []

  try {
    const globalKey = `recentlyViewed_global_${userId}`
    const globalStored = localStorage.getItem(globalKey)
    if (globalStored) {
      const entries: RecentlyViewedEntry[] = JSON.parse(globalStored)
      return (Array.isArray(entries) ? entries : [])
        .slice(-limit)
        .reverse()
    }

    const entries: RecentlyViewedEntry[] = []
    const prefix = `recentlyViewed_${userId}_`
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix) && key !== globalKey) {
        const objectName = key.slice(prefix.length)
        const stored = localStorage.getItem(key)
        if (stored) {
          const ids = JSON.parse(stored)
          const idsArr = Array.isArray(ids) ? ids : []
          idsArr.slice(-10).reverse().forEach((id: string) => {
            entries.push({ objectName, recordId: id })
          })
        }
      }
    }
    return entries.slice(0, limit)
  } catch {
    return []
  }
}

/**
 * Track a record as recently viewed (updates both per-object and global storage)
 * @param objectName - The object type name (e.g., 'order', 'customer')
 * @param recordId - The ID of the record being viewed
 * @param userId - The current user's ID
 */
export function trackRecentlyViewed(objectName: string, recordId: string | number, userId: number | null | undefined): void {
  if (!userId) return
  
  try {
    const recordIdStr = String(recordId)
    const key = `recentlyViewed_${userId}_${objectName}`
    const stored = localStorage.getItem(key)
    const recentIds = stored ? JSON.parse(stored) : []
    const filtered = recentIds.filter((id: string) => id !== recordIdStr)
    filtered.push(recordIdStr)
    const trimmed = filtered.slice(-50)
    localStorage.setItem(key, JSON.stringify(trimmed))

    const globalKey = `recentlyViewed_global_${userId}`
    const globalStored = localStorage.getItem(globalKey)
    const globalEntries: RecentlyViewedEntry[] = globalStored ? JSON.parse(globalStored) : []
    const newEntry: RecentlyViewedEntry = { objectName, recordId: recordIdStr, viewedAt: Date.now() }
    const filteredGlobal = globalEntries.filter(
      (e) => !(e.objectName === objectName && String(e.recordId) === recordIdStr)
    )
    filteredGlobal.push(newEntry)
    const trimmedGlobal = filteredGlobal.slice(-50)
    localStorage.setItem(globalKey, JSON.stringify(trimmedGlobal))
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Sort records by recently viewed status (most recently viewed first)
 * @param records - Array of records to sort
 * @param objectName - The object type name (e.g., 'order', 'customer')
 * @param userId - The current user's ID
 */
export function sortByRecentlyViewed<T extends { id: string | number }>(
  records: T[],
  objectName: string,
  userId: number | null | undefined
): T[] {
  const recentIds = getRecentlyViewedIds(objectName, userId)
  if (recentIds.length === 0) return records

  // Create a map for quick lookup
  const recentIndexMap = new Map<string, number>()
  recentIds.forEach((id, index) => {
    recentIndexMap.set(String(id), index)
  })

  // Sort: recently viewed first (by their position in recentIds), then others
  return [...records].sort((a, b) => {
    const aId = String(a.id)
    const bId = String(b.id)
    const aIndex = recentIndexMap.get(aId)
    const bIndex = recentIndexMap.get(bId)

    // Both are recently viewed - sort by recency (lower index = more recent)
    if (aIndex !== undefined && bIndex !== undefined) {
      return aIndex - bIndex
    }
    // Only a is recently viewed
    if (aIndex !== undefined) return -1
    // Only b is recently viewed
    if (bIndex !== undefined) return 1
    // Neither is recently viewed - maintain original order
    return 0
  })
}
