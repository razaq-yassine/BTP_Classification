import { useState } from 'react'
import { apiBaseUrl } from '@/services/api'
import { ProtectedFilePreview } from '@/components/generic/ProtectedFilePreview'

interface ProtectedFileLinkProps {
  path: string
  filename: string
  className?: string
  onClick?: (e: React.MouseEvent) => void
}

/**
 * Link for field-uploaded files (e.g. logo, file-type fields).
 * Opens a preview dialog on click - images and PDFs show inline, others offer download.
 */
export function ProtectedFileLink({ path, filename, className, onClick }: ProtectedFileLinkProps) {
  const [showPreview, setShowPreview] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    onClick?.(e)
    e.preventDefault()
    setShowPreview(true)
  }

  const linkClass = 'text-blue-600 dark:text-primary hover:underline cursor-pointer'
  return (
    <>
      <a
        href={`${apiBaseUrl}/api/files/serve?path=${encodeURIComponent(path)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={className ?? linkClass}
        onClick={handleClick}
      >
        {filename}
      </a>
      {showPreview && (
        <ProtectedFilePreview
          path={path}
          filename={filename}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  )
}
