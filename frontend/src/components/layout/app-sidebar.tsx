import * as React from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavGroup } from '@/components/layout/nav-group'
import { TeamSwitcher } from '@/components/layout/team-switcher'
import { useSidebarData } from '@/hooks/useSidebarData'
import { useTheme } from '@/context/theme-context'

function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return hex
  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function isColorDark(hex: string): boolean {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return false
  const r = parseInt(m[1], 16) / 255
  const g = parseInt(m[2], 16) / 255
  const b = parseInt(m[3], 16) / 255
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  return luminance < 0.55
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const sidebarData = useSidebarData()
  const { theme } = useTheme()
  const [effectiveTheme, setEffectiveTheme] = React.useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    if (theme !== 'system') return theme
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  React.useEffect(() => {
    const resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme
    setEffectiveTheme(resolved)
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => setEffectiveTheme(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const sidebarTheme = sidebarData.tenantContext?.sidebarTheme
  const sidebarStyle = React.useMemo(() => {
    if (!sidebarTheme || effectiveTheme !== 'light') return undefined
    const dark = isColorDark(sidebarTheme)
    return {
      '--sidebar': sidebarTheme,
      '--sidebar-primary': sidebarTheme,
      '--sidebar-accent': hexToRgba(sidebarTheme, 0.1),
      ...(dark && {
        '--sidebar-foreground': '#ffffff',
        '--sidebar-primary-foreground': '#ffffff',
        '--sidebar-accent-foreground': '#ffffff',
      }),
    } as React.CSSProperties
  }, [sidebarTheme, effectiveTheme])

  return (
    <Sidebar collapsible='icon' variant='floating' style={sidebarStyle} {...props}>
      <SidebarHeader>
        <TeamSwitcher tenantContext={sidebarData.tenantContext} />
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((groupProps, i) => (
          <NavGroup key={groupProps.title || `nav-${i}`} {...groupProps} />
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
