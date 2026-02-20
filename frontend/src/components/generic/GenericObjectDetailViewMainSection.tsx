import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ObjectDefinition, GenericRecord, FieldDefinition } from '@/types/object-definition'
import { translateFieldLabel, translateObjectLabel, translateSectionTitle } from '@/utils/translateMetadata'
import { formatDetailValue } from '@/utils/formatDetailValue'
import { ReferenceFieldValue } from './ReferenceFieldValue'
import { evaluateFormula } from '@/utils/evaluateFormula'
import { usePermissions } from '@/hooks/usePermissions'
import { GenericRelatedListView } from './GenericRelatedListView'
import { GenericDetailInputFormatter } from './GenericDetailInputFormatter'
import { GenericDetailsTabSkeleton } from './GenericDetailsTabSkeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ImportantFieldsDialog } from '@/components/ui/important-fields-dialog'
import { Edit2, ChevronDown, ChevronRight, Save, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getObjectBorderAccentClasses, getObjectButtonClasses } from '@/utils/object-color'
import api from '@/services/api'
import { isNetworkError } from '@/utils/handle-server-error'
import { playSaveSound } from '@/utils/sound-effects'
import { toast } from 'sonner'

// Field validation result
interface FieldValidation {
  isValid: boolean
  errorMessage?: string
}

interface GenericObjectDetailViewMainSectionProps {
  objectDefinition: ObjectDefinition
  record: GenericRecord | null
  onRecordUpdate?: (updatedRecord: GenericRecord) => void
  isLoading?: boolean
}

// Tab state management for global edit mode
interface TabState {
  isEditing: boolean
  formData: Record<string, any>
  hasChanges: boolean
  sectionStates: Record<string, boolean>
  fieldErrors: Record<string, string>
}

// Global tab states to preserve state across tab switches
const tabStates = new Map<string, TabState>()

// Component for displaying field value in read-only or edit mode
function FieldDisplay({
  field,
  record,
  isEditing,
  formData,
  onChange,
  onStartEdit,
  onRevertField,
  error,
  objectName,
  canEditField,
  profileName,
}: {
  field: FieldDefinition
  record: GenericRecord
  isEditing: boolean
  formData: Record<string, any>
  onChange: (fieldKey: string, value: any) => void
  onStartEdit?: () => void
  onRevertField?: (fieldKey: string) => void
  error?: string
  objectName: string
  canEditField: (fieldKey: string) => boolean
  profileName?: string
}) {
  const { t } = useTranslation('common')
  // Formula fields: evaluate expression (read-only, not editable)
  let value = record[field.key]
  if (field.type === 'formula' && field.formulaExpression) {
    value = evaluateFormula(field.formulaExpression, record)
  }
  const formValue = formData[field.key] !== undefined ? formData[field.key] : value

  const fieldEditable = canEditField(field.key)
  const editableForProfiles = field.editableForProfiles
  // When editableForProfiles is set, only those profiles can edit; otherwise use field.editable
  const effectiveEditable = editableForProfiles?.length
    ? (profileName != null && editableForProfiles.includes(profileName)) && fieldEditable
    : (field.editable !== false && fieldEditable)

  // Formula fields are always read-only
  if (isEditing && field.type !== 'formula') {
    const hasChanged = formValue !== value

    const isMasterDetail =
      field.type === 'masterDetail' || field.relationshipType === 'masterDetail'
    const isFieldRequired = field.required || isMasterDetail

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-foreground">{translateFieldLabel(objectName, field.key, field.label)}</span>
          {isFieldRequired && <span className="text-red-500 text-sm">*</span>}
          {field.isImportant && <span className="text-orange-500 text-sm" title={t('common:importantField')}>!</span>}
          {hasChanged && onRevertField && (
            <button
              onClick={() => onRevertField(field.key)}
              className="ml-auto p-1 text-muted-foreground hover:text-orange-600 transition-colors"
              title={t('revertFieldTitle')}
            >
              <Undo2 className="h-3 w-3" />
            </button>
          )}
        </div>
        <GenericDetailInputFormatter
          fieldDefinition={field}
          value={formValue}
          onChange={(newValue) => onChange(field.key, newValue)}
          showLabel={false}
          disabled={!effectiveEditable}
          className={error ? 'border-red-500' : ''}
          objectName={objectName}
          recordId={record?.id != null ? record.id : undefined}
        />
        {error && (
          <p className="text-sm text-destructive mt-1">{error}</p>
        )}
      </div>
    )
  }

  // Read-only mode
  const isEmpty = value === null || value === undefined || value === ''
  const isImportant = field.isImportant && isEmpty
  const canEdit = effectiveEditable

  return (
    <div
      className={cn(
        "space-y-1 group",
        canEdit && "cursor-pointer hover:bg-muted/50 p-1.5 rounded-md transition-colors"
      )}
      onClick={canEdit && onStartEdit ? onStartEdit : undefined}
    >
      <div className="flex items-center gap-1">
        <span className="text-sm font-bold text-foreground">{translateFieldLabel(objectName, field.key, field.label)}</span>
        {(field.required || field.type === 'masterDetail' || field.relationshipType === 'masterDetail') && (
          <span className="text-red-500 text-sm">*</span>
        )}
        {field.isImportant && <span className="text-orange-500 text-sm" title={t('importantField')}>!</span>}
        {canEdit && onStartEdit && (
          <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
        )}
      </div>
      <div className={cn(
        "text-sm",
        isEmpty ? "text-muted-foreground italic" : "text-foreground",
        isImportant && "text-orange-600 font-medium"
      )}>
        {(field.type === 'reference' || field.type === 'masterDetail') && !isEmpty ? (
          <ReferenceFieldValue field={field} value={value} record={record} />
        ) : (
          formatDetailValue(field, value, record, objectName)
        )}
      </div>
    </div>
  )
}

