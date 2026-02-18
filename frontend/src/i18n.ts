import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import Backend from 'i18next-http-backend'

const DEFAULT_LANGUAGE = 'en'

void i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    backend: {
      loadPath: '/metadata/translations/{{lng}}/{{ns}}.json',
    },
    defaultNS: 'common',
    fallbackLng: DEFAULT_LANGUAGE,
    lng: DEFAULT_LANGUAGE,
    ns: ['common', 'navigation', 'settings', 'errors', 'objects'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false,
    },
  })

export default i18n
export { DEFAULT_LANGUAGE }
