import { useEffect } from 'react'
import Cookies from 'js-cookie'
import { Outlet, useLocation } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { SearchProvider } from '@/context/search-context'
import { useSidebarBehavior } from '@/context/sidebar-behavior-context'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { Header } from '@/components/layout/header'
import { GlobalActions } from '@/components/layout/global-actions'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitcher } from '@/components/language-switcher'
import SkipToMain from '@/components/skip-to-main'
import { useMetadataVersionPolling } from '@/hooks/useMetadataVersionPolling'
import { useEffectiveLanguage } from '@/hooks/useEffectiveLanguage'
import { useAppConfigStore } from '@/stores/appConfigStore'

interface Props {
  children?: React.ReactNode
}

export function AuthenticatedLayout({ children }: Props) {
  const fetchConfig = useAppConfigStore((s) => s.fetchConfig)
  const isLoaded = useAppConfigStore((s) => s.isLoaded)
  useEffectiveLanguage()
  useEffect(() => {
    if (!isLoaded) fetchConfig()
  }, [fetchConfig, isLoaded])
  useMetadataVersionPolling()
  const location = useLocation()
  const isSettings = location.pathname.startsWith('/settings')
  const { sidebarBehavior } = useSidebarBehavior()

  const defaultOpen = Cookies.get('sidebar_state') !== 'false'

  return (
    <SearchProvider>
      <SidebarProvider defaultOpen={defaultOpen} sidebarBehavior={sidebarBehavior}>
        <SkipToMain />
        <AppSidebar />
        <div
          id='content'
          className={cn(
            'ms-auto w-full max-w-full',
            'peer-data-[layout=collapsed]:w-[calc(100%-var(--sidebar-width-icon)-1rem)]',
            'peer-data-[layout=expanded]:w-[calc(100%-var(--sidebar-width))]',
            'sm:transition-[width] sm:duration-200 sm:ease-linear',
            'flex h-svh flex-col',
            'group-data-[scroll-locked=1]/body:h-full',
            'has-[main.fixed-main]:group-data-[scroll-locked=1]/body:h-svh'
          )}
        >
          {/* ===== Top Header ===== */}
          <Header>
            {!isSettings && <GlobalActions />}
            <div className='flex min-w-0 flex-1 items-center'>
              <Search />
            </div>
            <div className='flex shrink-0 items-center gap-4'>
              <ThemeSwitch />
              <LanguageSwitcher />
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
