import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { getMetadataFile, getField, saveField, saveMetadataFile, getObjectNames } from '@/services/metadata-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { invalidateObjectDefinitions } from '@/hooks/useObjectDefinitionsQuery'
import { cn } from '@/lib/utils'
import { pluralize } from '@/metadata/utils'
import { Trash2 } from 'lucide-react'
import { SYSTEM_FIELDS, SYSTEM_FIELDS_SET } from '@shared/protected-metadata'

interface SelectOption {
  value: string
  label: string
  color?: string
  colorHover?: string
}

interface FieldDef {
  key: string
  label: string
  type: string
  editable?: boolean
  sortable?: boolean
  searchable?: boolean
  required?: boolean
  maxLength?: number
  autoNumberPattern?: string
  autoNumberStart?: number
  objectName?: string
  apiEndpoint?: string
  searchBy?: string
  options?: SelectOption[]
  useInPath?: boolean
  format?: string
  additionalFields?: string[]
  render?: string
  relationshipType?: 'reference' | 'masterDetail'
  deleteOnCascade?: boolean
  defaultValue?: string | number | boolean | string[]
}

/** Reserved field keys that cannot be created (name is created with object) */
const RESERVED_FIELD_KEYS = new Set([...SYSTEM_FIELDS_SET, 'name'])

function isValidFieldKey(key: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(key) && !RESERVED_FIELD_KEYS.has(key)
}

/** Validate autoNumber pattern: must contain exactly one {0+} placeholder, e.g. MSG-{00000} */
function validateAutoNumberPattern(pattern: string): string | null {
  const match = pattern.match(/\{0+\}/g)
  if (!match || match.length !== 1) {
    return 'Pattern must contain exactly one digit placeholder, e.g. {000} or MSG-{00000}'
  }
  return null
}

