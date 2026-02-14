import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Full-page skeleton shown while the authenticated layout is loading
 * (during beforeLoad auth check and loader prefetch of object definitions).
 * Mirrors the layout structure: sidebar + header + main content.
 */
export function DashboardSkeleton() {
  return (
    <div className='flex h-svh w-full'>
      {/* Sidebar skeleton */}
      <div
        className={cn(
          'hidden md:flex w-16 flex-col gap-2 border-r bg-sidebar p-2',
          'sm:w-64 sm:gap-4 sm:p-4'
        )}
      >
        {/* Team switcher */}
        <div className='flex items-center gap-2'>
          <Skeleton className='h-8 w-8 rounded-md sm:w-10 sm:h-10' />
          <div className='hidden flex-1 flex-col gap-1 sm:flex'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-3 w-16' />
          </div>
        </div>
        {/* Nav groups */}
        <div className='flex-1 space-y-4 pt-4'>
          {[1, 2, 3].map((i) => (
            <div key={i} className='space-y-2'>
              <Skeleton className='h-3 w-16' />
              <div className='space-y-1'>
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className='h-8 w-full' />
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* User */}
        <div className='flex items-center gap-2 pt-2'>
          <Skeleton className='h-8 w-8 rounded-full' />
          <div className='hidden flex-1 sm:block'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-3 w-20' />
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className='flex flex-1 flex-col min-w-0'>
        {/* Header skeleton */}
        <header className='bg-background flex h-16 shrink-0 items-center gap-3 border-b p-4 sm:gap-4'>
          <Skeleton className='h-9 w-9 shrink-0' />
          <div className='h-6 w-px shrink-0 bg-border' />
          <div className='flex flex-1 gap-4'>
            <Skeleton className='h-8 w-24' />
            <Skeleton className='h-8 w-24' />
            <Skeleton className='h-8 w-24' />
          </div>
          <div className='flex items-center gap-2'>
            <Skeleton className='h-9 w-64' />
            <Skeleton className='h-9 w-9' />
            <Skeleton className='h-9 w-9 rounded-full' />
          </div>
        </header>

        {/* Main content skeleton */}
        <main className='flex-1 overflow-auto p-4 sm:p-6'>
          <div className='space-y-6'>
            {/* Page header */}
            <div className='flex items-center justify-between'>
              <Skeleton className='h-8 w-48' />
              <Skeleton className='h-10 w-28' />
            </div>

            {/* Tabs */}
            <div className='flex gap-2'>
              <Skeleton className='h-9 w-20' />
              <Skeleton className='h-9 w-20' />
              <Skeleton className='h-9 w-20' />
            </div>

            {/* Stats cards */}
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className='rounded-lg border p-6'>
                  <div className='flex items-center justify-between'>
                    <Skeleton className='h-4 w-24' />
                    <Skeleton className='h-4 w-4' />
                  </div>
                  <Skeleton className='mt-2 h-8 w-20' />
                  <Skeleton className='mt-1 h-3 w-32' />
                </div>
              ))}
            </div>

            {/* Chart + table area */}
            <div className='grid gap-4 lg:grid-cols-7'>
              <div className='rounded-lg border p-6 lg:col-span-4'>
                <Skeleton className='h-6 w-24 mb-4' />
                <Skeleton className='h-64 w-full' />
              </div>
              <div className='rounded-lg border p-6 lg:col-span-3'>
                <Skeleton className='h-6 w-32 mb-2' />
                <Skeleton className='h-4 w-48 mb-4' />
                <div className='space-y-3'>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className='flex items-center gap-3'>
                      <Skeleton className='h-8 w-8 rounded-full' />
                      <div className='flex-1'>
                        <Skeleton className='h-4 w-full' />
                        <Skeleton className='mt-1 h-3 w-3/4' />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
