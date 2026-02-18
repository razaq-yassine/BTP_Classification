import { useState, useEffect } from 'react'
import { ObjectDefinition, GenericRecord, FieldDefinition } from '@/types/object-definition'
import { GenericDetailInputFormatter } from './GenericDetailInputFormatter'
import { ImportantFieldsDialog } from '@/components/ui/important-fields-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getObjectBorderAccentClasses, getObjectButtonClasses } from '@/utils/object-color'
import api from '@/services/api'
import { toast } from 'sonner'
import { isNetworkError } from '@/utils/handle-server-error'
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@/hooks/usePermissions'
import { useTenantConfig } from '@/hooks/useTenantConfig'

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
  error,
  canEditField,
  profileName,
  objectName,
}: {
  field: FieldDefinition
  formData: Record<string, any>
  onChange: (fieldKey: string, value: any) => void
  error?: string
  canEditField: (fieldKey: string) => boolean
  profileName?: string
  objectName?: string
}) {
  const value = formData[field.key] || ''
  const fieldEditable = canEditField(field.key)
  const editableForProfiles = field.editableForProfiles
  const profileCanEdit =
    (editableForProfiles?.length && profileName && editableForProfiles.includes(profileName)) ||
    // Tenant field: org-user must select tenant when creating (edit not allowed)
    (field.key === 'tenant' && profileName === 'org-user')
  const isReadOnly =
    field.type === 'autoNumber' ||
    (field.editable === false && !profileCanEdit) ||
    (!fieldEditable && !profileCanEdit)

  return (
    <div className="space-y-1">
      <GenericDetailInputFormatter
        fieldDefinition={field}
        value={value}
        onChange={(newValue) => !isReadOnly && onChange(field.key, newValue)}
        disabled={isReadOnly}
        showLabel={true}
        className={error ? 'border-red-500' : ''}
        objectName={objectName}
        recordId="temp"
      />
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
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
  const { t } = useTranslation('common')
  const { isFieldVisible, canEditField, profile } = usePermissions()
  const { data: tenantConfig } = useTenantConfig()
  const tenantMode = tenantConfig?.mode ?? 'single_tenant'
  const hasOrgs =
    tenantMode === 'single_tenant' || tenantMode === 'multi_tenant' || tenantMode === 'org_and_tenant'
  const isTenantModeNone = !hasOrgs

  // When mode has no orgs (legacy "none"), org/tenant fields don't exist in schema - skip them
  const isTenantScopeFieldSkipped = (fieldKey: string) =>
    isTenantModeNone && (fieldKey === 'organization' || fieldKey === 'tenant')

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
      objectDefinition.detailView?.sections?.forEach((_section, index) => {
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

            // Filter fields based on permissions
            if (!fieldDefinition || !isFieldVisible(objectDefinition.name, fieldKey)) {
              return
            }
            // Skip org/tenant when tenant mode is none
            if (isTenantScopeFieldSkipped(fieldKey)) {
              return
            }

            // Filter out non-editable fields in create modal.
            // Admin always sees and can edit all fields (including org/tenant for tenant-scoped objects).
            const isAdmin = profile?.name === 'admin'
            const fieldEditable = canEditField(objectDefinition.name, fieldKey)
            const editableForProfiles = fieldDefinition.editableForProfiles
            const profileCanEdit =
              isAdmin ||
              (editableForProfiles?.length && profile?.name && editableForProfiles.includes(profile.name)) ||
              // Tenant field: org-user must select tenant when creating (edit not allowed)
              (fieldKey === 'tenant' && profile?.name === 'org-user')
            const isReadOnly =
              fieldDefinition.type === 'autoNumber' ||
              (fieldDefinition.editable === false && !profileCanEdit) ||
              (!fieldEditable && !profileCanEdit)

            // Skip non-editable fields
            if (isReadOnly) {
              return
            }

            // Set default values: use field.defaultValue if set, else type-based fallback
            // Skip formula and autoNumber fields (read-only)
            if (fieldDefinition.type !== 'formula' && fieldDefinition.type !== 'autoNumber') {
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
      setFieldErrors({})
    }
  }, [open, objectDefinition, isFieldVisible, canEditField, profile, isTenantModeNone])

  // Validate individual field
  const validateField = (fieldDefinition: FieldDefinition, value: any): FieldValidation => {
    const isAutoNumber = fieldDefinition.type === 'autoNumber'
    const isNameField = fieldDefinition.key === 'name'
    const isMasterDetail =
      fieldDefinition.type === 'masterDetail' ||
      fieldDefinition.relationshipType === 'masterDetail'
    // AutoNumber fields are never required - they're generated on save
    // Master-detail fields are always required
    const isRequired = !isAutoNumber && (fieldDefinition.required || isNameField || isMasterDetail)

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

    // URL validation (domain required, no spaces)
    if (fieldDefinition.type === 'url' && value && value.toString().trim() !== '') {
      const url = value.toString().trim()
      if (url.includes(' ')) {
        return { isValid: false, errorMessage: 'URL must not contain spaces' }
      }
      if (!url.includes('.') || !/\w/.test(url)) {
        return { isValid: false, errorMessage: 'Please enter a valid URL with a domain' }
      }
      const parts = url.split('.')
      const lastPart = parts[parts.length - 1]
      if (lastPart.length < 2 || !/^[a-zA-Z0-9-]+$/.test(lastPart)) {
        return { isValid: false, errorMessage: 'Please enter a valid URL with a domain' }
      }
    }

    // Geolocation validation
    if (fieldDefinition.type === 'geolocation' && value && value.toString().trim() !== '') {
      try {
        const loc = typeof value === 'string' ? JSON.parse(value) : value
        const lat = loc?.latitude
        const lng = loc?.longitude
        if (lat != null && (typeof lat !== 'number' || lat < -90 || lat > 90)) {
          return { isValid: false, errorMessage: 'Latitude must be between -90 and 90' }
        }
        if (lng != null && (typeof lng !== 'number' || lng < -180 || lng > 180)) {
          return { isValid: false, errorMessage: 'Longitude must be between -180 and 180' }
        }
      } catch {
        return { isValid: false, errorMessage: 'Please enter valid geolocation data' }
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

      // When mode has no orgs, don't send org/tenant - backend doesn't expect them
      if (isTenantModeNone) {
        delete createData.organization
        delete createData.organizationId
        delete createData.tenant
        delete createData.tenantId
      }

      objectDefinition.detailView?.sections?.forEach(section => {
        section.fields.forEach(field => {
          const fieldKey = typeof field === 'string' ? field : field.key
          const fieldDefinition = typeof field === 'string'
            ? objectDefinition.fields?.find(f => f.key === fieldKey)
            : field

          if (isTenantScopeFieldSkipped(fieldKey)) return

          const isAutoNumber = fieldDefinition?.type === 'autoNumber'
          if (isAutoNumber) {
            delete createData[fieldKey]
          } else if (
            (fieldDefinition?.type === 'reference' || fieldDefinition?.type === 'masterDetail') &&
            createData[fieldKey] != null
          ) {
            // Transform reference fields to the format expected by backend: { id: <value> }
            // Backend expects either body[ref.key]?.id or body[ref.idField]
            const refValue = createData[fieldKey]
            if (refValue !== null && refValue !== undefined && refValue !== '') {
              createData[fieldKey] = { id: refValue }
            } else {
              delete createData[fieldKey]
            }
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

        if (fieldDefinition && !isTenantScopeFieldSkipped(fieldKey)) {
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

          if (fieldDefinition && !isTenantScopeFieldSkipped(fieldKey)) {
            const value = formData[fieldKey]
            const isEmpty = value === null || value === undefined || value === ''

            // Check important fields (for confirmation) - only if not required
            const isRequired =
              fieldDefinition.required ||
              fieldDefinition.type === 'masterDetail' ||
              fieldDefinition.relationshipType === 'masterDetail'
            if (fieldDefinition.isImportant && !isRequired && isEmpty) {
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
          className={cn(
            "overflow-hidden flex flex-col p-0",
            "fixed inset-0 w-full max-w-full h-full max-h-[100dvh] translate-x-0 translate-y-0",
            "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
            "sm:h-auto sm:max-h-[95vh] sm:w-[95vw] sm:max-w-2xl",
            "rounded-none sm:rounded-lg"
          )}
        >
          <DialogHeader className="flex-shrink-0 px-4 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-4">
            <DialogTitle className="text-base font-semibold sm:text-lg">
              New {objectDefinition.label || objectDefinition.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6">
            {error && (
              <div className="mb-3 p-2.5 sm:p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                <p className="text-sm text-destructive whitespace-pre-line">{error}</p>
              </div>
            )}

            <div className="space-y-2">
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
                        <div className={cn("flex items-center justify-between w-full p-2 sm:p-2.5 bg-muted hover:bg-muted/80 rounded-md cursor-pointer transition-colors", getObjectBorderAccentClasses(objectDefinition.color))}>
                          <h3 className="text-sm font-medium text-foreground sm:text-base">
                            {section.title}
                          </h3>
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="mt-1">
                        <div className={cn(
                          "grid gap-2.5 p-2.5 sm:p-3 bg-card/50 border border-border rounded-lg shadow-sm",
                          section.columns === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
                        )}>
                          {section.fields.map((field) => {
                            const fieldKey = typeof field === 'string' ? field : field.key
                            const fieldDefinition = typeof field === 'string'
                              ? objectDefinition.fields?.find(f => f.key === fieldKey)
                              : field

                            if (!fieldDefinition) return null

                            // Skip org/tenant when tenant mode is none
                            if (isTenantScopeFieldSkipped(fieldKey)) return null

                            // Filter fields based on permissions
                            if (!isFieldVisible(objectDefinition.name, fieldKey)) {
                              return null
                            }

                            // Filter out non-editable fields in create modal.
                            // Admin always sees and can edit all fields (including org/tenant for tenant-scoped objects).
                            const isAdmin = profile?.name === 'admin'
                            const fieldEditable = canEditField(objectDefinition.name, fieldKey)
                            const editableForProfiles = fieldDefinition.editableForProfiles
                            const profileCanEdit =
                              isAdmin ||
                              (editableForProfiles?.length && profile?.name && editableForProfiles.includes(profile.name)) ||
                              // Tenant field: org-user must select tenant when creating (edit not allowed)
                              (fieldKey === 'tenant' && profile?.name === 'org-user')
                            const isReadOnly =
                              fieldDefinition.type === 'autoNumber' ||
                              (fieldDefinition.editable === false && !profileCanEdit) ||
                              (!fieldEditable && !profileCanEdit)

                            // Don't show non-editable fields in create modal
                            if (isReadOnly) {
                              return null
                            }

                            return (
                              <CreateFieldDisplay
                                key={fieldDefinition.key}
                                field={fieldDefinition}
                                formData={formData}
                                onChange={handleFieldChange}
                                error={fieldErrors[fieldDefinition.key]}
                                canEditField={(fieldKey) => canEditField(objectDefinition.name, fieldKey)}
                                profileName={profile?.name}
                                objectName={objectDefinition.name}
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

          <DialogFooter className="flex-shrink-0 flex justify-end gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6 border-t bg-background">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={saving}
            >
              <X className="h-4 w-4 mr-2" />
              {t('cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || hasValidationErrors()}
              className={getObjectButtonClasses(objectDefinition.color)}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? t('creating', { defaultValue: 'Creating...' }) : t('create', { defaultValue: 'Create' })}
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
