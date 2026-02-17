import * as React from 'react'
import DOMPurify from 'dompurify'
import { cn } from '@/lib/utils'

interface RichTextViewProps {
  html: string
  className?: string
  /** Max height in pixels when collapsed. Default 120. */
  maxHeightCollapsed?: number
}

export function RichTextView({
  html,
  className,
  maxHeightCollapsed = 120,
}: RichTextViewProps) {
  const [expanded, setExpanded] = React.useState(false)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [needsExpand, setNeedsExpand] = React.useState(false)

  const sanitized = DOMPurify.sanitize(html || '')

  React.useEffect(() => {
    if (!contentRef.current || expanded) return
    const el = contentRef.current
    setNeedsExpand(el.scrollHeight > maxHeightCollapsed)
  }, [html, expanded, maxHeightCollapsed])

  if (!sanitized || sanitized.trim() === '') {
    return <span className="text-muted-foreground">(Empty)</span>
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div
        ref={contentRef}
        className={cn(
          'prose prose-sm dark:prose-invert max-w-none',
          !expanded && needsExpand && 'overflow-hidden'
        )}
        style={
          !expanded && needsExpand
            ? { maxHeight: maxHeightCollapsed }
            : undefined
        }
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
      {needsExpand && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((prev) => !prev)
          }}
          className="text-primary hover:underline text-sm font-medium"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}
