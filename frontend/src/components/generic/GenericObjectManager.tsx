import { ObjectDefinition } from '@/types/object-definition'
import { GenericListView } from './GenericListView'
import { GenericDetailView } from './GenericDetailView'

interface GenericObjectManagerProps {
  objectDefinition: ObjectDefinition
  view: 'list' | 'detail'
  recordId?: string | number
  basePath?: string
  /** View key from URL search (e.g. ?view=openOrders) for deep-linking */
  initialViewKey?: string
}

export function GenericObjectManager({
  objectDefinition,
  view,
  recordId,
  basePath,
  initialViewKey,
}: GenericObjectManagerProps) {

  if (view === 'detail' && recordId) {
    return (
      <div className="px-2 md:px-2 lg:px-3 py-1">
        <GenericDetailView
          objectDefinition={objectDefinition}
          recordId={recordId}
          basePath={basePath}
        />
      </div>
    )
  }

  return (
      <GenericListView
        objectDefinition={objectDefinition}
        basePath={basePath}
        initialViewKey={initialViewKey}
      />
  )
}
