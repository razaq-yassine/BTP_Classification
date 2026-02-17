import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SalesforcePath, type SalesforcePathStep } from '@/components/ui/salesforce-path'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_authenticated/dev-components/salesforce-path')({
  component: SalesforcePathPage,
})

const sampleSteps: SalesforcePathStep[] = [
  { value: 'prospecting', label: 'Prospecting', color: '#0369a1' },
  { value: 'qualification', label: 'Qualification', color: '#1e40af' },
  { value: 'proposal', label: 'Proposal', color: '#7c3aed', colorHover: '#8b5cf6' },
  { value: 'negotiation', label: 'Negotiation', color: '#b45309' },
  { value: 'closed-won', label: 'Closed Won', color: '#047857' },
]

function SalesforcePathPage() {
  const [currentStep, setCurrentStep] = useState('qualification')

  return (
    <Main className="px-4">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Salesforce Path</h1>
          <p className="text-muted-foreground">
            A horizontal step progress indicator inspired by Salesforce Sales Path.
          </p>
          <div className="mt-2 flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dev-components/order-detail-path">
                Path demo (mock data)
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/$objectName/$recordId" params={{ objectName: 'orders', recordId: '1' }}>
                Open Order #1 (generic detail view)
              </Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Path with Mark as complete / Mark as current</CardTitle>
            <CardDescription>
              Each stage has a custom color when it&apos;s current. &quot;Mark stage as complete&quot; advances to next. Click a different stage for outline, then &quot;Mark as current&quot;. Current: {currentStep}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SalesforcePath
              steps={sampleSteps}
              currentStep={currentStep}
              onStageChange={async (value) => {
                setCurrentStep(value)
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Read-only Path</CardTitle>
            <CardDescription>
              Path without click handlers - useful for display-only progress.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SalesforcePath
              steps={[
                { value: '1', label: 'Contacted' },
                { value: '2', label: 'Meeting Scheduled' },
                { value: '3', label: 'Proposal Sent' },
                { value: '4', label: 'Closed' },
              ]}
              currentStep="3"
            />
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}