// Component for the Details tab content with accordion sections and global edit mode
function DetailsTabContent({
  objectDefinition,
  record,
  onRecordUpdate,
  isLoading = false
}: {
  objectDefinition: ObjectDefinition
  record: GenericRecord | null
  onRecordUpdate: (updatedRecord: GenericRecord) => void
  isLoading?: boolean
}) {
  const { t } = useTranslation(['common', 'objects'])
  const { canUpdate, isFieldVisible, canEditField, profile } = usePermissions()
  const tabKey = `details_${objectDefinition.name}_${record?.id}`
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showImportantFieldsDialog, setShowImportantFieldsDialog] = useState(false)
  const [pendingEmptyImportantFields, setPendingEmptyImportantFields] = useState<string[]>([])
  const [previousRecordState, setPreviousRecordState] = useState<GenericRecord | null>(null)

  // Get or initialize tab state
  const getTabState = (): TabState => {
    if (!tabStates.has(tabKey)) {
      // Initialize section states based on config
      const sectionStates: Record<string, boolean> = {}
      objectDefinition.detailView?.sections?.forEach((section, index) => {
        sectionStates[`section_${index}`] = section.defaultOpen ?? true
      })

      tabStates.set(tabKey, {
        isEditing: false,
        formData: {},
        hasChanges: false,
        sectionStates,
        fieldErrors: {}
      })
    }
    return tabStates.get(tabKey)!
  }

  const [tabState, setTabState] = useState<TabState>(getTabState)

  // Update tab state in map when local state changes
  useEffect(() => {
    tabStates.set(tabKey, tabState)
  }, [tabKey, tabState])

  if (isLoading) {
    return <GenericDetailsTabSkeleton objectColor={objectDefinition.color} />
  }

  if (!record) return null

  // Validate individual field
  const validateField = (fieldDefinition: FieldDefinition, value: any): FieldValidation => {
    // Check if field is required and empty (master-detail fields are always required)
    const isRequired =
      fieldDefinition.required ||
      fieldDefinition.type === 'masterDetail' ||
      fieldDefinition.relationshipType === 'masterDetail'
    if (isRequired) {
      if (value === null || value === undefined || value === '') {
        return {
          isValid: false,
          errorMessage: t('fieldRequired', { label: fieldDefinition.label || fieldDefinition.key })
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

  // Global edit mode handlers
  const handleStartEdit = () => {
    // Check update permission
    if (!canUpdate(objectDefinition.name)) {
      setError(t('noPermissionToEdit', { defaultValue: 'You do not have permission to edit this record' }))
      return
    }

    // Capture the current state for undo functionality BEFORE any changes
    setPreviousRecordState({ ...record })

    // Initialize form data with current record values
    const formData: Record<string, any> = {}
    objectDefinition.detailView?.sections?.forEach(section => {
      section.fields.forEach(field => {
        const fieldKey = typeof field === 'string' ? field : field.key
        // Only include visible fields
        if (isFieldVisible(objectDefinition.name, fieldKey)) {
          formData[fieldKey] = record[fieldKey]
        }
      })
    })

    setTabState(prev => ({
      ...prev,
      isEditing: true,
      formData,
      hasChanges: false,
      fieldErrors: {}
    }))
    setError('')
  }

  // Extract save logic into separate function for reuse
  const performSave = async () => {
    try {
      setSaving(true)
      setError('')

      // Previous state was already captured when entering edit mode

      // Prepare update data with all form data
      const updateData = {
        ...record,
        ...tabState.formData
      }

      // Transform reference fields and handle required fields
      objectDefinition.detailView?.sections?.forEach(section => {
        section.fields.forEach(field => {
          const fieldKey = typeof field === 'string' ? field : field.key
          const fieldDefinition = typeof field === 'string'
            ? objectDefinition.fields?.find(f => f.key === fieldKey)
            : field

          // Transform reference fields to the format expected by backend: { id: <value> }
          // Also set the idField (e.g. tenantId) so it overwrites stale values from record spread
          if (fieldDefinition?.type === 'reference' || fieldDefinition?.type === 'masterDetail') {
            const refValue = updateData[fieldKey]
            const idField = `${fieldKey}Id` // Convention: tenant -> tenantId, customer -> customerId
            let resolvedId: number | string | null = null
            if (refValue != null && typeof refValue === 'object' && 'id' in refValue) {
              resolvedId = (refValue as { id?: number }).id ?? null
            } else if (refValue !== null && refValue !== undefined && refValue !== '') {
              updateData[fieldKey] = { id: refValue }
              resolvedId = refValue as number | string
            } else {
              updateData[fieldKey] = refValue
            }
            if (resolvedId != null) updateData[idField] = resolvedId
            else if (refValue === null || refValue === undefined || refValue === '') updateData[idField] = null
          }

          // Only preserve values for required fields, not just important ones
          if (fieldDefinition?.required && (updateData[fieldKey] === null || updateData[fieldKey] === undefined)) {
            // For required fields, use original value if new value is null/undefined
            updateData[fieldKey] = record[fieldKey]
          }
        })
      })

      // Ensure endpoint doesn't have trailing slash
      const baseEndpoint = objectDefinition.apiEndpoint.endsWith('/')
        ? objectDefinition.apiEndpoint.slice(0, -1)
        : objectDefinition.apiEndpoint

      const endpoint = `${baseEndpoint}/${record.id}`

      const response = await api.put(endpoint, updateData)

      // Call the onRecordUpdate callback to refresh the data
      onRecordUpdate(response.data)

      // Show success toast with undo button
      playSaveSound()
      toast.success(t('changesSaved'), {
        description: t('recordUpdated', { label: objectDefinition.label || objectDefinition.name }),
        duration: 5000,
        action: {
          label: t('undo'),
          onClick: () => handleUndo()
        }
      })

      // Exit edit mode
      setTabState(prev => ({
        ...prev,
        isEditing: false,
        hasChanges: false,
        formData: {}
      }))
    } catch (err: any) {
      // Handle authentication errors specifically
      if (err.response?.status === 401) {
        setError(t('authFailedRetry', { defaultValue: 'Authentication failed. Please try logging in again.' }))
      } else {
        const msg = isNetworkError(err)
          ? 'Connection lost. Please wait and try again.'
          : err.response?.data?.detail || err.response?.data?.message || t('failedToSaveChanges', { defaultValue: 'Failed to save changes' })
        setError(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  // Check if form has any validation errors
  const hasValidationErrors = () => {
    return Object.keys(tabState.fieldErrors).length > 0
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
          const value = tabState.formData[fieldKey]
          const validation = validateField(fieldDefinition, value)
          if (!validation.isValid) {
            newErrors[fieldKey] = validation.errorMessage || t('invalidValue')
          }
        }
      })
    })

    setTabState(prev => ({
      ...prev,
      fieldErrors: newErrors
    }))
    return Object.keys(newErrors).length === 0
  }

  const handleSaveAll = async () => {
    try {
      setSaving(true)
      setError('')

      // First, validate all fields
      if (!validateAllFields()) {
        setError(t('fixFieldErrors'))
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
            const value = tabState.formData[fieldKey]
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

      // If no validation errors and no important field confirmation needed, proceed with save
      await performSave()
    } catch (err: any) {
      // Handle authentication errors specifically
      if (err.response?.status === 401) {
        setError(t('authFailedRetry', { defaultValue: 'Authentication failed. Please try logging in again.' }))
      } else {
        const msg = isNetworkError(err)
          ? 'Connection lost. Please wait and try again.'
          : err.response?.data?.detail || err.response?.data?.message || t('failedToSaveChanges', { defaultValue: 'Failed to save changes' })
        setError(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  // Cmd+S / Ctrl+S to save when in edit mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (tabState.isEditing && !saving && tabState.hasChanges && Object.keys(tabState.fieldErrors).length === 0) {
          handleSaveAll()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tabState.isEditing, tabState.hasChanges, tabState.fieldErrors, saving])

  const handleCancelEdit = () => {
    setTabState(prev => ({
      ...prev,
      isEditing: false,
      formData: {},
      hasChanges: false
    }))
    setError('')
    // Clear previous state since no changes were saved
    setPreviousRecordState(null)
  }

  // Handle undo functionality
  const handleUndo = async () => {
    if (!previousRecordState) {
      console.warn('No previous state available for undo')
      toast.error(t('noChangesToUndo', { defaultValue: 'No changes to undo' }), {
        description: t('previousStateNotFound', { defaultValue: 'Previous state not found.' }),
        duration: 3000,
      })
      return
    }

    try {
      setSaving(true)
      setError('')

      // Ensure endpoint doesn't have trailing slash
      const baseEndpoint = objectDefinition.apiEndpoint.endsWith('/')
        ? objectDefinition.apiEndpoint.slice(0, -1)
        : objectDefinition.apiEndpoint

      const endpoint = `${baseEndpoint}/${previousRecordState.id}`

      const response = await api.put(endpoint, previousRecordState)

      // Call the onRecordUpdate callback to refresh the data
      onRecordUpdate(response.data)

      // Show undo success toast
      toast.success(t('changesUndone'), {
        description: t('recordUpdated', { label: objectDefinition.label || objectDefinition.name }),
        duration: 3000,
      })

      // Clear previous state after successful undo
      setPreviousRecordState(null)
    } catch {
      toast.error(t('undoFailed'), {
        description: t('retry'),
        duration: 3000,
      })
    } finally {
      setSaving(false)
    }
  }

  // Dialog handlers for important fields confirmation
  const handleImportantFieldsDialogContinue = async () => {
    setShowImportantFieldsDialog(false)
    setPendingEmptyImportantFields([])
    await performSave()
  }

  const handleImportantFieldsDialogCancel = () => {
    setShowImportantFieldsDialog(false)
    setPendingEmptyImportantFields([])
    setSaving(false)
  }

  const handleFieldChange = (fieldKey: string, value: any) => {
    setTabState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [fieldKey]: value
      },
      hasChanges: true
    }))
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
      setTabState(prev => {
        const newFieldErrors = { ...prev.fieldErrors }
        if (validation.isValid) {
          delete newFieldErrors[fieldKey]
        } else {
          newFieldErrors[fieldKey] = validation.errorMessage || 'Invalid value'
        }
        return {
          ...prev,
          fieldErrors: newFieldErrors
        }
      })
    }
  }

  const handleRevertField = (fieldKey: string) => {
    setTabState(prev => {
      const newFormData = { ...prev.formData }
      // Reset field to original record value
      newFormData[fieldKey] = record[fieldKey]

      // Check if there are any actual changes by comparing all form fields with original record values
      const hasActualChanges = Object.keys(newFormData).some(key => {
        const formValue = newFormData[key]
        const originalValue = record[key]

        // Handle different types of comparisons
        if (formValue === originalValue) return false

        // Handle null/undefined/empty string equivalence
        const isFormEmpty = formValue === null || formValue === undefined || formValue === ''
        const isOriginalEmpty = originalValue === null || originalValue === undefined || originalValue === ''

        if (isFormEmpty && isOriginalEmpty) return false

        // Handle string/number comparisons (e.g., "123" vs 123)
        if (String(formValue) === String(originalValue)) return false

        return true
      })

      return {
        ...prev,
        formData: newFormData,
        hasChanges: hasActualChanges
      }
    })
  }

  const toggleSection = (sectionIndex: number) => {
    setTabState(prev => ({
      ...prev,
      sectionStates: {
        ...prev.sectionStates,
        [`section_${sectionIndex}`]: !prev.sectionStates[`section_${sectionIndex}`]
      }
    }))
  }

  // Global save/cancel buttons
  const GlobalButtons = ({ showUnsavedMessage = true }: { showUnsavedMessage?: boolean }) => {
    const buttonClasses = getObjectButtonClasses(objectDefinition.color)
    return (
    <div className="flex items-center gap-2 p-3 bg-muted border border-border rounded-lg shadow-sm">
      {showUnsavedMessage && (
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{t('unsavedChanges')}</p>
          <p className="text-xs text-muted-foreground">{t('unsavedChangesDesc')}</p>
        </div>
      )}
      {!showUnsavedMessage && (
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{t('editMode')}</p>
          <p className="text-xs text-muted-foreground">{t('editModeDesc')}</p>
        </div>
      )}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancelEdit}
          disabled={saving}
          className="flex items-center gap-1"
        >
          <Undo2 className="h-4 w-4" />
          {t('cancel')}
        </Button>
        <Button
          size="sm"
          onClick={handleSaveAll}
          disabled={saving || !tabState.hasChanges || hasValidationErrors()}
          className={cn("flex items-center gap-2", buttonClasses)}
        >
          <Save className="h-4 w-4" />
          {saving ? t('saving') : t('saveAll')}
        </Button>
      </div>
    </div>
  )
  }

  // Render sections as accordions
  return (
    <div className="w-full space-y-3">
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Global save/cancel buttons at top */}
      {tabState.isEditing && <GlobalButtons showUnsavedMessage={tabState.hasChanges} />}



      {/* Accordion sections */}
      {objectDefinition.detailView?.sections?.map((section, sectionIndex) => {
        if (!section.fields || section.fields.length === 0) return null

        const isOpen = tabState.sectionStates[`section_${sectionIndex}`] ?? true

        return (
          <Collapsible
            key={sectionIndex}
            open={isOpen}
            onOpenChange={() => toggleSection(sectionIndex)}
          >
            <div className="border border-border rounded-lg overflow-hidden shadow-sm">
              <CollapsibleTrigger className={cn("flex items-center justify-between w-full p-2.5 text-left bg-muted hover:bg-muted/80 transition-colors", getObjectBorderAccentClasses(objectDefinition.color))}>
                <h3 className="text-base font-semibold text-foreground">{translateSectionTitle(objectDefinition.name, section.title, section.title, section.titleKey)}</h3>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-3 pt-0 border-t border-border bg-card/50">
                  <div
                    className={cn(
                      "grid gap-4",
                      section.columns === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
                    )}
                  >
                    {section.fields.map((field) => {
                      // Handle both string and FieldDefinition types
                      const fieldKey = typeof field === 'string' ? field : field.key
                      const fieldDefinition = typeof field === 'string'
                        ? objectDefinition.fields?.find(f => f.key === fieldKey)
                        : field

                      if (!fieldDefinition) return null

                      // Check field visibility permission
                      if (!isFieldVisible(objectDefinition.name, fieldKey)) {
                        return null
                      }

                      // Formula fields: evaluate expression
                      let value = record[fieldKey]
                      if (fieldDefinition.type === 'formula' && fieldDefinition.formulaExpression) {
                        value = evaluateFormula(fieldDefinition.formulaExpression, record)
                      }
                      // Show field if: important, editing, has value, or is editable (to show all editable fields in read-only mode)
                      // Important fields should ALWAYS be visible, even when empty in read-only mode
                      // Editable fields should also be visible even when empty to maintain consistent UI
                      // Formula fields should always be visible
                      const shouldShow = fieldDefinition.isImportant ||
                        tabState.isEditing ||
                        fieldDefinition.type === 'formula' ||
                        (value !== null && value !== undefined && value !== '') ||
                        (fieldDefinition.editable !== false) // Show all editable fields

                      if (!shouldShow) return null

                      return (
                        <FieldDisplay
                          key={fieldDefinition.key}
                          field={fieldDefinition}
                          record={record}
                          isEditing={tabState.isEditing}
                          formData={tabState.formData}
                          onChange={handleFieldChange}
                          onStartEdit={handleStartEdit}
                          onRevertField={handleRevertField}
                          error={tabState.fieldErrors[fieldDefinition.key]}
                          objectName={objectDefinition.name}
                          canEditField={(fieldKey) => canEditField(objectDefinition.name, fieldKey)}
                          profileName={profile?.name}
                        />
                      )
                    })}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )
      })}

      {/* Global save/cancel buttons at bottom */}
      {tabState.isEditing && <GlobalButtons showUnsavedMessage={tabState.hasChanges} />}

      {/* Important Fields Confirmation Dialog */}
      <ImportantFieldsDialog
        open={showImportantFieldsDialog}
        onOpenChange={setShowImportantFieldsDialog}
        emptyImportantFields={pendingEmptyImportantFields}
        onContinue={handleImportantFieldsDialogContinue}
        onCancel={handleImportantFieldsDialogCancel}
      />
    </div>
  )
}

