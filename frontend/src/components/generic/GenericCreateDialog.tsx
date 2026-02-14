import { useState, useEffect } from 'react'
import { ObjectDefinition, GenericRecord, FieldDefinition } from '@/types/object-definition'
import { GenericDetailInputFormatter } from './GenericDetailInputFormatter'
import { ImportantFieldsDialog } from '@/components/ui/important-fields-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/services/api'
import { toast } from 'sonner'
import { isNetworkError } from '@/utils/handle-server-error'

// Field validation result
interface FieldValidation {
  isValid: boolean
  errorMessage?: string
}

interface GenericCreateDialogProps {
  objectDefinition: ObjectDefinition
  open: boolean
  onOpenChange: (open: boolean) => void
  onRecordCreated?: (newRecord: GenericRecord) => void
}

// Component for displaying field in create mode
function CreateFieldDisplay({ 
  field, 
  formData, 
  onChange,
  error
}: {
  field: FieldDefinition
  formData: Record<string, any>
  onChange: (fieldKey: string, value: any) => void
  error?: string
}) {
  const value = formData[field.key] || ''
  const isAutoNumber = field.type === 'autoNumber' || field.type === 'autonumber'
  
  return (
    <div className="space-y-2">
      <GenericDetailInputFormatter
        fieldDefinition={field}
        value={value}
        onChange={(newValue) => !isAutoNumber && onChange(field.key, newValue)}
        disabled={isAutoNumber}
        showLabel={true}
        className={error ? 'border-red-500' : ''}
      />
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  )
}

