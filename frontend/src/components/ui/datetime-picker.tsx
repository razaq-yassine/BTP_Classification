import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CalendarIcon, Clock, X } from 'lucide-react'
import { format, isValid } from 'date-fns'
import { formatDateTimeLocale } from '@/utils/formatDateLocale'
import { cn } from '@/lib/utils'

interface DateTimePickerProps {
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
}

export function DateTimePicker({
  value,
  onChange,
  disabled = false,
  className,
  placeholder
}: DateTimePickerProps) {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const displayPlaceholder = placeholder ?? t('pickDateAndTime')
  
  // Parse the datetime value
  const dateTimeValue = value ? new Date(value) : undefined
  const isValidDateTime = dateTimeValue && isValid(dateTimeValue)
  
  // Extract date and time parts
  const dateValue = isValidDateTime ? dateTimeValue : undefined
  const timeValue = isValidDateTime ? format(dateTimeValue!, 'HH:mm') : ''

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Preserve existing time or use current time
      const existingTime = timeValue || format(new Date(), 'HH:mm')
      const [hours, minutes] = existingTime.split(':').map(Number)
      
      const newDateTime = new Date(date)
      newDateTime.setHours(hours, minutes, 0, 0)
      
      onChange(newDateTime.toISOString())
    }
  }

  const handleTimeChange = (time: string) => {
    if (!time) return
    
    const [hours, minutes] = time.split(':').map(Number)
    if (isNaN(hours) || isNaN(minutes)) return
    
    // Use existing date or today's date
    const baseDate = dateValue || new Date()
    const newDateTime = new Date(baseDate)
    newDateTime.setHours(hours, minutes, 0, 0)
    
    onChange(newDateTime.toISOString())
  }

  const handleClear = () => {
    onChange('')
  }

  const formatDisplayValue = () => {
    if (!isValidDateTime) return displayPlaceholder
    return formatDateTimeLocale(dateTimeValue!, 'PPp')
  }

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
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
            <span dir="ltr" className="tabular-nums">{formatDisplayValue()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 space-y-3">
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={handleDateSelect}
              initialFocus
            />
            <div className="space-y-2">
              <Label htmlFor="time-input" className="text-sm font-medium">
                <Clock className="inline h-4 w-4 mr-1" />
                {t('time')}
              </Label>
              <Input
                id="time-input"
                type="time"
                value={timeValue}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                {t('done')}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleClear}
          disabled={disabled}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
