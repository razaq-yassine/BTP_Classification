import { createFileRoute } from '@tanstack/react-router'
import { ObjectEditor } from '@/features/settings/object-manager/components/object-editor-layout'

export const Route = createFileRoute(
  '/_authenticated/settings/object-manager/$objectName'
)({
  component: ObjectManagerEditor,
})

function ObjectManagerEditor() {
  const { objectName } = Route.useParams()
  return <ObjectEditor objectName={objectName} />
}
