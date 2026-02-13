import React from 'react'
import { ObjectDefinition, GenericRecord } from '@/types/object-definition'
import { IconUserCog } from '@tabler/icons-react'
import { Edit, Trash2, Mail, Phone, Building, Calendar } from 'lucide-react'

export const customerObjectDefinition: ObjectDefinition = {
  // Basic object information
  name: 'customer',
  label: 'Customer',
  labelPlural: 'Customers',
  description: 'Manage customer information and records',
  
  // API configuration
  apiEndpoint: '/api/customers', // Full path including /api context path
  
  // Navigation configuration
  basePath: '/customers',
  detailPath: '/customers/$customerId',
  
  // Header configuration
  header: {
    imageField: undefined, // No image field, will use icon
    primaryActions: [
      {
        key: 'edit',
        label: 'Edit',
        icon: Edit,
        variant: 'outline' as const,
        onClick: (record: GenericRecord) => {
          console.log('Edit customer:', record)
          // TODO: Navigate to edit page
        }
      },
      {
        key: 'contact',
        label: 'Contact',
        icon: Mail,
        variant: 'default' as const,
        onClick: (record: GenericRecord) => {
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
        onClick: (record: GenericRecord) => {
          window.location.href = `tel:${record.phone}`
        }
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash2,
        variant: 'destructive' as const,
        onClick: (record: GenericRecord) => {
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
        calculator: (record: GenericRecord) => {
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
        calculator: (record: GenericRecord) => record.company || 'No company',
        format: 'text' as const
      }
    ]
  },
  
  // List view configuration
  listView: {
    fields: [
      {
        key: 'fullName',
        label: 'Full Name',
        type: 'string',
        sortable: true,
        searchable: true,
      },
      {
        key: 'email',
        label: 'Email',
        type: 'email',
        sortable: true,
        searchable: true,
      },
      {
        key: 'company',
        label: 'Company',
        type: 'string',
        sortable: true,
        searchable: true,
      },
      {
        key: 'phone',
        label: 'Phone',
        type: 'phone',
        searchable: true,
      },
      {
        key: 'isActive',
        label: 'Status',
        type: 'boolean',
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
        key: 'createdAt',
        label: 'Created',
        type: 'date',
        sortable: true,
        format: 'MMM dd, yyyy',
      },
    ],
    defaultSort: 'createdAt',
    defaultSortOrder: 'desc',
    pageSize: 10,
  },
  
  // Detail view configuration
  detailView: {
    layout: 'two-column',
    sections: [
      {
        title: 'Basic Information',
        columns: 2,
        defaultOpen: true,
        fields: [
          {
            key: 'firstName',
            label: 'First Name',
            type: 'string',
            required: true,
            editable: true,
          },
          {
            key: 'lastName',
            label: 'Last Name',
            type: 'string',
            required: true,
            editable: true,
          },
          {
            key: 'email',
            label: 'Email',
            type: 'email',
            required: true,
            editable: true,
          },
          {
            key: 'phone',
            label: 'Phone',
            type: 'phone',
            editable: true,
          },
        ],
      },
      {
        title: 'Company Information',
        columns: 1,
        defaultOpen: true,
        fields: [
          {
            key: 'company',
            label: 'Company',
            type: 'string',
            isImportant: true,
            editable: true,
          },
          {
            key: 'address',
            label: 'Address',
            type: 'text',
            editable: true,
          },
        ],
      },
      {
        title: 'System Information',
        columns: 2,
        defaultOpen: false,
        fields: [
          {
            key: 'id',
            label: 'ID',
            type: 'number',
            editable: false,
          },
          {
            key: 'isActive',
            label: 'Status',
            type: 'boolean',
            editable: true,
          },
          {
            key: 'createdAt',
            label: 'Created',
            type: 'date',
            format: 'MMM dd, yyyy',
            editable: false,
          },
          {
            key: 'updatedAt',
            label: 'Updated',
            type: 'date',
            format: 'MMM dd, yyyy',
            editable: false,
          },
        ],
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
  
  // Related objects configuration
  relatedObjects: [
    {
      name: 'orders',
      label: 'Orders',
      labelPlural: 'Orders',
      objectDefinition: 'order', // Reference to order object definition
      relationshipType: 'one-to-many',
      foreignKey: 'customer.id', // Field in the related object that references this object
      apiEndpoint: '/api/orders/customer', // Endpoint to fetch related data
      fields: [
        {
          key: 'orderNumber',
          label: 'Order Number',
          type: 'string',
          sortable: true,
          searchable: true,
        },
        {
          key: 'status',
          label: 'Status',
          type: 'string',
          sortable: true,
          render: (value: string) => {
            const statusColors: Record<string, string> = {
              'PENDING': 'bg-yellow-100 text-yellow-800',
              'CONFIRMED': 'bg-blue-100 text-blue-800',
              'SHIPPED': 'bg-purple-100 text-purple-800',
              'DELIVERED': 'bg-green-100 text-green-800',
              'CANCELLED': 'bg-red-100 text-red-800'
            }
            
            return React.createElement('span', {
              className: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                statusColors[value] || 'bg-gray-100 text-gray-800'
              }`
            }, value)
          },
        },
        {
          key: 'totalAmount',
          label: 'Total Amount',
          type: 'number',
          sortable: true,
          render: (value: number) => `$${parseFloat(value?.toString() || '0').toFixed(2)}`,
        },
        {
          key: 'orderDate',
          label: 'Order Date',
          type: 'date',
          sortable: true,
          format: 'MMM dd, yyyy',
        },
        {
          key: 'isActive',
          label: 'Active',
          type: 'boolean',
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
      ],
      defaultSort: 'orderDate',
      defaultSortOrder: 'desc',
      pageSize: 10,
      permissions: {
        create: true,
        read: true,
        update: true,
        delete: false,
      },
    }
  ],
  
  // UI configuration
  icon: IconUserCog,
  color: 'blue',
}