const RELATED_TABS_THRESHOLD = 3

// Component for the Related Object tab content
function RelatedObjectTabContent({
  parentRecord,
  relatedObjectDefinition,
  collapsible = false,
  showSearch
}: {
  parentRecord: GenericRecord
  relatedObjectDefinition: any
  collapsible?: boolean
  showSearch?: boolean
}) {
  return (
    <GenericRelatedListView
      parentRecord={parentRecord}
      relatedObjectDefinition={relatedObjectDefinition}
      showSearch={showSearch ?? relatedObjectDefinition.showSearch !== false}
      showAddButton={relatedObjectDefinition.showAddButton !== false}
      maxHeight={relatedObjectDefinition.maxHeight || '400px'}
      collapsible={collapsible}
    />
  )
}

// Stacked view: all related lists in one tab, collapsible sections without search
function RelatedObjectsStackedContent({
  parentRecord,
  relatedObjects
}: {
  parentRecord: GenericRecord
  relatedObjects: any[]
}) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {relatedObjects.map((relObj) => (
        <div key={relObj.name} className="w-full detail-view-related-tabs">
          <RelatedObjectTabContent
            parentRecord={parentRecord}
            relatedObjectDefinition={relObj}
            collapsible={true}
            showSearch={false}
          />
        </div>
      ))}
    </div>
  )
}

