import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getObjectNames } from '@/metadata/loader'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { GenericDetailInputFormatter } from '@/components/generic/GenericDetailInputFormatter'
import { FieldDefinition } from '@/types/object-definition'
import { formatDetailValue } from '@/utils/formatDetailValue'
import { AlertTriangle } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/dev-components/detail-view-formatter')({
  component: DetailViewFormatterPage,
})

function DetailViewFormatterPage() {
  // Sample data for each field type
  const [formData, setFormData] = useState({
    text: 'Sample text value',
    email: 'test@example.com',
    phone: '+212 612345678',
    number: 42,
    numberPercent: 0.85,
    date: '2024-01-15',
    datetime: '2024-01-15T14:30:00',
    boolean: true,
    select: 'option2',
    multiselect: ['option1', 'option3'],
    url: 'https://example.com',
    reference: { id: 2, name: 'Sample Record', fullName: 'Sample Record' },
    importantField: '',
    anotherImportantField: 'This has a value',
  })
  
  const [showImportantFieldsDialog, setShowImportantFieldsDialog] = useState(false)
  const [emptyImportantFields, setEmptyImportantFields] = useState<Array<{label: string, isEmpty: boolean, value: any}>>([])
  const [lookupObjectName, setLookupObjectName] = useState<string>('')

  useEffect(() => {
    getObjectNames().then((names) => setLookupObjectName(names[0] || ''))
  }, [])

  // Field definitions for each type - lookupObjectName from metadata
  const fieldDefinitions: FieldDefinition[] = [
    {
      key: 'text',
      label: 'Text Field',
      type: 'text',
      isRequired: true,
    },
    {
      key: 'email',
      label: 'Email Field (Important + Validation)',
      type: 'email',
      isRequired: true,
      isImportant: true,
    },
    {
      key: 'phone',
      label: 'Phone Field (Country Selector + Validation)',
      type: 'phone',
      required: false,
    },
    {
      key: 'number',
      label: 'Number Field',
      type: 'number',
      isRequired: true,
    },
    {
      key: 'numberPercent',
      label: 'Number (Percent)',
      type: 'number',
      required: false,
      renderType: 'percent',
    },
    {
      key: 'date',
      label: 'Date Field (Can be cleared)',
      type: 'date',
      required: false,
    },
    {
      key: 'datetime',
      label: 'DateTime Field (Can be cleared)',
      type: 'datetime',
      required: false,
    },
    {
      key: 'boolean',
      label: 'Boolean Field',
      type: 'boolean',
      required: false,
    },
    {
      key: 'url',
      label: 'URL Field',
      type: 'url',
      required: false,
    },
    {
      key: 'select',
      label: 'Select Field (Searchable + Empty Option)',
      type: 'select',
      isRequired: true,
      options: [
        { value: 'option1', label: 'First Option' },
        { value: 'option2', label: 'Second Option' },
        { value: 'option3', label: 'Third Option' },
        { value: 'option4', label: 'Fourth Option' },
        { value: 'option5', label: 'Fifth Option' },
        { value: 'option6', label: 'Sixth Option' },
      ],
    },
    {
      key: 'importantField',
      label: 'Important Field (Empty - Shows in Popup)',
      type: 'text',
      isImportant: true,
    },
    {
      key: 'multiselect',
      label: 'Multi-Select Field (Multiple Options)',
      type: 'multiselect',
      required: false,
      options: [
        { value: 'option1', label: 'First Option' },
        { value: 'option2', label: 'Second Option' },
        { value: 'option3', label: 'Third Option' },
        { value: 'option4', label: 'Fourth Option' },
        { value: 'option5', label: 'Fifth Option' },
        { value: 'option6', label: 'Sixth Option' },
      ],
    },
    ...(lookupObjectName
      ? [
          {
            key: 'reference',
            label: 'Reference Field (Link to Record)',
            type: 'reference' as const,
            required: false,
            objectName: lookupObjectName,
            additionalFields: ['email', 'company'],
          },
        ]
      : []),
    {
      key: 'anotherImportantField',
      label: 'Another Important Field (Has Value - Shows in Popup)',
      type: 'text',
      isImportant: true,
    },
  ]

  const handleFieldChange = (fieldKey: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }))
  }
  
  const handleSubmit = () => {
    // Get all important fields (both empty and filled)
    const allImportantFields = fieldDefinitions
      .filter(field => field.isImportant)
      .map(field => {
        const value = formData[field.key as keyof typeof formData]
        const isEmpty = !value || (typeof value === 'string' && value.trim() === '')
        return {
          label: field.label,
          isEmpty,
          value: isEmpty ? '(empty)' : value
        }
      })
    
    const emptyImportantFields = allImportantFields.filter(field => field.isEmpty)
    
    if (emptyImportantFields.length > 0) {
      setEmptyImportantFields(allImportantFields)
      setShowImportantFieldsDialog(true)
    } else {
      // Proceed with form submission
      alert('Form submitted successfully!')
    }
  }
  
  const handleContinueAnyway = () => {
    setShowImportantFieldsDialog(false)
    alert('Form submitted with empty important fields!')
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Detail View Formatter Page</h1>
        <p className="text-muted-foreground">
          This page demonstrates the Generic Detail Input Formatter component for all field types.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generic Detail Input Formatter Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {fieldDefinitions.map((fieldDef) => (
            <div key={fieldDef.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">({fieldDef.type})</span>
                {(fieldDef.required || fieldDef.isRequired) && (
                  <span className="text-xs text-red-500">*</span>
                )}
                {fieldDef.isImportant && (
                  <span className="text-xs text-orange-500" title="Important field">!</span>
                )}
              </div>
              
              <GenericDetailInputFormatter
                fieldDefinition={fieldDef}
                value={formData[fieldDef.key as keyof typeof formData]}
                onChange={(value) => handleFieldChange(fieldDef.key, value)}
              />
              
              <div className="text-xs text-muted-foreground">
                Current value: {JSON.stringify(formData[fieldDef.key as keyof typeof formData])}
              </div>
            </div>
          ))}
          
          {/* Submit Button */}
          <div className="pt-4 border-t">
            <Button onClick={handleSubmit} className="w-full">
              Submit Form (Test Important Fields Popup)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Read-only Preview (formatDetailValue)</CardTitle>
          <p className="text-sm text-muted-foreground font-normal">
            How each field type displays in read-only detail view. Add new field types here when implementing.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {fieldDefinitions.map((fieldDef) => (
            <div key={fieldDef.key} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{fieldDef.label}</span>
                <span className="text-xs text-muted-foreground">({fieldDef.type})</span>
              </div>
              <div className="text-sm text-foreground rounded-md border bg-muted/30 px-3 py-2">
                {formatDetailValue(fieldDef, formData[fieldDef.key as keyof typeof formData])}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Form Data (JSON)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
            {JSON.stringify(formData, null, 2)}
          </pre>
        </CardContent>
      </Card>
      

      
      {/* Important Fields Dialog */}
      <Dialog open={showImportantFieldsDialog} onOpenChange={setShowImportantFieldsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Important Fields Empty
            </DialogTitle>
            <DialogDescription>
              Here are all important fields. Empty ones are highlighted. Do you want to continue anyway?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-2">
              {emptyImportantFields.map((field, index) => (
                <div key={index} className={`p-2 rounded border ${
                  field.isEmpty ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{field.label}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      field.isEmpty ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {field.isEmpty ? 'Empty' : 'Has Value'}
                    </span>
                  </div>
                  {!field.isEmpty && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Value: {JSON.stringify(field.value)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowImportantFieldsDialog(false)}
            >
              Go Back
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleContinueAnyway}
            >
              Continue Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
