// Object definition types for generic components
import React from 'react'

// Generic record type
export interface GenericRecord {
  id: string | number
  [key: string]: any
}

export interface ActionDefinition {
  key: string
  label: string
  icon?: React.ComponentType<any>
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  onClick: (record: GenericRecord) => void
}

export interface CalculatedDataDefinition {
  key: string
  label: string
  calculator: (record: GenericRecord) => string | number
  format?: 'currency' | 'percentage' | 'number' | 'text'
  icon?: React.ComponentType<any>
}

export interface FieldDefinition {
  key: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'email' | 'phone' | 'text' | 'select' | 'multiselect' | 'lookup' | 'reference'
  required?: boolean
  isRequired?: boolean // Alternative to required for compatibility
  isImportant?: boolean // Important fields show popup if empty on submit
  editable?: boolean
  sortable?: boolean
  searchable?: boolean
  format?: string // For date formatting, etc.
  options?: { value: string; label: string }[] // For select fields
  objectName?: string // For lookup/reference fields
  additionalFields?: string[] // Additional fields to display in lookup
  render?: (value: any, record: GenericRecord) => React.ReactNode // Custom render function
}

export interface RelatedObjectDefinition {
  name: string
  label: string
  labelPlural: string
  objectDefinition: string // Reference to object definition name
  relationshipType: 'one-to-many' | 'many-to-one' | 'many-to-many'
  foreignKey: string // Field in the related object that references this object
  apiEndpoint: string // Endpoint to fetch related data
  fields: FieldDefinition[] // Fields to display in the related object table
  defaultSort?: string
  defaultSortOrder?: 'asc' | 'desc'
  pageSize?: number
  permissions?: {
    create?: boolean
    read?: boolean
    update?: boolean
    delete?: boolean
  }
  compact?: boolean // Whether to use compact table styling
  showSearch?: boolean // Whether to show search functionality
  showAddButton?: boolean // Whether to show add new button
  maxHeight?: string // Maximum height for the table container
}

export interface ObjectDefinition {
  // Basic object information
  name: string // Internal name (e.g., 'customer')
  label: string // Singular display name (e.g., 'Customer')
  labelPlural: string // Plural display name (e.g., 'Customers')
  description?: string
  
  // API configuration
  apiEndpoint: string // Base API endpoint (e.g., '/customers')
  
  // Navigation configuration
  basePath?: string // Base path for list view (e.g., '/customers')
  detailPath?: string // Path template for detail view (e.g., '/customers/$customerId')
  
  // Field definitions (optional for new format)
  fields?: FieldDefinition[]
  
  // Related objects configuration
  
  // Header configuration
  header?: {
    imageField?: string // Field key for record image (null = use icon)
    primaryActions?: ActionDefinition[] // Primary action buttons
    secondaryActions?: ActionDefinition[] // Secondary actions in dropdown
    calculatedData?: CalculatedDataDefinition[] // Calculated data to show
  }
  
  // View configurations
  listView: {
    fields: string[] | FieldDefinition[] // Field keys or field definitions to show in list view
    defaultSort?: string // Default sort field
    defaultSortOrder?: 'asc' | 'desc'
    searchFields?: string[] // Fields to search in
    pageSize?: number
  }
  
  detailView: {
    fields?: string[] // Field keys to show in detail view
    layout?: 'single-column' | 'two-column' | 'tabs'
    sections?: {
      title: string
      fields: string[] | FieldDefinition[]
      columns?: number // Number of columns for this section
      defaultOpen?: boolean // Whether section is open by default in accordion
    }[]
  }
  
  // Permissions
  permissions?: {
    create?: boolean
    read?: boolean
    update?: boolean
    delete?: boolean
  }
  
  // Related objects configuration
  relatedObjects?: RelatedObjectDefinition[]
  
  // UI configuration
  icon?: React.ComponentType<{ className?: string }> // Icon component
  color?: string
}


