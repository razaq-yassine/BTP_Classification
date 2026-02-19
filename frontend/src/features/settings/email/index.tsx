import { useTranslation } from 'react-i18next'
import ContentSection from '../components/content-section'
import { EmailConfigForm } from './email-config-form'

export default function SettingsEmail() {
  const { t } = useTranslation('settings')
  return (
    <ContentSection
      title={t('emailTitle')}
      desc={t('emailDesc')}
    >
      <EmailConfigForm />
    </ContentSection>
  )
}
