import { useState, useEffect } from 'react'
import { ObjectDefinition, GenericRecord, FieldDefinition } from '@/types/object-definition'
import { GenericRelatedListView } from './GenericRelatedListView'
import { GenericDetailInputFormatter } from './GenericDetailInputFormatter'
import { GenericDetailsTabSkeleton } from './GenericDetailsTabSkeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ImportantFieldsDialog } from '@/components/ui/important-fields-dialog'
import { Edit2, ChevronDown, ChevronRight, Save, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/services/api'
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
  error
}: {
  field: FieldDefinition
  record: GenericRecord
  isEditing: boolean
  formData: Record<string, any>
  onChange: (fieldKey: string, value: any) => void
  onStartEdit?: () => void
  onRevertField?: (fieldKey: string) => void
  error?: string
}) {
  const value = record[field.key]
  const formValue = formData[field.key] !== undefined ? formData[field.key] : value

  // Format display value for read-only mode
  const formatValue = (val: any) => {
    if (val === null || val === undefined || val === '') {
      return '(Empty)' // Important fields should also show as empty, not required
    }
    
    switch (field.type) {
      case 'boolean':
        return val ? 'Yes' : 'No'
      case 'date':
        if (val) {
          const date = new Date(val)
          return date.toLocaleDateString()
        }
        return '(Empty)'
      case 'email':
      case 'phone':
      default:
        return val
    }
  }

  if (isEditing) {
    const hasChanged = formValue !== value
    
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-gray-700">{field.label}</span>
          {field.required && <span className="text-red-500 text-sm">*</span>}
          {field.isImportant && <span className="text-orange-500 text-sm" title="Important field">!</span>}
          {hasChanged && onRevertField && (
            <button
              onClick={() => onRevertField(field.key)}
              className="ml-auto p-1 text-gray-400 hover:text-orange-600 transition-colors"
              title="Revert this field to original value"
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
          className={error ? 'border-red-500' : ''}
        />
        {error && (
          <p className="text-sm text-red-600 mt-1">{error}</p>
        )}
      </div>
    )
  }

  // Read-only mode
  const isEmpty = value === null || value === undefined || value === ''
  const isImportant = field.isImportant && isEmpty
  const canEdit = field.editable !== false

  return (
    <div 
      className={cn(
        "space-y-1 group",
        canEdit && "cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
      )}
      onClick={canEdit && onStartEdit ? onStartEdit : undefined}
    >
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-gray-700">{field.label}</span>
        {field.required && <span className="text-red-500 text-sm">*</span>}
        {field.isImportant && <span className="text-orange-500 text-sm" title="Important field">!</span>}
        {canEdit && (
          <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
        )}
      </div>
      <div className={cn(
        "text-sm",
        isEmpty ? "text-gray-400 italic" : "text-gray-900",
        isImportant && "text-orange-600 font-medium"
      )}>
        {formatValue(value)}
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
    return <GenericDetailsTabSkeleton />
  }

  if (!record) return null

  // Validate individual field
  const validateField = (fieldDefinition: FieldDefinition, value: any): FieldValidation => {
    // Check if field is required and empty
    if (fieldDefinition.required) {
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

  // Global edit mode handlers
  const handleStartEdit = () => {
    // Capture the current state for undo functionality BEFORE any changes
    setPreviousRecordState({ ...record })
    
    // Initialize form data with current record values
    const formData: Record<string, any> = {}
    objectDefinition.detailView?.sections?.forEach(section => {
      section.fields.forEach(field => {
        const fieldKey = typeof field === 'string' ? field : field.key
        formData[fieldKey] = record[fieldKey]
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
      
      // Remove any null/undefined values for required fields to prevent backend issues
      objectDefinition.detailView?.sections?.forEach(section => {
        section.fields.forEach(field => {
          const fieldKey = typeof field === 'string' ? field : field.key
          const fieldDefinition = typeof field === 'string' 
            ? objectDefinition.fields?.find(f => f.key === fieldKey)
            : field
          
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
      console.log(`🔄 Updating ${objectDefinition.label} at endpoint: ${endpoint}`)
      console.log(`📝 Update data:`, updateData)
      
      const response = await api.put(endpoint, updateData)
      console.log(`✅ Update successful:`, response.data)
      
      // Call the onRecordUpdate callback to refresh the data
      onRecordUpdate(response.data)
      
      // Show success toast with undo button
      toast.success('Changes saved successfully!', {
        description: `${objectDefinition.label || objectDefinition.name} has been updated.`,
        duration: 5000,
        action: {
          label: 'Undo',
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
      console.error(`❌ Error updating ${objectDefinition.label}:`, {
        message: err.response?.data?.message || err.message,
        status: err.response?.status,
        data: err.response?.data,
        endpoint: err.config?.url
      })
      
      // Handle authentication errors specifically
      if (err.response?.status === 401) {
        setError('Authentication failed. Please try logging in again.')
      } else {
        setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to save changes')
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
            newErrors[fieldKey] = validation.errorMessage || 'Invalid value'
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
            const value = tabState.formData[fieldKey]
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
      
      // If no validation errors and no important field confirmation needed, proceed with save
      await performSave()
    } catch (err: any) {
      console.error(`❌ Error updating ${objectDefinition.label}:`, {
        message: err.response?.data?.message || err.message,
        status: err.response?.status,
        data: err.response?.data,
        endpoint: err.config?.url
      })
      
      // Handle authentication errors specifically
      if (err.response?.status === 401) {
        setError('Authentication failed. Please try logging in again.')
      } else {
        setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to save changes')
      }
    } finally {
      setSaving(false)
    }
  }

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
      toast.error('No changes to undo', {
        description: 'Previous state not found.',
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
      console.log(`↩️ Undoing changes for ${objectDefinition.label} at endpoint: ${endpoint}`)
      console.log(`📝 Reverting to previous state:`, previousRecordState)
      
      const response = await api.put(endpoint, previousRecordState)
      console.log(`✅ Undo successful:`, response.data)
      
      // Call the onRecordUpdate callback to refresh the data
      onRecordUpdate(response.data)
      
      // Show undo success toast
      toast.success('Changes undone successfully!', {
        description: `${objectDefinition.label || objectDefinition.name} has been reverted.`,
        duration: 3000,
      })
      
      // Clear previous state after successful undo
      setPreviousRecordState(null)
    } catch (err: any) {
      console.error(`❌ Error undoing changes:`, err)
      toast.error('Failed to undo changes', {
        description: 'Please try refreshing the page.',
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
  const GlobalButtons = ({ showUnsavedMessage = true }: { showUnsavedMessage?: boolean }) => (
    <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      {showUnsavedMessage && (
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900">You have unsaved changes</p>
          <p className="text-xs text-blue-700">Save your changes or cancel to discard them</p>
        </div>
      )}
      {!showUnsavedMessage && (
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900">Edit mode</p>
          <p className="text-xs text-blue-700">Make changes to the fields below</p>
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
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSaveAll}
          disabled={saving || !tabState.hasChanges || hasValidationErrors()}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save All'}
        </Button>
      </div>
    </div>
  )

  // Render sections as accordions
  return (
    <div className="w-full space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
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
            <div className="border border-gray-200 rounded-lg">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-50 transition-colors">
                <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0 border-t border-gray-100">
                  <div 
                    className={cn(
                      "grid gap-6",
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

                      const value = record[fieldKey]
                      // Show field if: important, editing, has value, or is editable (to show all editable fields in read-only mode)
                      // Important fields should ALWAYS be visible, even when empty in read-only mode
                      // Editable fields should also be visible even when empty to maintain consistent UI
                      const shouldShow = fieldDefinition.isImportant || 
                                       tabState.isEditing ||
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

// Component for the Related Object tab content
function RelatedObjectTabContent({ 
  parentRecord, 
  relatedObjectDefinition 
}: { 
  parentRecord: GenericRecord
  relatedObjectDefinition: any
}) {
  // Use the GenericRelatedListView with the new relationship structure
  return (
    <GenericRelatedListView
      parentRecord={parentRecord}
      relatedObjectDefinition={relatedObjectDefinition}
      showSearch={relatedObjectDefinition.showSearch !== false}
      showAddButton={relatedObjectDefinition.showAddButton !== false}
      maxHeight={relatedObjectDefinition.maxHeight || '400px'}
    />
  )
}

export function GenericObjectDetailViewMainSection({ objectDefinition, record, onRecordUpdate, isLoading = false }: GenericObjectDetailViewMainSectionProps) {
  const [activeTab, setActiveTab] = useState('details');
  
  // Get related objects from the object definition configuration
  const relatedObjects = objectDefinition.relatedObjects || [];
  
  if (!record) {
    return null;
  }

  return (
    <div className='w-full'>
      <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start mb-0">
            <TabsTrigger value="details">
              Details
            </TabsTrigger>
            {relatedObjects.map((relObj) => (
              <TabsTrigger key={relObj.name} value={relObj.name}>
                {relObj.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <TabsContent value="details" className="w-full mt-0">
            <DetailsTabContent 
              objectDefinition={objectDefinition}
              record={record} 
              onRecordUpdate={onRecordUpdate || (() => {})} 
              isLoading={isLoading}
            />
          </TabsContent>
          
          {relatedObjects.map((relObj) => (
            <TabsContent key={relObj.name} value={relObj.name} className="w-full mt-0">
              <RelatedObjectTabContent 
                parentRecord={record}
                relatedObjectDefinition={relObj} 
              />
            </TabsContent>
          ))}
        </Tabs>
    </div>
  );
}
