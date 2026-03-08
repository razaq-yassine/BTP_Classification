import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ObjectDefinition, GenericRecord } from '@/types/object-definition'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft } from 'lucide-react'
import { GenericObjectDetailViewHeader } from './GenericObjectDetailViewHeader'
import { GenericObjectDetailViewMainSection } from './GenericObjectDetailViewMainSection'
import { GenericObjectDetailViewSideSection } from './GenericObjectDetailViewSideSection'
import { GenericDetailViewSkeleton } from './GenericDetailViewSkeleton'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { SalesforcePath, type SalesforcePathStep } from '@/components/ui/salesforce-path'
import { translateSelectOptionLabel, translateObjectLabel } from '@/utils/translateMetadata'
import api from '@/services/api'
import { isNetworkError } from '@/utils/handle-server-error'
import { playDeleteSound } from '@/utils/sound-effects'
import { trackRecentlyViewed } from '@/utils/recently-viewed'
import { useAuthStore, selectUser } from '@/stores/authStore'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from 'sonner'

interface GenericDetailViewProps {
  objectDefinition: ObjectDefinition
  recordId: string | number
  basePath?: string // Base path for navigation back to list
}

export function GenericDetailView({ objectDefinition, recordId, basePath }: GenericDetailViewProps) {
  const { t } = useTranslation(['common', 'errors'])
  const navigate = useNavigate()
  const user = useAuthStore(selectUser)
  const { canDelete } = usePermissions()
  const [record, setRecord] = useState<GenericRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isConnectionError, setIsConnectionError] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showReopenDialog, setShowReopenDialog] = useState(false)
  const [reopening, setReopening] = useState(false)

  const handleDossierEdit = useCallback(
    async (r: GenericRecord) => {
      if (objectDefinition.name !== 'dossier') return
      const status = r.status as string
      if (status === 'COMPLETED') {
        try {
          const endpoint = objectDefinition.apiEndpoint.endsWith('/')
            ? objectDefinition.apiEndpoint.slice(0, -1)
            : objectDefinition.apiEndpoint
          const res = await api.put(`${endpoint}/${r.id}`, { ...r, status: 'EDITING' })
          setRecord(res.data)
          navigate({ to: '/dossiers/$dossierId/edit', params: { dossierId: String(res.data.id) } })
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Erreur')
        }
      } else {
        navigate({ to: '/dossiers/$dossierId/edit', params: { dossierId: String(r.id) } })
      }
    },
    [objectDefinition, navigate]
  )

  const handleDossierResume = useCallback(
    () => {
      if (objectDefinition.name !== 'dossier' || !record) return
      navigate({ to: '/dossiers/$dossierId/edit', params: { dossierId: String(record.id) } })
    },
    [objectDefinition, record, navigate]
  )

  const handleDossierReopenRequest = useCallback(() => {
    setShowReopenDialog(true)
  }, [])

  const handleDossierReopenConfirm = useCallback(async () => {
    if (objectDefinition.name !== 'dossier' || !record) return
    try {
      setReopening(true)
      const endpoint = objectDefinition.apiEndpoint.endsWith('/')
        ? objectDefinition.apiEndpoint.slice(0, -1)
        : objectDefinition.apiEndpoint
      const res = await api.post(`${endpoint}/${record.id}/reopen`)
      setRecord(res.data)
      setShowReopenDialog(false)
      toast.success(t('dossierReopened', { defaultValue: 'Dossier rouvert pour modification' }))
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally {
      setReopening(false)
    }
  }, [objectDefinition, record, t])

  useEffect(() => {
    fetchRecord()
  }, [objectDefinition, recordId])

  const fetchRecord = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get(`${objectDefinition.apiEndpoint}/${recordId}`)
      const fetchedRecord = response.data
      setRecord(fetchedRecord)

      // Track this record as recently viewed
      if (fetchedRecord?.id) {
        trackRecentlyViewed(objectDefinition.name, fetchedRecord.id, user?.id)
      }
    } catch (err: any) {
      const networkErr = isNetworkError(err)
      setIsConnectionError(networkErr)
      const msg = networkErr
        ? t('errors:connectionLost')
        : err.response?.data?.message || err.response?.data?.error || t('errors:failedToFetch', { object: translateObjectLabel(objectDefinition.name, objectDefinition.label, false).toLowerCase() })
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // const getDisplayName = (record: GenericRecord) => {
  //   return record.full_name || record.name || record.title || `${objectDefinition.label} #${record.id}`
  // }

  const handleBack = () => {
    if (basePath) {
      navigate({ to: basePath })
    } else {
      window.history.back()
    }
  }

  const handleDeleteRequest = () => {
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    if (!record?.id) return
    setDeleting(true)
    try {
      const endpoint = objectDefinition.apiEndpoint.endsWith('/')
        ? objectDefinition.apiEndpoint.slice(0, -1)
        : objectDefinition.apiEndpoint
      await api.delete(`${endpoint}/${record.id}`)
      playDeleteSound()
      toast.success(t('common:recordDeleted', { label: translateObjectLabel(objectDefinition.name, objectDefinition.label, false) }))
      setShowDeleteDialog(false)
      handleBack()
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || t('errors:failedToDelete')
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  // const Icon = objectDefinition.icon

  if (loading) {
    return <GenericDetailViewSkeleton />
  }

  if (error) {
    return (
      <main className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common:back')}
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-4">
            {error}
            {isConnectionError && (
              <Button variant="outline" size="sm" onClick={() => fetchRecord()}>
                {t('common:retry')}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </main>
    )
  }

  if (!record) {
    return (
      <main className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common:back')}
          </Button>
        </div>
        <Alert>
          <AlertDescription>{t('common:recordNotFound', { label: translateObjectLabel(objectDefinition.name, objectDefinition.label, false) })}</AlertDescription>
        </Alert>
      </main>
    )
  }

  // const Icon = objectDefinition.icon
  // const displayName = getDisplayName(record)

  const path = objectDefinition.path
  const rawPathSteps: SalesforcePathStep[] | undefined =
    path?.enabled && path?.steps
      ? path.steps.map((s) => {
        const hex = s.color?.replace?.(/^#/, '').trim()
        const isValidHex = hex && /^[a-f\d]{6}$/i.test(hex)
        let color: string | undefined
        if (isValidHex) {
          const r = parseInt(hex!.slice(0, 2), 16)
          const g = parseInt(hex!.slice(2, 4), 16)
          const b = parseInt(hex!.slice(4, 6), 16)
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
          color = luminance > 0.9 ? undefined : `#${hex}` // Reject white/very light
        } else {
          color = undefined
        }
        const hexHover = s.colorHover?.replace?.(/^#/, '').trim()
        const colorHover = color && hexHover && /^[a-f\d]{6}$/i.test(hexHover)
          ? `#${hexHover}`
          : color
        return {
          value: s.value,
          label: translateSelectOptionLabel(objectDefinition.name, path.field, s.value, s.label),
          color: color ?? undefined,
          colorHover,
        }
      })
      : undefined
  // Dossier: hide "En modification" (EDITING) from pipeline; show Brouillon → En cours → Complété → Soumis
  const pathSteps =
    objectDefinition.name === 'dossier' && rawPathSteps
      ? rawPathSteps.filter((s) => s.value !== 'EDITING')
      : rawPathSteps
  const pathFieldValueRaw = path?.enabled ? String(record[path.field] ?? '') : ''
  // Map EDITING to COMPLETED for path display so breadcrumb shows correct position
  const pathFieldValue =
    objectDefinition.name === 'dossier' && pathFieldValueRaw === 'EDITING'
      ? 'COMPLETED'
      : pathFieldValueRaw
  const showPath = path?.enabled && pathSteps && pathSteps.length > 0

  return (
    <main className="flex-1 space-y-6">
      {/* Header Section */}
      <GenericObjectDetailViewHeader
        objectDefinition={objectDefinition}
        record={record}
        onDelete={canDelete(objectDefinition.name) ? handleDeleteRequest : undefined}
        actionOverrides={
          objectDefinition.name === 'dossier'
            ? { edit: handleDossierEdit }
            : undefined
        }
        extraPrimaryActions={
          objectDefinition.name === 'dossier' && record.status === 'SOUMIS'
            ? [{ key: 'reopen', label: '✏ Modifier le dossier', variant: 'outline', onClick: handleDossierReopenRequest }]
            : []
        }
        primaryActionsFilter={
          objectDefinition.name === 'dossier' && record.status === 'SOUMIS'
            ? (action) => action.key !== 'edit'
            : undefined
        }
      />

      {/* Path (Salesforce-style) - between header and content */}
      {showPath && (
        <SalesforcePath
          steps={pathSteps}
          currentStep={pathFieldValue}
          onStageChange={async (newValue) => {
            try {
              const updatePayload = { ...record, [path.field]: newValue }
              const response = await api.put(`${objectDefinition.apiEndpoint}/${recordId}`, updatePayload)
              setRecord(response.data)
            } catch (err) {
              console.error('Failed to update stage:', err)
            }
          }}
        />
      )}

      {/* Main Layout */}
      <div className={`grid grid-cols-1 lg:grid-cols-5 gap-2 ${showPath ? '!mt-0' : ''}`}>
        {/* Main Content - 3 columns on large screens */}
        <div className="lg:col-span-3">
          <GenericObjectDetailViewMainSection
            objectDefinition={objectDefinition}
            record={record}
            onRecordUpdate={setRecord}
            isLoading={loading}
          />
        </div>

        {/* Side Section - 2 columns on large screens (Activity, History, Communication, Files) */}
        <div className="lg:col-span-2">
          <GenericObjectDetailViewSideSection
            objectDefinition={objectDefinition}
            record={record}
            onOpenDossierWizard={
              objectDefinition.name === 'dossier' ? handleDossierResume : undefined
            }
          />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={t('common:deleteRecordTitle', { label: translateObjectLabel(objectDefinition.name, objectDefinition.label, false) })}
        desc={t('common:deleteRecordDesc', { label: translateObjectLabel(objectDefinition.name, objectDefinition.label, false).toLowerCase() })}
        confirmText={t('common:delete')}
        destructive
        isLoading={deleting}
        handleConfirm={handleDeleteConfirm}
      />

      {/* Dossier Reopen Confirmation Dialog */}
      <ConfirmDialog
        open={showReopenDialog}
        onOpenChange={setShowReopenDialog}
        title={t('dossierReopenTitle', { defaultValue: 'Modifier le dossier' })}
        desc={t('dossierReopenDesc', { defaultValue: "Cette action annulera la soumission du dossier. Il devra être complété et soumis à nouveau. Confirmer ?" })}
        confirmText={t('common:confirm', { defaultValue: 'Confirmer' })}
        isLoading={reopening}
        handleConfirm={handleDossierReopenConfirm}
      />
    </main>
  )
}
