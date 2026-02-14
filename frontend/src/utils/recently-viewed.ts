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

/**
 * Track a record as recently viewed
 * @param objectName - The object type name (e.g., 'order', 'customer')
 * @param recordId - The ID of the record being viewed
 * @param userId - The current user's ID
 */
export function trackRecentlyViewed(objectName: string, recordId: string | number, userId: number | null | undefined): void {
  if (!userId) return
  
  try {
    const key = `recentlyViewed_${userId}_${objectName}`
    const stored = localStorage.getItem(key)
    const recentIds = stored ? JSON.parse(stored) : []
    const recordIdStr = String(recordId)
    // Remove if already exists, then add to end
    const filtered = recentIds.filter((id: string) => id !== recordIdStr)
    filtered.push(recordIdStr)
    // Keep only last 50
    const trimmed = filtered.slice(-50)
    localStorage.setItem(key, JSON.stringify(trimmed))
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
