import { useMemo } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { IconLayoutDashboard, IconSettings } from '@tabler/icons-react'
import type { ObjectDefinition } from '@/types/object-definition'
import type { SidebarData, NavGroup, NavItem, NavLink, NavCollapsible } from '@/components/layout/types'
import { useObjectDefinitionsQuery } from '@/hooks/useObjectDefinitionsQuery'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuthStore, selectUser } from '@/stores/authStore'
import { useTenantContext } from '@/hooks/useTenantContext'
import { sidebarData as staticSidebarData, settingsNavGroups } from '@/components/layout/data/sidebar-data'

function buildDataNavItems(
  defs: ObjectDefinition[],
  canRead: (objectName: string) => boolean,
  t: (key: string, opts?: { defaultValue?: string }) => string
): NavItem[] {
  const withSidebar = defs.filter(
    (d) => d.basePath && (d.sidebar?.showInSidebar !== false) && canRead(d.name)
  )
  if (withSidebar.length === 0) return []

  const objectNavItems: NavItem[] = []
  const withParent = new Map<string, ObjectDefinition[]>()
  const noParent: ObjectDefinition[] = []

  for (const d of withSidebar) {
    if (d.sidebar?.parent) {
      const p = d.sidebar.parent
      if (!withParent.has(p)) withParent.set(p, [])
      withParent.get(p)!.push(d)
    } else {
      noParent.push(d)
    }
  }

  for (const d of noParent) {
    objectNavItems.push({
      title: t(`objects:${d.name}.labelPlural`, { defaultValue: d.labelPlural }),
      url: d.basePath!,
      icon: d.icon,
    } as NavLink)
  }

  for (const [parentTitle, items] of withParent) {
    const Icon = items[0]?.icon
    const parentKey = `navigation:${parentTitle.toLowerCase().replace(/\s+/g, '')}`
    objectNavItems.push({
      title: t(parentKey, { defaultValue: parentTitle }),
      icon: Icon,
      items: items.map((d) => ({
        title: t(`objects:${d.name}.labelPlural`, { defaultValue: d.labelPlural }),
        url: d.basePath!,
      })),
    } as NavCollapsible)
  }

  return objectNavItems
}

function filterSettingsNavForProfile(
  groups: NavGroup[],
  isAdmin: boolean,
  hasOrgId: boolean,
  hasTenantId: boolean
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if ('adminOnly' in item && item.adminOnly && !isAdmin) return false
        if ('orgUserOnly' in item && item.orgUserOnly && !hasOrgId && !(item.adminAlsoSees && isAdmin)) return false
        if ('tenantUserOnly' in item && item.tenantUserOnly && !hasTenantId && !(item.adminAlsoSees && isAdmin)) return false
        return true
      }),
    }))
    .filter((group) => group.items.length > 0)
}

function resolveNavTitles(
  groups: NavGroup[],
  t: (key: string, opts?: { defaultValue?: string }) => string
): NavGroup[] {
  return groups.map((group) => ({
    ...group,
    title: group.titleKey ? t(`navigation:${group.titleKey.replace('navigation.', '')}`, { defaultValue: group.title }) : group.title,
    items: group.items.map((item) => ({
      ...item,
      title: item.titleKey ? t(`navigation:${item.titleKey.replace('navigation.', '')}`, { defaultValue: item.title }) : item.title
    }))
  }))
}

export function useSidebarData(): SidebarData {
  const location = useLocation()
  const user = useAuthStore(selectUser)
  const { t } = useTranslation()
  const { data: tenantContext } = useTenantContext()
  const { data: defs } = useObjectDefinitionsQuery()
  const { canRead } = usePermissions()
  const isSettings = location.pathname.startsWith('/settings')
  const isAdmin = (user?.profile ?? '').toLowerCase() === 'admin'

  const tenantContextData = useMemo(() => {
    if (!tenantContext) return null
    return {
      name: tenantContext.name,
      logoUrl: tenantContext.logoUrl ?? null,
      subtitle: tenantContext.subtitle,
      sidebarTheme: tenantContext.sidebarTheme ?? null
    }
  }, [tenantContext])

  const hasOrgId = (user?.organizationId ?? null) != null
  const hasTenantId = (user?.tenantId ?? null) != null

  const navGroups = useMemo(() => {
    if (isSettings) {
      const filtered = filterSettingsNavForProfile(settingsNavGroups, isAdmin, hasOrgId, hasTenantId)
      return resolveNavTitles(filtered, t)
    }

    const dashboardItem: NavLink = {
      title: t('navigation:dashboard', { defaultValue: 'Dashboard' }),
      url: '/dashboard',
      icon: IconLayoutDashboard
    }
    const settingsItem: NavLink = {
      title: t('navigation:settings', { defaultValue: 'Settings' }),
      url: '/settings',
      icon: IconSettings,
      external: true
    }
    const dataItems = defs ? buildDataNavItems(defs, canRead, t) : []

    const allItems: NavItem[] = [dashboardItem, ...dataItems, settingsItem]

    return [{ title: '', items: allItems }]
  }, [defs, isSettings, canRead, isAdmin, hasOrgId, hasTenantId, t])

  return {
    ...staticSidebarData,
    navGroups,
    tenantContext: tenantContextData,
  }
}
