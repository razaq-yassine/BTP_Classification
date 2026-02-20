import { ChevronRight, ChevronDown, File, Folder, FolderOpen, ExternalLink } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { ExplorerFile } from './files-api'
import { FilePreview } from '@/components/generic/FilePreview'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export interface FileTreeRecordNode {
  recordId: number
  recordLabel: string
  files: ExplorerFile[]
}

export interface FileTreeNode {
  objectName: string
  objectLabel: string
  records: FileTreeRecordNode[]
}

interface FileTreeProps {
  nodes: FileTreeNode[]
  formatObjectName?: (objectName: string) => string
  /** Returns the path to the record detail, or null if not navigable */
  getRecordPath?: (objectName: string, recordId: number) => string | null
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileTree({
  nodes,
  formatObjectName = (n) => n,
  getRecordPath
}: FileTreeProps) {
  const { t } = useTranslation('common')
  const [previewFile, setPreviewFile] = useState<ExplorerFile | null>(null)
  const [openObjects, setOpenObjects] = useState<Set<string>>(new Set())
  const [openRecords, setOpenRecords] = useState<Set<string>>(new Set())

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) => {
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (nodes.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t('common:noFiles', { defaultValue: 'No files found' })}
      </p>
    )
  }

  const totalFiles = (node: FileTreeNode) =>
    node.records.reduce((sum, r) => sum + r.files.length, 0)

  return (
    <div className="space-y-1">
      {nodes.map((objectNode) => {
        const objectKey = objectNode.objectName
        const isObjectOpen = openObjects.has(objectKey)
        const fileCount = totalFiles(objectNode)

        return (
          <Collapsible
            key={objectKey}
            open={isObjectOpen}
            onOpenChange={() => toggle(setOpenObjects, objectKey)}
          >
            <div className="flex items-center gap-1 group/row">
              <CollapsibleTrigger className="flex flex-1 min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent">
                {isObjectOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                )}
                {isObjectOpen ? (
                  <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate font-medium">
                  {formatObjectName(objectNode.objectName)}
                </span>
                <span className="ml-auto text-xs text-muted-foreground shrink-0">
                  {objectNode.records.length} {t('records', { defaultValue: 'records' })}, {fileCount} {t('common:files', { defaultValue: 'files' })}
                </span>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="ml-6 mt-1 space-y-1 border-l pl-3">
                {objectNode.records.map((recordNode) => {
                  const recordKey = `${objectNode.objectName}-${recordNode.recordId}`
                  const isRecordOpen = openRecords.has(recordKey)
                  const recordPath = getRecordPath?.(objectNode.objectName, recordNode.recordId)

                  return (
                    <Collapsible
                      key={recordKey}
                      open={isRecordOpen}
                      onOpenChange={() => toggle(setOpenRecords, recordKey)}
                    >
                      <div className="flex items-center gap-1 group/record">
                        <CollapsibleTrigger className="flex flex-1 min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent">
                          {isRecordOpen ? (
                            <ChevronDown className="h-4 w-4 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0" />
                          )}
                          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate font-medium">
                            {recordNode.recordLabel}
                          </span>
                          <span className="ml-auto text-xs text-muted-foreground shrink-0">
                            {recordNode.files.length} {t('common:files', { defaultValue: 'files' })}
                          </span>
                        </CollapsibleTrigger>
                        {recordPath && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 opacity-0 group-hover/record:opacity-100 transition-opacity"
                            asChild
                          >
                            <Link
                              to={recordPath}
                              title={t('goToRecord', { defaultValue: 'Go to record' })}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </div>
                      <CollapsibleContent>
                        <div className="ml-6 mt-1 space-y-0.5 border-l pl-3">
                          {recordNode.files.map((file) => (
                            <div
                              key={file.id}
                              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-accent group/file"
                              onClick={() => setPreviewFile(file)}
                            >
                              <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="truncate flex-1">{file.filename}</span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {formatFileSize(file.size)}
                              </span>
                              {recordPath && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 shrink-0 opacity-0 group-hover/file:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                  asChild
                                >
                                  <Link
                                    to={recordPath}
                                    title={t('goToRecord', { defaultValue: 'Go to record' })}
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Link>
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )
      })}
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
