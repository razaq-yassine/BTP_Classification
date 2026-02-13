// Object definition types for generic components
import React from 'react'

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
  key: string
  label: string
  type?: string
  apiEndpoint?: string // Custom API endpoint, supports {parentId} placeholder
  displayField?: string
  objectDefinition?: ObjectDefinition // Full object definition for the related object
  showFields?: string[] // Override which fields to show in the table
  compact?: boolean // Whether to use compact table styling
  showSearch?: boolean // Whether to show search functionality
  showAddButton?: boolean // Whether to show add new button
  maxHeight?: string // Maximum height for the table container
}

export interface DetailViewSection {
  title: string
  columns?: number // Number of columns for this section
  fields: FieldDefinition[] // Field definitions with labels and properties
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
  
  // Related objects configuration
  relatedObjects?: RelatedObjectDefinition[] // Related objects to show in tabs
  
  // Header configuration
  header?: {
    imageField?: string // Field key for record image (null = use icon)
    primaryActions?: ActionDefinition[] // Primary action buttons
    secondaryActions?: ActionDefinition[] // Secondary actions in dropdown
    calculatedData?: CalculatedDataDefinition[] // Calculated data to show
  }
  
  // View configurations
  listView: {
    fields: FieldDefinition[] // Field definitions with labels and properties
    defaultSort?: string // Default sort field
    defaultSortOrder?: 'asc' | 'desc'
    pageSize?: number
  }
  
  detailView: {
    layout?: 'single-column' | 'two-column' | 'tabs'
    sections?: DetailViewSection[]
  }
  
  // Permissions
  permissions?: {
    create?: boolean
    read?: boolean
    update?: boolean
    delete?: boolean
  }
  
  // UI configuration
  icon?: React.ComponentType<any>
  color?: string
}

// Generic record type
export interface GenericRecord {
  id: string | number
  [key: string]: any
}
