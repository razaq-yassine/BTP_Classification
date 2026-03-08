import { createFileRoute } from '@tanstack/react-router'
import { GenericObjectManager } from '@/components/generic/GenericObjectManager'
import { useObjectDefinition } from '@/hooks/useObjectDefinition'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/dossiers/$dossierId/')({
  component: DossierDetailPage,
})

function DossierDetailPage() {
  const { dossierId } = Route.useParams()
  const { definition, loading, error } = useObjectDefinition('dossier')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !definition) {
    return (
      <div className="p-4 text-destructive">
        {error || 'Failed to load dossier definition'}
      </div>
    )
  }

  const basePath = definition.basePath ?? 'dossiers'

  return (
    <div className="px-2 md:px-2 lg:px-3 py-1">
      <GenericObjectManager
        objectDefinition={definition}
        view="detail"
        recordId={dossierId}
        basePath={`/${basePath}`}
      />
    </div>
  )
}
