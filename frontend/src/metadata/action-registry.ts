import React from 'react'
import { Edit, Trash2, Mail, Phone, Building, Calendar, Eye, Package, DollarSign, Layers } from 'lucide-react'
import { IconUserCog, IconShoppingCart } from '@tabler/icons-react'
import type { ActionDefinition, CalculatedDataDefinition, GenericRecord } from '@/types/object-definition'

export const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Edit,
  Trash2,
  Mail,
  Phone,
  Building,
  Calendar,
  Eye,
  Package,
  DollarSign,
  Layers,
  IconUserCog,
  IconShoppingCart,
}

export function getIcon(iconName: string): React.ComponentType<{ className?: string }> | undefined {
  return iconMap[iconName]
}

export type ActionHandler = (record: GenericRecord, config: Record<string, unknown>) => void

export const actionHandlers: Record<string, ActionHandler> = {
  mailto: (record, config) => {
    const field = (config.targetField as string) || 'email'
    const value = record[field]
    if (value) window.location.href = `mailto:${value}`
  },
  tel: (record, config) => {
    const field = (config.targetField as string) || 'phone'
    const value = record[field]
    if (value) window.location.href = `tel:${value}`
  },
  edit: (record) => {
    console.log('Edit:', record)
    // TODO: Navigate to edit page
  },
  delete: (record) => {
    console.log('Delete:', record)
    // TODO: Show confirmation dialog
  },
}

export type CalculatorHandler = (record: GenericRecord, config: Record<string, unknown>) => string | number

export const calculatorHandlers: Record<string, CalculatorHandler> = {
  daysSince: (record, config) => {
    const field = (config.sourceField as string) || 'createdAt'
    const value = record[field]
    if (!value) return 'N/A'
    const created = new Date(value)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - created.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return `${diffDays} days`
  },
  fallback: (record, config) => {
    const field = (config.sourceField as string) || ''
    const fallback = (config.fallbackValue as string) || ''
    const value = record[field]
    return value ?? fallback
  },
  currency: (record, config) => {
    const field = (config.sourceField as string) || 'totalAmount'
    const value = record[field]
    return `$${parseFloat(value?.toString() || '0').toFixed(2)}`
  },
}

export function resolveAction(
  config: { key: string; label: string; type?: string; targetField?: string; icon?: string; variant?: string }
): ActionDefinition {
  const handler = config.type ? actionHandlers[config.type] : actionHandlers.edit
  const Icon = config.icon ? getIcon(config.icon) : undefined
  return {
    key: config.key,
    label: config.label,
    icon: Icon,
    variant: (config.variant as ActionDefinition['variant']) || 'default',
    onClick: (r) => (handler || actionHandlers.edit)(r, { targetField: config.targetField }),
  }
}

export function resolveCalculatedData(
  config: { key: string; label: string; formula?: string; sourceField?: string; fallbackValue?: string; icon?: string; format?: string }
): CalculatedDataDefinition {
  const handler = config.formula ? calculatorHandlers[config.formula] : calculatorHandlers.fallback
  const Icon = config.icon ? getIcon(config.icon) : undefined
  return {
    key: config.key,
    label: config.label,
    calculator: (r) => (handler || calculatorHandlers.fallback)(r, config),
    format: (config.format as CalculatedDataDefinition['format']) || 'text',
    icon: Icon,
  }
}