function SelectOptionsEditor({
  options,
  onChange,
}: {
  options: SelectOption[]
  onChange: (options: SelectOption[]) => void
}) {
  const updateOption = (index: number, updates: Partial<SelectOption>) => {
    const next = [...options]
    next[index] = { ...next[index], ...updates }
    onChange(next)
  }
  const addOption = () => {
    onChange([...options, { value: '', label: '' }])
  }
  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index))
  }
  return (
    <div className='space-y-3 rounded-md border p-3'>
      <div className='flex items-center justify-between'>
        <Label className='text-sm font-medium'>Options *</Label>
        <Button type='button' variant='outline' size='sm' onClick={addOption}>
          <Plus className='mr-1 size-4' />
          Add option
        </Button>
      </div>
      <p className='text-muted-foreground text-xs'>At least one option required. Value is stored, label is displayed.</p>
      <div className='space-y-2'>
        {options.map((opt, i) => (
          <div key={i} className='flex gap-2 items-center'>
            <Input
              placeholder='Value'
              value={opt.value}
              onChange={(e) => updateOption(i, { value: e.target.value })}
              className='flex-1'
            />
            <Input
              placeholder='Label'
              value={opt.label}
              onChange={(e) => updateOption(i, { label: e.target.value })}
              className='flex-1'
            />
            <Input
              placeholder='Color'
              value={opt.color ?? ''}
              onChange={(e) => updateOption(i, { color: e.target.value || undefined })}
              className='w-24'
            />
            <Button type='button' variant='ghost' size='icon' onClick={() => removeOption(i)}>
              <Trash2 className='size-4' />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

interface FieldsEditorProps {
  objectName: string
}

export function FieldsEditor({ objectName }: FieldsEditorProps) {
  const queryClient = useQueryClient()
  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [fieldsOrder, setFieldsOrder] = useState<string>('')

  const { data: fieldsList = [], isLoading: listLoading } = useQuery({
    queryKey: ['metadata', objectName, 'fields.json'],
    queryFn: () => getMetadataFile<string[]>(objectName, 'fields.json'),
  })

  const { data: objectNames = [] } = useQuery({
    queryKey: ['metadata', 'objects'],
    queryFn: getObjectNames,
  })

  const isCreateMode = selectedField === '__new__'
  const { data: fieldDef, isLoading: fieldLoading } = useQuery({
    queryKey: ['metadata', objectName, 'fields', selectedField],
    queryFn: () => getField<FieldDef>(objectName, selectedField!),
    enabled: !!selectedField && !isCreateMode,
  })

  const handleSaveFieldsOrder = async () => {
    try {
      const raw = fieldsOrder || editableFieldsList.join(', ')
      const userOrder = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((k) => !SYSTEM_FIELDS_SET.has(k))
      const order = ['id', ...userOrder.filter((k) => !SYSTEM_FIELDS_SET.has(k)), ...SYSTEM_FIELDS.filter((f) => f !== 'id')]
      await saveMetadataFile(objectName, 'fields.json', order)
      invalidateObjectDefinitions(queryClient)
      toast.success('Fields order saved')
    } catch (err) {
      toast.error('Failed to save')
    }
  }

  const editableFieldsList = fieldsList.filter((key) => !SYSTEM_FIELDS_SET.has(key))

  useEffect(() => {
    if (selectedField && SYSTEM_FIELDS_SET.has(selectedField)) {
      setSelectedField(null)
    }
  }, [selectedField])

  const validateFieldByType = (data: FieldDef): string | null => {
    if (data.type === 'reference') {
      if (!data.objectName?.trim()) return 'Reference object is required'
    }
    if (data.type === 'select' || data.type === 'multiselect') {
      if (!data.options?.length) return 'At least one option is required for select fields'
      const empty = data.options.find((o) => !o.value?.trim() || !o.label?.trim())
      if (empty) return 'Each option must have a value and label'
    }
    return null
  }

  const handleCreateField = async (data: FieldDef) => {
    const key = (data.key || '').trim().toLowerCase()
    if (!key) {
      toast.error('Field key is required')
      return
    }
    if (!isValidFieldKey(key)) {
      toast.error(`Field key must start with a letter and contain only lowercase letters, numbers, and underscores. Cannot use reserved names (id, name, ${SYSTEM_FIELDS.filter((f) => f !== 'id').join(', ')}).`)
      return
    }
    if (editableFieldsList.includes(key)) {
      toast.error(`Field "${key}" already exists`)
      return
    }
    const typeErr = validateFieldByType(data)
    if (typeErr) {
      toast.error(typeErr)
      return
    }
    try {
      await saveField(objectName, key, { ...data, key })
      const userOrder = (fieldsOrder || editableFieldsList.join(', '))
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((k) => !SYSTEM_FIELDS_SET.has(k))
      if (!userOrder.includes(key)) userOrder.push(key)
      const order = ['id', ...userOrder.filter((k) => !SYSTEM_FIELDS_SET.has(k)), ...SYSTEM_FIELDS.filter((f) => f !== 'id')]
      await saveMetadataFile(objectName, 'fields.json', order)
      invalidateObjectDefinitions(queryClient)
      queryClient.invalidateQueries({ queryKey: ['metadata', objectName, 'fields.json'] })
      queryClient.invalidateQueries({ queryKey: ['metadata', objectName, 'fields', key] })
      setSelectedField(key)
      setFieldsOrder('')
      toast.success('Field created')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to create field')
    }
  }

  const handleSaveField = async (key: string, data: FieldDef) => {
    const typeErr = validateFieldByType(data)
    if (typeErr) {
      toast.error(typeErr)
      return
    }
    if (key === 'name') {
      if (data.type === 'autoNumber') {
        const patternErr = validateAutoNumberPattern(data.autoNumberPattern || '')
        if (patternErr) {
          toast.error(patternErr)
          return
        }
        const start = data.autoNumberStart ?? 1
        if (!Number.isInteger(start) || start < 1) {
          toast.error('Starting number must be a positive integer')
          return
        }
        data.autoNumberStart = start
      }
      data.required = true
      data.editable = false
    }
    try {
      await saveField(objectName, key, data)
      invalidateObjectDefinitions(queryClient)
      toast.success('Field saved')
    } catch (err) {
      toast.error('Failed to save')
    }
  }

  if (listLoading) {
    return <div className='text-muted-foreground'>Loading...</div>
  }

  return (
    <div className='flex gap-6'>
      <div className='w-64 shrink-0 space-y-4'>
        <div>
          <Label>Fields order (comma-separated)</Label>
          <p className='text-muted-foreground mb-1 text-xs'>System fields ({SYSTEM_FIELDS.join(', ')}) are fixed.</p>
          <div className='mt-2 flex gap-2'>
            <Input
              value={fieldsOrder || editableFieldsList.join(', ')}
              onChange={(e) => setFieldsOrder(e.target.value)}
              placeholder='name, email, ...'
            />
            <Button
              type='button'
              variant='secondary'
              size='sm'
              onClick={handleSaveFieldsOrder}
            >
              Save
            </Button>
          </div>
        </div>
        <div>
          <div className='flex items-center justify-between'>
            <Label>Fields</Label>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setSelectedField('__new__')}
            >
              <Plus className='mr-1 size-4' />
              Create field
            </Button>
          </div>
          <ScrollArea className='mt-2 h-[300px] rounded-md border'>
            <div className='p-2'>
              {editableFieldsList.map((key) => (
                <button
                  key={key}
                  type='button'
                  onClick={() => setSelectedField(key)}
                  className={cn(
                    'block w-full rounded-md px-3 py-2 text-left text-sm',
                    selectedField === key ? 'bg-accent' : 'hover:bg-accent/50'
                  )}
                >
                  {key}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
      <div className='min-w-0 flex-1'>
        {selectedField && (
          <FieldEditor
            objectName={objectName}
            fieldKey={selectedField}
            fieldDef={fieldDef}
            isLoading={fieldLoading}
            isCreateMode={isCreateMode}
            objectNames={objectNames}
            onSave={(data) => (isCreateMode ? handleCreateField(data) : handleSaveField(selectedField, data))}
          />
        )}
      </div>
    </div>
  )
}

function FieldEditor({
  objectName,
  fieldKey,
  fieldDef,
  isLoading,
  isCreateMode,
  objectNames,
  onSave,
}: {
  objectName: string
  fieldKey: string
  fieldDef: FieldDef | undefined
  isLoading: boolean
  isCreateMode?: boolean
  objectNames?: string[]
  onSave: (data: FieldDef) => void
}) {
  const isNameField = !isCreateMode && fieldKey === 'name'
  const [form, setForm] = useState<FieldDef>(() => {
    const base = fieldDef ?? { key: '', label: '', type: 'string' }
    if (isNameField) {
      return { ...base, required: true, editable: false }
    }
    return base
  })

  useEffect(() => {
    if (isCreateMode) {
      setForm({ key: '', label: '', type: 'string', editable: true, sortable: false, searchable: false, required: false, options: [] })
    } else if (fieldDef) {
      const base = { ...fieldDef }
      if (isNameField) {
        base.required = true
        base.editable = false
      }
      setForm(base)
    } else {
      setForm(isNameField ? { key: 'name', label: 'Name', type: 'string', required: true, editable: false } : { key: fieldKey, label: fieldKey, type: 'string' })
    }
  }, [fieldDef, fieldKey, isNameField, isCreateMode])

  const update = (updates: Partial<FieldDef>) => {
    setForm((p) => ({ ...p, ...updates }))
  }

  if (!isCreateMode && isLoading) {
    return <div className='text-muted-foreground'>Loading field...</div>
  }

  return (
    <div className='space-y-4 rounded-md border p-4'>
      <h3 className='font-medium'>{isCreateMode ? 'Create field' : `Edit: ${fieldKey}`}</h3>
      <div className='grid gap-4'>
        {isNameField ? (
          <>
            <div>
              <Label>Key</Label>
              <Input value='name' disabled className='bg-muted' />
              <p className='text-muted-foreground mt-1 text-xs'>Name field key cannot be changed.</p>
            </div>
            <div>
              <Label>Label</Label>
              <Input value='Name' disabled className='bg-muted' />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={form.type === 'autoNumber' ? 'autoNumber' : 'string'}
                onValueChange={(v) => update({ type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='string'>Text</SelectItem>
                  <SelectItem value='autoNumber'>Auto number</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type === 'autoNumber' && (
              <>
                <div>
                  <Label>Auto number pattern</Label>
                  <Input
                    value={form.autoNumberPattern ?? ''}
                    onChange={(e) => update({ autoNumberPattern: e.target.value })}
                    placeholder='e.g. MSG-{00000}'
                  />
                  <p className='text-muted-foreground mt-1 text-xs'>
                    Use {'{000}'} for digits. MSG-{'{00000}'} generates MSG-00001, MSG-00002, etc.
                  </p>
                </div>
                <div>
                  <Label>Starting number</Label>
                  <Input
                    type='number'
                    min={1}
                    value={form.autoNumberStart ?? 1}
                    onChange={(e) => update({ autoNumberStart: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>
              </>
            )}
            <p className='text-muted-foreground text-sm'>Name is always required and not editable by users.</p>
          </>
        ) : (
          <>
            <div>
              <Label>Key</Label>
              <Input
                value={form.key}
                onChange={(e) => {
                  const key = isCreateMode ? e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') : e.target.value
                  if (isCreateMode && key) {
                    const label = key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
                    update({ key, label })
                  } else {
                    update({ key })
                  }
                }}
                placeholder='e.g. email, phoneNumber'
                disabled={!isCreateMode}
              />
              {isCreateMode && (
                <p className='text-muted-foreground mt-1 text-xs'>
                  Lowercase letters, numbers, underscores. Must start with a letter.
                </p>
              )}
            </div>
            <div>
              <Label>Label</Label>
              <Input
                value={form.label}
                onChange={(e) => update({ label: e.target.value })}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => update({ type: v, options: v === 'select' || v === 'multiselect' ? form.options || [] : undefined })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='string'>String</SelectItem>
                  <SelectItem value='text'>Text (long)</SelectItem>
                  <SelectItem value='number'>Number</SelectItem>
                  <SelectItem value='boolean'>Boolean</SelectItem>
                  <SelectItem value='date'>Date</SelectItem>
                  <SelectItem value='datetime'>Date & time</SelectItem>
                  <SelectItem value='email'>Email</SelectItem>
                  <SelectItem value='phone'>Phone</SelectItem>
                  <SelectItem value='url'>URL</SelectItem>
                  <SelectItem value='reference'>Reference</SelectItem>
                  <SelectItem value='select'>Select</SelectItem>
                  <SelectItem value='multiselect'>Multi-select</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type === 'reference' && (
              <div className='space-y-3 rounded-md border p-3'>
                <Label className='text-sm font-medium'>Reference configuration</Label>
                <div>
                  <Label className='text-xs'>Object to reference *</Label>
                  <Select
                    value={form.objectName || ''}
                    onValueChange={(v) => update({ objectName: v, apiEndpoint: v ? `/api/${pluralize(v)}` : undefined })}
                  >
                    <SelectTrigger className='mt-1'>
                      <SelectValue placeholder='Select object...' />
                    </SelectTrigger>
                    <SelectContent>
                      {objectNames?.filter((n) => n !== objectName).map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className='text-muted-foreground mt-1 text-xs'>Required. The object this field references.</p>
                </div>
                <div>
                  <Label className='text-xs'>Search by (optional)</Label>
                  <Input
                    value={form.searchBy ?? ''}
                    onChange={(e) => update({ searchBy: e.target.value || undefined })}
                    placeholder='e.g. fullName, name'
                  />
                  <p className='text-muted-foreground mt-1 text-xs'>Field to display when searching/selecting.</p>
                </div>
                <div>
                  <Label className='text-xs'>Relationship type</Label>
                  <Select
                    value={form.relationshipType === 'masterDetail' ? 'masterDetail' : 'reference'}
                    onValueChange={(v) => {
                      const isMasterDetail = v === 'masterDetail'
                      update({
                        relationshipType: isMasterDetail ? 'masterDetail' : undefined,
                        deleteOnCascade: isMasterDetail ? true : undefined,
                        ...(isMasterDetail && { required: true }),
                      })
                    }}
                  >
                    <SelectTrigger className='mt-1'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='reference'>Reference (optional, no cascade)</SelectItem>
                      <SelectItem value='masterDetail'>Master-detail (required + cascade delete)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className='text-muted-foreground mt-1 text-xs'>
                    Use master-detail for junction/detail objects (e.g. order items). Child records are required and deleted when parent is deleted.
                  </p>
                </div>
              </div>
            )}
            {(form.type === 'select' || form.type === 'multiselect') && (
              <SelectOptionsEditor
                options={form.options || []}
                onChange={(options) => update({ options })}
              />
            )}
            {(form.type === 'date' || form.type === 'datetime') && (
              <div>
                <Label className='text-xs'>Format (optional)</Label>
                <Input
                  value={form.format ?? ''}
                  onChange={(e) => update({ format: e.target.value || undefined })}
                  placeholder='e.g. MMM dd, yyyy'
                />
              </div>
            )}
            {(form.type === 'string' || form.type === 'text') && (
              <div>
                <Label className='text-xs'>Max length (optional)</Label>
                <Input
                  type='number'
                  min={1}
                  value={form.maxLength ?? ''}
                  onChange={(e) => update({ maxLength: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                  placeholder='e.g. 255'
                />
              </div>
            )}
            {form.type === 'boolean' && (
              <div className='flex items-center gap-2'>
                <Switch
                  checked={form.defaultValue === true}
                  onCheckedChange={(v) => update({ defaultValue: v ? true : undefined })}
                />
                <Label className='text-xs'>Default to true</Label>
              </div>
            )}
            {(form.type === 'string' || form.type === 'text' || form.type === 'email' || form.type === 'phone' || form.type === 'url' || form.type === 'date' || form.type === 'datetime') && (
              <div>
                <Label className='text-xs'>Default value (optional)</Label>
                <Input
                  value={typeof form.defaultValue === 'string' ? form.defaultValue : ''}
                  onChange={(e) => update({ defaultValue: e.target.value || undefined })}
                  placeholder='Pre-fill when creating'
                  className='mt-1'
                />
              </div>
            )}
            {form.type === 'number' && (
              <div>
                <Label className='text-xs'>Default value (optional)</Label>
                <Input
                  type='number'
                  value={form.defaultValue !== undefined && form.defaultValue !== null && typeof form.defaultValue === 'number' ? form.defaultValue : ''}
                  onChange={(e) => update({ defaultValue: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder='e.g. 0 or 1'
                  className='mt-1'
                />
              </div>
            )}
            {form.type === 'select' && form.options?.length && (
              <div>
                <Label className='text-xs'>Default value (optional)</Label>
                <Select
                  value={typeof form.defaultValue === 'string' ? form.defaultValue : '__none__'}
                  onValueChange={(v) => update({ defaultValue: v === '__none__' ? undefined : v })}
                >
                  <SelectTrigger className='mt-1'>
                    <SelectValue placeholder='None' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__none__'>None</SelectItem>
                    {form.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.type === 'multiselect' && (
              <div>
                <Label className='text-xs'>Default values (optional)</Label>
                <Input
                  value={Array.isArray(form.defaultValue) ? form.defaultValue.join(', ') : ''}
                  onChange={(e) => {
                    const raw = e.target.value.trim()
                    update({ defaultValue: raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : undefined })
                  }}
                  placeholder='value1, value2'
                  className='mt-1'
                />
              </div>
            )}
            {form.type === 'number' && (
              <div>
                <Label className='text-xs'>Display (optional)</Label>
                <Select
                  value={form.render === 'currency' ? 'currency' : form.render === 'percent' ? 'percent' : 'default'}
                  onValueChange={(v) => update({ render: v === 'currency' ? 'currency' : v === 'percent' ? 'percent' : undefined })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='default'>Default</SelectItem>
                    <SelectItem value='currency'>Currency</SelectItem>
                    <SelectItem value='percent'>Percent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.type === 'select' && (
              <>
                <div className='flex items-center gap-2'>
                  <Switch
                    checked={form.render === 'statusBadge'}
                    onCheckedChange={(v) => update({ render: v ? 'statusBadge' : undefined })}
                  />
                  <Label>Display as colored badge</Label>
                </div>
                <div className='flex items-center gap-2'>
                  <Switch
                    checked={form.useInPath ?? false}
                    onCheckedChange={(v) => update({ useInPath: v })}
                  />
                  <Label>Use in Path (drives status path)</Label>
                </div>
              </>
            )}
            <div className='flex items-center gap-2'>
              <Switch
                checked={form.editable ?? true}
                onCheckedChange={(v) => update({ editable: v })}
              />
              <Label>Editable</Label>
            </div>
            <div className='flex items-center gap-2'>
              <Switch
                checked={form.sortable ?? false}
                onCheckedChange={(v) => update({ sortable: v })}
              />
              <Label>Sortable</Label>
            </div>
            <div className='flex items-center gap-2'>
              <Switch
                checked={form.searchable ?? false}
                onCheckedChange={(v) => update({ searchable: v })}
              />
              <Label>Searchable</Label>
            </div>
            <div className='flex items-center gap-2'>
              <Switch
                checked={form.required ?? false}
                onCheckedChange={(v) => update({ required: v })}
              />
              <Label>Required</Label>
            </div>
          </>
        )}
        <Button onClick={() => onSave(form)}>{isCreateMode ? 'Create Field' : 'Save Field'}</Button>
      </div>
    </div>
  )
}
