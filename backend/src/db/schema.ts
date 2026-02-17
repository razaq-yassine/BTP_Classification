import { mysqlTable, int, varchar, text, decimal, boolean, datetime } from 'drizzle-orm/mysql-core'

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  profile: varchar('profile', { length: 255 }).default('standard-user'),
  isActive: boolean('is_active').default(true),
  dateJoined: datetime('date_joined'),
  organizationId: int('organization_id').references(() => organizations.id),
  tenantId: int('tenant_id').references(() => tenants.id),
})

export const organizations = mysqlTable('organizations', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
})

export const tenants = mysqlTable('tenants', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  organizationId: int('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
})

export const files = mysqlTable('files', {
  id: int('id').autoincrement().primaryKey(),
  objectName: varchar('object_name', { length: 255 }).notNull(),
  recordId: int('record_id').notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  storagePath: varchar('storage_path', { length: 512 }).notNull(),
  mimeType: varchar('mime_type', { length: 128 }),
  size: int('size').notNull(),
  isPublic: boolean('is_public').default(false).notNull(),
  uploadedById: int('uploaded_by_id').references(() => users.id, { onDelete: 'set null' }),
  uploadedAt: datetime('uploaded_at'),
  organizationId: int('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  tenantId: int('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
})

export const recordHistory = mysqlTable('record_history', {
  id: int('id').autoincrement().primaryKey(),
  objectName: varchar('object_name', { length: 255 }).notNull(),
  recordId: int('record_id').notNull(),
  fieldKey: varchar('field_key', { length: 255 }).notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  changedById: int('changed_by_id').references(() => users.id, { onDelete: 'set null' }),
  changedAt: datetime('changed_at'),
  organizationId: int('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  tenantId: int('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
})

export const categories = mysqlTable('categories', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
})

export const customers = mysqlTable('customers', {
  id: int('id').autoincrement().primaryKey(),
  organizationId: int('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  tenantId: int('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 255 }),
  company: varchar('company', { length: 255 }),
  address: text('address'),
  notes: varchar('notes', { length: 255 }),
  tags: varchar('tags', { length: 255 }),
  priority: varchar('priority', { length: 255 }),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
})

export const deploytests = mysqlTable('deploytests', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  fString: varchar('f_string', { length: 255 }),
  fNumber: varchar('f_number', { length: 255 }),
  fBoolean: boolean('f_boolean').default(true),
  fDate: datetime('f_date'),
  fDatetime: datetime('f_datetime'),
  fEmail: varchar('f_email', { length: 255 }),
  fPhone: varchar('f_phone', { length: 255 }),
  fText: text('f_text'),
  fUrl: varchar('f_url', { length: 255 }),
  fPassword: varchar('f_password', { length: 255 }),
  fGeolocation: text('f_geolocation'),
  fAddress: text('f_address'),
  fRichText: text('f_rich_text'),
  fFile: text('f_file'),
  fSelect: varchar('f_select', { length: 255 }),
  fMultiselect: varchar('f_multiselect', { length: 255 }),
  fReferenceId: int('f_reference_id').references(() => customers.id, { onDelete: 'set null' }),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
})

export const opportunities = mysqlTable('opportunities', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
})

export const orders = mysqlTable('orders', {
  id: int('id').autoincrement().primaryKey(),
  organizationId: int('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  tenantId: int('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  status: varchar('status', { length: 255 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  orderDate: datetime('order_date').notNull(),
  deliveryDate: datetime('delivery_date'),
  customerId: int('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
})

export const orderitems = mysqlTable('orderitems', {
  id: int('id').autoincrement().primaryKey(),
  organizationId: int('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  tenantId: int('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  orderId: int('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: int('product_id').notNull().references(() => products.id, { onDelete: 'set null' }),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
})

export const products = mysqlTable('products', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 255 }).notNull().unique(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
})

export const suppliers = mysqlTable('suppliers', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  contactEmail: varchar('contact_email', { length: 255 }),
  website: varchar('website', { length: 255 }),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
})

export const warehouses = mysqlTable('warehouses', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  location: varchar('location', { length: 255 }),
  capacity: decimal('capacity', { precision: 10, scale: 2 }),
  description: text('description').notNull(),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
})

export type User = typeof users.$inferSelect
export type Organization = typeof organizations.$inferSelect
export type Tenant = typeof tenants.$inferSelect
export type Fil = typeof files.$inferSelect
export type RecordHistory = typeof recordHistory.$inferSelect
export type Category = typeof categories.$inferSelect
export type Customer = typeof customers.$inferSelect
export type Deploytest = typeof deploytests.$inferSelect
export type Opportunity = typeof opportunities.$inferSelect
export type Order = typeof orders.$inferSelect
export type Orderitem = typeof orderitems.$inferSelect
export type Product = typeof products.$inferSelect
export type Supplier = typeof suppliers.$inferSelect
export type Warehous = typeof warehouses.$inferSelect
