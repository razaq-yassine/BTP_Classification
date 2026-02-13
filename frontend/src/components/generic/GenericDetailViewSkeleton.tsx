import { Skeleton } from '@/components/ui/skeleton'

export function GenericDetailViewSkeleton() {
  return (
    <main className="flex-1 space-y-4">
      {/* Header Section Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-20" /> {/* Back button */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24" /> {/* Action button 1 */}
          <Skeleton className="h-10 w-24" /> {/* Action button 2 */}
        </div>
      </div>

      {/* Main Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Section (Details Tab) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs Skeleton */}
          <div className="space-y-4">
            <div className="flex space-x-1 border-b">
              <Skeleton className="h-10 w-20" /> {/* Tab 1 */}
              <Skeleton className="h-10 w-24" /> {/* Tab 2 */}
              <Skeleton className="h-10 w-28" /> {/* Tab 3 */}
            </div>

            {/* Tab Content Skeleton */}
            <div className="space-y-6">
              {/* Section 1 */}
              <div className="space-y-4">
                <Skeleton className="h-6 w-32" /> {/* Section title */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                      <Skeleton className="h-4 w-24" /> {/* Field label */}
                      <Skeleton className="h-10 w-full" /> {/* Field value */}
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2 */}
              <div className="space-y-4">
                <Skeleton className="h-6 w-28" /> {/* Section title */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                      <Skeleton className="h-4 w-20" /> {/* Field label */}
                      <Skeleton className="h-10 w-full" /> {/* Field value */}
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3 */}
              <div className="space-y-4">
                <Skeleton className="h-6 w-24" /> {/* Section title */}
                <div className="grid grid-cols-1 gap-4">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                      <Skeleton className="h-4 w-16" /> {/* Field label */}
                      <Skeleton className="h-10 w-full" /> {/* Field value */}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Side Section */}
        <div className="space-y-6">
          {/* Activity/Related Records Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" /> {/* Side section title */}
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Skeleton className="h-8 w-8 rounded-full" /> {/* Avatar/Icon */}
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-full" /> {/* Title */}
                    <Skeleton className="h-3 w-3/4" /> {/* Subtitle */}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export function GenericDetailViewHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between p-6 border-b">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" /> {/* Icon/Avatar */}
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" /> {/* Title */}
          <Skeleton className="h-4 w-32" /> {/* Subtitle */}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-20" /> {/* Action button 1 */}
        <Skeleton className="h-10 w-24" /> {/* Action button 2 */}
      </div>
    </div>
  )
}
