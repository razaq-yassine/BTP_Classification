import { createFileRoute } from '@tanstack/react-router'
import { GenericObjectManager } from '@/components/generic/GenericObjectManager'
import { useObjectDefinition } from '@/hooks/useObjectDefinition'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/$objectName/')({
  validateSearch: (search: Record<string, unknown>): { view?: string } => {
    const view = search.view
    return { view: typeof view === 'string' && view.trim() ? view.trim() : undefined }
  },
  component: ObjectListPage,
})

function ObjectListPage() {
  const { objectName: pathSegment } = Route.useParams()
  const { view: viewFromSearch } = Route.useSearch()
  const { definition, loading, error } = useObjectDefinition(pathSegment, {
    resolveFromPath: true,
  })

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
        {error || `Failed to load ${pathSegment} definition`}
      </div>
    )
  }

  const basePath = definition.basePath ?? `/${pathSegment}`

  return (
    <GenericObjectManager
      objectDefinition={definition}
      view="list"
      basePath={basePath}
      initialViewKey={viewFromSearch}
    />
  )
}
