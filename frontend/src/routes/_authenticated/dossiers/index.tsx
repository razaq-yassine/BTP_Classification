import { createFileRoute } from '@tanstack/react-router'
import { GenericObjectManager } from '@/components/generic/GenericObjectManager'
import { useObjectDefinition } from '@/hooks/useObjectDefinition'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/dossiers/')({
  component: DossiersListPage,
})

function DossiersListPage() {
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
    <GenericObjectManager
      objectDefinition={definition}
      view="list"
      basePath={`/${basePath}`}
    />
  )
}
