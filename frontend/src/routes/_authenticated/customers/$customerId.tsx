import { createFileRoute } from '@tanstack/react-router'
import { GenericObjectManager } from '@/components/generic/GenericObjectManager'
import { customerObjectDefinition } from '@/config/objects/customer'

export const Route = createFileRoute('/_authenticated/customers/$customerId')({
  component: CustomerDetailPage,
})

function CustomerDetailPage() {
  const { customerId } = Route.useParams()
  
  return (
    <GenericObjectManager
      objectDefinition={customerObjectDefinition}
      view="detail"
      recordId={customerId}
      basePath="/customers"
    />
  )
}
