import { LinkProps } from '@tanstack/react-router'

interface User {
  name: string
  email: string
  avatar: string
}

interface Team {
  name: string
  logo: React.ElementType
  plan: string
}

export interface TenantContextData {
  name: string
  logoUrl?: string | null
  subtitle?: string
  sidebarTheme?: string | null
}

interface BaseNavItem {
  title: string
  badge?: string
  icon?: React.ElementType
  /** If true, only visible to users with profile === 'admin' */
  adminOnly?: boolean
  /** If true, only visible when user has organizationId (org user) */
  orgUserOnly?: boolean
  /** If true, only visible when user has tenantId (tenant user) */
  tenantUserOnly?: boolean
  /** If true, admin also sees this item even when orgUserOnly/tenantUserOnly would hide it */
  adminAlsoSees?: boolean
}

type NavLink = BaseNavItem & {
  url: LinkProps['to']
  items?: never
  external?: boolean
}

type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: LinkProps['to']; external?: boolean })[]
  url?: never
}

type NavItem = NavCollapsible | NavLink

interface NavGroup {
  title: string
  items: NavItem[]
}

interface SidebarData {
  user: User
  teams: Team[]
  navGroups: NavGroup[]
  /** Tenant or org context for sidebar selector (when user has org/tenant) */
  tenantContext?: TenantContextData | null
}

export type { SidebarData, NavGroup, NavItem, NavCollapsible, NavLink }