export function GenericObjectDetailViewMainSection({ objectDefinition, record, onRecordUpdate, isLoading = false }: GenericObjectDetailViewMainSectionProps) {
  const { t } = useTranslation('common')
  const [activeTab, setActiveTab] = useState('details');
  const { canRead } = usePermissions();

  // Get related objects from the object definition configuration, filtered by read permission
  const relatedObjects = (objectDefinition.relatedObjects || []).filter((relObj) =>
    canRead(relObj.objectDefinition)
  );

  const useGroupedRelatedTab = relatedObjects.length > RELATED_TABS_THRESHOLD
  const relatedTabValue = 'related-objects'

  if (!record) {
    return null;
  }

  return (
    <div className='w-full'>
      <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start mb-0">
          <TabsTrigger value="details">
            {t('details')}
          </TabsTrigger>
          {useGroupedRelatedTab ? (
            <TabsTrigger value={relatedTabValue}>
              {t('relatedObjects')}
            </TabsTrigger>
          ) : (
            relatedObjects.map((relObj) => (
              <TabsTrigger key={relObj.name} value={relObj.name}>
                {translateObjectLabel(relObj.objectDefinition, relObj.labelPlural, true)}
              </TabsTrigger>
            ))
          )}
        </TabsList>

        <TabsContent value="details" className="w-full mt-0">
          <DetailsTabContent
            objectDefinition={objectDefinition}
            record={record}
            onRecordUpdate={onRecordUpdate || (() => { })}
            isLoading={isLoading}
          />
        </TabsContent>

        {useGroupedRelatedTab ? (
          <TabsContent value={relatedTabValue} className="w-full mt-0 p-0">
            <RelatedObjectsStackedContent
              parentRecord={record}
              relatedObjects={relatedObjects}
            />
          </TabsContent>
        ) : (
          relatedObjects.map((relObj) => (
            <TabsContent key={relObj.name} value={relObj.name} className="w-full mt-0 p-0 detail-view-related-tabs">
              <RelatedObjectTabContent
                parentRecord={record}
                relatedObjectDefinition={relObj}
                collapsible={true}
                showSearch={false}
              />
            </TabsContent>
          ))
        )}
      </Tabs>
    </div>
  );
}
