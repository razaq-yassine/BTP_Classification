import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
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
      title='Email Templates'
      desc='Edit email templates used for notifications. Use {{variable}} for placeholders.'
    >
      {loading ? (
        <div className='text-muted-foreground text-sm'>Loading...</div>
      ) : templates.length === 0 ? (
        <div className='text-muted-foreground text-sm'>No templates found.</div>
      ) : (
        <div className='space-y-2'>
          {templates.map((t) => (
            <div
              key={t.key}
              className='flex items-center justify-between rounded-lg border p-4'
            >
              <div>
                <p className='font-medium'>{t.label}</p>
                <p className='text-muted-foreground text-sm'>{t.subject}</p>
                <p className='text-muted-foreground mt-1 text-xs'>
                  Variables: {t.variables?.join(', ') || 'none'}
                </p>
              </div>
              <Button variant='outline' size='sm' asChild>
                <Link to='/settings/email-templates/$templateKey' params={{ templateKey: t.key }}>
                  Edit
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </ContentSection>
  )
}
