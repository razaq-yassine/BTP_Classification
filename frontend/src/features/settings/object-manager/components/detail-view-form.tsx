import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getMetadataFile, saveMetadataFile } from '@/services/metadata-api'
import { Button } from '@/components/ui/button'
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

const sectionSchema = z.object({
  title: z.string(),
  columns: z.number().optional(),
  defaultOpen: z.boolean().optional(),
  fields: z.array(z.string()),
})

const detailViewSchema = z.object({
  layout: z.enum(['single-column', 'two-column']),
  sections: z.array(sectionSchema),
})

type DetailViewFormValues = z.infer<typeof detailViewSchema>

interface DetailViewFormProps {
  objectName: string
}

export function DetailViewForm({ objectName }: DetailViewFormProps) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['metadata', objectName, 'detailView.json'],
    queryFn: () =>
      getMetadataFile<DetailViewFormValues>(objectName, 'detailView.json'),
  })

  const form = useForm<DetailViewFormValues>({
    resolver: zodResolver(detailViewSchema),
    values: data,
  })

  const onSubmit = async (values: DetailViewFormValues) => {
    try {
      const payload = { ...data, ...values }
      await saveMetadataFile(objectName, 'detailView.json', payload)
      invalidateObjectDefinitions(queryClient)
      toast.success('Detail view saved')
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
          name='layout'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Layout</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Select layout' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value='single-column'>Single Column</SelectItem>
                  <SelectItem value='two-column'>Two Column</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='sections'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sections (JSON)</FormLabel>
              <FormControl>
                <textarea
                  className='min-h-[200px] w-full rounded-md border bg-background px-3 py-2 font-mono text-sm'
                  value={JSON.stringify(field.value ?? [], null, 2)}
                  onChange={(e) => {
                    try {
                      field.onChange(JSON.parse(e.target.value || '[]'))
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
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
