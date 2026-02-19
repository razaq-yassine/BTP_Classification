import crypto from 'crypto'
import { Hono } from 'hono'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { signToken, verifyToken } from '../lib/jwt.js'
import { authMiddleware } from '../middleware/auth.js'
import { loadEmailConfig, enqueueEmail } from '../services/email.js'

const loginSchema = z.object({ username: z.string(), password: z.string() })

const updateMeSchema = z.object({
  preferredLanguage: z.string().optional().nullable(),
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine((p) => /[a-z]/.test(p), 'Password must contain at least one lowercase letter')
    .refine((p) => /\d/.test(p), 'Password must contain at least one number'),
})

const requestEmailChangeSchema = z.object({
  newEmail: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const authRoutes = new Hono()

authRoutes.post('/login', async (c) => {
  const body = await c.req.json()
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ message: 'Username and password required' }, 400)
  }
  const { username, password } = parsed.data

  const [user] = await db.select().from(users).where(eq(users.username, username))
  if (!user || !user.isActive) {
    return c.json({ message: 'Invalid credentials' }, 401)
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return c.json({ message: 'Invalid credentials' }, 401)
  }

  const token = await signToken({ sub: user.username, id: user.id })

  const response: Record<string, unknown> = {
    accessToken: token,
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profile: user.profile || 'standard-user',
  }
  if ('organizationId' in user && user.organizationId != null) response.organizationId = user.organizationId
  if ('tenantId' in user && user.tenantId != null) response.tenantId = user.tenantId
  if ('preferredLanguage' in user) response.preferredLanguage = user.preferredLanguage
  if ('emailVerified' in user) response.emailVerified = user.emailVerified
  if ('twoFactorEnabled' in user) response.twoFactorEnabled = user.twoFactorEnabled
  if ('pendingEmail' in user && user.pendingEmail) response.pendingEmail = user.pendingEmail
  return c.json(response)
})

authRoutes.get('/me', async (c) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ message: 'Unauthorized' }, 401)
  }
  const token = auth.slice(7)
  try {
    const { id } = await verifyToken(token)
    const [user] = await db.select().from(users).where(eq(users.id, id))
    if (!user || !user.isActive) {
      return c.json({ message: 'Unauthorized' }, 401)
    }
    const response: Record<string, unknown> = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profile: user.profile || 'standard-user',
    }
    if ('organizationId' in user && user.organizationId != null) response.organizationId = user.organizationId
    if ('tenantId' in user && user.tenantId != null) response.tenantId = user.tenantId
    if ('preferredLanguage' in user) response.preferredLanguage = user.preferredLanguage
    if ('emailVerified' in user) response.emailVerified = user.emailVerified
    if ('twoFactorEnabled' in user) response.twoFactorEnabled = user.twoFactorEnabled
    if ('pendingEmail' in user && user.pendingEmail) response.pendingEmail = user.pendingEmail
    return c.json(response)
  } catch {
    return c.json({ message: 'Unauthorized' }, 401)
  }
})

authRoutes.patch('/me', authMiddleware, async (c) => {
  const user = c.get('user') as { id: number }
  const body = await c.req.json()
  const parsed = updateMeSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ message: 'Invalid request' }, 400)
  }
  const updates: Record<string, unknown> = {}
  if (parsed.data.preferredLanguage !== undefined) {
    updates.preferredLanguage = parsed.data.preferredLanguage
  }
  if (parsed.data.firstName !== undefined) {
    updates.firstName = parsed.data.firstName.trim() || null
  }
  if (parsed.data.lastName !== undefined) {
    updates.lastName = parsed.data.lastName.trim() || null
  }
  if (Object.keys(updates).length === 0) {
    return c.json({ message: 'No updates provided' }, 400)
  }
  await db.update(users).set(updates as any).where(eq(users.id, user.id))
  const [updated] = await db.select().from(users).where(eq(users.id, user.id))
  const response: Record<string, unknown> = {
    id: updated!.id,
    username: updated!.username,
    email: updated!.email,
    firstName: updated!.firstName,
    lastName: updated!.lastName,
    profile: updated!.profile || 'standard-user',
  }
  if ('organizationId' in updated! && updated!.organizationId != null) response.organizationId = updated!.organizationId
  if ('tenantId' in updated! && updated!.tenantId != null) response.tenantId = updated!.tenantId
  if ('preferredLanguage' in updated!) response.preferredLanguage = updated!.preferredLanguage
  if ('emailVerified' in updated!) response.emailVerified = updated!.emailVerified
  if ('twoFactorEnabled' in updated!) response.twoFactorEnabled = updated!.twoFactorEnabled
  if ('pendingEmail' in updated! && updated!.pendingEmail) response.pendingEmail = updated!.pendingEmail
  return c.json(response)
})

