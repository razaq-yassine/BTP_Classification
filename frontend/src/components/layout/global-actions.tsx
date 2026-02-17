import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { GenericCreateDialog } from '@/components/generic/GenericCreateDialog'
import { GlobalActionsBar } from '@/components/layout/global-actions-bar'
import { usePermissions } from '@/hooks/usePermissions'
import { useObjectDefinitionsQuery } from '@/hooks/useObjectDefinitionsQuery'

/**
 * Example global actions for the header bar.
 * Uses canUseGlobalAction() to show/hide based on profile permissions.
 * Configure permissions at Settings → Administration → Profiles → [Profile] → Global action permissions.
 */
const QUICK_CREATE_CONFIG = [
  { actionId: 'quick-create-order', objectName: 'order', label: 'New Order' },
  { actionId: 'quick-create-customer', objectName: 'customer', label: 'New Customer' },
  { actionId: 'quick-create-product', objectName: 'product', label: 'New Product' },
  { actionId: 'quick-create-opportunity', objectName: 'opportunity', label: 'New Opportunity' },
  { actionId: 'quick-create-category', objectName: 'category', label: 'New Category' },
] as const

export function GlobalActions() {
  const navigate = useNavigate()
  const { canUseGlobalAction, canCreate } = usePermissions()
  const { data: defs } = useObjectDefinitionsQuery()
  const [openObject, setOpenObject] = useState<string | null>(null)

  const navigateToRecord = (objectName: string, id: string | number) => {
    const def = defs?.find((d) => d.name === objectName)
    if (def?.basePath) {
      const pathSegment = def.basePath.replace(/^\//, '')
      navigate({ to: '/$objectName/$recordId', params: { objectName: pathSegment, recordId: String(id) } })
    }
  }

  const actions = QUICK_CREATE_CONFIG.filter(({ actionId, objectName }) => {
    const def = defs?.find((d) => d.name === objectName)
    return canUseGlobalAction(actionId) && canCreate(objectName) && def
  }).map(({ objectName, label }) => ({
    label,
    onClick: () => setOpenObject(objectName),
  }))

  return (
    <GlobalActionsBar actions={actions}>
      {QUICK_CREATE_CONFIG.map(({ objectName }) => {
        const def = defs?.find((d) => d.name === objectName)
        if (!def || openObject !== objectName) return null

        return (
          <GenericCreateDialog
            key={objectName}
            objectDefinition={def}
            open={openObject === objectName}
            onOpenChange={(open) => !open && setOpenObject(null)}
            onRecordCreated={(newRecord) => {
              setOpenObject(null)
              const id = newRecord?.id
              if (id != null) navigateToRecord(objectName, id)
            }}
          />
        )
      })}
    </GlobalActionsBar>
  )
}
