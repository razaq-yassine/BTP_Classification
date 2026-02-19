import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from 'react-i18next'
import api from '@/services/api'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useEffectiveLanguage } from '@/hooks/useEffectiveLanguage'
import { DEFAULT_LANGUAGE } from '@/i18n'
import { LANGUAGE_OPTIONS } from '@/constants/languages'

const SIDEBAR_ITEMS = [
  { id: 'recents' as const, labelKey: 'sidebarRecents' as const },
  { id: 'home' as const, labelKey: 'sidebarHome' as const },
  { id: 'applications' as const, labelKey: 'sidebarApplications' as const },
  { id: 'desktop' as const, labelKey: 'sidebarDesktop' as const },
  { id: 'downloads' as const, labelKey: 'sidebarDownloads' as const },
  { id: 'documents' as const, labelKey: 'sidebarDocuments' as const },
] as const

const displayFormSchema = (t: (key: string) => string) =>
  z.object({
    items: z.array(z.string()).refine((value) => value.some((item) => item), {
      message: t('selectAtLeastOneItem'),
    }),
    preferredLanguage: z.string().optional(),
  })

type DisplayFormValues = z.infer<ReturnType<typeof displayFormSchema>>

const defaultValues: Partial<DisplayFormValues> = {
  items: ['recents', 'home'],
  preferredLanguage: DEFAULT_LANGUAGE,
}

export function DisplayForm() {
  const { t } = useTranslation('settings')
  const updateUser = useAuthStore((s) => s.checkAuth)
  const effective = useEffectiveLanguage()
  const [loadingPrefs, setLoadingPrefs] = useState(true)
  const form = useForm<DisplayFormValues>({
    resolver: zodResolver(displayFormSchema(t)),
    defaultValues,
  })

  useEffect(() => {
    api
      .get('/api/auth/me')
      .then((res) => {
        const pref = res.data?.preferredLanguage ?? ''
        form.setValue('preferredLanguage', pref || effective || DEFAULT_LANGUAGE)
      })
      .catch(() => {})
      .finally(() => setLoadingPrefs(false))
  }, [form, effective])

  const handleSubmit = async (data: DisplayFormValues) => {
    try {
      await api.patch('/api/auth/me', {
        preferredLanguage: data.preferredLanguage || null,
      })
      await updateUser()
      toast.success(t('preferredLanguageUpdated', { defaultValue: 'Preferred language updated' }))
    } catch {
      toast.error(t('failedToUpdatePreferredLanguage', { defaultValue: 'Failed to update preferred language' }))
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className='space-y-8'
      >
        <FormField
          control={form.control}
          name='preferredLanguage'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('preferredLanguage', { defaultValue: 'Preferred Language' })}</FormLabel>
              <FormDescription>
                {t('preferredLanguageDescription', { defaultValue: 'Override the default language.' })}
              </FormDescription>
              <Select
                onValueChange={field.onChange}
                value={field.value || DEFAULT_LANGUAGE}
                disabled={loadingPrefs}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectLanguage', { defaultValue: 'Select language' })} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {'labelKey' in opt ? t(opt.labelKey as string) : opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='items'
          render={() => (
            <FormItem>
              <div className='mb-4'>
                <FormLabel className='text-base'>{t('sidebar')}</FormLabel>
                <FormDescription>
                  {t('sidebarDesc')}
                </FormDescription>
              </div>
              {SIDEBAR_ITEMS.map((item) => (
                <FormField
                  key={item.id}
                  control={form.control}
                  name='items'
                  render={({ field }) => {
                    return (
                      <FormItem
                        key={item.id}
                        className='flex flex-row items-start space-y-0 space-x-3'
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, item.id])
                                : field.onChange(
                                    field.value?.filter(
                                      (value) => value !== item.id
                                    )
                                  )
                            }}
                          />
                        </FormControl>
                        <FormLabel className='font-normal'>
                          {t(item.labelKey)}
                        </FormLabel>
                      </FormItem>
                    )
                  }}
                />
              ))}
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit' disabled={loadingPrefs}>
          {t('savePreferences', { defaultValue: 'Save preferences' })}
        </Button>
      </form>
    </Form>
  )
}
