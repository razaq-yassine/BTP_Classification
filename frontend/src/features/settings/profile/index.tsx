import { useTranslation } from 'react-i18next'
import ContentSection from '../components/content-section'
import ProfileForm from './profile-form'

export default function SettingsProfile() {
  const { t } = useTranslation('settings')
  return (
    <ContentSection
      title={t('profilePageTitle', { defaultValue: 'Profile' })}
      desc={t('profilePageDescMerged', { defaultValue: 'Manage your profile and account settings.' })}
      contentClassName='w-full max-w-full'
    >
      <ProfileForm />
    </ContentSection>
  )
}
