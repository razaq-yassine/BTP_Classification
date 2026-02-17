import { Skeleton } from '@/components/ui/skeleton'
import { getObjectBorderAccentClasses } from '@/utils/object-color'
import { cn } from '@/lib/utils'

interface GenericDetailsTabSkeletonProps {
  objectColor?: string | null
}

export function GenericDetailsTabSkeleton(props?: GenericDetailsTabSkeletonProps) {
  const { objectColor } = props ?? {}
  return (
    <div className="w-full space-y-3">
      {/* Global Edit Buttons Skeleton (when editing) */}
      <div className="flex items-center justify-between p-3 bg-muted border border-border rounded-lg shadow-sm">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-4" /> {/* Info icon */}
          <Skeleton className="h-4 w-64" /> {/* Unsaved changes message */}
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-16" /> {/* Cancel button */}
          <Skeleton className="h-9 w-20" /> {/* Save button */}
        </div>
      </div>

      {/* Accordion Sections Skeleton */}
      <div className="space-y-3">
        {/* Section 1 - Basic Info */}
        <div className="border border-border rounded-lg overflow-hidden shadow-sm">
          <div className={cn("flex items-center justify-between p-2.5 cursor-pointer bg-muted", getObjectBorderAccentClasses(objectColor))}>
            <Skeleton className="h-5 w-32" /> {/* Section title */}
            <Skeleton className="h-4 w-4" /> {/* Chevron icon */}
          </div>
          <div className="p-3 border-t border-border bg-card/50 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center space-x-1">
                    <Skeleton className="h-4 w-20" /> {/* Field label */}
                    <Skeleton className="h-3 w-3" /> {/* Required/Important indicator */}
                  </div>
                  <Skeleton className="h-10 w-full" /> {/* Field input/value */}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2 - Company Info */}
        <div className="border border-border rounded-lg overflow-hidden shadow-sm">
          <div className={cn("flex items-center justify-between p-2.5 cursor-pointer bg-muted", getObjectBorderAccentClasses(objectColor))}>
            <Skeleton className="h-5 w-28" /> {/* Section title */}
            <Skeleton className="h-4 w-4" /> {/* Chevron icon */}
          </div>
          <div className="p-3 border-t border-border bg-card/50 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center space-x-1">
                    <Skeleton className="h-4 w-16" /> {/* Field label */}
                    <Skeleton className="h-3 w-3" /> {/* Required/Important indicator */}
                  </div>
                  <Skeleton className="h-10 w-full" /> {/* Field input/value */}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3 - System Info (Collapsed) */}
        <div className="border border-border rounded-lg overflow-hidden shadow-sm">
          <div className={cn("flex items-center justify-between p-2.5 cursor-pointer bg-muted", getObjectBorderAccentClasses(objectColor))}>
            <Skeleton className="h-5 w-24" /> {/* Section title */}
            <Skeleton className="h-4 w-4" /> {/* Chevron icon */}
          </div>
        </div>
      </div>

      {/* Bottom Global Edit Buttons Skeleton */}
      <div className="flex items-center justify-between p-3 bg-muted border border-border rounded-lg shadow-sm">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-4" /> {/* Info icon */}
          <Skeleton className="h-4 w-64" /> {/* Unsaved changes message */}
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-16" /> {/* Cancel button */}
          <Skeleton className="h-9 w-20" /> {/* Save button */}
        </div>
      </div>
    </div>
  )
}

export function GenericFieldSkeleton() {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-1">
        <Skeleton className="h-4 w-20" /> {/* Field label */}
        <Skeleton className="h-3 w-3" /> {/* Required/Important indicator */}
      </div>
      <Skeleton className="h-10 w-full" /> {/* Field input/value */}
    </div>
  )
}

export function GenericSectionSkeleton({ fieldCount = 3, columns = 1, objectColor }: { fieldCount?: number; columns?: 1 | 2; objectColor?: string | null }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden shadow-sm">
      <div className={cn("flex items-center justify-between p-2.5 bg-muted", getObjectBorderAccentClasses(objectColor))}>
        <Skeleton className="h-4 w-32" /> {/* Section title */}
        <Skeleton className="h-4 w-4" /> {/* Chevron icon */}
      </div>
      <div className="p-3 border-t border-border bg-card/50 space-y-4">
        <div className={`grid grid-cols-1 ${columns === 2 ? 'md:grid-cols-2' : ''} gap-4`}>
          {Array.from({ length: fieldCount }).map((_, index) => (
            <GenericFieldSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  )
}
