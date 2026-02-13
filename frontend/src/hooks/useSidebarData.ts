import { useMemo } from 'react'
import type { ObjectDefinition } from '@/types/object-definition'
import type { SidebarData, NavGroup, NavItem, NavLink, NavCollapsible } from '@/components/layout/types'
import { useObjectDefinitionsQuery } from '@/hooks/useObjectDefinitionsQuery'
import { sidebarData as staticSidebarData } from '@/components/layout/data/sidebar-data'

function buildDataNavGroup(defs: ObjectDefinition[]): NavGroup | null {
  const withSidebar = defs.filter(
    (d) => d.basePath && (d.sidebar?.showInSidebar !== false)
  )
  if (withSidebar.length === 0) return null

  const groupTitle = 'Data'
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
      title: d.labelPlural,
      url: d.basePath!,
      icon: d.icon,
    } as NavLink)
  }

  for (const [parentTitle, items] of withParent) {
    const Icon = items[0]?.icon
    objectNavItems.push({
      title: parentTitle,
      icon: Icon,
      items: items.map((d) => ({
        title: d.labelPlural,
        url: d.basePath!,
      })),
    } as NavCollapsible)
  }

  return {
    title: groupTitle,
    items: objectNavItems,
  }
}

export function useSidebarData(): SidebarData {
  const { data: defs } = useObjectDefinitionsQuery()

  const navGroups = useMemo(() => {
    if (!defs) return staticSidebarData.navGroups
    const dataGroup = buildDataNavGroup(defs)
    if (!dataGroup) return staticSidebarData.navGroups
    const existing = staticSidebarData.navGroups.filter((g) => g.title !== dataGroup.title)
    return [dataGroup, ...existing]
  }, [defs])

  return {
    ...staticSidebarData,
    navGroups,
  }
}
