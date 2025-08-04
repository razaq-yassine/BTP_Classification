import React from 'react'
import { ObjectDefinition } from '@/types/object-definition'
import { IconUserCog } from '@tabler/icons-react'
import { Edit, Trash2, Mail, Phone, Building, Calendar } from 'lucide-react'

export const customerObjectDefinition: ObjectDefinition = {
  // Basic object information
  name: 'customer',
  label: 'Customer',
  labelPlural: 'Customers',
  description: 'Manage customer information and records',
  
  // API configuration
  apiEndpoint: '/customers',
  
  // Navigation configuration
  basePath: '/customers',
  detailPath: '/customers/$customerId',
  
  // Field definitions
  fields: [
    {
      key: 'id',
      label: 'ID',
      type: 'number',
      sortable: true,
    },
    {
      key: 'first_name',
      label: 'First Name',
      type: 'string',
      required: true,
      isImportant: true, // Important field - will show popup if empty on submit
      editable: true,
      sortable: true,
      searchable: true,
    },
    {
      key: 'last_name',
      label: 'Last Name',
      type: 'string',
      required: true,
      isImportant: true, // Important field - will show popup if empty on submit
      editable: true,
      sortable: true,
      searchable: true,
    },
    {
      key: 'full_name',
      label: 'Full Name',
      type: 'string',
      sortable: true,
      searchable: true,
    },
    {
      key: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      isImportant: true, // Important field - will show popup if empty on submit
      editable: true,
      sortable: true,
      searchable: true,
    },
    {
      key: 'phone',
      label: 'Phone',
      type: 'phone',
      editable: true,
      searchable: true,
    },
    {
      key: 'company',
      label: 'Company',
      type: 'string',
      isImportant: true, // Important field - will show popup if empty on submit
      editable: true,
      sortable: true,
      searchable: true,
    },
    {
      key: 'address',
      label: 'Address',
      type: 'text',
      editable: true,
    },
    {
      key: 'is_active',
      label: 'Status',
      type: 'boolean',
      editable: true,
      sortable: true,
      render: (value: boolean) => {
        return React.createElement('span', {
          className: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            value 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`
        }, value ? 'Active' : 'Inactive')
      },
    },
    {
      key: 'created_at',
      label: 'Created',
      type: 'date',
      sortable: true,
      format: 'MMM dd, yyyy',
    },
    {
      key: 'updated_at',
      label: 'Updated',
      type: 'date',
      sortable: true,
      format: 'MMM dd, yyyy',
    },
  ],
  
  // Header configuration
  header: {
    imageField: undefined, // No image field, will use icon
    primaryActions: [
      {
        key: 'edit',
        label: 'Edit',
        icon: Edit,
        variant: 'outline' as const,
        onClick: (record) => {
          console.log('Edit customer:', record)
          // TODO: Navigate to edit page
        }
      },
      {
        key: 'contact',
        label: 'Contact',
        icon: Mail,
        variant: 'default' as const,
        onClick: (record) => {
          window.location.href = `mailto:${record.email}`
        }
      }
    ],
    secondaryActions: [
      {
        key: 'call',
        label: 'Call',
        icon: Phone,
        variant: 'ghost' as const,
        onClick: (record) => {
          window.location.href = `tel:${record.phone}`
        }
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash2,
        variant: 'destructive' as const,
        onClick: (record) => {
          console.log('Delete customer:', record)
          // TODO: Show confirmation dialog
        }
      }
    ],
    calculatedData: [
      {
        key: 'account_age',
        label: 'Account Age',
        icon: Calendar,
        calculator: (record) => {
          const created = new Date(record.created_at)
          const now = new Date()
          const diffTime = Math.abs(now.getTime() - created.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          return `${diffDays} days`
        },
        format: 'text' as const
      },
      {
        key: 'company_info',
        label: 'Company',
        icon: Building,
        calculator: (record) => record.company || 'No company',
        format: 'text' as const
      }
    ]
  },
  
  // List view configuration
  listView: {
    fields: ['full_name', 'email', 'company', 'phone', 'is_active', 'created_at'],
    defaultSort: 'created_at',
    defaultSortOrder: 'desc',
    searchFields: ['full_name', 'email', 'company'],
    pageSize: 10,
  },
  
  // Detail view configuration
  detailView: {
    fields: ['id', 'first_name', 'last_name', 'email', 'phone', 'company', 'address', 'is_active', 'created_at', 'updated_at'],
    layout: 'two-column',
    sections: [
      {
        title: 'Basic Information',
        fields: ['first_name', 'last_name', 'email', 'phone'],
        columns: 2, // Display fields in 2 columns
      },
      {
        title: 'Company Information',
        fields: ['company', 'address'],
        columns: 1, // Display fields in 1 column
      },
      {
        title: 'System Information',
        fields: ['id', 'is_active', 'created_at', 'updated_at'],
        columns: 2, // Display fields in 2 columns
      },
    ],
  },
  
  // Permissions
  permissions: {
    create: true,
    read: true,
    update: true,
    delete: false, // For now, don't allow deletion
  },
  
  // UI configuration
  icon: IconUserCog,
  color: 'blue',
}
