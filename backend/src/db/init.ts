import { db } from './index.js'
import { users } from './schema.js'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { tenantConfig } from '../routes/entity-registry.generated.js'
import { seedMultiTenant } from './seed-multi-tenant.js'
import { seedSingleTenant } from './seed-single-tenant.js'
import { seedNotificationSettings } from './seed-notification-settings.js'
import { syncRulesFromConfig } from '../seeds/syncRulesFromConfig.js'

/** Seed minimal data - tables are created by Drizzle migrations. Admin user is mandatory. */
export async function initDb() {
  const mode = tenantConfig.mode as string
  if (mode === 'single_tenant') {
    await seedSingleTenant()
    return
  }
  if (mode === 'org_and_tenant') {
    await initDbMultiTenant()
    return
  }

  // multi_tenant or other: admin only
  const userList = await db.select().from(users)
  if (userList.length === 0) {
    const hash = await bcrypt.hash('admin123', 10)
    await db.insert(users).values({
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: hash,
      firstName: 'Admin',
      lastName: 'User',
      profile: 'admin',
      isActive: true,
      dateJoined: new Date(),
    })
    console.log('Created admin user: admin/admin123')
  } else {
    const [adminUser] = await db.select().from(users).where(eq(users.username, 'admin'))
    if (adminUser && adminUser.profile !== 'admin') {
      await db.update(users).set({ profile: 'admin' }).where(eq(users.id, adminUser.id))
      console.log('Updated admin user profile to admin')
    }
  }

  await seedNotificationSettings()

  await syncRulesFromConfig()
}

async function initDbMultiTenant() {
  const userList = await db.select().from(users)
  if (userList.length === 0) {
    const hash = await bcrypt.hash('admin123', 10)
    await db.insert(users).values({
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: hash,
      firstName: 'Admin',
      lastName: 'User',
      profile: 'admin',
      isActive: true,
      dateJoined: new Date(),
    })
    console.log('Created admin user: admin/admin123 (platform admin)')
  } else {
    const [adminUser] = await db.select().from(users).where(eq(users.username, 'admin'))
    if (adminUser) {
      if (adminUser.profile !== 'admin') {
        await db.update(users).set({ profile: 'admin' }).where(eq(users.id, adminUser.id))
        console.log('Updated admin user profile to admin')
      }
      if (adminUser.organizationId != null || adminUser.tenantId != null) {
        await db.update(users).set({ organizationId: null, tenantId: null }).where(eq(users.username, 'admin'))
        console.log('Cleared admin org/tenant (platform admin)')
      }
    }
  }

  await seedMultiTenant()
}
