import { createFileRoute } from '@tanstack/react-router'
import { GenericObjectManager } from '@/components/generic/GenericObjectManager'
import { customerObjectDefinition } from '@/config/objects/customer'

export const Route = createFileRoute('/_authenticated/customers/')({
  component: CustomersPage,
})

function CustomersPage() {
  return (
    <GenericObjectManager
      objectDefinition={customerObjectDefinition}
      view="list"
      basePath="/customers"
    />
  )
}
