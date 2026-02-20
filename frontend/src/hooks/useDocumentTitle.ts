import { useEffect } from 'react'
import { useLocation, useParams } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useTenantContext } from '@/hooks/useTenantContext'
import { useObjectDefinition } from '@/hooks/useObjectDefinition'
import { getPathTitleKey } from '@/utils/documentTitle'

const DEFAULT_APP_NAME = 'App'

/**
 * Resolves the page title from the current route.
 * Uses static path mapping for known routes, object metadata for dynamic routes.
 */
function usePageTitle(): string {
  const { pathname } = useLocation()
  const params = useParams({ strict: false })
  const { t } = useTranslation()
  const objectName = (params?.objectName as string | undefined) || '__'
  const recordId = params?.recordId as string | undefined
  const { definition } = useObjectDefinition(objectName, {
    resolveFromPath: objectName !== '__',
  })

  const normalizedPath = pathname.replace(/\/$/, '') || '/'

  // Static route mapping
  const staticKey = getPathTitleKey(normalizedPath)
  if (staticKey) {
    if (staticKey.startsWith('navigation:')) {
      return t(`navigation:${staticKey.replace('navigation:', '')}`, {
        defaultValue: staticKey.replace('navigation:', ''),
      })
    }
    return t(staticKey, { defaultValue: staticKey })
  }

  // Dynamic: object list (e.g. /orders)
  if (objectName && !recordId && definition) {
    return t(`objects:${definition.name}.labelPlural`, {
      defaultValue: definition.labelPlural,
    })
  }

  // Dynamic: object detail (e.g. /orders/123)
  if (objectName && recordId && definition) {
    const label = t(`objects:${definition.name}.label`, {
      defaultValue: definition.label,
    })
    return `${label} #${recordId}`
  }

  // Fallback: use last path segment or "App"
  const segments = normalizedPath.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  if (last) {
    const title = last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ')
    return title
  }

  return DEFAULT_APP_NAME
}

/**
 * Sets document.title dynamically: <context> - <page> when context exists,
 * otherwise just <page>. Used for multi-tenant tab identification.
 */
export function useDocumentTitle(): void {
  const pageTitle = usePageTitle()
  const { data: tenantContext } = useTenantContext()

  useEffect(() => {
    const contextName = tenantContext?.name?.trim()
    const title = contextName ? `${contextName} - ${pageTitle}` : pageTitle
    document.title = title
  }, [pageTitle, tenantContext?.name])
}
