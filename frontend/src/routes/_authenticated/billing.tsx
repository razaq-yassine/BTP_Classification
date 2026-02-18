import { createFileRoute } from '@tanstack/react-router'
import UnderDevelopment from '@/components/under-development'

export const Route = createFileRoute('/_authenticated/billing')({
  component: () => <UnderDevelopment title='Billing' />,
})
