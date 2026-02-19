import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ContentSection from '../components/content-section'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import api from '@/services/api'
import { toast } from 'sonner'

interface NotificationSetting {
  eventKey: string
  label: string
  description: string
  defaultTemplateKey: string
  enabled: boolean
  templateKey: string
}

interface EmailTemplate {
  key: string
  label: string
}

export default function SettingsNotificationSettings() {
  const { t } = useTranslation('settings')
  const [settings, setSettings] = useState<NotificationSetting[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<NotificationSetting[]>('/api/email/notification-settings'),
      api.get<EmailTemplate[]>('/api/email/templates'),
    ])
      .then(([settingsRes, templatesRes]) => {
        setSettings(settingsRes.data ?? [])
        setTemplates(templatesRes.data ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleToggle(eventKey: string, enabled: boolean) {
    const updated = settings.map((s) =>
      s.eventKey === eventKey ? { ...s, enabled } : s
    )
    setSettings(updated)
  }

  function handleTemplateChange(eventKey: string, templateKey: string) {
    const updated = settings.map((s) =>
      s.eventKey === eventKey ? { ...s, templateKey } : s
    )
    setSettings(updated)
  }

  function handleSave() {
    setSaving(true)
    api
      .put(
        '/api/email/notification-settings',
        settings.map((s) => ({
          eventKey: s.eventKey,
          enabled: s.enabled,
          templateKey: s.templateKey,
        }))
      )
      .then(() => toast.success(t('notificationSettingsSaved')))
      .catch(() => toast.error(t('saveFailed')))
      .finally(() => setSaving(false))
  }

  if (loading) return <div className='text-muted-foreground text-sm'>{t('loading')}</div>

  return (
    <ContentSection
      title={t('notificationSettingsTitle')}
      desc={t('notificationSettingsDesc')}
    >
      <div className='space-y-6'>
        {settings.map((s) => (
          <div
            key={s.eventKey}
            className='flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between'
          >
            <div className='flex-1'>
              <p className='font-medium'>{s.label}</p>
              <p className='text-muted-foreground text-sm'>{s.description}</p>
            </div>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
              <Select
                value={s.templateKey}
                onValueChange={(v) => handleTemplateChange(s.eventKey, v)}
              >
                <SelectTrigger className='w-[180px]'>
                  <SelectValue placeholder={t('template')} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className='flex items-center gap-2'>
                <span className='text-muted-foreground text-sm'>{t('enabled')}</span>
                <Switch
                  checked={s.enabled}
                  onCheckedChange={(v) => handleToggle(s.eventKey, v)}
                />
              </div>
            </div>
          </div>
        ))}
        {settings.length === 0 && (
          <div className='text-muted-foreground text-sm'>{t('noNotificationEventsConfigured')}</div>
        )}
        {settings.length > 0 && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('saving') : t('save', { ns: 'common' })}
          </Button>
        )}
      </div>
    </ContentSection>
  )
}
