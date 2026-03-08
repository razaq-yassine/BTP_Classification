import { useState, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { DossierWizard } from '@/components/dossier/DossierWizard'
import { ConfirmDialog } from '@/components/confirm-dialog'
import api from '@/services/api'
import type { GenericRecord } from '@/types/object-definition'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/dossiers/$dossierId/edit')({
  component: DossierEditPage,
})

function DossierEditPage() {
  const { dossierId } = Route.useParams()
  const navigate = useNavigate()
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [dossier, setDossier] = useState<GenericRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await api.get(`/api/dossiers/${dossierId}`)
        if (!cancelled) setDossier(res.data)
      } catch (err: any) {
        if (!cancelled) setError(err.response?.data?.message || 'Erreur de chargement')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [dossierId])

  const handleRequestLeave = () => {
    setShowLeaveDialog(true)
  }

  const handleConfirmLeave = () => {
    setShowLeaveDialog(false)
    navigate({ to: '/dossiers' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !dossier) {
    return (
      <div className="p-4 text-destructive">
        {error || 'Dossier introuvable'}
      </div>
    )
  }

  return (
    <>
      <DossierWizard
        layout="page"
        initialDossier={dossier}
        onRequestLeave={handleRequestLeave}
      />
      <ConfirmDialog
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
        title="Quitter le formulaire ?"
        desc="Les données non sauvegardées seront perdues."
        confirmText="Quitter"
        handleConfirm={handleConfirmLeave}
      />
    </>
  )
}
