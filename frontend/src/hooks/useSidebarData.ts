import { useState, useEffect } from 'react'
import type { SidebarData, NavGroup, NavItem, NavLink, NavCollapsible } from '@/components/layout/types'
import { getAllObjectDefinitions } from '@/metadata/loader'
import { sidebarData as staticSidebarData } from '@/components/layout/data/sidebar-data'

export function useSidebarData(): SidebarData {
  const [navGroups, setNavGroups] = useState<NavGroup[]>(staticSidebarData.navGroups)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const defs = await getAllObjectDefinitions()
        if (cancelled) return

        const withSidebar = defs.filter(
          (d) => d.basePath && (d.sidebar?.showInSidebar !== false)
        )

        if (withSidebar.length === 0) return

        const groupTitle = 'Data'
        const objectNavItems: NavItem[] = []
        const withParent = new Map<string, typeof withSidebar>()
        const noParent: typeof withSidebar = []

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

        const dataGroup: NavGroup = {
          title: groupTitle,
          items: objectNavItems,
        }

        const existing = staticSidebarData.navGroups.filter((g) => g.title !== groupTitle)
        const merged = [dataGroup, ...existing]
        setNavGroups(merged)
      } catch (err) {
        console.error('Failed to load sidebar from object definitions:', err)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return {
    ...staticSidebarData,
    navGroups,
  }
}
