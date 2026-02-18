import { createFileRoute } from '@tanstack/react-router'
import ContentSection from '@/features/settings/components/content-section'
import { TemplateEditor } from '@/features/settings/email-templates/template-editor'

export const Route = createFileRoute('/_authenticated/settings/email-templates/$templateKey')({
  component: EmailTemplateEditPage,
})

function EmailTemplateEditPage() {
  const { templateKey } = Route.useParams()
  return (
    <ContentSection
      title={`Edit template: ${templateKey}`}
      desc='Edit the email template. Use {{variable}} for placeholders.'
    >
      <TemplateEditor templateKey={templateKey} />
    </ContentSection>
  )
}
