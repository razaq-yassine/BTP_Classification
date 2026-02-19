import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'

interface ProfileListProps {
  profiles: string[]
  isLoading: boolean
  onSelect: (name: string) => void
}

export function ProfileList({ profiles, isLoading, onSelect }: ProfileListProps) {
  const { t } = useTranslation('settings')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return [...profiles].sort((a, b) => a.localeCompare(b))
    return profiles
      .filter((name) => name.toLowerCase().includes(s))
      .sort((a, b) => a.localeCompare(b))
  }, [profiles, search])

  if (isLoading) {
    return (
      <div className='rounded-md border p-4 text-muted-foreground'>
        {t('loadingProfiles')}
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      <div className='relative'>
        <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          placeholder={t('searchProfilesPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='pl-9'
        />
      </div>
      <ScrollArea className='h-[400px] rounded-md border'>
        <div className='p-2'>
          {filtered.length === 0 ? (
            <p className='py-4 text-center text-muted-foreground'>
              {t('noProfilesFound')}
            </p>
          ) : (
            filtered.map((name) => (
              <button
                key={name}
                type='button'
                onClick={() => onSelect(name)}
                className={cn(
                  'flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <span className='font-medium'>{name}</span>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
