import { createFileRoute } from '@tanstack/react-router'
import SettingsEmailTemplates from '@/features/settings/email-templates'

export const Route = createFileRoute('/_authenticated/settings/email-templates/')({
  component: SettingsEmailTemplates,
})
