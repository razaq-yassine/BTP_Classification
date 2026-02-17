/**
 * Loads sidebar definitions from metadata/sidebars/ directory.
 */

import {
  IconBarrierBlock,
  IconBug,
  IconError404,
  IconHelp,
  IconLayoutDashboard,
  IconLock,
  IconLockAccess,
  IconMessages,
  IconPackages,
  IconServerOff,
  IconSettings,
  IconUserOff,
  IconUsers
} from '@tabler/icons-react'
import { Layers } from 'lucide-react'
import type { NavGroup, NavItem, NavLink, NavCollapsible } from '@/components/layout/types'

const METADATA_BASE = '/metadata'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  IconBarrierBlock,
  IconBug,
  IconError404,
  IconHelp,
  IconLayoutDashboard,
  IconLock,
  IconLockAccess,
  IconMessages,
  IconPackages,
  IconServerOff,
  IconSettings,
  IconUserOff,
  IconUsers,
  Layers
}

function resolveIcon(iconName: string | undefined): React.ComponentType<{ className?: string }> | undefined {
  if (!iconName) return undefined
  return ICON_MAP[iconName] ?? ICON_MAP[iconName.replace(/^Icon/, '')]
}

export interface SidebarNavItemLink {
  type: 'link'
  title: string
  url: string
  icon?: string
  badge?: string
  external?: boolean
}

export interface SidebarNavItemCollapsible {
  type: 'collapsible'
  title: string
  icon?: string
  items: SidebarNavItemLink[]
}

export interface SidebarConfig {
  id: string
  label: string
  navGroups: Array<{
    title: string
    items: (SidebarNavItemLink | SidebarNavItemCollapsible)[]
  }>
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${METADATA_BASE}${path}`)
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`)
  return res.json()
}

function resolveNavItem(
  item: SidebarNavItemLink | SidebarNavItemCollapsible
): NavLink | NavCollapsible {
  if (item.type === 'link') {
    const Icon = resolveIcon(item.icon)
    return {
      title: item.title,
      url: item.url as '/tasks',
      icon: Icon,
      badge: item.badge,
      external: item.external
    } as NavLink
  }
  const Icon = resolveIcon(item.icon)
  return {
    title: item.title,
    icon: Icon,
    items: item.items.map((sub) => {
      const SubIcon = resolveIcon(sub.icon)
      return {
        title: sub.title,
        url: sub.url as '/sign-in',
        icon: SubIcon,
        badge: sub.badge,
        external: sub.external
      }
    })
  } as NavCollapsible
}

/**
 * Load a sidebar config by ID from metadata/sidebars/
 */
export async function loadSidebar(sidebarId: string): Promise<SidebarConfig | undefined> {
  try {
    const data = await fetchJson<SidebarConfig>(`/sidebars/${sidebarId}.json`)
    if (!data?.id || !data?.navGroups) return undefined
    return data
  } catch {
    return undefined
  }
}

/**
 * Convert sidebar config to NavGroup[] for use in the layout.
 */
export function sidebarConfigToNavGroups(config: SidebarConfig): NavGroup[] {
  return config.navGroups.map((group) => ({
    title: group.title,
    items: group.items.map(resolveNavItem) as NavItem[]
  }))
}
