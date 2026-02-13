import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getMetadataFile, saveMetadataFile } from '@/services/metadata-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { invalidateObjectDefinitions } from '@/hooks/useObjectDefinitionsQuery'

const listViewSchema = z.object({
  fields: z.array(z.string()),
  defaultSort: z.string().optional(),
  defaultSortOrder: z.enum(['asc', 'desc']).optional(),
  pageSize: z.number().optional(),
})

type ListViewFormValues = z.infer<typeof listViewSchema>

interface ListViewFormProps {
  objectName: string
}

export function ListViewForm({ objectName }: ListViewFormProps) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['metadata', objectName, 'listView.json'],
    queryFn: () => getMetadataFile<ListViewFormValues>(objectName, 'listView.json'),
  })

  const form = useForm<ListViewFormValues>({
    resolver: zodResolver(listViewSchema),
    values: data,
  })

  const onSubmit = async (values: ListViewFormValues) => {
    try {
      const payload = { ...data, ...values }
      await saveMetadataFile(objectName, 'listView.json', payload)
      invalidateObjectDefinitions(queryClient)
      toast.success('List view saved')
    } catch (err) {
      toast.error('Failed to save')
    }
  }

  if (isLoading || !data) {
    return <div className='text-muted-foreground'>Loading...</div>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
        <FormField
          control={form.control}
          name='fields'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fields (comma-separated)</FormLabel>
              <FormControl>
                <Input
                  value={field.value?.join(', ') ?? ''}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='defaultSort'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Sort</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='defaultSortOrder'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Sort Order</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Select order' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value='asc'>Ascending</SelectItem>
                  <SelectItem value='desc'>Descending</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='pageSize'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Page Size</FormLabel>
              <FormControl>
                <Input
                  type='number'
                  {...field}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit'>Save</Button>
      </form>
    </Form>
  )
}
