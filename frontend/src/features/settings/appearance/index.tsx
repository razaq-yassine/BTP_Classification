import { useTranslation } from 'react-i18next'
import ContentSection from '../components/content-section'
import { AppearanceForm } from './appearance-form'

export default function SettingsAppearance() {
  const { t } = useTranslation('settings')
  return (
    <ContentSection
      title='Appearance'
      desc={t('appearancePageDescription')}
    >
      <AppearanceForm />
    </ContentSection>
  )
}
