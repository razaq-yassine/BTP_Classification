import { useEffect, useState } from 'react'
import ContentSection from '../components/content-section'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  getTranslationLocales,
  getTranslationNamespace,
  saveTranslationNamespace,
  TRANSLATION_NAMESPACES,
} from '@/services/metadata-api'
import { toast } from 'sonner'

type Namespace = (typeof TRANSLATION_NAMESPACES)[number]

function flattenObject(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey))
    } else {
      result[fullKey] = String(value ?? '')
    }
  }
  return result
}

function unflattenObject(flat: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.')
    let current: Record<string, unknown> = result
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {}
      }
      current = current[part] as Record<string, unknown>
    }
    current[parts[parts.length - 1]] = value
  }
  return result
}

export default function SettingsTranslations() {
  const [locales, setLocales] = useState<string[]>([])
  const [selectedLocale, setSelectedLocale] = useState<string>('')
  const [selectedNamespace, setSelectedNamespace] = useState<Namespace>('common')
  const [entries, setEntries] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getTranslationLocales()
      .then(setLocales)
      .catch(() => setLocales([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedLocale || !selectedNamespace) return
    setLoading(true)
    getTranslationNamespace(selectedLocale, selectedNamespace)
      .then((data) => setEntries(flattenObject(data as Record<string, unknown>)))
      .catch(() => setEntries({}))
      .finally(() => setLoading(false))
  }, [selectedLocale, selectedNamespace])

  const handleSave = async () => {
    if (!selectedLocale || !selectedNamespace) return
    setSaving(true)
    try {
      const data = unflattenObject(entries)
      await saveTranslationNamespace(selectedLocale, selectedNamespace, data)
      toast.success('Translations saved')
    } catch {
      toast.error('Failed to save translations')
    } finally {
      setSaving(false)
    }
  }

  const handleAddKey = () => {
    const key = prompt('Enter new key (e.g. newKey or parent.childKey):')
    if (key && !(key in entries)) {
      setEntries((prev) => ({ ...prev, [key]: '' }))
    }
  }

  const handleRemoveKey = (key: string) => {
    setEntries((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleUpdateValue = (key: string, value: string) => {
    setEntries((prev) => ({ ...prev, [key]: value }))
  }

  const entryKeys = Object.keys(entries).sort()

  return (
    <ContentSection
      title='Translations'
      desc='Edit translation strings for each locale and namespace. Add keys for new UI strings.'
    >
      {loading && locales.length === 0 ? (
        <div className='text-muted-foreground text-sm'>Loading locales...</div>
      ) : locales.length === 0 ? (
        <div className='text-muted-foreground text-sm'>
          No translation locales found. Create metadata/translations/en/ with
          namespace files (common.json, navigation.json, etc.).
        </div>
      ) : (
        <div className='space-y-4'>
          <div className='flex flex-wrap gap-4'>
            <div className='space-y-2'>
              <Label>Locale</Label>
              <Select
                value={selectedLocale}
                onValueChange={(v) => {
                  setSelectedLocale(v)
                  if (!selectedNamespace) setSelectedNamespace('common')
                }}
              >
                <SelectTrigger className='w-[140px]'>
                  <SelectValue placeholder='Select locale' />
                </SelectTrigger>
                <SelectContent>
                  {locales.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label>Namespace</Label>
              <Select
                value={selectedNamespace}
                onValueChange={(v) => setSelectedNamespace(v as Namespace)}
              >
                <SelectTrigger className='w-[140px]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSLATION_NAMESPACES.map((ns) => (
                    <SelectItem key={ns} value={ns}>
                      {ns}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedLocale && selectedNamespace && (
            <>
              <div className='flex items-center justify-between'>
                <Button variant='outline' size='sm' onClick={handleAddKey}>
                  Add key
                </Button>
                <Button size='sm' onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>

              {loading ? (
                <div className='text-muted-foreground text-sm'>
                  Loading translations...
                </div>
              ) : entryKeys.length === 0 ? (
                <div className='text-muted-foreground text-sm'>
                  No keys in this namespace. Click &quot;Add key&quot; to add one.
                </div>
              ) : (
                <div className='space-y-3'>
                  {entryKeys.map((key) => (
                    <div
                      key={key}
                      className='flex gap-2 items-start rounded border p-2'
                    >
                      <div className='flex-1 min-w-0 space-y-1'>
                        <Label className='text-xs text-muted-foreground'>
                          {key}
                        </Label>
                        <Input
                          value={entries[key] ?? ''}
                          onChange={(e) =>
                            handleUpdateValue(key, e.target.value)
                          }
                          placeholder='Translation value'
                          className='font-mono text-sm'
                        />
                      </div>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='shrink-0 text-destructive hover:text-destructive'
                        onClick={() => handleRemoveKey(key)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </ContentSection>
  )
}
