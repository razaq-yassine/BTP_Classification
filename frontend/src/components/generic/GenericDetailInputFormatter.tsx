import { FieldDefinition } from '@/types/object-definition'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { CalendarIcon, X } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { countries, defaultCountry, Country } from '@/data/countries'
import { useState } from 'react'
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select'
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { RecordLookup } from '@/components/ui/record-lookup'
import { PasswordInput } from '@/components/password-input'
import { RichTextEditor } from '@/components/rich-text-editor'
import { useAuthStore, selectUser } from '@/stores/authStore'
import api from '@/services/api'
import { toast } from 'sonner'

function FileFieldInput({
  value,
  onChange,
  disabled,
  objectName,
  recordId,
  fieldKey,
  label: _label,
  className,
  accept,
}: {
  value: any
  onChange: (value: string) => void
  disabled: boolean
  objectName?: string
  recordId?: string | number
  fieldKey: string
  label: string
  className?: string
  accept?: string
}) {
  const [uploading, setUploading] = useState(false)
  const canUpload = objectName && recordId != null && !disabled

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !canUpload) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const rid = recordId === 'temp' ? `temp-${Date.now()}` : String(recordId)
      const { data } = await api.post<{ path: string }>(
        `/api/upload/${objectName}/${rid}/${fieldKey}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      onChange(data.path)
      toast.success('File uploaded')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Upload failed'
      toast.error(msg)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-2">
      {value && (
        <div className="text-sm text-muted-foreground">
          Current: {typeof value === 'string' ? value.split('/').pop() : value}
        </div>
      )}
      <Input
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={disabled || !canUpload || uploading}
        className={className}
      />
      {!canUpload && objectName && (
        <p className="text-xs text-muted-foreground">Save the record first to upload files.</p>
      )}
    </div>
  )
}

interface GenericDetailInputFormatterProps {
  fieldDefinition: FieldDefinition
  value: any
  onChange: (value: any) => void
  disabled?: boolean
  className?: string
  showLabel?: boolean // Whether to show the field label
  /** For file upload: object name (e.g. 'customer') */
  objectName?: string
  /** For file upload: record id, or 'temp' for create flow */
  recordId?: string | number
}

export function GenericDetailInputFormatter({
  fieldDefinition,
  value,
  onChange,
  disabled = false,
  className,
  showLabel = true,
  objectName: objectNameProp,
  recordId,
}: GenericDetailInputFormatterProps) {
  const user = useAuthStore(selectUser)
  const { type, label, required, isRequired, isImportant, options } = fieldDefinition
  const [selectedCountry, setSelectedCountry] = useState<Country>(() => {
    // Find country from existing phone value or use default
    if (value && typeof value === 'string') {
      const foundCountry = countries.find(country => value.startsWith(country.dialCode))
      return foundCountry || defaultCountry
    }
    return defaultCountry
  })
  const [emailError, setEmailError] = useState('')
  const [phoneError, setPhoneError] = useState('')

  const isAutoNumber = type === 'autoNumber'
  const isNameField = fieldDefinition.key === 'name'
  const isMasterDetail =
    fieldDefinition.type === 'masterDetail' ||
    fieldDefinition.relationshipType === 'masterDetail'
  const isFieldRequired = (required || isRequired || (isNameField && !isAutoNumber) || isMasterDetail)
  const isFieldImportant = isImportant

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'))
    } else {
      onChange('')
    }
  }



  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (email && !emailRegex.test(email)) {
      setEmailError('Please enter a valid email address')
    } else {
      setEmailError('')
    }
  }

  const formatPhoneNumber = (phone: string) => {
    // Remove all non-numeric characters
    return phone.replace(/\D/g, '')
  }

  const validatePhoneNumber = (phone: string, country: Country) => {
    // Only validate if phone is not empty
    if (!phone || phone.trim() === '') {
      setPhoneError('')
      return
    }

    const cleanPhone = formatPhoneNumber(phone)
    const { min, max } = country.phoneLength
    const currentLength = cleanPhone.length

    if (currentLength < min || currentLength > max) {
      const expectedRange = min === max ? `${min}` : `${min}-${max}`
      setPhoneError(`Phone number should be ${expectedRange} digits for ${country.name}. Current: ${currentLength} digits`)
    } else {
      setPhoneError('')
    }
  }

  const renderInput = () => {
    switch (type) {
      case 'autoNumber':
        return (
          <Input
            type="text"
            value={value || ''}
            disabled
            readOnly
            placeholder="Auto-generated"
            className={cn(className, 'bg-muted cursor-not-allowed')}
          />
        )
      case 'formula':
        return (
          <Input
            type="text"
            value={value || ''}
            disabled
            readOnly
            placeholder="Calculated value"
            className={cn(className, 'bg-muted cursor-not-allowed')}
          />
        )

      case 'string':
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={`Enter ${label.toLowerCase()}`}
            className={className}
          />
        )
      case 'text':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={`Enter ${label.toLowerCase()}`}
            className={cn(className, 'min-h-[80px]')}
            rows={4}
          />
        )

      case 'email':
        return (
          <div className="space-y-1">
            <Input
              type="email"
              value={value || ''}
              onChange={(e) => {
                onChange(e.target.value)
                setEmailError('') // Clear error on change
              }}
              onBlur={(e) => validateEmail(e.target.value)}
              disabled={disabled}
              placeholder="Enter email address"
              className={cn(className, emailError && 'border-red-500')}
            />
            {emailError && (
              <p className="text-sm text-destructive">{emailError}</p>
            )}
          </div>
        )

      case 'url':
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="e.g. example.com"
            className={className}
          />
        )

      case 'password':
        return (
          <PasswordInput
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={`Enter ${label.toLowerCase()}`}
            className={className}
          />
        )

      case 'phone':
        const countryOptions: SearchableSelectOption[] = countries.map(country => ({
          value: country.code,
          label: `${country.flag} ${country.name} ${country.dialCode}` // For search
        }))

        return (
          <div className="space-y-1">
            <div className={cn(
              "flex rounded-md border bg-transparent shadow-xs overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
              phoneError ? "border-destructive" : "border-input"
            )}>
              {/* Persistent country code - always visible, clickable to change */}
              <div className="flex shrink-0 border-r border-input">
                <SearchableSelect
                  options={countryOptions}
                  value={selectedCountry.code}
                  renderValue={(opt) => {
                    const parts = opt.label.split(' ')
                    return `${parts[0]} ${parts[parts.length - 1]}`
                  }}
                  onValueChange={(countryCode) => {
                    const country = countries.find(c => c.code === countryCode) || defaultCountry
                    setSelectedCountry(country)
                    const currentPhone = value ? formatPhoneNumber(value.replace(selectedCountry.dialCode, '').trim()) : ''
                    const newValue = currentPhone ? `${country.dialCode} ${currentPhone}` : ''
                    onChange(newValue)
                    if (currentPhone) {
                      validatePhoneNumber(currentPhone, country)
                    } else {
                      setPhoneError('')
                    }
                  }}
                  placeholder={selectedCountry.flag}
                  searchPlaceholder="Search countries..."
                  disabled={disabled}
                  className="h-9 min-w-0 w-auto px-3 border-0 rounded-none bg-muted/30 hover:bg-muted/50 focus:ring-0 focus-visible:ring-0"
                />
              </div>
              {/* Phone number input - user types here, next to country code */}
              <Input
                type="tel"
                value={value ? formatPhoneNumber(value.replace(selectedCountry.dialCode, '').trim()) : ''}
                onChange={(e) => {
                  const cleanPhone = formatPhoneNumber(e.target.value)
                  const newValue = cleanPhone ? `${selectedCountry.dialCode} ${cleanPhone}` : ''
                  onChange(newValue)
                  validatePhoneNumber(cleanPhone, selectedCountry)
                }}
                disabled={disabled}
                placeholder={`${selectedCountry.phoneLength.min === selectedCountry.phoneLength.max ? selectedCountry.phoneLength.min : `${selectedCountry.phoneLength.min}-${selectedCountry.phoneLength.max}`} digits`}
                className={cn('flex-1 border-0 rounded-none focus-visible:ring-0', className)}
              />
            </div>
            {phoneError && (
              <p className="text-sm text-destructive">{phoneError}</p>
            )}
          </div>
        )

      case 'number':
        return (
          <Input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            disabled={disabled}
            placeholder={fieldDefinition.renderType === 'percent' ? 'e.g. 0.85 for 85%' : 'Enter number'}
            step={fieldDefinition.renderType === 'percent' ? '0.01' : undefined}
            min={fieldDefinition.renderType === 'percent' ? 0 : undefined}
            max={fieldDefinition.renderType === 'percent' ? 1 : undefined}
            className={className}
          />
        )

      case 'date':
        const dateValue = value ? new Date(value) : undefined
        return (
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'flex-1 justify-start text-left font-normal',
                    !value && 'text-muted-foreground',
                    className
                  )}
                  disabled={disabled}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value ? format(dateValue!, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateValue}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {value && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => onChange('')}
                disabled={disabled}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )

      case 'datetime':
        return (
          <DateTimePicker
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={className}
            placeholder={`Pick ${label.toLowerCase()}`}
          />
        )

      case 'reference':
      case 'masterDetail': {
        const { objectName, additionalFields = [], apiEndpoint, searchBy } = fieldDefinition as any
        if (!objectName) {
          return (
            <div className="text-sm text-destructive">
              Object name is required for reference fields
            </div>
          )
        }

        // Convert additionalFields to the new format with labels
        const formattedAdditionalFields = (additionalFields || []).map((fieldKey: string) => ({
          key: fieldKey,
          label: fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1).replace('_', ' ')
        }))

        // Extract ID from value if it's an object (backend returns { id: ..., name: ... })
        // RecordLookup expects a primitive value (string | number)
        const referenceValue = value != null && typeof value === 'object' && 'id' in value
          ? value.id
          : value

        return (
          <RecordLookup
            objectName={objectName}
            value={referenceValue}
            onValueChange={(newValue) => onChange(newValue)}
            additionalFields={formattedAdditionalFields}
            searchBy={searchBy ?? 'name'}
            apiEndpoint={apiEndpoint}
            placeholder={`Search ${objectName.toLowerCase()}...`}
            disabled={disabled}
            className={cn('w-full', className)}
            userId={user?.id}
          />
        )
      }

      case 'select':
        if (!options || options.length === 0) {
          return (
            <div className="text-sm text-muted-foreground">
              No options available
            </div>
          )
        }

        const selectOptions: SearchableSelectOption[] = options.map(option => ({
          value: option.value,
          label: option.label
        }))

        return (
          <SearchableSelect
            options={selectOptions}
            value={value}
            onValueChange={onChange}
            placeholder={`Select ${label.toLowerCase()}...`}
            searchPlaceholder={`Search ${label.toLowerCase()}...`}
            disabled={disabled}
            className={cn('w-full', className)}
          />
        )

      case 'multiselect':
        if (!options || options.length === 0) {
          return (
            <div className="text-sm text-muted-foreground">
              No options available
            </div>
          )
        }

        const multiSelectOptions: MultiSelectOption[] = options.map(option => ({
          value: option.value,
          label: option.label
        }))

        return (
          <MultiSelect
            options={multiSelectOptions}
            value={Array.isArray(value) ? value : []}
            onValueChange={onChange}
            placeholder={`Select ${label.toLowerCase()}...`}
            searchPlaceholder={`Search ${label.toLowerCase()}...`}
            disabled={disabled}
            className={cn('w-full', className)}
          />
        )

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={fieldDefinition.key}
              checked={Boolean(value)}
              onCheckedChange={onChange}
              disabled={disabled}
            />
            <Label htmlFor={fieldDefinition.key} className="text-sm">
              {value ? 'Yes' : 'No'}
            </Label>
          </div>
        )

      case 'geolocation': {
        let parsed: { latitude?: number; longitude?: number } = {}
        try {
          parsed = typeof value === 'string' ? JSON.parse(value || '{}') : value || {}
        } catch {
          parsed = {}
        }
        const lat = parsed.latitude ?? ''
        const lng = parsed.longitude ?? ''
        return (
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Latitude</Label>
              <Input
                type="number"
                step="any"
                min={-90}
                max={90}
                value={lat}
                onChange={(e) => {
                  const v = e.target.value
                  const num = v === '' ? undefined : parseFloat(v)
                  onChange(JSON.stringify({ ...parsed, latitude: num }))
                }}
                disabled={disabled}
                placeholder="-90 to 90"
                className={className}
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Longitude</Label>
              <Input
                type="number"
                step="any"
                min={-180}
                max={180}
                value={lng}
                onChange={(e) => {
                  const v = e.target.value
                  const num = v === '' ? undefined : parseFloat(v)
                  onChange(JSON.stringify({ ...parsed, longitude: num }))
                }}
                disabled={disabled}
                placeholder="-180 to 180"
                className={className}
              />
            </div>
          </div>
        )
      }

      case 'address': {
        const addrFields = ['street', 'city', 'state', 'zip', 'country']
        let parsed: Record<string, string> = {}
        try {
          parsed = typeof value === 'string' ? JSON.parse(value || '{}') : value || {}
        } catch {
          parsed = {}
        }
        return (
          <div className="space-y-2">
            {addrFields.map((key) => (
              <div key={key}>
                <Label className="text-xs text-muted-foreground capitalize">{key}</Label>
                <Input
                  value={parsed[key] ?? ''}
                  onChange={(e) => {
                    const next = { ...parsed, [key]: e.target.value }
                    onChange(JSON.stringify(next))
                  }}
                  disabled={disabled}
                  placeholder={`Enter ${key}`}
                  className={cn('mt-0.5', className)}
                />
              </div>
            ))}
          </div>
        )
      }

      case 'richText':
        return (
          <RichTextEditor
            value={value || ''}
            onChange={onChange}
            disabled={disabled}
            placeholder={`Enter ${label.toLowerCase()}`}
            className={className}
          />
        )

      case 'file':
        return (
          <FileFieldInput
            value={value}
            onChange={onChange}
            disabled={disabled}
            objectName={objectNameProp}
            recordId={recordId}
            fieldKey={fieldDefinition.key}
            label={label}
            className={className}
            accept={fieldDefinition.accept}
          />
        )

      default:
        return (
          <div className="text-sm text-muted-foreground">
            Unsupported field type: {type}
          </div>
        )
    }
  }

  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex items-center gap-1">
          <Label htmlFor={fieldDefinition.key} className="text-sm font-medium">
            {label}
          </Label>
          {isFieldRequired && <span className="text-destructive text-sm">*</span>}
          {isFieldImportant && <span className="text-orange-500 text-sm" title="Important field">!</span>}
        </div>
      )}
      {renderInput()}
    </div>
  )
}
