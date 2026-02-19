// import { Cross2Icon } from '@radix-ui/react-icons' // Temporarily disabled
import { useTranslation } from 'react-i18next'
import { Table } from '@tanstack/react-table'

// import { Button } from '@/components/ui/button' // Temporarily disabled
import { Input } from '@/components/ui/input'
// import { GenericDataTableViewOptions } from './GenericDataTableViewOptions' // Temporarily disabled

import { ObjectDefinition } from '@/types/object-definition'

interface GenericDataTableToolbarProps<TData> {
  table: Table<TData>
  objectDefinition: ObjectDefinition
}

export function GenericDataTableToolbar<TData>({
  table,
  objectDefinition,
}: GenericDataTableToolbarProps<TData>) {
  const { t } = useTranslation('common')
  // const isFiltered = table.getState().columnFilters.length > 0 // Temporarily disabled

  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-1 items-center space-x-2'>
        <Input
          placeholder={t('filterPlaceholder', { objectName: (objectDefinition.labelPlural ?? objectDefinition.name + 's').toLowerCase() })}
          value={(table.getState().globalFilter as string) ?? ''}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          className='h-8 w-[150px] lg:w-[250px]'
        />
        {/* Temporarily disabled to isolate infinite loop */}
        {/* {isFiltered && (
          <Button
            variant='ghost'
            onClick={() => table.resetColumnFilters()}
            className='h-8 px-2 lg:px-3'
          >
            Reset
            <Cross2Icon className='ml-2 h-4 w-4' />
          </Button>
        )} */}
      </div>
      {/* Temporarily disabled to isolate infinite loop */}
      {/* <GenericDataTableViewOptions table={table} /> */}
    </div>
  )
}
