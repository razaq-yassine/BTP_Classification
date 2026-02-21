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
  emailVerified: boolean('email_verified').default(false),
  emailVerificationToken: varchar('email_verification_token', { length: 255 }),
  emailVerificationTokenExpires: datetime('email_verification_token_expires'),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  twoFactorCode: varchar('two_factor_code', { length: 10 }),
  twoFactorCodeExpires: datetime('two_factor_code_expires'),
  pendingEmail: varchar('pending_email', { length: 255 }),
  pendingEmailToken: varchar('pending_email_token', { length: 255 }),
  pendingEmailTokenExpires: datetime('pending_email_token_expires'),
    preferredLanguage: varchar('preferred_language', { length: 255 }),
})

export const organizations = mysqlTable('organizations', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
  createdById: int('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  ownerId: int('owner_id').references(() => users.id, { onDelete: 'set null' }),
  editedById: int('edited_by_id').references(() => users.id, { onDelete: 'set null' }),
    logo: varchar('logo', { length: 255 }),
    address: varchar('address', { length: 255 }),
    defaultCurrency: varchar('default_currency', { length: 255 }),
    currencySymbol: varchar('currency_symbol', { length: 255 }),
    timezone: varchar('timezone', { length: 255 }),
    defaultPreferredLanguage: varchar('default_preferred_language', { length: 255 }),
    sidebarTheme: varchar('sidebar_theme', { length: 255 }),
    maxStorageBytes: decimal('max_storage_bytes', { precision: 10, scale: 2 }),
})

export const tenants = mysqlTable('tenants', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  organizationId: int('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
  createdById: int('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  ownerId: int('owner_id').references(() => users.id, { onDelete: 'set null' }),
  editedById: int('edited_by_id').references(() => users.id, { onDelete: 'set null' }),
    logo: varchar('logo', { length: 255 }),
    address: varchar('address', { length: 255 }),
    defaultCurrency: varchar('default_currency', { length: 255 }),
    currencySymbol: varchar('currency_symbol', { length: 255 }),
    timezone: varchar('timezone', { length: 255 }),
    defaultPreferredLanguage: varchar('default_preferred_language', { length: 255 }),
    sidebarTheme: varchar('sidebar_theme', { length: 255 }),
    maxStorageBytes: decimal('max_storage_bytes', { precision: 10, scale: 2 }),
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

export const notificationSettings = mysqlTable('notification_settings', {
  id: int('id').autoincrement().primaryKey(),
  eventKey: varchar('event_key', { length: 255 }).notNull().unique(),
  enabled: boolean('enabled').default(false).notNull(),
  templateKey: varchar('template_key', { length: 255 }).notNull(),
})

export const inviteTokens = mysqlTable('invite_tokens', {
  id: int('id').autoincrement().primaryKey(),
  token: varchar('token', { length: 64 }).notNull().unique(),
  organizationId: int('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  tenantId: int('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }),
  profile: varchar('profile', { length: 255 }).default('standard-user'),
  invitedById: int('invited_by_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: datetime('expires_at').notNull(),
  usedAt: datetime('used_at'),
})

export type User = typeof users.$inferSelect
export type Organization = typeof organizations.$inferSelect
export type Tenant = typeof tenants.$inferSelect
export type Fil = typeof files.$inferSelect
export type RecordHistory = typeof recordHistory.$inferSelect
export type NotificationSetting = typeof notificationSettings.$inferSelect
export type InviteToken = typeof inviteTokens.$inferSelect
