import { useMemo } from 'react'
import Cookies from 'js-cookie'
import { Outlet, useLocation } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { SearchProvider } from '@/context/search-context'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { Header } from '@/components/layout/header'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import SkipToMain from '@/components/skip-to-main'
import { useObjectDefinitionsQuery } from '@/hooks/useObjectDefinitionsQuery'
import { useMetadataVersionPolling } from '@/hooks/useMetadataVersionPolling'

interface Props {
  children?: React.ReactNode
}

const staticTopNav = [
  { title: 'Overview', href: '/dashboard', isActive: true },
  { title: 'Analytics', href: '/analytics', isActive: false, disabled: true },
]

export function AuthenticatedLayout({ children }: Props) {
  useMetadataVersionPolling()
  const location = useLocation()
  const isSettings = location.pathname.startsWith('/settings')
  const { data: defs } = useObjectDefinitionsQuery()
  const topNav = useMemo(() => {
    if (!defs?.length) return staticTopNav
    const withNav = defs.filter((d) => d.basePath && (d.sidebar?.showInSidebar !== false))
    if (withNav.length === 0) return staticTopNav
    const dataNav = { title: withNav[0].labelPlural, href: withNav[0].basePath!, isActive: false }
    return [staticTopNav[0], dataNav, ...staticTopNav.slice(1)]
  }, [defs])

  const defaultOpen = Cookies.get('sidebar_state') !== 'false'

  return (
    <SearchProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <SkipToMain />
        <AppSidebar />
        <div
          id='content'
          className={cn(
            'ml-auto w-full max-w-full',
            'peer-data-[state=collapsed]:w-[calc(100%-var(--sidebar-width-icon)-1rem)]',
            'peer-data-[state=expanded]:w-[calc(100%-var(--sidebar-width))]',
            'sm:transition-[width] sm:duration-200 sm:ease-linear',
            'flex h-svh flex-col',
            'group-data-[scroll-locked=1]/body:h-full',
            'has-[main.fixed-main]:group-data-[scroll-locked=1]/body:h-svh'
          )}
        >
          {/* ===== Top Header ===== */}
          <Header>
            {!isSettings && <TopNav links={topNav} />}
            <div className='ml-auto flex items-center space-x-4'>
              <Search />
              <ThemeSwitch />
              <ProfileDropdown />
            </div>
          </Header>

          {/* ===== Main Content ===== */}
          <div className='flex-1 overflow-auto'>
            {children ? children : <Outlet />}
          </div>
        </div>
      </SidebarProvider>
    </SearchProvider>
  )
}
