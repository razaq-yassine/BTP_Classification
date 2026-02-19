import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView } from '@codemirror/view'
import { html } from '@codemirror/lang-html'
import { oneDark } from '@codemirror/theme-one-dark'
import beautify from 'js-beautify'
import { useTheme } from '@/context/theme-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

const getTemplateSchema = (t: (key: string) => string) =>
  z.object({
    label: z.string().min(1, t('labelRequired')),
    subject: z.string().min(1, t('subjectRequired')),
    bodyHtml: z.string().min(1, t('bodyRequired')),
  })

type TemplateFormValues = z.infer<ReturnType<typeof getTemplateSchema>>

interface EmailTemplate {
  key: string
  label: string
  subject: string
  bodyHtml: string
  variables: string[]
}

const LOGO_PLACEHOLDER =
  '<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgwIiBoZWlnaHQ9IjQ4IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxODAiIGhlaWdodD0iNDgiIGZpbGw9IiM1MjUyNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9IiNmZmZmZmYiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TG9nbzwvdGV4dD48L3N2Zz4=" alt="Logo" style="max-height:48px;max-width:180px;height:auto;display:inline-block" />'

const SAMPLE_DATA: Record<string, Record<string, unknown>> = {
  order_created: {
    order: { name: 'ORD-001', totalAmount: '99.99' },
    customer: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    brandName: 'Your Company',
    logoDataUrl: '',
    logoOrBrand: LOGO_PLACEHOLDER,
  },
  customer_signup: {
    customer: { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
    brandName: 'Your Company',
    logoDataUrl: '',
    logoOrBrand: LOGO_PLACEHOLDER,
  },
}

interface TemplateEditorProps {
  templateKey: string
}

export function TemplateEditor({ templateKey }: TemplateEditorProps) {
  const { t } = useTranslation('settings')
  const [template, setTemplate] = useState<EmailTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [preview, setPreview] = useState<{ subject: string; bodyHtml: string } | null>(null)
  const { theme } = useTheme()

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(getTemplateSchema(t)),
    defaultValues: { label: '', subject: '', bodyHtml: '' },
  })

  useEffect(() => {
    if (!templateKey) return
    api
      .get<EmailTemplate>(`/api/email/templates/${templateKey}`)
      .then((res) => {
        const t = res.data
        if (t) {
          setTemplate(t)
          const formattedBody = beautify.html(t.bodyHtml, {
            indent_size: 2,
            wrap_line_length: 120,
            wrap_attributes: 'auto',
            preserve_newlines: false,
          })
          form.reset({ label: t.label, subject: t.subject, bodyHtml: formattedBody })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [templateKey, form])

  function onSubmit(data: TemplateFormValues) {
    if (!templateKey) return
    api
      .put(`/api/email/templates/${templateKey}`, {
        key: templateKey,
        label: data.label,
        subject: data.subject,
        bodyHtml: data.bodyHtml,
        variables: template?.variables ?? [],
      })
      .then(() => {
        toast.success(t('templateSaved'))
        setTemplate((prev) => (prev ? { ...prev, ...data } : null))
      })
      .catch((err) => {
        toast.error(err.response?.data?.message ?? t('saveFailed'))
      })
  }

  function handlePreview() {
    if (!templateKey) return
    const baseSample = SAMPLE_DATA[templateKey] ?? {}
    const sampleData = {
      brandName: 'Your Company',
      logoDataUrl: '',
      logoOrBrand: LOGO_PLACEHOLDER,
      ...baseSample,
    }
    api
      .post<{ subject: string; bodyHtml: string }>('/api/email/preview', {
        templateKey,
        sampleData,
      })
      .then((res) => {
        setPreview(res.data ?? null)
        setPreviewOpen(true)
      })
      .catch(() => toast.error(t('previewFailed')))
  }

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark'))
  const codeMirrorExtensions = useMemo(
    () => [EditorView.lineWrapping, html(), ...(isDark ? [oneDark] : [])],
    [isDark]
  )

  if (loading)
    return <div className='text-muted-foreground text-sm'>{t('loading')}</div>
  if (!template) return <div className='text-muted-foreground text-sm'>{t('noTemplatesFound')}</div>

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-2'>
        <Button variant='outline' size='sm' asChild>
          <Link to='/settings/email-templates'>Back</Link>
        </Button>
        <Button variant='secondary' size='sm' onClick={handlePreview}>
          Preview
        </Button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          <FormField
            control={form.control}
            name='label'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('label')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='subject'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('subject')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('useVariablePlaceholders')} {...field} />
                </FormControl>
                <FormDescription>
                  Variables: {template.variables?.join(', ') || 'none'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='bodyHtml'
            render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('bodyHtml')}</FormLabel>
                  <div className='space-y-2'>
                    <div className='flex justify-end'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => {
          const formatted = beautify.html(field.value, {
            indent_size: 2,
            wrap_line_length: 120,
            wrap_attributes: 'auto',
            preserve_newlines: false,
          })
                          field.onChange(formatted)
                          toast.success(t('htmlFormatted'))
                        }}
                      >
                        Format
                      </Button>
                    </div>
                    <FormControl>
                      <div className='overflow-hidden rounded-md border border-input'>
                        <CodeMirror
                          value={field.value}
                          onChange={field.onChange}
                          extensions={codeMirrorExtensions}
                          placeholder='<p>Hello {{customer.firstName}},</p>...'
                          basicSetup={{
                            lineNumbers: true,
                            foldGutter: true,
                            highlightActiveLine: true,
                            bracketMatching: true,
                          }}
                          className='text-sm [&_.cm-editor]:outline-none [&_.cm-scroller]:min-h-[280px] [&_.cm-content]:font-mono'
                        />
                      </div>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
            )}
          />
          <Button type='submit'>{t('save', { ns: 'common' })}</Button>
        </form>
      </Form>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className='max-w-2xl max-h-[80vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className='space-y-4'>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>Subject</p>
                <p>{preview.subject}</p>
              </div>
              <div>
                <p className='text-muted-foreground mb-2 text-sm font-medium'>Body</p>
                <div
                  className='rounded border bg-muted/30 p-4 text-sm'
                  dangerouslySetInnerHTML={{ __html: preview.bodyHtml }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
