import { useTranslation } from 'react-i18next'
import ContentSection from '../components/content-section'
import { DisplayForm } from './display-form'

export default function SettingsDisplay() {
  const { t } = useTranslation('settings')
  return (
    <ContentSection
      title='Display'
      desc={t('displayPageDescription')}
    >
      <DisplayForm />
    </ContentSection>
  )
}
