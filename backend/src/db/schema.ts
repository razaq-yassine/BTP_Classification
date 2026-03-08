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
  tenantId: int('tenant_id'),
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
  tenantId: int('tenant_id'),
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

export const caEntries = mysqlTable('caEntries', {
  id: int('id').autoincrement().primaryKey(),
  organizationId: int('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  dossierId: int('dossier_id').notNull().references(() => dossiers.id, { onDelete: 'cascade' }),
  secteur: varchar('secteur', { length: 255 }).notNull(),
  annee: varchar('annee', { length: 255 }).notNull(),
  caTTC: decimal('ca_t_t_c', { precision: 10, scale: 2 }).notNull(),
  caHT: decimal('ca_h_t', { precision: 10, scale: 2 }).notNull(),
  montantSoustraite: decimal('montant_soustraite', { precision: 10, scale: 2 }),
  isGrosOeuvresSingleLot: boolean('is_gros_oeuvres_single_lot').default(true),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
  createdById: int('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  ownerId: int('owner_id').references(() => users.id, { onDelete: 'set null' }),
  editedById: int('edited_by_id').references(() => users.id, { onDelete: 'set null' }),
})

export const classificationRules = mysqlTable('classificationRules', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  sector: varchar('sector', { length: 255 }).notNull(),
  classe: varchar('classe', { length: 255 }).notNull(),
  method: varchar('method', { length: 255 }).notNull(),
  minCa: decimal('min_ca', { precision: 10, scale: 2 }).notNull(),
  minCapitalSocial: decimal('min_capital_social', { precision: 10, scale: 2 }),
  minEngineers: decimal('min_engineers', { precision: 10, scale: 2 }).notNull(),
  minTechnicians: decimal('min_technicians', { precision: 10, scale: 2 }).notNull(),
  minEncadrementScore: decimal('min_encadrement_score', { precision: 10, scale: 2 }).notNull(),
  masseSalarialeRatio: decimal('masse_salariale_ratio', { precision: 10, scale: 2 }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
  createdById: int('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  ownerId: int('owner_id').references(() => users.id, { onDelete: 'set null' }),
  editedById: int('edited_by_id').references(() => users.id, { onDelete: 'set null' }),
})

export const dossiers = mysqlTable('dossiers', {
  id: int('id').autoincrement().primaryKey(),
  organizationId: int('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  raisonSociale: varchar('raison_sociale', { length: 255 }).notNull(),
  formeJuridique: varchar('forme_juridique', { length: 255 }),
  dateCreation: datetime('date_creation'),
  ice: varchar('ice', { length: 255 }),
  status: varchar('status', { length: 255 }).notNull(),
  currentStep: decimal('current_step', { precision: 10, scale: 2 }),
  classificationMethod: varchar('classification_method', { length: 255 }).notNull(),
  sectorsSelected: varchar('sectors_selected', { length: 255 }),
  secteurClasseDemandee: varchar('secteur_classe_demandee', { length: 255 }),
  caYears: varchar('ca_years', { length: 255 }),
  caMax: decimal('ca_max', { precision: 10, scale: 2 }),
  caMaxHT: decimal('ca_max_h_t', { precision: 10, scale: 2 }),
  capitalSocial: decimal('capital_social', { precision: 10, scale: 2 }),
  masseSalariale: decimal('masse_salariale', { precision: 10, scale: 2 }),
  totalEncadrementScore: decimal('total_encadrement_score', { precision: 10, scale: 2 }),
  materielConfirmed: boolean('materiel_confirmed').default(true),
  notes: text('notes'),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
  createdById: int('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  ownerId: int('owner_id').references(() => users.id, { onDelete: 'set null' }),
  editedById: int('edited_by_id').references(() => users.id, { onDelete: 'set null' }),
})

export const materielItems = mysqlTable('materielItems', {
  id: int('id').autoincrement().primaryKey(),
  organizationId: int('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  secteur: varchar('secteur', { length: 255 }).notNull(),
  quantite: decimal('quantite', { precision: 10, scale: 2 }),
  valeur: decimal('valeur', { precision: 10, scale: 2 }),
  proprietaire: boolean('proprietaire').default(true),
  dossierId: int('dossier_id').notNull().references(() => dossiers.id, { onDelete: 'cascade' }),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
  createdById: int('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  ownerId: int('owner_id').references(() => users.id, { onDelete: 'set null' }),
  editedById: int('edited_by_id').references(() => users.id, { onDelete: 'set null' }),
})

export const membreEncadrements = mysqlTable('membreEncadrements', {
  id: int('id').autoincrement().primaryKey(),
  organizationId: int('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 255 }).notNull(),
  diplome: varchar('diplome', { length: 255 }),
  anneesExperience: decimal('annees_experience', { precision: 10, scale: 2 }).notNull(),
  secteurImputation: varchar('secteur_imputation', { length: 255 }),
  scoreCalcule: decimal('score_calcule', { precision: 10, scale: 2 }),
  dossierId: int('dossier_id').notNull().references(() => dossiers.id, { onDelete: 'cascade' }),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
  createdById: int('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  ownerId: int('owner_id').references(() => users.id, { onDelete: 'set null' }),
  editedById: int('edited_by_id').references(() => users.id, { onDelete: 'set null' }),
})

export const resultatSimulations = mysqlTable('resultatSimulations', {
  id: int('id').autoincrement().primaryKey(),
  organizationId: int('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  dossierId: int('dossier_id').notNull().references(() => dossiers.id, { onDelete: 'cascade' }),
  secteur: varchar('secteur', { length: 255 }).notNull(),
  classeObtenue: varchar('classe_obtenue', { length: 255 }),
  scoreCa: boolean('score_ca').default(true),
  scoreCapital: boolean('score_capital').default(true),
  scoreEncadrement: boolean('score_encadrement').default(true),
  scoreMasseSalariale: boolean('score_masse_salariale').default(true),
  scoreMateriel: boolean('score_materiel').default(true),
  caActualDH: decimal('ca_actual_dh', { precision: 10, scale: 2 }),
  encadrementScoreActual: decimal('encadrement_score_actual', { precision: 10, scale: 2 }),
  masseSalarialeRatioPercent: decimal('masse_salariale_ratio_percent', { precision: 10, scale: 2 }),
  details: text('details'),
  computedAt: datetime('computed_at'),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
  createdById: int('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  ownerId: int('owner_id').references(() => users.id, { onDelete: 'set null' }),
  editedById: int('edited_by_id').references(() => users.id, { onDelete: 'set null' }),
})

export type User = typeof users.$inferSelect
export type Organization = typeof organizations.$inferSelect
export type Tenant = typeof tenants.$inferSelect
export type Fil = typeof files.$inferSelect
export type RecordHistory = typeof recordHistory.$inferSelect
export type NotificationSetting = typeof notificationSettings.$inferSelect
export type InviteToken = typeof inviteTokens.$inferSelect
export type CaEntry = typeof caEntries.$inferSelect
export type ClassificationRul = typeof classificationRules.$inferSelect
export type Dossier = typeof dossiers.$inferSelect
export type MaterielItem = typeof materielItems.$inferSelect
export type MembreEncadrement = typeof membreEncadrements.$inferSelect
export type ResultatSimulation = typeof resultatSimulations.$inferSelect
