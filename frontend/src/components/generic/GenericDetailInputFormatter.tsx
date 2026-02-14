import { FieldDefinition } from '@/types/object-definition'
import { Input } from '@/components/ui/input'

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

interface GenericDetailInputFormatterProps {
  fieldDefinition: FieldDefinition
  value: any
  onChange: (value: any) => void
  disabled?: boolean
  className?: string
  showLabel?: boolean // Whether to show the field label
}

export function GenericDetailInputFormatter({
  fieldDefinition,
  value,
  onChange,
  disabled = false,
  className,
  showLabel = true
}: GenericDetailInputFormatterProps) {
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
  
  const isAutoNumber = type === 'autoNumber' || type === 'autonumber'
  const isNameField = fieldDefinition.key === 'name'
  const isFieldRequired = (required || isRequired || (isNameField && !isAutoNumber))
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
      case 'text':
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
              <p className="text-sm text-red-500">{emailError}</p>
            )}
          </div>
        )

      case 'url':
        return (
          <Input
            type="url"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="https://"
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
            <div className="relative flex">
              <div className="absolute left-0 top-0 h-full z-10">
                <SearchableSelect
                  options={countryOptions}
                  value={selectedCountry.code}
                  onValueChange={(countryCode) => {
                    const country = countries.find(c => c.code === countryCode) || defaultCountry
                    setSelectedCountry(country)
                    // Don't auto-populate random number - keep existing phone number if any
                    const currentPhone = value ? formatPhoneNumber(value.replace(selectedCountry.dialCode, '').trim()) : ''
                    const newValue = currentPhone ? `${country.dialCode} ${currentPhone}` : ''
                    onChange(newValue)
                    if (currentPhone) {
                      validatePhoneNumber(currentPhone, country)
                    } else {
                      setPhoneError('') // Clear error if no phone number
                    }
                  }}
                  placeholder={selectedCountry.flag}
                  searchPlaceholder="Search countries..."
                  disabled={disabled}
                  className="w-16 border-r-0 rounded-r-none bg-transparent"
                />
              </div>
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
                placeholder={`${selectedCountry.dialCode} Enter ${selectedCountry.phoneLength.min === selectedCountry.phoneLength.max ? selectedCountry.phoneLength.min : `${selectedCountry.phoneLength.min}-${selectedCountry.phoneLength.max}`} digits`}
                className={cn('pl-16 flex-1', className, phoneError && 'border-red-500')}
              />
            </div>
            {phoneError && (
              <p className="text-sm text-red-500">{phoneError}</p>
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
        const { objectName, additionalFields = [], apiEndpoint, searchBy } = fieldDefinition as any
        if (!objectName) {
          return (
            <div className="text-sm text-red-500">
              Object name is required for reference fields
            </div>
          )
        }

        // Convert additionalFields to the new format with labels
        const formattedAdditionalFields = (additionalFields || []).map((fieldKey: string) => ({
          key: fieldKey,
          label: fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1).replace('_', ' ')
        }))

        return (
          <RecordLookup
            objectName={objectName}
            value={value}
            onValueChange={(newValue) => onChange(newValue)}
            additionalFields={formattedAdditionalFields}
            searchBy={searchBy ?? 'name'}
            apiEndpoint={apiEndpoint}
            placeholder={`Search ${objectName.toLowerCase()}...`}
            disabled={disabled}
            className={cn('w-full', className)}
          />
        )

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
          {isFieldRequired && <span className="text-red-500 text-sm">*</span>}
          {isFieldImportant && <span className="text-orange-500 text-sm" title="Important field">!</span>}
        </div>
      )}
      {renderInput()}
    </div>
  )
}
