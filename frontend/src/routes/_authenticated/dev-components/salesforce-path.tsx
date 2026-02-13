import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SalesforcePath, type SalesforcePathStep } from '@/components/ui/salesforce-path'
import { Main } from '@/components/layout/main'

export const Route = createFileRoute('/_authenticated/dev-components/salesforce-path')({
  component: SalesforcePathPage,
})

const sampleSteps: SalesforcePathStep[] = [
  { value: 'prospecting', label: 'Prospecting' },
  { value: 'qualification', label: 'Qualification' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'closed-won', label: 'Closed Won' },
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Path with Mark as complete / Mark as current</CardTitle>
            <CardDescription>
              Default: current stage preselected (dark green), &quot;Mark stage as complete&quot; advances to next. Click a different stage for outline, then &quot;Mark as current&quot;. Current: {currentStep}.
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
