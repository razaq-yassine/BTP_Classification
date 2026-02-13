import { z } from 'zod'

export const sidebarConfigSchema = z.object({
  showInSidebar: z.boolean().optional().default(true),
  group: z.string().optional(), // Nav group title (e.g. "Data", "General")
  parent: z.string().optional(), // Parent item title - puts this under a collapsible parent
})

export const objectSchema = z.object({
  name: z.string(),
  label: z.string(),
  labelPlural: z.string(),
  description: z.string().optional(),
  apiEndpoint: z.string(),
  basePath: z.string().optional(),
  detailPath: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  trigger: z.string().optional(),
  sidebar: sidebarConfigSchema.optional(),
})

export const fieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum([
    'string', 'number', 'boolean', 'date', 'datetime', 'email', 'phone', 'text', 'url',
    'select', 'multiselect', 'reference', 'lookup', 'autoNumber' // lookup maps to reference
  ]),
  required: z.boolean().optional(),
  editable: z.boolean().optional(),
  sortable: z.boolean().optional(),
  searchable: z.boolean().optional(),
  format: z.string().optional(),
  maxLength: z.number().optional(),
  options: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
        color: z.string().optional(),
        colorHover: z.string().optional(),
      })
    )
    .optional(),
  useInPath: z.boolean().optional(),
  isImportant: z.boolean().optional(),
  render: z.string().optional(),
  /** For reference fields: 'masterDetail' = required + cascade delete (use for junction/detail objects) */
  relationshipType: z.enum(['reference', 'masterDetail']).optional(),
  /** For reference fields: when true, parent delete cascades to children. Implied by relationshipType: 'masterDetail' */
  deleteOnCascade: z.boolean().optional(),
  computed: z.boolean().optional(),
  autoNumberPattern: z.string().optional(),
  autoNumberStart: z.number().optional(),
})

export const listViewSchema = z.object({
  fields: z.array(z.string()),
  defaultSort: z.string().optional(),
  defaultSortOrder: z.enum(['asc', 'desc']).optional(),
  pageSize: z.number().optional(),
})

export const detailViewSectionSchema = z.object({
  title: z.string(),
  columns: z.number().optional(),
  defaultOpen: z.boolean().optional(),
  fields: z.array(z.union([z.string(), fieldSchema])),
})

export const detailViewSchema = z.object({
  layout: z.enum(['single-column', 'two-column', 'tabs']).optional(),
  sections: z.array(detailViewSectionSchema).optional(),
})