authRoutes.post('/change-password', authMiddleware, async (c) => {
  const user = c.get('user') as { id: number; passwordHash: string }
  const body = await c.req.json()
  const parsed = changePasswordSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid request'
    return c.json({ message: msg }, 400)
  }
  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
  if (!valid) {
    return c.json({ message: 'Invalid current password' }, 400)
  }
  const newHash = await bcrypt.hash(parsed.data.newPassword, 10)
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id))
  return c.json({ message: 'Password updated successfully' })
})

function isEmailConfigured(): boolean {
  const config = loadEmailConfig()
  return !!(config?.enabled && config?.smtpHost && config?.smtpUser && config?.smtpPassword)
}

function getAppUrl(): string {
  return process.env.APP_URL || 'http://localhost:5173'
}

authRoutes.post('/send-verification-email', authMiddleware, async (c) => {
  const user = c.get('user') as { id: number; email: string; firstName?: string | null }
  if (!isEmailConfigured()) {
    return c.json({ message: 'Email is not configured. Please contact your administrator.' }, 400)
  }
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id))
  if (!dbUser || !dbUser.isActive) {
    return c.json({ message: 'Unauthorized' }, 401)
  }
  if (dbUser.emailVerified) {
    return c.json({ message: 'Email is already verified' }, 400)
  }
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  await db
    .update(users)
    .set({
      emailVerificationToken: token,
      emailVerificationTokenExpires: expires,
    })
    .where(eq(users.id, user.id))
  const verifyUrl = `${getAppUrl()}/verify-email?token=${token}`
  enqueueEmail(dbUser.email, 'verify_email', {
    user: { firstName: dbUser.firstName || 'User', email: dbUser.email },
    verifyUrl,
    brandName: 'My App',
    logoOrBrand: 'My App',
  })
  return c.json({ message: 'Verification email sent' })
})

authRoutes.get('/verify-email', async (c) => {
  const rawToken = c.req.query('token')
  const token = typeof rawToken === 'string' ? rawToken.trim() : ''
  if (!token) {
    return c.json({ message: 'Token is required' }, 400)
  }
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.emailVerificationToken, token))
  const expiresAt = user?.emailVerificationTokenExpires ? new Date(user.emailVerificationTokenExpires) : null
  const isExpired = expiresAt ? new Date() > expiresAt : true
  if (!user || !expiresAt || isExpired) {
    return c.json({
      message: 'This link has already been used or has expired. If your email is already verified, you can go to Settings to confirm.',
      code: 'LINK_ALREADY_USED_OR_EXPIRED',
    }, 400)
  }
  await db
    .update(users)
    .set({
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpires: null,
    })
    .where(eq(users.id, user.id))
  return c.json({ message: 'Email verified successfully' })
})

authRoutes.post('/enable-2fa', authMiddleware, async (c) => {
  const user = c.get('user') as { id: number }
  if (!isEmailConfigured()) {
    return c.json({ message: 'Email is not configured. Two-factor authentication requires SMTP to be configured.' }, 400)
  }
  await db.update(users).set({ twoFactorEnabled: true }).where(eq(users.id, user.id))
  return c.json({ message: 'Two-factor authentication enabled' })
})

