import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { DossierWizard } from '@/components/dossier/DossierWizard'
import { ConfirmDialog } from '@/components/confirm-dialog'

export const Route = createFileRoute('/_authenticated/dossiers/new')({
  component: DossierNewPage,
})

function DossierNewPage() {
  const navigate = useNavigate()
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)

  const handleRequestLeave = () => {
    setShowLeaveDialog(true)
  }

  const handleConfirmLeave = () => {
    setShowLeaveDialog(false)
    navigate({ to: '/dossiers' })
  }

  return (
    <>
      <DossierWizard
        layout="page"
        initialDossier={null}
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
