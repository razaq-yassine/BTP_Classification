import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ObjectDefinition, GenericRecord } from '@/types/object-definition'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GenericDataTable } from './GenericDataTable'
import { Search, Plus, Trash2 } from 'lucide-react'
import axios from 'axios'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'

interface GenericListViewProps {
  objectDefinition: ObjectDefinition
  basePath?: string
}

export function GenericListView({ objectDefinition, basePath }: GenericListViewProps) {
  const navigate = useNavigate()
  const [records, setRecords] = useState<GenericRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRecords, setSelectedRecords] = useState<Set<string | number>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchRecords()
  }, [objectDefinition])

  const fetchRecords = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await axios.get(objectDefinition.apiEndpoint + '/')
      setRecords(response.data.customers || response.data.results || response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to fetch ${objectDefinition.labelPlural.toLowerCase()}`)
    } finally {
      setLoading(false)
    }
  }

  const handleViewRecord = (record: GenericRecord) => {
    if (objectDefinition.detailPath) {
      const detailPath = objectDefinition.detailPath.replace('$customerId', record.id.toString())
      navigate({ to: detailPath })
    } else if (basePath) {
      navigate({ to: `${basePath}/${record.id}` })
    }
  }

  const handleSelectRecord = (recordId: string | number, selected: boolean) => {
    const newSelected = new Set(selectedRecords)
    if (selected) {
      newSelected.add(recordId)
    } else {
      newSelected.delete(recordId)
    }
    setSelectedRecords(newSelected)
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedRecords(new Set(filteredRecords.map(record => record.id)))
    } else {
      setSelectedRecords(new Set())
    }
  }

  const handleMassDelete = async () => {
    if (selectedRecords.size === 0) return
    
    try {
      setIsDeleting(true)
      const deletePromises = Array.from(selectedRecords).map(id => 
        axios.delete(`${objectDefinition.apiEndpoint}/${id}/`)
      )
      await Promise.all(deletePromises)
      
      // Refresh the records list
      await fetchRecords()
      setSelectedRecords(new Set())
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete selected records')
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter records based on search term
  const filteredRecords = records.filter(record => {
    if (!searchTerm) return true
    
    const searchFields = objectDefinition.listView.searchFields || objectDefinition.listView.fields
    return searchFields.some(fieldKey => {
      const value = record[fieldKey]
      return value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    })
  })

  return (
    <>
      <Header fixed>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${objectDefinition.labelPlural.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-2 flex flex-wrap items-center justify-between space-y-2 gap-x-4'>
          <div className="flex items-center gap-4">
            <div>
              <h2 className='text-2xl font-bold tracking-tight'>{objectDefinition.labelPlural}</h2>
              <p className='text-muted-foreground'>
                {filteredRecords.length > 0 
                  ? `${filteredRecords.length} ${filteredRecords.length === 1 ? objectDefinition.label.toLowerCase() : objectDefinition.labelPlural.toLowerCase()}`
                  : `No ${objectDefinition.labelPlural.toLowerCase()} found`
                }
              </p>
            </div>
            {selectedRecords.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleMassDelete}
                disabled={isDeleting}
                className="ml-4"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {selectedRecords.size} {selectedRecords.size === 1 ? 'item' : 'items'}
              </Button>
            )}
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add {objectDefinition.label}
          </Button>
        </div>
        
        <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
          <GenericDataTable
            objectDefinition={objectDefinition}
            records={filteredRecords}
            loading={loading}
            error={error}
            onRecordClick={handleViewRecord}
            selectedRecords={selectedRecords}
            onSelectRecord={handleSelectRecord}
            onSelectAll={handleSelectAll}
            compact={false}
            sortable={true}
          />
        </div>
      </Main>
    </>
  )
}
