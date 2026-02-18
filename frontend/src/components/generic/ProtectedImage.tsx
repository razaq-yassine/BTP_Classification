import { useState, useEffect, useRef } from 'react'
import { Layers } from 'lucide-react'
import api from '@/services/api'

interface ProtectedImageProps {
  /** Path like /uploads/organization/1/logo/xxx.png - requires auth to load */
  path: string
  alt: string
  className?: string
  fallbackIcon?: React.ReactNode
}

/**
 * Image that fetches with auth for field-uploaded files (e.g. logo).
 * img src cannot send Authorization header, so we fetch and use blob URL.
 */
export function ProtectedImage({ path, alt, className, fallbackIcon }: ProtectedImageProps) {
  const [src, setSrc] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!path || !path.startsWith('/uploads/')) return
    let cancelled = false
    api
      .get<Blob>(`/api/files/serve`, {
        params: { path },
        responseType: 'blob',
      })
      .then(({ data }) => {
        if (cancelled) return
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
        const blobUrl = URL.createObjectURL(data)
        blobUrlRef.current = blobUrl
        setSrc(blobUrl)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
      setSrc(null)
    }
  }, [path])

  if (error || !path?.startsWith('/uploads/')) {
    return fallbackIcon ?? <Layers className="size-4" />
  }
  if (!src) {
    return fallbackIcon ?? <Layers className="size-4 animate-pulse" />
  }
  return <img src={src} alt={alt} className={className} />
}
