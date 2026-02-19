import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import ContentSection from '../components/content-section'
import { Button } from '@/components/ui/button'
import api from '@/services/api'

interface EmailTemplate {
  key: string
  label: string
  subject: string
  bodyHtml: string
  variables: string[]
}

export default function SettingsEmailTemplates() {
  const { t } = useTranslation('settings')
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<EmailTemplate[]>('/api/email/templates')
      .then((res) => setTemplates(res.data ?? []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <ContentSection
      title={t('emailTemplatesTitle')}
      desc={t('emailTemplatesDesc')}
    >
      {loading ? (
        <div className='text-muted-foreground text-sm'>{t('loading')}</div>
      ) : templates.length === 0 ? (
        <div className='text-muted-foreground text-sm'>{t('noTemplatesFound')}</div>
      ) : (
        <div className='space-y-2'>
          {templates.map((tmpl) => (
            <div
              key={tmpl.key}
              className='flex items-center justify-between rounded-lg border p-4'
            >
              <div>
                <p className='font-medium'>{tmpl.label}</p>
                <p className='text-muted-foreground text-sm'>{tmpl.subject}</p>
                <p className='text-muted-foreground mt-1 text-xs'>
                  {t('variables')}: {tmpl.variables?.join(', ') || 'none'}
                </p>
              </div>
              <Button variant='outline' size='sm' asChild>
                <Link to='/settings/email-templates/$templateKey' params={{ templateKey: tmpl.key }}>
                  {t('edit', { ns: 'common' })}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </ContentSection>
  )
}
