import React from 'react'
import { ObjectDefinition, GenericRecord } from '@/types/object-definition'
import { IconShoppingCart } from '@tabler/icons-react'
import { Edit, Trash2, Eye, Package, Calendar, DollarSign } from 'lucide-react'

export const orderObjectDefinition: ObjectDefinition = {
  // Basic object information
  name: 'order',
  label: 'Order',
  labelPlural: 'Orders',
  description: 'Manage customer orders and transactions',
  
  // API configuration
  apiEndpoint: '/api/orders', // Full path including /api context path
  
  // Navigation configuration
  basePath: '/orders',
  detailPath: '/orders/$orderId',
  
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
          console.log('Edit order:', record)
          // TODO: Navigate to edit page
        }
      },
      {
        key: 'view',
        label: 'View Details',
        icon: Eye,
        variant: 'default' as const,
        onClick: (record: GenericRecord) => {
          console.log('View order details:', record)
          // TODO: Navigate to detail page
        }
      }
    ],
    secondaryActions: [
      {
        key: 'ship',
        label: 'Mark as Shipped',
        icon: Package,
        variant: 'ghost' as const,
        onClick: (record: GenericRecord) => {
          console.log('Mark order as shipped:', record)
          // TODO: Update order status
        }
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash2,
        variant: 'destructive' as const,
        onClick: (record: GenericRecord) => {
          console.log('Delete order:', record)
          // TODO: Show confirmation dialog
        }
      }
    ],
    calculatedData: [
      {
        key: 'order_age',
        label: 'Order Age',
        icon: Calendar,
        calculator: (record: GenericRecord) => {
          const orderDate = new Date(record.orderDate)
          const now = new Date()
          const diffTime = Math.abs(now.getTime() - orderDate.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          return `${diffDays} days`
        },
        format: 'text' as const
      },
      {
        key: 'total_formatted',
        label: 'Total Amount',
        icon: DollarSign,
        calculator: (record: GenericRecord) => `$${parseFloat(record.totalAmount || 0).toFixed(2)}`,
        format: 'text' as const
      }
    ]
  },
  
  // List view configuration
  listView: {
    fields: [
      {
        key: 'orderNumber',
        label: 'Order Number',
        type: 'string',
        sortable: true,
        searchable: true,
      },
      {
        key: 'customerName',
        label: 'Customer',
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
  },
  
  // Detail view configuration
  detailView: {
    layout: 'two-column',
    sections: [
      {
        title: 'Order Information',
        columns: 2,
        defaultOpen: true,
        fields: [
          {
            key: 'orderNumber',
            label: 'Order Number',
            type: 'string',
            required: true,
            editable: true,
          },
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            required: true,
            editable: true,
            options: [
              { value: 'PENDING', label: 'Pending' },
              { value: 'CONFIRMED', label: 'Confirmed' },
              { value: 'SHIPPED', label: 'Shipped' },
              { value: 'DELIVERED', label: 'Delivered' },
              { value: 'CANCELLED', label: 'Cancelled' }
            ]
          },
          {
            key: 'totalAmount',
            label: 'Total Amount',
            type: 'number',
            required: true,
            editable: true,
          },
          {
            key: 'orderDate',
            label: 'Order Date',
            type: 'datetime',
            required: true,
            editable: true,
          },
        ],
      },
      {
        title: 'Customer & Delivery',
        columns: 1,
        defaultOpen: true,
        fields: [
          {
            key: 'customer',
            label: 'Customer',
            type: 'text',
            required: true,
            editable: true,
          },
          {
            key: 'description',
            label: 'Description',
            type: 'text',
            editable: true,
          },
          {
            key: 'deliveryDate',
            label: 'Delivery Date',
            type: 'datetime',
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
            label: 'Active',
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
  
  // UI configuration
  icon: IconShoppingCart,
  color: 'green',
}
