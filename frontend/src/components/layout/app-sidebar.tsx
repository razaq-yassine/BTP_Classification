import * as React from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavGroup } from '@/components/layout/nav-group'
import { NavUser } from '@/components/layout/nav-user'
import { TeamSwitcher } from '@/components/layout/team-switcher'
import { useSidebarData } from '@/hooks/useSidebarData'

function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return hex
  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const sidebarData = useSidebarData()
  const sidebarTheme = sidebarData.tenantContext?.sidebarTheme
  const sidebarStyle = React.useMemo(() => {
    if (!sidebarTheme) return undefined
    return {
      '--sidebar-primary': sidebarTheme,
      '--sidebar-accent': hexToRgba(sidebarTheme, 0.1),
    } as React.CSSProperties
  }, [sidebarTheme])

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
      <SidebarFooter>
        <NavUser user={sidebarData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
