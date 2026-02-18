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
    'select', 'multiselect', 'reference', 'lookup', 'masterDetail', 'autoNumber', 'formula', // lookup maps to reference
    'password', 'geolocation', 'address', 'richText', 'file', 'color'
  ]),
  required: z.boolean().optional(),
  editable: z.boolean().optional(),
  /** Profile names that can edit this field even when editable: false (e.g. org-user for tenant field) */
  editableForProfiles: z.array(z.string()).optional(),
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
  /** Pre-fill value when creating new records. Type should match field type (string, number, boolean, or array for multiselect). */
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
  /** For formula fields: expression to evaluate (e.g. "quantity * price", "daysSince(orderDate)") */
  formulaExpression: z.string().optional(),
  /** For file fields: accepted file types (e.g. "image/*" or ".jpg,.jpeg,.png,.gif,.webp,.svg") */
  accept: z.string().optional(),
  /** For color fields: suggested hex values as quick-pick options (e.g. light theme presets) */
  suggestedColors: z.array(z.string()).optional(),
})

export const statisticsCardSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(['count', 'sum', 'avg', 'min', 'max']).optional(), // Built-in aggregation type
  field: z.string().optional(), // Field to aggregate (required for sum, avg, min, max)
  formula: z.string().optional(), // Custom formula handler (overrides type)
  sourceField: z.string().optional(), // Source field for custom formulas
  fallbackValue: z.string().optional(), // Fallback value if calculation fails
  icon: z.string().optional(), // Icon name (PascalCase)
  format: z.enum(['currency', 'percentage', 'number', 'text']).optional().default('text'),
})

export const listViewDefinitionSchema = z.object({
  key: z.string(),
  label: z.string(),
  fields: z.array(z.string()),
  defaultSort: z.string().optional(),
  defaultSortOrder: z.enum(['asc', 'desc']).optional(),
  pageSize: z.number().optional(),
  statistics: z.array(statisticsCardSchema).optional(),
  filters: z.record(z.string(), z.any()).optional(), // Filter criteria (e.g., { status: { $in: ['Open'] } })
  type: z.enum(['standard', 'recentlyViewed']).optional().default('standard'),
  /** Profile names; if omitted, view visible to all users who can read the object */
  profiles: z.array(z.string()).optional(),
})

export const listViewSchema = z.object({
  // Legacy single view support (backward compatible)
  fields: z.array(z.string()).optional(),
  defaultSort: z.string().optional(),
  defaultSortOrder: z.enum(['asc', 'desc']).optional(),
  pageSize: z.number().optional(),
  statistics: z.array(statisticsCardSchema).optional(),
  
  // Multiple views support
  defaultView: z.string().optional(),
  views: z.array(listViewDefinitionSchema).optional(),
}).refine(
  (data) => {
    // Either have legacy fields OR views array, but not both
    if (data.views && data.views.length > 0) {
      return true // views takes precedence
    }
    if (data.fields && data.fields.length > 0) {
      return true // legacy format is valid
    }
    return false // Must have either views or fields
  },
  {
    message: 'Must have either "views" array or legacy "fields" array',
  }
)

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
