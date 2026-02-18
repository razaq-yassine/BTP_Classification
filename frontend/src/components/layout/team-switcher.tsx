import { Link } from '@tanstack/react-router'
import { Layers } from 'lucide-react'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import type { TenantContextData } from '@/components/layout/types'

const DEFAULT_APP_NAME = 'App'

export function TeamSwitcher({
  tenantContext,
}: {
  tenantContext?: TenantContextData | null
}) {
  const name = tenantContext?.name ?? DEFAULT_APP_NAME
  const logoUrl = tenantContext?.logoUrl
  const subtitle = tenantContext?.subtitle

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size='lg' asChild>
          <Link to='/dashboard'>
            <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg'>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={name}
                  className='size-full object-cover'
                />
              ) : (
                <Layers className='size-4' />
              )}
            </div>
            <div className='grid flex-1 text-left text-sm leading-tight'>
              <span className='truncate font-semibold'>{name}</span>
              {subtitle && (
                <span className='truncate text-xs text-muted-foreground'>
                  {subtitle}
                </span>
              )}
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
