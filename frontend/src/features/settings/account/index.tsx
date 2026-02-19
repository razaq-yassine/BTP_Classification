import { useTranslation } from 'react-i18next'
import ContentSection from '../components/content-section'
import { AccountForm } from './account-form'

export default function SettingsAccount() {
  const { t } = useTranslation('settings')
  return (
    <ContentSection
      title='Account'
      desc={t('accountPageDescription')}
    >
      <AccountForm />
    </ContentSection>
  )
}
