import { Link } from '@tanstack/react-router'
import type { FieldDefinition, GenericRecord } from '@/types/object-definition'
import { useObjectDefinition } from '@/hooks/useObjectDefinition'
import { getObjectIconClasses } from '@/utils/object-color'
import { getReferenceDisplayName } from '@/utils/formatDetailValue'
import { cn } from '@/lib/utils'

const linkClass = 'text-blue-600 dark:text-primary hover:underline'

interface ReferenceFieldValueProps {
  field: FieldDefinition
  value: unknown
  record?: GenericRecord // Reserved for future use
}

/**
 * Renders a reference or masterDetail field value with optional object icon and color.
 * Used in detail view when the referenced object has icon/color in metadata.
 */
export function ReferenceFieldValue({ field, value }: ReferenceFieldValueProps) {
  const objectName = field.objectName
  const basePath = (field as { basePath?: string }).basePath

  const refId = typeof value === 'object' ? (value as { id?: string | number })?.id : value
  const displayName = getReferenceDisplayName(value)

  const toPath = basePath ? `${basePath}/${refId}` : `/${objectName}/${refId}`

  const { definition } = useObjectDefinition(objectName || 'none')
  const ObjectIcon = definition?.icon
  const iconClasses = getObjectIconClasses(definition?.color)

  if (!(objectName || basePath) || refId == null) {
    return <span>{displayName}</span>
  }

  return (
    <Link to={toPath} className={cn('inline-flex items-center gap-1.5', linkClass)} onClick={(e) => e.stopPropagation()}>
      {ObjectIcon && <ObjectIcon className={cn('h-4 w-4 shrink-0', iconClasses)} />}
      <span className="hover:underline">{displayName}</span>
    </Link>
  )
}
