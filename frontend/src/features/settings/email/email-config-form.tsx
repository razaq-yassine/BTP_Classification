import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import api from '@/services/api'
import type { EmailConfig } from '@/stores/appConfigStore'

const emailConfigSchema = z.object({
  enabled: z.boolean(),
  fromEmail: z.string().email('Invalid email').or(z.literal('')),
  fromName: z.string(),
  smtpHost: z.string(),
  smtpPort: z.number().min(1).max(65535),
  smtpSecure: z.boolean(),
  smtpUser: z.string(),
  smtpPassword: z.string(),
})

type EmailConfigFormValues = z.infer<typeof emailConfigSchema>

const defaultValues: EmailConfigFormValues = {
  enabled: false,
  fromEmail: 'noreply@example.com',
  fromName: 'My App',
  smtpHost: 'smtp.example.com',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPassword: '',
}

export function EmailConfigForm() {
  const { t } = useTranslation(['settings', 'common'])
  const [loading, setLoading] = useState(true)
  const form = useForm<EmailConfigFormValues>({
    resolver: zodResolver(emailConfigSchema),
    defaultValues,
  })

  const [appConfig, setAppConfig] = useState<{ defaultCurrency?: string; currencySymbol?: string }>({})

  useEffect(() => {
    api
      .get<{ emailConfig?: EmailConfig; defaultCurrency?: string; currencySymbol?: string }>('/api/config/app-config')
      .then((res) => {
        const data = res.data
        setAppConfig({
          defaultCurrency: data?.defaultCurrency ?? 'USD',
          currencySymbol: data?.currencySymbol ?? '$',
        })
        const ec = data?.emailConfig
        if (ec) {
          form.reset({
            enabled: ec.enabled ?? false,
            fromEmail: ec.fromEmail ?? 'noreply@example.com',
            fromName: ec.fromName ?? 'My App',
            smtpHost: ec.smtpHost ?? 'smtp.example.com',
            smtpPort: ec.smtpPort ?? 587,
            smtpSecure: ec.smtpSecure ?? false,
            smtpUser: ec.smtpUser ?? '',
            smtpPassword: ec.smtpPassword === '********' ? '' : (ec.smtpPassword ?? ''),
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [form])

  function onSubmit(data: EmailConfigFormValues) {
    api
      .put('/api/config/app-config', {
        defaultCurrency: appConfig.defaultCurrency ?? 'USD',
        currencySymbol: appConfig.currencySymbol ?? '$',
        emailConfig: data,
      })
      .then(() => {
        toast.success(t('emailConfigSaved'))
        toast.info(t('restartBackendForChanges', { defaultValue: 'Restart the backend for changes to take effect.' }), { duration: 6000 })
      })
      .catch((err) => {
        toast.error(err.response?.data?.message ?? t('saveFailed'))
      })
  }

  if (loading) return <div className='text-muted-foreground text-sm'>{t('loading')}</div>

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <FormField
          control={form.control}
          name='enabled'
          render={({ field }) => (
            <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
              <div className='space-y-0.5'>
                <FormLabel className='text-base'>{t('enableEmailSending')}</FormLabel>
                <FormDescription>
                  {t('enableEmailSendingDesc')}
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='fromEmail'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fromEmail')}</FormLabel>
              <FormControl>
                <Input type='email' placeholder='noreply@example.com' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='fromName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fromName')}</FormLabel>
              <FormControl>
                <Input placeholder='My App' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className='grid grid-cols-2 gap-4'>
          <FormField
            control={form.control}
            name='smtpHost'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('smtpHost')}</FormLabel>
                <FormControl>
                  <Input placeholder='smtp.example.com' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='smtpPort'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('smtpPort')}</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(e) => {
                    const n = parseInt(e.target.value, 10)
                    field.onChange(Number.isNaN(n) ? 587 : n)
                  }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name='smtpSecure'
          render={({ field }) => (
            <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
              <FormLabel className='text-base'>{t('useTlsSsl')}</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='smtpUser'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('smtpUsername')}</FormLabel>
              <FormControl>
                <Input type='text' placeholder={t('optional')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='smtpPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('smtpPassword')}</FormLabel>
              <FormControl>
                <Input type='password' placeholder={t('leaveBlankToKeep')} {...field} />
              </FormControl>
              <FormDescription>{t('leaveBlankToKeepPassword')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit'>{t('save', { ns: 'common' })}</Button>
      </form>
    </Form>
  )
}
