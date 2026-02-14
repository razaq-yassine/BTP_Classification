import { useState, useMemo } from 'react'
import { ListViewDefinition } from '@/types/object-definition'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronDown, Pin, Search, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ListViewSwitcherProps {
  objectIcon?: React.ComponentType<{ className?: string }>
  views: ListViewDefinition[]
  activeViewKey: string
  recordCount: number
  onViewChange: (viewKey: string) => void
  pinnedViewKey: string | null
  onPinChange: (viewKey: string | null) => void
}

export function ListViewSwitcher({
  objectIcon: ObjectIcon,
  views,
  activeViewKey,
  recordCount,
  onViewChange,
  pinnedViewKey,
  onPinChange,
}: ListViewSwitcherProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)

  const activeView = views.find((v) => v.key === activeViewKey) || views[0]
  const isPinned = pinnedViewKey === activeViewKey

  const filteredViews = useMemo(() => {
    if (!searchQuery.trim()) {
      // No search: show pinned first, then rest
      const pinned = pinnedViewKey ? views.find((v) => v.key === pinnedViewKey) : null
      const others = views.filter((v) => v.key !== pinnedViewKey)
      return pinned ? [pinned, ...others] : views
    }
    const q = searchQuery.toLowerCase()
    return views.filter((v) => v.label.toLowerCase().includes(q))
  }, [views, searchQuery, pinnedViewKey])

  const handleSelectView = (viewKey: string) => {
    onViewChange(viewKey)
    setOpen(false)
  }

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onPinChange(isPinned ? null : activeViewKey)
  }

  const itemCountLabel = recordCount === 1 ? '1 item' : `${recordCount} items`

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      {/* Main heading: icon + name + count + arrow + pin */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Icon */}
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          {ObjectIcon ? (
            <ObjectIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          ) : (
            <div className="h-4 w-4 sm:h-5 sm:w-5 rounded bg-primary-foreground/30" />
          )}
        </div>

        {/* View name + dropdown + pin */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 sm:gap-1.5 rounded-md hover:bg-muted/50 px-1 py-0.5 -ml-1 transition-colors group data-[state=open]:bg-muted/50 border-b-2 border-transparent hover:border-muted-foreground/20 data-[state=open]:border-muted-foreground/30 min-w-0"
              >
                <span className="text-lg sm:text-2xl font-bold tracking-tight truncate">
                  {activeView?.label ?? 'All'}
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground shrink-0">
                  {itemCountLabel}
                </span>
                <ChevronDown className={cn("h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64" sideOffset={8}>
              <div className="px-2 py-1.5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search lists..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8"
                  />
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                  {searchQuery.trim() ? 'Matching lists' : 'List views'}
                </DropdownMenuLabel>
                {filteredViews.map((view) => (
                  <DropdownMenuItem
                    key={view.key}
                    onClick={() => handleSelectView(view.key)}
                    className="flex items-center gap-2"
                  >
                    <span className={cn(
                      "w-5 shrink-0 flex items-center justify-center",
                      activeViewKey !== view.key && "invisible"
                    )}>
                      {activeViewKey === view.key && <Check className="h-4 w-4 text-primary" />}
                    </span>
                    <span className="truncate flex-1">
                      {view.label}
                      {pinnedViewKey === view.key && (
                        <span className="text-muted-foreground ml-1">(Pinned list)</span>
                      )}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Pin button */}
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 sm:h-9 sm:w-9 shrink-0 rounded-full"
            onClick={handlePinClick}
            title={isPinned ? 'Unpin as default view' : 'Pin as default view'}
          >
            <Pin className={cn("h-3 w-3 sm:h-4 sm:w-4", isPinned && "fill-current")} />
          </Button>
        </div>
      </div>
    </div>
  )
}
