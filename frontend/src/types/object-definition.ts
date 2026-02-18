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

export interface StatisticsCardDefinition {
  key: string
  label: string
  calculator: (records: GenericRecord[]) => string | number
  format?: 'currency' | 'percentage' | 'number' | 'text'
  icon?: React.ComponentType<any>
}

export interface ListViewDefinition {
  key: string
  label: string
  fields: string[] | FieldDefinition[]
  defaultSort?: string
  defaultSortOrder?: 'asc' | 'desc'
  pageSize?: number
  statistics?: StatisticsCardDefinition[]
  filters?: Record<string, any> // Filter criteria (e.g., { status: { $in: ['Open', 'Pending'] } })
  type?: 'standard' | 'recentlyViewed' // Special view types
  /** If set, only users with one of these profiles see this view */
  profiles?: string[]
}

export interface FieldDefinition {
  key: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'email' | 'phone' | 'text' | 'url' | 'select' | 'multiselect' | 'reference' | 'masterDetail' | 'autoNumber' | 'formula' | 'password' | 'geolocation' | 'address' | 'richText' | 'file'
  required?: boolean
  isRequired?: boolean // Alternative to required for compatibility
  isImportant?: boolean // Important fields show popup if empty on submit
  editable?: boolean
  /** Profile names that can edit this field even when editable: false (e.g. org-user for tenant field) */
  editableForProfiles?: string[]
  sortable?: boolean
  searchable?: boolean
  format?: string // For date formatting, etc.
  options?: { value: string; label: string; color?: string; colorHover?: string }[] // For select fields
  useInPath?: boolean // When true, this select field drives the Path component on detail view
  objectName?: string // For reference fields
  /** 'masterDetail' = required + cascade delete (use for junction/detail objects) */
  relationshipType?: 'reference' | 'masterDetail'
  /** When true, parent delete cascades to children. Implied by relationshipType: 'masterDetail' */
  deleteOnCascade?: boolean
  additionalFields?: string[] // Additional fields to display in lookup
  render?: (value: any, record: GenericRecord) => React.ReactNode // Custom render function
  renderType?: string // Preserved string from metadata (e.g. 'currency', 'statusBadge') for list formatting
  autoNumberPattern?: string // e.g. MSG-{00000} for autoNumber type
  autoNumberStart?: number // Starting number for autoNumber
  /** Pre-fill value when creating new records */
  defaultValue?: string | number | boolean | string[]
  /** For formula fields: expression to evaluate (e.g. "quantity * price", "daysSince(orderDate)") */
  formulaExpression?: string
  /** For file fields: accepted file types (e.g. "image/*" or ".jpg,.jpeg,.png,.gif,.webp,.svg") */
  accept?: string
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
  
  // Sidebar configuration
  sidebar?: {
    showInSidebar?: boolean
    group?: string // Nav group title (e.g. "Data", "General")
    parent?: string // Parent item title - puts this under a collapsible parent
  }
  
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
    // Legacy single view support (for backward compatibility)
    fields?: string[] | FieldDefinition[] // Field keys or field definitions to show in list view
    defaultSort?: string // Default sort field
    defaultSortOrder?: 'asc' | 'desc'
    searchFields?: string[] // Fields to search in
    pageSize?: number
    statistics?: StatisticsCardDefinition[] // Statistics cards to display above the table
    
    // Multiple views support
    defaultView?: string // Key of the default view (first view if not specified)
    views?: ListViewDefinition[] // Array of list view definitions
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
  
  // Path (Salesforce-style stage progress) - shown between header and content on detail view
  path?: PathDefinition
  
  // UI configuration
  icon?: React.ComponentType<{ className?: string }> // Icon component
  color?: string
}

/** Path step - derived from field options when useInPath is true */
export interface PathStepDefinition {
  value: string
  label: string
  color?: string
  colorHover?: string
}

/** Path config - derived from a field with useInPath: true */
export interface PathDefinition {
  enabled: boolean
  field: string
  steps: PathStepDefinition[]
}


