import { Skeleton } from '@/components/ui/skeleton'
import { Main } from '@/components/layout/main'

export function GenericListViewSkeleton() {
  return (
    <Main className="px-4">
      {/* Header Section Skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" /> {/* Title */}
          <Skeleton className="h-4 w-32" /> {/* Subtitle */}
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-32" /> {/* Add button */}
        </div>
      </div>

      {/* Data Table Skeleton */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-4">
          {/* Table Toolbar Skeleton */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-80" /> {/* Search input */}
            <Skeleton className="h-10 w-24" /> {/* View options */}
          </div>

          {/* Table Header Skeleton */}
          <div className="border rounded-lg">
            <div className="flex items-center space-x-4 p-4 border-b bg-muted/50">
              <Skeleton className="h-4 w-4" /> {/* Checkbox */}
              <Skeleton className="h-4 w-24" /> {/* Column 1 */}
              <Skeleton className="h-4 w-32" /> {/* Column 2 */}
              <Skeleton className="h-4 w-28" /> {/* Column 3 */}
              <Skeleton className="h-4 w-20" /> {/* Column 4 */}
              <Skeleton className="h-4 w-24" /> {/* Column 5 */}
            </div>

            {/* Table Rows Skeleton */}
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 border-b last:border-b-0">
                <Skeleton className="h-4 w-4" /> {/* Checkbox */}
                <Skeleton className="h-4 w-24" /> {/* Column 1 */}
                <Skeleton className="h-4 w-32" /> {/* Column 2 */}
                <Skeleton className="h-4 w-28" /> {/* Column 3 */}
                <Skeleton className="h-4 w-20" /> {/* Column 4 */}
                <Skeleton className="h-4 w-24" /> {/* Column 5 */}
              </div>
            ))}
          </div>

          {/* Pagination Skeleton */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-40" /> {/* Row count text */}
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-20" /> {/* Previous button */}
              <Skeleton className="h-8 w-16" /> {/* Next button */}
            </div>
          </div>
        </div>
      </div>
    </Main>
  )
}
