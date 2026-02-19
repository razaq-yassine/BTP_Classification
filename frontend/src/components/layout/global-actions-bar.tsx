import React from 'react'
import { useTranslation } from 'react-i18next'
import { IconPlus, IconStar } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useIsMobile } from '@/hooks/use-mobile'

/** Max actions to show inline before collapsing into the star dropdown (desktop only) */
const MAX_INLINE_ACTIONS = 4

export interface GlobalAction {
  label: string
  onClick: () => void
}

/**
 * Global Actions Bar
 *
 * Top bar area (between collapse button and search bar) for custom global actions
 * like "New Order", "New Customer", etc.
 *
 * On mobile (same breakpoint as sidebar: 768px) or when >4 actions, collapses
 * into a star icon button that opens a dropdown.
 */
interface GlobalActionsBarProps extends React.HTMLAttributes<HTMLDivElement> {
  actions: GlobalAction[]
  children?: React.ReactNode
}

export function GlobalActionsBar({ className, actions, children, ...props }: GlobalActionsBarProps) {
  const { t } = useTranslation('common')
  const isMobile = useIsMobile()
  const useDropdownForCount = actions.length > MAX_INLINE_ACTIONS
  const showStarDropdown = isMobile || useDropdownForCount

  const dropdownContent = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" aria-label={t('globalActions')}>
          <IconStar className="h-4 w-4" />
          <span className="hidden sm:inline">{t('actions')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[10rem]">
        {actions.map((action, i) => (
          <DropdownMenuItem
            key={i}
            onSelect={(e) => {
              e.preventDefault()
              action.onClick()
            }}
          >
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  if (actions.length === 0) {
    return (
      <div data-global-actions-bar className={cn('flex shrink-0 items-center', className)} {...props}>
        {children}
      </div>
    )
  }

  return (
    <div
      data-global-actions-bar
      className={cn('flex shrink-0 items-center', className)}
      {...props}
    >
      {children}
      {showStarDropdown && (
        <div className="flex items-center">{dropdownContent}</div>
      )}
      {!showStarDropdown && (
        <div className="flex items-center space-x-2">
          {actions.map((action, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              onClick={action.onClick}
              className="gap-1.5"
            >
              <IconPlus className="h-4 w-4" />
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
