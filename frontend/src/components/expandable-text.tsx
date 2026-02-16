import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface ExpandableTextProps {
  children: string
  className?: string
  maxLines?: number
}

const DEFAULT_MAX_LINES = 3

export function ExpandableText({
  children,
  className,
  maxLines = DEFAULT_MAX_LINES,
}: ExpandableTextProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [needsExpand, setNeedsExpand] = useState(false)

  useEffect(() => {
    if (!ref.current || isExpanded) return

    const el = ref.current
    const overflows =
      el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth

    setNeedsExpand(overflows)
  }, [children, isExpanded])

  const lineClampClass =
    maxLines === 2
      ? 'line-clamp-2'
      : maxLines === 3
        ? 'line-clamp-3'
        : maxLines === 4
          ? 'line-clamp-4'
          : maxLines === 5
            ? 'line-clamp-5'
            : 'line-clamp-3'

  if (!needsExpand && !isExpanded) {
    return (
      <div
        ref={ref}
        className={cn(
          'whitespace-pre-wrap break-words',
          lineClampClass,
          className
        )}
      >
        {children}
      </div>
    )
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div
        ref={ref}
        className={cn(
          'whitespace-pre-wrap break-words',
          !isExpanded && lineClampClass
        )}
      >
        {children}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setIsExpanded((prev) => !prev)
        }}
        className="text-primary hover:underline text-sm font-medium"
      >
        {isExpanded ? 'Show less' : 'Show more'}
      </button>
    </div>
  )
}
