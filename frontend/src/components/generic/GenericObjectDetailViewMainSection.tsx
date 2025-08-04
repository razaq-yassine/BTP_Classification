import { useState, useEffect } from 'react'
import { ObjectDefinition, GenericRecord } from '@/types/object-definition'
import { GenericRelatedListView } from './GenericRelatedListView'
import { GenericDetailInputFormatter } from './GenericDetailInputFormatter'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Construction, Save, Edit, X } from 'lucide-react'
import axios from 'axios'

interface GenericObjectDetailViewMainSectionProps {
  objectDefinition: ObjectDefinition
  record: GenericRecord | null
  onRecordUpdate?: (updatedRecord: GenericRecord) => void
}

// Component for the Details tab content
function DetailsTabContent({ 
  objectDefinition, 
  record, 
  onRecordUpdate 
}: { 
  objectDefinition: ObjectDefinition
  record: GenericRecord | null
  onRecordUpdate: (updatedRecord: GenericRecord) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Initialize form data when record changes or editing starts
  useEffect(() => {
    if (record && isEditing) {
      setFormData({ ...record })
    }
  }, [record, isEditing])

  if (!record) return null

  const handleEdit = () => {
    setFormData({ ...record })
    setIsEditing(true)
    setError('')
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({})
    setError('')
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      
      const response = await axios.put(`${objectDefinition.apiEndpoint}/${record.id}/`, formData)
      onRecordUpdate(response.data)
      setIsEditing(false)
      setFormData({})
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleFieldChange = (fieldKey: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }))
  }

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Edit {objectDefinition.label}</h3>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCancel}
              disabled={saving}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {objectDefinition.detailView?.fields?.map((fieldKey) => {
            const fieldDefinition = objectDefinition.fields.find(f => f.key === fieldKey)
            if (!fieldDefinition || !fieldDefinition.editable) return null

            return (
              <GenericDetailInputFormatter
                key={fieldKey}
                fieldDefinition={fieldDefinition}
                value={formData[fieldKey]}
                onChange={(value) => handleFieldChange(fieldKey, value)}
              />
            )
          })}
        </div>
      </div>
    )
  }

  // Read-only view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{objectDefinition.label} Details</h3>
        <Button size="sm" onClick={handleEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {objectDefinition.detailView?.fields?.map((fieldKey) => {
          const fieldDefinition = objectDefinition.fields.find(f => f.key === fieldKey)
          if (!fieldDefinition) return null

          const value = record[fieldKey]
          const displayValue = fieldDefinition.render 
            ? fieldDefinition.render(value, record) 
            : (value !== null && value !== undefined ? String(value) : '-')

          return (
            <div key={fieldKey} className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                {fieldDefinition.label}
              </label>
              <div className="text-sm text-gray-900 min-h-[1.5rem]">
                {typeof displayValue === 'string' ? displayValue : displayValue}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Component for the Related Object tab content
function RelatedObjectTabContent({ 
  parentObjectDefinition, 
  parentRecord, 
  relatedObjectDefinition 
}: { 
  parentObjectDefinition: ObjectDefinition
  parentRecord: GenericRecord
  relatedObjectDefinition: any
}) {
  // If we have a full object definition, use the GenericRelatedListView
  if (relatedObjectDefinition.objectDefinition) {
    return (
      <GenericRelatedListView
        parentObjectDefinition={parentObjectDefinition}
        parentRecord={parentRecord}
        relatedObjectDefinition={relatedObjectDefinition}
        relatedObjectConfig={relatedObjectDefinition.objectDefinition}
        compact={relatedObjectDefinition.compact !== false}
        showSearch={relatedObjectDefinition.showSearch || false}
        showAddButton={relatedObjectDefinition.showAddButton || false}
        maxHeight={relatedObjectDefinition.maxHeight || '400px'}
      />
    )
  }
  
  // Fallback to under development message
  return (
    <div className="flex items-center justify-center py-8 text-muted-foreground">
      <div className="text-center">
        <Construction className="h-12 w-12 mx-auto mb-4 text-orange-500" />
        <p className="text-lg font-medium">{relatedObjectDefinition.label} - Under Development</p>
        <p className="text-sm">This tab will display related {relatedObjectDefinition.label.toLowerCase()} information</p>
      </div>
    </div>
  );
}

export function GenericObjectDetailViewMainSection({ objectDefinition, record, onRecordUpdate }: GenericObjectDetailViewMainSectionProps) {
  const [activeTab, setActiveTab] = useState('details');
  
  // This would come from the config in a real implementation
  const relatedObjects = objectDefinition.relatedObjects || [
    { key: 'activities', label: 'Activities' },
    { key: 'notes', label: 'Notes' }
  ];
  
  if (!record) {
    return null;
  }

  return (
    <Card className='py-1'>
      <CardContent className="p-0 mt-0">
        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="details">
              Details
            </TabsTrigger>
            {relatedObjects.map((relObj) => (
              <TabsTrigger key={relObj.key} value={relObj.key}>
                {relObj.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <TabsContent value="details" className="p-6 mt-0">
            <DetailsTabContent 
              objectDefinition={objectDefinition}
              record={record} 
              onRecordUpdate={onRecordUpdate || (() => {})} 
            />
          </TabsContent>
          
          {relatedObjects.map((relObj) => (
            <TabsContent key={relObj.key} value={relObj.key} className="p-6 mt-0">
              <RelatedObjectTabContent 
                parentObjectDefinition={objectDefinition}
                parentRecord={record}
                relatedObjectDefinition={relObj} 
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
