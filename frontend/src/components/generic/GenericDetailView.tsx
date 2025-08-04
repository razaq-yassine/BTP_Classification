import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ObjectDefinition, GenericRecord } from '@/types/object-definition'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ArrowLeft } from 'lucide-react'
import { GenericObjectDetailViewHeader } from './GenericObjectDetailViewHeader'
import { GenericObjectDetailViewMainSection } from './GenericObjectDetailViewMainSection'
import { GenericObjectDetailViewSideSection } from './GenericObjectDetailViewSideSection'
import axios from 'axios'

interface GenericDetailViewProps {
  objectDefinition: ObjectDefinition
  recordId: string | number
  basePath?: string // Base path for navigation back to list
}

export function GenericDetailView({ objectDefinition, recordId, basePath }: GenericDetailViewProps) {
  const navigate = useNavigate()
  const [record, setRecord] = useState<GenericRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchRecord()
  }, [objectDefinition, recordId])

  const fetchRecord = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await axios.get(`${objectDefinition.apiEndpoint}/${recordId}/`)
      setRecord(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to fetch ${objectDefinition.label.toLowerCase()}`)
    } finally {
      setLoading(false)
    }
  }

  // const getDisplayName = (record: GenericRecord) => {
  //   return record.full_name || record.name || record.title || `${objectDefinition.label} #${record.id}`
  // }

  const handleBack = () => {
    if (basePath) {
      navigate({ to: basePath })
    } else {
      window.history.back()
    }
  }

  // const Icon = objectDefinition.icon

  if (loading) {
    return (
      <main className="flex-1 space-y-4">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading {objectDefinition.label.toLowerCase()}...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </main>
    )
  }

  if (!record) {
    return (
      <main className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Alert>
          <AlertDescription>{objectDefinition.label} not found.</AlertDescription>
        </Alert>
      </main>
    )
  }

  // const Icon = objectDefinition.icon
  // const displayName = getDisplayName(record)

  return (
    <main className="flex-1 space-y-6">
      {/* Header Section */}
      <GenericObjectDetailViewHeader objectDefinition={objectDefinition} record={record} />

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
        {/* Main Content - 3 columns on large screens */}
        <div className="lg:col-span-3">
          <GenericObjectDetailViewMainSection 
            objectDefinition={objectDefinition} 
            record={record} 
            onRecordUpdate={setRecord}
          />
        </div>
        
        {/* Side Section - 1 column on large screens */}
        <div className="lg:col-span-1">
          <GenericObjectDetailViewSideSection objectDefinition={objectDefinition} record={record} />
        </div>
      </div>
    </main>
  )
}
