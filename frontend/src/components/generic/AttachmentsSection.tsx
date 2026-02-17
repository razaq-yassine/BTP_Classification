import { useState, useEffect } from 'react'
import { Paperclip, Upload, Trash2, ExternalLink, FileText, Download, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import api from '@/services/api'
import { apiBaseUrl } from '@/services/api'
import { toast } from 'sonner'
import { FilePreview } from './FilePreview'

export interface FileRecord {
  id: number
  objectName: string
  recordId: number
  filename: string
  storagePath: string
  mimeType: string | null
  size: number
  isPublic: boolean
  uploadedById: number | null
  uploadedAt: string | null
}

interface AttachmentsSectionProps {
  objectName: string
  recordId: number
  canUpdate?: boolean
}

const INITIAL_DISPLAY_LIMIT = 5

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentsSection({ objectName, recordId, canUpdate = true }: AttachmentsSectionProps) {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [makePublicDefault, setMakePublicDefault] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [togglingPublic, setTogglingPublic] = useState<number | null>(null)

  const displayLimit = INITIAL_DISPLAY_LIMIT
  const hasMore = files.length > displayLimit
  const displayedFiles = showAll || !hasMore ? files : files.slice(0, displayLimit)

  const fetchFiles = async () => {
    try {
      setLoading(true)
      const { data } = await api.get<{ files: FileRecord[] }>('/api/files', {
        params: { objectName, recordId },
      })
      setFiles(data.files ?? [])
    } catch (err) {
      console.error('Failed to fetch files:', err)
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [objectName, recordId])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !canUpdate) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('isPublic', String(makePublicDefault))
      await api.post(`/api/upload/${objectName}/${recordId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('File uploaded')
      fetchFiles()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Upload failed'
      toast.error(msg)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (fileId: number) => {
    if (!canUpdate) return
    try {
      await api.delete(`/api/files/${fileId}`)
      toast.success('File deleted')
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
      if (previewFile?.id === fileId) setPreviewFile(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Delete failed'
      toast.error(msg)
    }
  }

  const handleTogglePublic = async (file: FileRecord) => {
    if (!canUpdate) return
    setTogglingPublic(file.id)
    try {
      await api.patch(`/api/files/${file.id}`, { isPublic: !file.isPublic })
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, isPublic: !f.isPublic } : f))
      )
      toast.success(file.isPublic ? 'File is now private' : 'File is now public')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update'
      toast.error(msg)
    } finally {
      setTogglingPublic(null)
    }
  }

  const handleDownload = async (file: FileRecord) => {
    const url = `${apiBaseUrl}/api/files/download/${file.id}`
    if (file.isPublic) {
      window.open(url, '_blank')
      return
    }
    try {
      const { data } = await api.get<Blob>(`/api/files/download/${file.id}`, {
        responseType: 'blob',
      })
      const blob = data instanceof Blob ? data : new Blob([data])
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = file.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Paperclip className="h-4 w-4" />
          <span>Loading attachments...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Paperclip className="h-4 w-4" />
          <span>Attachments</span>
        </div>
        {canUpdate && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Checkbox
                id="makePublicDefault"
                checked={makePublicDefault}
                onCheckedChange={(v) => setMakePublicDefault(!!v)}
              />
              <label htmlFor="makePublicDefault" className="text-xs text-muted-foreground cursor-pointer">
                Make new uploads public
              </label>
            </div>
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploading}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg"
              />
              <Button variant="outline" size="sm" asChild disabled={uploading}>
                <span>
                  <Upload className="h-4 w-4 mr-1" />
                  {uploading ? 'Uploading...' : 'Upload'}
                </span>
              </Button>
            </label>
          </div>
        )}
      </div>

      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments yet.</p>
      ) : (
        <div className="space-y-2">
          {displayedFiles.map((file) => (
            <Card key={file.id} className="p-2">
              <CardContent className="p-0 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{file.filename}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                      {canUpdate && (
                        <div className="flex items-center gap-1">
                          <Checkbox
                            id={`public-${file.id}`}
                            checked={file.isPublic}
                            disabled={togglingPublic === file.id}
                            onCheckedChange={() => handleTogglePublic(file)}
                          />
                          <label
                            htmlFor={`public-${file.id}`}
                            className="text-xs text-muted-foreground cursor-pointer"
                          >
                            Public
                          </label>
                        </div>
                      )}
                      {!canUpdate && file.isPublic && (
                        <span className="text-xs rounded bg-muted px-1">Public</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPreviewFile((f) => (f?.id === file.id ? null : file))}
                    title="Preview"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-primary"
                    onClick={() => handleDownload(file)}
                    title="Download"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  {canUpdate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(file.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show more ({files.length - displayLimit} more)
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {previewFile && (
        <FilePreview
          fileId={previewFile.id}
          filename={previewFile.filename}
          mimeType={previewFile.mimeType}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  )
}
