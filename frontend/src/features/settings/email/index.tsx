import ContentSection from '../components/content-section'
import { EmailConfigForm } from './email-config-form'

export default function SettingsEmail() {
  return (
    <ContentSection
      title='Email'
      desc='Configure SMTP settings for sending transactional emails.'
    >
      <EmailConfigForm />
    </ContentSection>
  )
}
