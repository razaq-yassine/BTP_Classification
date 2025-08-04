import { ObjectDefinition } from '@/types/object-definition'
import { GenericListView } from './GenericListView'
import { GenericDetailView } from './GenericDetailView'

interface GenericObjectManagerProps {
  objectDefinition: ObjectDefinition
  view: 'list' | 'detail'
  recordId?: string | number
  basePath?: string
}

export function GenericObjectManager({ 
  objectDefinition, 
  view, 
  recordId, 
  basePath 
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
    <div className="px-2 md:px-2 lg:px-13 py-2">
      <GenericListView
        objectDefinition={objectDefinition}
        basePath={basePath}
      />
    </div>
  )
}
