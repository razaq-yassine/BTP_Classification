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
import { toast } from 'sonner'
import { invalidateObjectDefinitions } from '@/hooks/useObjectDefinitionsQuery'

const objectSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  labelPlural: z.string().min(1),
  description: z.string().optional(),
  apiEndpoint: z.string().min(1),
  basePath: z.string().optional(),
  detailPath: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  trigger: z.string().optional(),
  sidebar: z
    .object({
      showInSidebar: z.boolean().optional(),
      group: z.string().optional(),
      parent: z.string().optional(),
      showInSidebarForProfiles: z.array(z.string()).optional(),
    })
    .optional(),
})

type ObjectFormValues = z.infer<typeof objectSchema>

interface ObjectDetailsFormProps {
  objectName: string
}

export function ObjectDetailsForm({ objectName }: ObjectDetailsFormProps) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['metadata', objectName, 'object.json'],
    queryFn: () => getMetadataFile<ObjectFormValues>(objectName, 'object.json'),
  })

  const form = useForm<ObjectFormValues>({
    resolver: zodResolver(objectSchema),
    values: data,
  })

  const onSubmit = async (values: ObjectFormValues) => {
    try {
      const payload = { ...data, ...values }
      await saveMetadataFile(objectName, 'object.json', payload)
      invalidateObjectDefinitions(queryClient)
      toast.success('Object details saved')
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
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='label'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Label</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='labelPlural'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Label Plural</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='description'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='apiEndpoint'
          render={({ field }) => (
            <FormItem>
              <FormLabel>API Endpoint</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='basePath'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Base Path</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='detailPath'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Detail Path</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='icon'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Icon</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='color'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl>
                <Input {...field} />
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