export function GenericCreateDialog({ 
  objectDefinition, 
  open, 
  onOpenChange, 
  onRecordCreated 
}: GenericCreateDialogProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [, setHasChanges] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showImportantFieldsDialog, setShowImportantFieldsDialog] = useState(false)
  const [pendingEmptyImportantFields, setPendingEmptyImportantFields] = useState<string[]>([])
  const [sectionStates, setSectionStates] = useState<Record<string, boolean>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Initialize section states when dialog opens
  useEffect(() => {
    if (open) {
      const initialSectionStates: Record<string, boolean> = {}
      objectDefinition.detailView?.sections?.forEach((section, index) => {
        // In create modal, always open all sections (ignore layout defaultOpen)
        initialSectionStates[`section_${index}`] = true
      })
      setSectionStates(initialSectionStates)
      
      // Initialize form data with default values (exclude System Information section)
      const initialFormData: Record<string, any> = {}
      objectDefinition.detailView?.sections
        ?.filter((s) => s.title !== 'System Information')
        ?.forEach(section => {
        section.fields.forEach(field => {
          const fieldKey = typeof field === 'string' ? field : field.key
          const fieldDefinition = typeof field === 'string' 
            ? objectDefinition.fields?.find(f => f.key === fieldKey)
            : field
          
          // Set default values: use field.defaultValue if set, else type-based fallback
          // Skip formula and autoNumber fields (read-only)
          if (fieldDefinition && fieldDefinition.type !== 'formula' && fieldDefinition.type !== 'autoNumber') {
            if (fieldDefinition.defaultValue !== undefined && fieldDefinition.defaultValue !== null) {
              initialFormData[fieldKey] = fieldDefinition.defaultValue
            } else {
              switch (fieldDefinition.type) {
                case 'boolean':
                  initialFormData[fieldKey] = false
                  break
                case 'number':
                  initialFormData[fieldKey] = ''
                  break
                default:
                  initialFormData[fieldKey] = ''
              }
            }
          }
        })
      })
      setFormData(initialFormData)
      setHasChanges(false)
      setError('')
    }
  }, [open, objectDefinition])

  // Validate individual field
  const validateField = (fieldDefinition: FieldDefinition, value: any): FieldValidation => {
    const isAutoNumber = fieldDefinition.type === 'autoNumber' || fieldDefinition.type === 'autonumber'
    const isNameField = fieldDefinition.key === 'name'
    // AutoNumber fields are never required - they're generated on save
    const isRequired = !isAutoNumber && (fieldDefinition.required || isNameField)

    if (isRequired) {
      if (value === null || value === undefined || value === '') {
        return {
          isValid: false,
          errorMessage: `${fieldDefinition.label || fieldDefinition.key} is required`
        }
      }
    }

    // Phone number validation
    if (fieldDefinition.type === 'phone' && value && value.toString().trim() !== '') {
      const phoneRegex = /^[+]?[(]?[\d\s\-\(\)]{10,15}$/
      if (!phoneRegex.test(value.toString().replace(/\s/g, ''))) {
        return {
          isValid: false,
          errorMessage: 'Please enter a valid phone number (10-15 digits)'
        }
      }
    }

    // Email validation
    if (fieldDefinition.type === 'email' && value && value.toString().trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value.toString())) {
        return {
          isValid: false,
          errorMessage: 'Please enter a valid email address'
        }
      }
    }

    // Number validation
    if (fieldDefinition.type === 'number' && value && value.toString().trim() !== '') {
      if (isNaN(Number(value))) {
        return {
          isValid: false,
          errorMessage: 'Please enter a valid number'
        }
      }
    }

    return { isValid: true }
  }

  // Handle field changes with validation
  const handleFieldChange = (fieldKey: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }))
    setHasChanges(true)
    setError('')

    // Find field definition for validation
    let fieldDefinition: FieldDefinition | undefined
    objectDefinition.detailView?.sections?.forEach(section => {
      section.fields.forEach(field => {
        const fieldDef = typeof field === 'string' 
          ? objectDefinition.fields?.find(f => f.key === field)
          : field
        if (fieldDef && fieldDef.key === fieldKey) {
          fieldDefinition = fieldDef
        }
      })
    })

    // Validate field and update errors
    if (fieldDefinition) {
      const validation = validateField(fieldDefinition, value)
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        if (validation.isValid) {
          delete newErrors[fieldKey]
        } else {
          newErrors[fieldKey] = validation.errorMessage || 'Invalid value'
        }
        return newErrors
      })
    }
  }

  // Toggle section open/closed state
  const toggleSection = (sectionKey: string) => {
    setSectionStates(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }))
  }

  // Extract create logic into separate function for reuse
  const performCreate = async () => {
    try {
      setSaving(true)
      setError('')
      
      // Prepare create data
      const createData = { ...formData }
      
      objectDefinition.detailView?.sections?.forEach(section => {
        section.fields.forEach(field => {
          const fieldKey = typeof field === 'string' ? field : field.key
          const fieldDefinition = typeof field === 'string' 
            ? objectDefinition.fields?.find(f => f.key === fieldKey)
            : field
          
          const isAutoNumber = fieldDefinition?.type === 'autoNumber' || fieldDefinition?.type === 'autonumber'
          if (isAutoNumber) {
            delete createData[fieldKey]
          } else if (fieldDefinition?.required && (createData[fieldKey] === null || createData[fieldKey] === undefined || createData[fieldKey] === '')) {
            delete createData[fieldKey]
          }
        })
      })
      
      // Ensure endpoint doesn't have trailing slash
      const endpoint = objectDefinition.apiEndpoint.endsWith('/') 
        ? objectDefinition.apiEndpoint.slice(0, -1) 
        : objectDefinition.apiEndpoint
      
      
      const response = await api.post(endpoint, createData)
      
      // Show success toast
      toast.success(`${objectDefinition.label || objectDefinition.name} created successfully!`, {
        description: `New ${objectDefinition.label || objectDefinition.name} has been created.`,
        duration: 3000,
      })
      
      // Call the onRecordCreated callback
      if (onRecordCreated) {
        onRecordCreated(response.data)
      }
      
      // Close dialog and reset form
      onOpenChange(false)
      setFormData({})
      setHasChanges(false)
    } catch (err: any) {
      console.error(`❌ Error creating ${objectDefinition.label}:`, {
        message: err.response?.data?.message || err.message,
        status: err.response?.status,
        data: err.response?.data,
        endpoint: err.config?.url
      })
      
      // Handle authentication errors specifically
      if (err.response?.status === 401) {
        setError('Authentication failed. Please try logging in again.')
      } else {
        const msg = isNetworkError(err)
          ? 'Connection lost. Please wait and try again.'
          : err.response?.data?.detail || err.response?.data?.message || 'Failed to create record'
        setError(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  // Check if form has any validation errors
  const hasValidationErrors = () => {
    return Object.keys(fieldErrors).length > 0
  }

  // Validate all fields before save
  const validateAllFields = () => {
    const newErrors: Record<string, string> = {}
    
    objectDefinition.detailView?.sections?.forEach(section => {
      section.fields.forEach(field => {
        const fieldKey = typeof field === 'string' ? field : field.key
        const fieldDefinition = typeof field === 'string' 
          ? objectDefinition.fields?.find(f => f.key === fieldKey)
          : field
        
        if (fieldDefinition) {
          const value = formData[fieldKey]
          const validation = validateField(fieldDefinition, value)
          if (!validation.isValid) {
            newErrors[fieldKey] = validation.errorMessage || 'Invalid value'
          }
        }
      })
    })
    
    setFieldErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      
      // First, validate all fields
      if (!validateAllFields()) {
        setError('Please fix all field errors before saving')
        setSaving(false)
        return
      }
      
      // Check for empty important fields (for confirmation)
      const emptyImportantFields: string[] = []
      
      objectDefinition.detailView?.sections?.forEach(section => {
        section.fields.forEach(field => {
          const fieldKey = typeof field === 'string' ? field : field.key
          const fieldDefinition = typeof field === 'string' 
            ? objectDefinition.fields?.find(f => f.key === fieldKey)
            : field
          
          if (fieldDefinition) {
            const value = formData[fieldKey]
            const isEmpty = value === null || value === undefined || value === ''
            
            // Check important fields (for confirmation) - only if not required
            if (fieldDefinition.isImportant && !fieldDefinition.required && isEmpty) {
              emptyImportantFields.push(fieldDefinition.label || fieldKey)
            }
          }
        })
      })
      
      // Important field confirmation - show dialog if there are empty important fields
      if (emptyImportantFields.length > 0) {
        setPendingEmptyImportantFields(emptyImportantFields)
        setShowImportantFieldsDialog(true)
        setSaving(false)
        return
      }
      
      // If no validation errors and no important field confirmation needed, proceed with create
      await performCreate()
    } catch (err: any) {
      console.error(`❌ Error creating ${objectDefinition.label}:`, {
        message: err.response?.data?.message || err.message,
        status: err.response?.status,
        data: err.response?.data,
        endpoint: err.config?.url
      })
      
      // Handle authentication errors specifically
      if (err.response?.status === 401) {
        setError('Authentication failed. Please try logging in again.')
      } else {
        const msg = isNetworkError(err)
          ? 'Connection lost. Please wait and try again.'
          : err.response?.data?.detail || err.response?.data?.message || 'Failed to create record'
        setError(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    setFormData({})
    setHasChanges(false)
    setError('')
  }

  // Handle important fields dialog
  const handleImportantFieldsDialogContinue = async () => {
    setShowImportantFieldsDialog(false)
    setPendingEmptyImportantFields([])
    await performCreate()
  }

  const handleImportantFieldsDialogCancel = () => {
    setShowImportantFieldsDialog(false)
    setPendingEmptyImportantFields([])
    setSaving(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-h-[95vh] overflow-hidden flex flex-col p-0"
          style={{ width: '95vw', maxWidth: '95vw' }}
        >
          <DialogHeader className="flex-shrink-0 px-6 pt-6">
            <DialogTitle className="text-xl font-semibold">
              New {objectDefinition.label || objectDefinition.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {objectDefinition.detailView?.sections
                ?.map((section, idx) => ({ section, sectionIndex: idx }))
                ?.filter(({ section }) => section.title !== 'System Information')
                ?.map(({ section, sectionIndex }) => {
                const sectionKey = `section_${sectionIndex}`
                const isOpen = sectionStates[sectionKey] ?? true
                
                return (
                  <Collapsible
                    key={sectionKey}
                    open={isOpen}
                    onOpenChange={() => toggleSection(sectionKey)}
                    className="w-full"
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                        <h3 className="text-lg font-medium text-gray-900">
                          {section.title}
                        </h3>
                        {isOpen ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="mt-2">
                      <div className={cn(
                        "grid gap-4 p-4 bg-white border border-gray-200 rounded-lg",
                        section.columns === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
                      )}>
                        {section.fields.map((field) => {
                          const fieldDefinition = typeof field === 'string' 
                            ? objectDefinition.fields?.find(f => f.key === field)
                            : field
                          
                          if (!fieldDefinition) return null
                          
                          return (
                            <CreateFieldDisplay
                              key={fieldDefinition.key}
                              field={fieldDefinition}
                              formData={formData}
                              onChange={handleFieldChange}
                              error={fieldErrors[fieldDefinition.key]}
                            />
                          )
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </div>
          </div>
          
          <DialogFooter className="flex-shrink-0 flex justify-end gap-2 pt-4 px-6 pb-6 border-t">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={saving}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || hasValidationErrors()}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Important Fields Dialog */}
      <ImportantFieldsDialog
        open={showImportantFieldsDialog}
        onOpenChange={setShowImportantFieldsDialog}
        emptyImportantFields={pendingEmptyImportantFields}
        onContinue={handleImportantFieldsDialogContinue}
        onCancel={handleImportantFieldsDialogCancel}
      />
    </>
  )
}
