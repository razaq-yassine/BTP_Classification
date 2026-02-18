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

const DEFAULT_LANG_VALUE = '__default__'
const LANGUAGE_OPTIONS = [
  { value: DEFAULT_LANG_VALUE, label: 'Default (from tenant or app)' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
]

const items = [
  {
    id: 'recents',
    label: 'Recents',
  },
  {
    id: 'home',
    label: 'Home',
  },
  {
    id: 'applications',
    label: 'Applications',
  },
  {
    id: 'desktop',
    label: 'Desktop',
  },
  {
    id: 'downloads',
    label: 'Downloads',
  },
  {
    id: 'documents',
    label: 'Documents',
  },
] as const

const displayFormSchema = z.object({
  items: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'You have to select at least one item.',
  }),
  preferredLanguage: z.string().optional(),
})

type DisplayFormValues = z.infer<typeof displayFormSchema>

const defaultValues: Partial<DisplayFormValues> = {
  items: ['recents', 'home'],
  preferredLanguage: DEFAULT_LANG_VALUE,
}

export function DisplayForm() {
  const { t } = useTranslation('settings')
  const updateUser = useAuthStore((s) => s.checkAuth)
  const [loadingPrefs, setLoadingPrefs] = useState(true)
  const form = useForm<DisplayFormValues>({
    resolver: zodResolver(displayFormSchema),
    defaultValues,
  })

  useEffect(() => {
    api
      .get('/api/auth/me')
      .then((res) => {
        const pref = res.data?.preferredLanguage ?? ''
        form.setValue('preferredLanguage', pref || DEFAULT_LANG_VALUE)
      })
      .catch(() => {})
      .finally(() => setLoadingPrefs(false))
  }, [form])

  const handleSubmit = async (data: DisplayFormValues) => {
    try {
      await api.patch('/api/auth/me', {
        preferredLanguage:
          data.preferredLanguage === DEFAULT_LANG_VALUE || !data.preferredLanguage
            ? null
            : data.preferredLanguage,
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
                {t('preferredLanguageDescription', { defaultValue: 'Override the default language. Leave as "Default" to use tenant or app settings.' })}
              </FormDescription>
              <Select
                onValueChange={field.onChange}
                value={field.value || DEFAULT_LANG_VALUE}
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
                      {opt.label}
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
                <FormLabel className='text-base'>Sidebar</FormLabel>
                <FormDescription>
                  Select the items you want to display in the sidebar.
                </FormDescription>
              </div>
              {items.map((item) => (
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
                          {item.label}
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
