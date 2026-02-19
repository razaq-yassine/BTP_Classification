import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useObjectDefinition } from '@/hooks/useObjectDefinition'
import { SalesforcePath } from '@/components/ui/salesforce-path'
import { translateSelectOptionLabel } from '@/utils/translateMetadata'
import type { ObjectDefinition } from '@/types/object-definition'

export const Route = createFileRoute('/_authenticated/dev-components/order-detail-path')({
  component: OrderDetailPathPage,
})

/** Mock order for demo - Path uses status field with useInPath */
const MOCK_ORDER = {
  id: 1,
  name: 'ORD-001',
  status: 'CONFIRMED',
  totalAmount: 299.99,
  orderDate: '2025-02-10',
  deliveryDate: '2025-02-20',
  description: 'Sample order for Path demo',
  customer: { id: 1, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
  createdAt: '2025-02-10T10:00:00Z',
  updatedAt: '2025-02-10T10:00:00Z',
}

function OrderDetailPathPage() {
  const { definition, loading, error } = useObjectDefinition('order')

  if (loading) {
    return (
      <Main className="px-4">
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading order definition...</div>
        </div>
      </Main>
    )
  }

  if (error || !definition) {
    return (
      <Main className="px-4">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error || 'Failed to load order definition'}</CardDescription>
          </CardHeader>
        </Card>
      </Main>
    )
  }

  return (
    <Main className="px-4">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dev-components/salesforce-path">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Path in Order Detail</h1>
            <p className="text-muted-foreground">
              The Order status field has <code className="rounded bg-muted px-1">useInPath: true</code> and colored
              options. The Path appears between the header and content.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Order Detail View with Path</CardTitle>
            <CardDescription>
              Navigate to a real order to see the Path in production. This demo uses mock data. The status field
              drives the Path — change stages with &quot;Mark stage as complete&quot; or &quot;Mark as current&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OrderDetailDemo definition={definition} />
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}

/** Demo that renders the detail layout with Path using mock data (no API) */
function OrderDetailDemo({ definition }: { definition: ObjectDefinition }) {
  const [record, setRecord] = useState(MOCK_ORDER)
  const path = definition.path
  const pathSteps =
    path?.enabled && path?.steps
      ? path.steps.map((s) => ({
          value: s.value,
          label: translateSelectOptionLabel(definition.name, path.field, s.value, s.label),
          color: s.color,
          colorHover: s.colorHover,
        }))
      : []
  const pathFieldValue = path?.enabled ? String((record as Record<string, unknown>)[path.field] ?? '') : ''
  const showPath = path?.enabled && pathSteps.length > 0

  // We need to render the detail view layout. For demo we'll use a simplified version
  // that doesn't call the API - we pass record and a custom update handler.
  // GenericDetailView fetches from API - so we need a different approach.
  // Let's render the key parts: header, path, and a minimal content area.
  return (
    <div className="rounded-lg border bg-card p-6 space-y-6">
      {/* Mock header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Order #{record.name}</h2>
          <p className="text-sm text-muted-foreground">Status: {record.status}</p>
        </div>
      </div>

      {/* Path - from status field with useInPath */}
      {showPath && (
        <div className="py-2">
          <OrderPathDemo
            steps={pathSteps}
            currentStep={pathFieldValue}
            onStageChange={(newValue) => {
              setRecord((prev) => ({ ...prev, [path.field]: newValue }))
            }}
          />
        </div>
      )}

      {/* Mock content */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Total:</span> ${record.totalAmount}
        </div>
        <div>
          <span className="text-muted-foreground">Order Date:</span> {record.orderDate}
        </div>
      </div>
    </div>
  )
}

function OrderPathDemo({
  steps,
  currentStep,
  onStageChange,
}: {
  steps: { value: string; label: string; color?: string; colorHover?: string }[]
  currentStep: string
  onStageChange: (value: string) => void
}) {
  return (
    <SalesforcePath
      steps={steps}
      currentStep={currentStep}
      onStageChange={onStageChange}
    />
  )
}
