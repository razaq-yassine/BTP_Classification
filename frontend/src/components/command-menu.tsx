import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  IconArrowRightDashed,
  IconChevronRight,
  IconDeviceLaptop,
  IconMoon,
  IconSun,
} from '@tabler/icons-react'
import { useSearch } from '@/context/search-context'
import { useTheme } from '@/context/theme-context'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useSidebarData } from '@/hooks/useSidebarData'
import { useObjectDefinitionsQuery } from '@/hooks/useObjectDefinitionsQuery'
import { useAuthStore, selectUser } from '@/stores/authStore'
import { searchObjects, getRecentRecords } from '@/services/search-api'
import { getGlobalRecentlyViewed } from '@/utils/recently-viewed'
import { pluralize } from '@/metadata/utils'
import { useQuery } from '@tanstack/react-query'
import type { ObjectDefinition } from '@/types/object-definition'

function getRecordDisplayName(record: Record<string, unknown>): string {
  return (
    (record.name as string) ??
    (record.fullName as string) ??
    (record.full_name as string) ??
    (record.title as string) ??
    (record.id != null ? `Record ${record.id}` : 'Unknown')
  )
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

export function CommandMenu() {
  const navigate = useNavigate()
  const { setTheme } = useTheme()
  const { open, setOpen } = useSearch()
  const user = useAuthStore(selectUser)
  const sidebarData = useSidebarData()
  const { data: defs } = useObjectDefinitionsQuery()

  const [searchValue, setSearchValue] = useState('')
  const debouncedSearch = useDebouncedValue(searchValue.trim(), 300)

  const entityPathToDef = useMemo(() => {
    const map = new Map<string, ObjectDefinition>()
    if (!defs) return map
    for (const def of defs) {
      const path = pluralize(def.name)
      map.set(path, def)
    }
    return map
  }, [defs])

  const searchQuery = useQuery({
    queryKey: ['search', debouncedSearch],
    queryFn: () => searchObjects(debouncedSearch, 5),
    enabled: open && debouncedSearch.length > 0,
    staleTime: 30 * 1000,
  })

  const recentRecords = useQuery({
    queryKey: ['search', 'recent', user?.id],
    queryFn: async () => {
      const entries = getGlobalRecentlyViewed(user?.id, 20)
      if (entries.length === 0) return { results: {}, counts: {}, total: 0 }
      return getRecentRecords(entries, 20)
    },
    enabled: open && debouncedSearch.length === 0 && !!user?.id,
    staleTime: 10 * 1000,
  })

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false)
      setSearchValue('')
      command()
    },
    [setOpen]
  )

  const handleSelectRecord = React.useCallback(
    (entityPath: string, record: Record<string, unknown>) => {
      const def = entityPathToDef.get(entityPath)
      const recordId = record.id
      if (recordId == null) return

      if (def?.detailPath) {
        const idPlaceholder = `$${def.name}Id`
        const detailPath = def.detailPath.replace(
          idPlaceholder,
          String(recordId)
        )
        runCommand(() => navigate({ to: detailPath }))
      } else if (def?.basePath) {
        runCommand(() => navigate({ to: `${def.basePath}/${recordId}` }))
      } else {
        runCommand(() => navigate({ to: `/${entityPath}/${recordId}` }))
      }
    },
    [entityPathToDef, navigate, runCommand]
  )

  const hasSearchResults =
    debouncedSearch.length > 0 &&
    searchQuery.data &&
    Object.keys(searchQuery.data.results).length > 0

  const hasRecentResults =
    debouncedSearch.length === 0 &&
    recentRecords.data &&
    Object.keys(recentRecords.data.results).length > 0

  const showSearchOrRecent =
    (debouncedSearch.length > 0 &&
      (hasSearchResults || searchQuery.isFetching)) ||
    (debouncedSearch.length === 0 &&
      (hasRecentResults || recentRecords.isFetching))
  const results = hasSearchResults
    ? searchQuery.data!.results
    : hasRecentResults
      ? recentRecords.data!.results
      : {}
  const isLoading =
    (debouncedSearch.length > 0 && searchQuery.isFetching) ||
    (debouncedSearch.length === 0 && recentRecords.isFetching)

  useEffect(() => {
    if (!open) setSearchValue('')
  }, [open])

  return (
    <CommandDialog
      modal
      open={open}
      onOpenChange={setOpen}
      shouldFilter={!showSearchOrRecent}
    >
      <CommandInput
        placeholder="Type a command or search..."
        value={searchValue}
        onValueChange={setSearchValue}
      />
      <CommandList className="max-h-[min(24rem,70vh)]">
        {showSearchOrRecent ? (
          <>
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : Object.keys(results).length === 0 ? (
              <CommandEmpty>No results found.</CommandEmpty>
            ) : (
              Object.entries(results).map(([entityPath, records]) => {
                const def = entityPathToDef.get(entityPath)
                const label =
                  def?.labelPlural ??
                  entityPath.charAt(0).toUpperCase() + entityPath.slice(1)
                const Icon = def?.icon

                return (
                  <CommandGroup key={entityPath} heading={label}>
                    {(records as Record<string, unknown>[]).map((record) => (
                      <CommandItem
                        key={`${entityPath}-${record.id}`}
                        value={getRecordDisplayName(record)}
                        onSelect={() => handleSelectRecord(entityPath, record)}
                      >
                        {Icon ? (
                          <Icon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <IconArrowRightDashed className="text-muted-foreground/80 mr-2 size-4" />
                        )}
                        {getRecordDisplayName(record)}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
              })
            )}
          </>
        ) : (
          <>
            <CommandEmpty>No results found.</CommandEmpty>
            {sidebarData.navGroups.map((group) => (
              <CommandGroup key={group.title} heading={group.title}>
                {group.items.map((navItem, i) => {
                  if (navItem.url)
                    return (
                      <CommandItem
                        key={`${navItem.url}-${i}`}
                        value={navItem.title}
                        onSelect={() => {
                          runCommand(() => navigate({ to: navItem.url }))
                        }}
                      >
                        <div className="mr-2 flex h-4 w-4 items-center justify-center">
                          <IconArrowRightDashed className="text-muted-foreground/80 size-2" />
                        </div>
                        {navItem.title}
                      </CommandItem>
                    )

                  return navItem.items?.map((subItem, i) => (
                    <CommandItem
                      key={`${navItem.title}-${subItem.url}-${i}`}
                      value={`${navItem.title}-${subItem.url}`}
                      onSelect={() => {
                        runCommand(() => navigate({ to: subItem.url }))
                      }}
                    >
                      <div className="mr-2 flex h-4 w-4 items-center justify-center">
                        <IconArrowRightDashed className="text-muted-foreground/80 size-2" />
                      </div>
                      {navItem.title} <IconChevronRight /> {subItem.title}
                    </CommandItem>
                  ))
                })}
              </CommandGroup>
            ))}
            <CommandSeparator />
            <CommandGroup heading="Theme">
              <CommandItem onSelect={() => runCommand(() => setTheme('light'))}>
                <IconSun /> <span>Light</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => setTheme('dark'))}>
                <IconMoon className="scale-90" />
                <span>Dark</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => setTheme('system'))}>
                <IconDeviceLaptop />
                <span>System</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
