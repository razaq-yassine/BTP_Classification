import { createFileRoute } from '@tanstack/react-router'
import SettingsTranslations from '@/features/settings/translations'

export const Route = createFileRoute('/_authenticated/settings/translations/')({
  component: SettingsTranslations,
})