authRoutes.post('/disable-2fa', authMiddleware, async (c) => {
  const user = c.get('user') as { id: number; passwordHash: string }
  const body = await c.req.json().catch(() => ({}))
  const password = typeof body.password === 'string' ? body.password : ''
  if (!password) {
    return c.json({ message: 'Password is required to disable two-factor authentication' }, 400)
  }
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return c.json({ message: 'Invalid password' }, 400)
  }
  await db.update(users).set({ twoFactorEnabled: false }).where(eq(users.id, user.id))
  return c.json({ message: 'Two-factor authentication disabled' })
})

authRoutes.post('/request-email-change', authMiddleware, async (c) => {
  const user = c.get('user') as { id: number; email: string; firstName?: string | null; passwordHash: string }
  if (!isEmailConfigured()) {
    return c.json({ message: 'Email change is unavailable until SMTP is configured by your administrator.' }, 400)
  }
  const body = await c.req.json().catch(() => ({}))
  const parsed = requestEmailChangeSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid request'
    return c.json({ message: msg }, 400)
  }
  const { newEmail, password } = parsed.data
  const newEmailLower = newEmail.trim().toLowerCase()
  if (newEmailLower === user.email?.toLowerCase()) {
    return c.json({ message: 'New email is the same as your current email' }, 400)
  }
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return c.json({ message: 'Invalid password' }, 400)
  }
  const [existing] = await db.select().from(users).where(eq(users.email, newEmailLower))
  if (existing) {
    return c.json({ message: 'This email is already in use by another account' }, 400)
  }
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id))
  if (!dbUser || !dbUser.isActive) {
    return c.json({ message: 'Unauthorized' }, 401)
  }
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  await db
    .update(users)
    .set({
      pendingEmail: newEmailLower,
      pendingEmailToken: token,
      pendingEmailTokenExpires: expires,
    })
    .where(eq(users.id, user.id))
  const confirmUrl = `${getAppUrl()}/confirm-email-change?token=${token}`
  enqueueEmail(newEmailLower, 'change_email', {
    user: { firstName: dbUser.firstName || 'User', email: dbUser.email },
    newEmail: newEmailLower,
    confirmUrl,
    brandName: 'My App',
    logoOrBrand: 'My App',
  })
  return c.json({ message: 'Verification email sent to your new address. Please check your inbox.' })
})

authRoutes.get('/confirm-email-change', async (c) => {
  const rawToken = c.req.query('token')
  const token = typeof rawToken === 'string' ? rawToken.trim() : ''
  if (!token) {
    return c.json({ message: 'Token is required' }, 400)
  }
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.pendingEmailToken, token))
  const expiresAt = user?.pendingEmailTokenExpires ? new Date(user.pendingEmailTokenExpires) : null
  const isExpired = expiresAt ? new Date() > expiresAt : true
  if (!user || !expiresAt || isExpired) {
    // Fallback: token might be from "Verify email" flow (user clicked wrong link)
    const [verifyUser] = await db
      .select()
      .from(users)
      .where(eq(users.emailVerificationToken, token))
    const verifyExpires = verifyUser?.emailVerificationTokenExpires ? new Date(verifyUser.emailVerificationTokenExpires) : null
    if (verifyUser && verifyExpires && new Date() <= verifyExpires) {
      await db
        .update(users)
        .set({
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationTokenExpires: null,
        })
        .where(eq(users.id, verifyUser.id))
      return c.json({ message: 'Email verified successfully' })
    }
    return c.json({ message: 'Invalid or expired token. Please request a new verification link from Settings.' }, 400)
  }
  if (!user.pendingEmail) {
    return c.json({ message: 'No pending email change' }, 400)
  }
  const oldEmail = user.email
  const newEmail = user.pendingEmail
  await db
    .update(users)
    .set({
      email: newEmail,
      emailVerified: true,
      pendingEmail: null,
      pendingEmailToken: null,
      pendingEmailTokenExpires: null,
      emailVerificationToken: null,
      emailVerificationTokenExpires: null,
    })
    .where(eq(users.id, user.id))
  enqueueEmail(oldEmail, 'email_changed', {
    user: { firstName: user.firstName || 'User' },
    oldEmail,
    newEmail,
    brandName: 'My App',
    logoOrBrand: 'My App',
  })
  return c.json({ message: 'Email changed successfully. You can now sign in with your new email.' })
})
