import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import api from '@/services/api'
import { apiBaseUrl } from '@/services/api'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
const PDF_TYPE = 'application/pdf'

function getMimeFromFilename(filename: string): string {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.') || 0)
  const map: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  }
  return map[ext] ?? 'application/octet-stream'
}

interface ProtectedFilePreviewProps {
  path: string
  filename: string
  onClose: () => void
}

/**
 * Preview dialog for field-uploaded files (e.g. logo, file-type fields).
 * Fetches via protected /api/files/serve endpoint.
 */
export function ProtectedFilePreview({ path, filename, onClose }: ProtectedFilePreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const mimeType = getMimeFromFilename(filename)

  useEffect(() => {
    let revoked = false
    const controller = new AbortController()

    async function fetchFile() {
      try {
        setLoading(true)
        setError(null)
        const { data, headers } = await api.get<Blob>(`/api/files/serve`, {
          params: { path },
          responseType: 'blob',
          signal: controller.signal,
        })
        const rawBlob = data instanceof Blob ? data : new Blob([data])
        const isPdfFile = mimeType === PDF_TYPE ||
          (typeof headers['content-type'] === 'string' && headers['content-type'].includes('pdf')) ||
          filename.toLowerCase().endsWith('.pdf')
        const blob = isPdfFile
          ? new Blob([await rawBlob.arrayBuffer()], { type: 'application/pdf' })
          : rawBlob
        const url = URL.createObjectURL(blob)
        if (!revoked) {
          setBlobUrl(url)
        } else {
          URL.revokeObjectURL(url)
        }
      } catch (err) {
        if (!revoked) {
          setError(err instanceof Error ? err.message : 'Failed to load file')
        }
      } finally {
        if (!revoked) setLoading(false)
      }
    }

    fetchFile()
    return () => {
      revoked = true
      controller.abort()
    }
  }, [path])

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [blobUrl])

  const handleDownload = async () => {
    try {
      const { data } = await api.get<Blob>(`/api/files/serve`, {
        params: { path },
        responseType: 'blob',
      })
      const blob = data instanceof Blob ? data : new Blob([data])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename ?? 'download'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Fallback: open serve URL in new tab (user may need to be logged in)
      const serveUrl = `${apiBaseUrl}/api/files/serve?path=${encodeURIComponent(path)}`
      window.open(serveUrl, '_blank')
    }
  }

  const isImage = mimeType && IMAGE_TYPES.includes(mimeType)
  const isPdf = mimeType === PDF_TYPE || filename.toLowerCase().endsWith('.pdf')

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{filename ?? 'Preview'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-auto flex flex-col items-center justify-center">
          {loading && <p className="text-muted-foreground">Loading...</p>}
          {error && <p className="text-destructive">{error}</p>}
          {blobUrl && !loading && (
            <>
              {isImage && (
                <img
                  src={blobUrl}
                  alt={filename ?? 'Preview'}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              )}
              {isPdf && (
                <iframe
                  src={blobUrl}
                  title={filename ?? 'PDF preview'}
                  className="w-full h-[70vh] border-0 rounded"
                />
              )}
              {!isImage && !isPdf && (
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">Preview not available for this file type.</p>
                  <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
        {(isImage || isPdf) && blobUrl && (
          <div className="pt-2 border-t">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
