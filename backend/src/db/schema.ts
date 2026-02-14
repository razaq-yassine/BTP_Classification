import { mysqlTable, int, varchar, decimal, boolean, datetime } from 'drizzle-orm/mysql-core'

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  isActive: boolean('is_active').default(true),
  dateJoined: datetime('date_joined'),
})

export const categories = mysqlTable('categories', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
})

export const customers = mysqlTable('customers', {
  id: int('id').autoincrement().primaryKey(),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 255 }),
  company: varchar('company', { length: 255 }),
  address: varchar('address', { length: 255 }),
  notes: varchar('notes', { length: 255 }),
  tags: varchar('tags', { length: 255 }),
  priority: varchar('priority', { length: 255 }),
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
  name: varchar('name', { length: 255 }).notNull().unique(),
  status: varchar('status', { length: 255 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  description: varchar('description', { length: 255 }),
  orderDate: datetime('order_date').notNull(),
  deliveryDate: datetime('delivery_date'),
  customerId: int('customer_id').notNull().references(() => customers.id),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
})

export const orderitems = mysqlTable('orderitems', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  orderId: int('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: int('product_id').notNull().references(() => products.id),
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
  description: varchar('description', { length: 255 }),
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
  description: varchar('description', { length: 255 }).notNull(),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
})

export type User = typeof users.$inferSelect
export type Category = typeof categories.$inferSelect
export type Customer = typeof customers.$inferSelect
export type Opportunity = typeof opportunities.$inferSelect
export type Order = typeof orders.$inferSelect
export type Orderitem = typeof orderitems.$inferSelect
export type Product = typeof products.$inferSelect
export type Supplier = typeof suppliers.$inferSelect
export type Warehous = typeof warehouses.$inferSelect
