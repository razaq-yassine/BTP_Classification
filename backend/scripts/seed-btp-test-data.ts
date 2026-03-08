/**
 * Seeds BTP Classifier test data for full flow validation.
 *
 * Creates:
 * - 2 organizations (Cabinet Alaoui & Associés, Cabinet Benali Conseil)
 * - 2 comptable users (Youssef Alaoui, Fatima Benali)
 * - 1 sample dossier under Cabinet Alaoui (for tenant isolation verification)
 *
 * Run: pnpm exec tsx scripts/seed-btp-test-data.ts
 *
 * Prerequisites: admin user exists. Classification rules are auto-synced on app startup.
 */
import 'dotenv/config'
import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { db } from '../src/db/index.js'
import { organizations, users, dossiers } from '../src/db/schema.js'

const PASSWORD = 'Test1234!'

async function seed() {
  const now = new Date()

  // 1. Cabinet Alaoui & Associés (organization)
  let orgAlaoui = (await db.select().from(organizations).where(eq(organizations.name, 'Cabinet Alaoui & Associés')))[0]
  if (!orgAlaoui) {
    await db.insert(organizations).values({
      name: 'Cabinet Alaoui & Associés',
      slug: 'cabinet-alaoui',
      createdAt: now,
      updatedAt: now,
    })
    orgAlaoui = (await db.select().from(organizations).where(eq(organizations.name, 'Cabinet Alaoui & Associés')))[0]!
    console.log('[seed-btp] Created organization: Cabinet Alaoui & Associés')
  } else {
    console.log('[seed-btp] Organization exists: Cabinet Alaoui & Associés')
  }

  // 2. Cabinet Benali Conseil (organization)
  let orgBenali = (await db.select().from(organizations).where(eq(organizations.name, 'Cabinet Benali Conseil')))[0]
  if (!orgBenali) {
    await db.insert(organizations).values({
      name: 'Cabinet Benali Conseil',
      slug: 'cabinet-benali',
      createdAt: now,
      updatedAt: now,
    })
    orgBenali = (await db.select().from(organizations).where(eq(organizations.name, 'Cabinet Benali Conseil')))[0]!
    console.log('[seed-btp] Created organization: Cabinet Benali Conseil')
  } else {
    console.log('[seed-btp] Organization exists: Cabinet Benali Conseil')
  }

  // 3. Youssef Alaoui (comptable, Cabinet Alaoui)
  let youssef = (await db.select().from(users).where(eq(users.email, 'youssef@cabinet-alaoui.ma')))[0]
  if (!youssef) {
    const hash = await bcrypt.hash(PASSWORD, 10)
    await db.insert(users).values({
      username: 'youssef.alaoui',
      email: 'youssef@cabinet-alaoui.ma',
      passwordHash: hash,
      firstName: 'Youssef',
      lastName: 'Alaoui',
      profile: 'comptable',
      isActive: true,
      dateJoined: now,
      emailVerified: true,
      organizationId: orgAlaoui.id!,
    })
    youssef = (await db.select().from(users).where(eq(users.email, 'youssef@cabinet-alaoui.ma')))[0]!
    console.log('[seed-btp] Created user: Youssef Alaoui (youssef@cabinet-alaoui.ma)')
  } else {
    console.log('[seed-btp] User exists: youssef@cabinet-alaoui.ma')
  }

  // 4. Fatima Benali (comptable, Cabinet Benali)
  let fatima = (await db.select().from(users).where(eq(users.email, 'fatima@cabinet-benali.ma')))[0]
  if (!fatima) {
    const hash = await bcrypt.hash(PASSWORD, 10)
    await db.insert(users).values({
      username: 'fatima.benali',
      email: 'fatima@cabinet-benali.ma',
      passwordHash: hash,
      firstName: 'Fatima',
      lastName: 'Benali',
      profile: 'comptable',
      isActive: true,
      dateJoined: now,
      emailVerified: true,
      organizationId: orgBenali.id!,
    })
    fatima = (await db.select().from(users).where(eq(users.email, 'fatima@cabinet-benali.ma')))[0]!
    console.log('[seed-btp] Created user: Fatima Benali (fatima@cabinet-benali.ma)')
  } else {
    console.log('[seed-btp] User exists: fatima@cabinet-benali.ma')
  }

  // 5. One sample dossier under Cabinet Alaoui (for Youssef to see; Fatima will see zero)
  const dossierName = 'DOS-TEST-001'
  try {
    const existingDossier = (await db.select().from(dossiers).where(eq(dossiers.name, dossierName)))[0]
    if (!existingDossier) {
      await db.insert(dossiers).values({
        organizationId: orgAlaoui.id!,
        name: dossierName,
        raisonSociale: 'Test Entreprise BTP',
        formeJuridique: 'SARL',
        status: 'brouillon',
        classificationMethod: 'T1',
        createdAt: now,
        updatedAt: now,
        createdById: youssef.id,
        ownerId: youssef.id,
      })
      console.log('[seed-btp] Created sample dossier: DOS-TEST-001 (Cabinet Alaoui)')
    } else {
      console.log('[seed-btp] Sample dossier exists: DOS-TEST-001')
    }
  } catch (err) {
    console.warn('[seed-btp] Could not create sample dossier (run db:deploy if dossiers table is missing organization_id):', (err as Error).message)
  }

  console.log('')
  console.log('--- Test credentials ---')
  console.log('Youssef (Cabinet Alaoui): youssef@cabinet-alaoui.ma / ' + PASSWORD)
  console.log('Fatima (Cabinet Benali):  fatima@cabinet-benali.ma / ' + PASSWORD)
  console.log('')
  console.log('[seed-btp] Done.')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
