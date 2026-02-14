import React from 'react'
import { DynamicIcon, dynamicIconImports } from 'lucide-react/dynamic'
import type { IconName } from 'lucide-react/dynamic'
import type { ActionDefinition, CalculatedDataDefinition, StatisticsCardDefinition, GenericRecord } from '@/types/object-definition'

/** Convert metadata icon name (PascalCase or IconXxx) to Lucide kebab-case key */
function toLucideKey(name: string): string {
  const stripped = name.replace(/^Icon/, '')
  return stripped.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`).replace(/^-/, '')
}

export function getIcon(iconName: string): React.ComponentType<{ className?: string }> | undefined {
  const key = toLucideKey(iconName) as IconName
  if (key in dynamicIconImports) {
    return (props: { className?: string }) =>
      React.createElement(DynamicIcon, { name: key, ...props })
  }
  return undefined
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
  edit: (_record) => {
    // TODO: Navigate to edit page
  },
  delete: (_record) => {
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

export type StatisticsHandler = (records: GenericRecord[], config: Record<string, unknown>) => string | number

export const statisticsHandlers: Record<string, StatisticsHandler> = {
  count: (records) => {
    return records.length
  },
  sum: (records, config) => {
    const field = (config.field as string) || ''
    if (!field) return 0
    return records.reduce((acc, record) => {
      const value = parseFloat(record[field]?.toString() || '0')
      return acc + (isNaN(value) ? 0 : value)
    }, 0)
  },
  avg: (records, config) => {
    const field = (config.field as string) || ''
    if (!field || records.length === 0) return 0
    const sum = records.reduce((acc, record) => {
      const value = parseFloat(record[field]?.toString() || '0')
      return acc + (isNaN(value) ? 0 : value)
    }, 0)
    return sum / records.length
  },
  min: (records, config) => {
    const field = (config.field as string) || ''
    if (!field || records.length === 0) return 0
    const values = records
      .map((record) => parseFloat(record[field]?.toString() || '0'))
      .filter((v) => !isNaN(v))
    return values.length > 0 ? Math.min(...values) : 0
  },
  max: (records, config) => {
    const field = (config.field as string) || ''
    if (!field || records.length === 0) return 0
    const values = records
      .map((record) => parseFloat(record[field]?.toString() || '0'))
      .filter((v) => !isNaN(v))
    return values.length > 0 ? Math.max(...values) : 0
  },
  // Sum of quantity * unitPrice (for order items / line totals)
  lineTotalSum: (records) => {
    return records.reduce((acc, record) => {
      const qty = parseFloat(record.quantity?.toString() || '0')
      const price = parseFloat(record.unitPrice?.toString() || '0')
      return acc + (isNaN(qty) || isNaN(price) ? 0 : qty * price)
    }, 0)
  },
  fallback: (records, config) => {
    const fallback = (config.fallbackValue as string) || '0'
    return fallback
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

export function resolveStatisticsCard(
  config: { key: string; label: string; type?: string; field?: string; formula?: string; sourceField?: string; fallbackValue?: string; icon?: string; format?: string }
): StatisticsCardDefinition {
  // If formula is provided, use it (custom handler)
  // Otherwise, use type (built-in aggregation)
  // If neither, default to count
  const handlerType = config.formula || config.type || 'count'
  const handler = statisticsHandlers[handlerType] || statisticsHandlers.fallback
  const Icon = config.icon ? getIcon(config.icon) : undefined
  
  return {
    key: config.key,
    label: config.label,
    calculator: (records) => {
      const result = (handler || statisticsHandlers.fallback)(records, config)
      return result
    },
    format: (config.format as StatisticsCardDefinition['format']) || 'text',
    icon: Icon,
  }
}
