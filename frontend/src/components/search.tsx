import { IconSearch } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useSearch } from '@/context/search-context'
import { Button } from './ui/button'

interface Props {
  className?: string
  type?: React.HTMLInputTypeAttribute
  placeholder?: string
}

export function Search({ className = '', placeholder }: Props) {
  const { t } = useTranslation('common')
  const displayPlaceholder = placeholder ?? t('search')
  const { setOpen } = useSearch()
  return (
    <Button
      variant='outline'
      className={cn(
        'bg-muted/25 text-muted-foreground hover:bg-muted/50 relative h-8 w-full min-w-0 flex-1 justify-start rounded-md text-sm font-normal shadow-none sm:pe-12',
        className
      )}
      onClick={() => setOpen(true)}
    >
      <IconSearch
        aria-hidden='true'
        className='absolute top-1/2 start-1.5 -translate-y-1/2'
      />
      <span className='ms-3 min-w-0 truncate'>{displayPlaceholder}</span>
      <kbd className='bg-muted pointer-events-none absolute top-[0.3rem] end-[0.3rem] hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex'>
        <span className='text-xs'>⌘</span>K
      </kbd>
    </Button>
  )
}
