import crypto from 'crypto'
import { Hono } from 'hono'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { rateLimiter } from 'hono-rate-limiter'
import { db } from '../db/index.js'
import { users, inviteTokens, organizations, tenants } from '../db/schema.js'
import { eq, or, and } from 'drizzle-orm'
import { signToken, verifyToken } from '../lib/jwt.js'
import { getClientIp } from '../lib/rate-limit-utils.js'
import { authMiddleware } from '../middleware/auth.js'
import { adminOnlyMiddleware } from '../middleware/admin.js'
import { loadEmailConfig, enqueueEmail } from '../services/email.js'

const rateLimiterLogin = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  keyGenerator: (c) => getClientIp(c),
})
const rateLimiterVerify2FA = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  keyGenerator: (c) => getClientIp(c),
})
const rateLimiterRegister = rateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 50,
  keyGenerator: (c) => getClientIp(c),
})
const rateLimiterChangePasswordRequired = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  keyGenerator: (c) => getClientIp(c),
})
const rateLimiterInviteValidate = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  keyGenerator: (c) => getClientIp(c),
})

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1).max(320),
  password: z.string().max(256),
})
const verify2FASchema = z.object({ tempToken: z.string(), code: z.string().length(6) })
const registerSchema = z.object({
  inviteToken: z.string().min(1, 'Invite token is required'),
  username: z.string().min(2).max(255).regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens'),
  email: z.string().email(),
  password: z.string().min(8).refine((p) => /[a-z]/.test(p), 'Password must contain at least one lowercase letter').refine((p) => /\d/.test(p), 'Password must contain at least one number'),
})

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

const createInviteSchema = z.object({
  email: z.string().email().optional(),
  organizationId: z.number().optional(),
  tenantId: z.number().optional(),
  profile: z.string().optional(),
})

const adminCreateUserSchema = z.object({
  username: z.string().min(2).max(255).regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens'),
  email: z.string().email(),
  password: z.string().min(8).refine((p) => /[a-z]/.test(p), 'Password must contain at least one lowercase letter').refine((p) => /\d/.test(p), 'Password must contain at least one number'),
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
  organizationId: z.number().optional().nullable(),
  tenantId: z.number().optional().nullable(),
  profile: z.string().optional(),
})

const adminInviteSchema = z.object({
  email: z.string().email(),
  organizationId: z.number().optional().nullable(),
  tenantId: z.number().optional().nullable(),
  profile: z.string().optional(),
})

const orgCreateUserSchema = z.object({
  username: z.string().min(2).max(255).regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens'),
  email: z.string().email(),
  password: z.string().min(8).refine((p) => /[a-z]/.test(p), 'Password must contain at least one lowercase letter').refine((p) => /\d/.test(p), 'Password must contain at least one number'),
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
  tenantId: z.number().optional().nullable(),
  profile: z.string().optional(),
})

const updateUserSchema = z.object({
  firstName: z.string().max(255).optional().nullable(),
  lastName: z.string().max(255).optional().nullable(),
  email: z.string().email().optional(),
  profile: z.string().optional(),
  organizationId: z.number().optional().nullable(),
  tenantId: z.number().optional().nullable(),
})

const adminChangePasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine((p) => /[a-z]/.test(p), 'Password must contain at least one lowercase letter')
    .refine((p) => /\d/.test(p), 'Password must contain at least one number'),
  forceReset: z.boolean().optional(),
  notifyUser: z.boolean().optional(),
})

const changePasswordRequiredSchema = z
  .object({
    tempToken: z.string().min(1, 'Token is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .refine((p) => /[a-z]/.test(p), 'Password must contain at least one lowercase letter')
      .refine((p) => /\d/.test(p), 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] })

type Variables = { user?: Record<string, unknown> };
export const authRoutes = new Hono<{ Variables: Variables }>()

// Public: validate invite token (no auth)
authRoutes.get('/invites/validate', rateLimiterInviteValidate, async (c) => {
  const token = c.req.query('token')?.trim()
  if (!token) {
    return c.json({ valid: false })
  }
  const [invite] = await db
    .select()
    .from(inviteTokens)
    .where(eq(inviteTokens.token, token))
  if (!invite || invite.usedAt) {
    return c.json({ valid: false })
  }
  const now = new Date()
  const expiresAt = new Date(invite.expiresAt)
  if (now > expiresAt) {
    return c.json({ valid: false })
  }
  let organizationName: string | undefined
  let tenantName: string | undefined
  if (invite.organizationId) {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, invite.organizationId))
    organizationName = org?.name
  }
  if (invite.tenantId) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, invite.tenantId))
    tenantName = tenant?.name
  }
  const inviteTarget = tenantName ? `${organizationName || 'Organization'} (${tenantName})` : (organizationName || 'the platform')
  return c.json({
    valid: true,
    organizationName: organizationName ?? null,
    tenantName: tenantName ?? null,
    inviteTarget,
    email: invite.email ?? null,
  })
})

// Create invite (auth required: admin, org owner, or tenant owner)
authRoutes.post('/invites', authMiddleware, async (c) => {
  const user = c.get('user') as {
    id: number
    profile?: string
    organizationId?: number | null
    tenantId?: number | null
  }
  const body = await c.req.json().catch(() => ({}))
  const parsed = createInviteSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ message: 'Invalid request' }, 400)
  }
  const { email, organizationId: reqOrgId, tenantId: reqTenantId, profile } = parsed.data

  const isAdmin = user.profile === 'admin'

  let targetOrgId: number | null = null
  let targetTenantId: number | null = null
  let targetProfile = profile ?? 'standard-user'

  if (isAdmin) {
    targetOrgId = reqOrgId ?? null
    targetTenantId = reqTenantId ?? null
  } else if (user.tenantId != null) {
    // Tenant owner: can only invite to their tenant
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, user.tenantId))
    if (!tenant) return c.json({ message: 'Tenant not found' }, 404)
    const [isOwner] = await db.select().from(tenants).where(and(eq(tenants.id, user.tenantId), eq(tenants.ownerId, user.id)))
    if (!isOwner) return c.json({ message: 'Forbidden: tenant owner required' }, 403)
    targetOrgId = tenant.organizationId
    targetTenantId = tenant.id
  } else if (user.organizationId != null) {
    // Org owner: can invite to their org, optionally to a tenant in their org
    const [org] = await db.select().from(organizations).where(eq(organizations.id, user.organizationId))
    if (!org) return c.json({ message: 'Organization not found' }, 404)
    const [isOwner] = await db.select().from(organizations).where(and(eq(organizations.id, user.organizationId), eq(organizations.ownerId, user.id)))
    if (!isOwner) return c.json({ message: 'Forbidden: organization owner required' }, 403)
    targetOrgId = org.id
    if (reqTenantId) {
      const [tenant] = await db.select().from(tenants).where(and(eq(tenants.id, reqTenantId), eq(tenants.organizationId, org.id)))
      if (!tenant) return c.json({ message: 'Tenant not found or not in your organization' }, 400)
      targetTenantId = tenant.id
    }
  } else {
    return c.json({ message: 'Forbidden: admin, org owner, or tenant owner required' }, 403)
  }

  // For multi_tenant/single_tenant/org_and_tenant we need at least org when not admin
  if (!isAdmin && targetOrgId == null) {
    return c.json({ message: 'Organization not found' }, 400)
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await db.insert(inviteTokens).values({
    token,
    organizationId: targetOrgId,
    tenantId: targetTenantId,
    email: email?.trim().toLowerCase() ?? null,
    profile: targetProfile,
    invitedById: user.id,
    expiresAt,
  })

  const inviteUrl = `${getAppUrl()}/sign-up?invite=${token}`

  if (email && isEmailConfigured()) {
    let organizationName = 'the platform'
    let tenantName: string | null = null
    if (targetOrgId) {
      const [org] = await db.select().from(organizations).where(eq(organizations.id, targetOrgId))
      organizationName = org?.name ?? 'Organization'
    }
    if (targetTenantId) {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, targetTenantId))
      tenantName = tenant?.name ?? null
    }
    const inviteTarget = tenantName ? `${organizationName} (${tenantName})` : organizationName
    enqueueEmail(email.trim().toLowerCase(), 'invite_user', {
      inviteUrl,
      inviteTarget,
      brandName: 'My App',
      logoOrBrand: 'My App',
    })
  }

  return c.json({
    inviteUrl,
    expiresAt: expiresAt.toISOString(),
    message: email && isEmailConfigured() ? 'Invite sent to email' : undefined,
  })
})

authRoutes.post('/login', rateLimiterLogin, async (c) => {
  const body = await c.req.json()
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ message: 'Username/email and password required' }, 400)
  }
  const { usernameOrEmail, password } = parsed.data
  const input = usernameOrEmail.trim()

  const [user] = await db
    .select()
    .from(users)
    .where(or(eq(users.username, input), eq(users.email, input)))
  if (!user || !user.isActive) {
    return c.json({ message: 'Invalid credentials' }, 401)
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return c.json({ message: 'Invalid credentials' }, 401)
  }

  if (user.twoFactorEnabled) {
    if (!isEmailConfigured()) {
      return c.json({
        message: 'Two-factor authentication is enabled but email is not configured. Please contact your administrator.',
      }, 400)
    }
    const code = crypto.randomInt(100000, 999999).toString()
    const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    await db
      .update(users)
      .set({ twoFactorCode: code, twoFactorCodeExpires: expires })
      .where(eq(users.id, user.id))
    enqueueEmail(user.email, 'two_factor_code', {
      user: { firstName: user.firstName || 'User', email: user.email },
      code,
      brandName: 'My App',
      logoOrBrand: 'My App',
    })
    const tempToken = await signToken(
      { sub: user.username, id: user.id, purpose: '2fa' },
      { expiresIn: '10m' }
    )
    return c.json({
      requiresTwoFactor: true,
      tempToken,
      message: 'Verification code sent to your email',
    })
  }

  const mustChange = !!(user as { mustChangePassword?: boolean }).mustChangePassword
  if (mustChange) {
    const changePwToken = await signToken(
      { sub: user.username, id: user.id, purpose: 'change_password_required' },
      { expiresIn: '15m' }
    )
    return c.json({
      mustChangePassword: true,
      tempToken: changePwToken,
      message: 'You must change your password before continuing',
    })
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

authRoutes.post('/verify-2fa', rateLimiterVerify2FA, async (c) => {
  const body = await c.req.json()
  const parsed = verify2FASchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ message: 'Token and 6-digit code required' }, 400)
  }
  const { tempToken, code } = parsed.data
  try {
    const payload = await verifyToken(tempToken)
    if (payload.purpose !== '2fa') {
      return c.json({ message: 'Invalid token' }, 401)
    }
    const userId = payload.id
    const [user] = await db.select().from(users).where(eq(users.id, userId))
    if (!user || !user.isActive) {
      return c.json({ message: 'Invalid token' }, 401)
    }
    const now = new Date()
    const expiresAt = user.twoFactorCodeExpires ? new Date(user.twoFactorCodeExpires) : null
    if (!user.twoFactorCode || !expiresAt || now > expiresAt) {
      return c.json({ message: 'Code expired. Please sign in again.' }, 401)
    }
    if (user.twoFactorCode !== code.trim()) {
      return c.json({ message: 'Invalid code' }, 401)
    }
    await db
      .update(users)
      .set({ twoFactorCode: null, twoFactorCodeExpires: null })
      .where(eq(users.id, user.id))
    const mustChange = !!(user as { mustChangePassword?: boolean }).mustChangePassword
    if (mustChange) {
      const changePwToken = await signToken(
        { sub: user.username, id: user.id, purpose: 'change_password_required' },
        { expiresIn: '15m' }
      )
      return c.json({
        mustChangePassword: true,
        tempToken: changePwToken,
        message: 'You must change your password before continuing',
      })
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
  } catch {
    return c.json({ message: 'Invalid or expired token' }, 401)
  }
})

authRoutes.post('/change-password-required', rateLimiterChangePasswordRequired, async (c) => {
  const body = await c.req.json()
  const parsed = changePasswordRequiredSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid request'
    return c.json({ message: msg }, 400)
  }
  try {
    const payload = await verifyToken(parsed.data.tempToken)
    if (payload.purpose !== 'change_password_required') {
      return c.json({ message: 'Invalid token' }, 401)
    }
    const userId = payload.id
    const [user] = await db.select().from(users).where(eq(users.id, userId))
    if (!user || !user.isActive) {
      return c.json({ message: 'Invalid token' }, 401)
    }
    const newHash = await bcrypt.hash(parsed.data.newPassword, 10)
    await db
      .update(users)
      .set({ passwordHash: newHash, mustChangePassword: false })
      .where(eq(users.id, user.id))
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
  } catch {
    return c.json({ message: 'Invalid or expired token' }, 401)
  }
})

authRoutes.post('/register', rateLimiterRegister, async (c) => {
  const body = await c.req.json()
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid request'
    return c.json({ message: msg }, 400)
  }
  const { inviteToken, username, email, password } = parsed.data
  const usernameTrim = username.trim().toLowerCase()
  const emailLower = email.trim().toLowerCase()

  const [invite] = await db.select().from(inviteTokens).where(eq(inviteTokens.token, inviteToken))
  if (!invite) {
    return c.json({ message: 'Invalid or expired invite' }, 400)
  }
  if (invite.usedAt) {
    return c.json({ message: 'This invite has already been used' }, 400)
  }
  const now = new Date()
  const expiresAt = new Date(invite.expiresAt)
  if (now > expiresAt) {
    return c.json({ message: 'This invite has expired' }, 400)
  }

  const [existingUsername] = await db.select().from(users).where(eq(users.username, usernameTrim))
  if (existingUsername) {
    return c.json({ message: 'Username is already taken' }, 400)
  }
  const existingByEmail = await db
    .select()
    .from(users)
    .where(or(eq(users.email, emailLower), eq(users.pendingEmail, emailLower)))
  if (existingByEmail.length > 0) {
    return c.json({ message: 'Email is already in use' }, 400)
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const emailVerified = invite.email != null && invite.email.toLowerCase() === emailLower

  await db.insert(users).values({
    username: usernameTrim,
    email: emailLower,
    passwordHash,
    firstName: null,
    lastName: null,
    profile: invite.profile || 'standard-user',
    isActive: true,
    dateJoined: new Date(),
    emailVerified,
    twoFactorEnabled: false,
    organizationId: invite.organizationId,
    tenantId: invite.tenantId,
  })
  const [newUser] = await db.select().from(users).where(eq(users.username, usernameTrim))
  if (!newUser) return c.json({ message: 'Registration failed' }, 500)

  await db.update(inviteTokens).set({ usedAt: new Date() }).where(eq(inviteTokens.id, invite.id))

  if (!emailVerified && isEmailConfigured()) {
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await db
      .update(users)
      .set({
        emailVerificationToken: token,
        emailVerificationTokenExpires: expires,
      })
      .where(eq(users.id, newUser.id))
    const verifyUrl = `${getAppUrl()}/verify-email?token=${token}`
    enqueueEmail(newUser.email, 'verify_email', {
      user: { firstName: newUser.firstName || 'User', email: newUser.email },
      verifyUrl,
      brandName: 'My App',
      logoOrBrand: 'My App',
    })
  }

  const accessToken = await signToken({ sub: newUser.username, id: newUser.id })
  const response: Record<string, unknown> = {
    accessToken,
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    profile: newUser.profile || 'standard-user',
    emailVerified,
    twoFactorEnabled: false,
    message: emailVerified ? 'Account created.' : (isEmailConfigured() ? 'Account created. Please verify your email.' : 'Account created.'),
  }
  if (newUser.organizationId != null) response.organizationId = newUser.organizationId
  if (newUser.tenantId != null) response.tenantId = newUser.tenantId
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
  const existingByEmail = await db
    .select()
    .from(users)
    .where(or(eq(users.email, newEmailLower), eq(users.pendingEmail, newEmailLower)))
  const otherUser = existingByEmail.find((u) => u.id !== user.id)
  if (otherUser) {
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

// List users (admin: all; org owner: org-scoped; tenant owner: tenant-scoped)
authRoutes.get('/users', authMiddleware, async (c) => {
  const user = c.get('user') as {
    id: number
    profile?: string
    organizationId?: number | null
    tenantId?: number | null
  }
  const page = Math.max(0, Number(c.req.query('page')) || 0)
  const size = Math.min(100, Math.max(1, Number(c.req.query('size')) || 20))
  const search = c.req.query('search')?.trim()

  const isAdmin = user.profile === 'admin'
  let allRows: typeof users.$inferSelect[]

  if (isAdmin) {
    allRows = await db.select().from(users).orderBy(users.username)
  } else if (user.tenantId != null) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, user.tenantId))
    if (!tenant) return c.json({ message: 'Tenant not found' }, 404)
    const [isOwner] = await db.select().from(tenants).where(and(eq(tenants.id, user.tenantId), eq(tenants.ownerId, user.id)))
    if (!isOwner) return c.json({ message: 'Forbidden: tenant owner required' }, 403)
    allRows = await db.select().from(users).where(eq(users.tenantId, user.tenantId)).orderBy(users.username)
  } else if (user.organizationId != null) {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, user.organizationId))
    if (!org) return c.json({ message: 'Organization not found' }, 404)
    const [isOwner] = await db.select().from(organizations).where(and(eq(organizations.id, user.organizationId), eq(organizations.ownerId, user.id)))
    if (!isOwner) return c.json({ message: 'Forbidden: organization owner required' }, 403)
    const orgTenants = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.organizationId, user.organizationId))
    const tenantIds = orgTenants.map((t) => t.id).filter((id): id is number => id != null)
    const orgCondition = eq(users.organizationId, user.organizationId)
    const tenantConditions = tenantIds.map((tid) => eq(users.tenantId, tid))
    allRows = await db
      .select()
      .from(users)
      .where(tenantConditions.length > 0 ? or(orgCondition, ...tenantConditions) : orgCondition)
      .orderBy(users.username)
  } else {
    return c.json({ message: 'Forbidden: admin, org owner, or tenant owner required' }, 403)
  }

  let filtered = allRows
  if (search) {
    const s = search.toLowerCase()
    filtered = allRows.filter(
      (u) =>
        (u.username?.toLowerCase().includes(s)) ||
        (u.email?.toLowerCase().includes(s)) ||
        (u.firstName?.toLowerCase().includes(s)) ||
        (u.lastName?.toLowerCase().includes(s))
    )
  }
  const total = filtered.length
  const rows = filtered.slice(page * size, page * size + size)

  const safeRows = rows.map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    profile: u.profile,
    isActive: u.isActive,
    organizationId: u.organizationId,
    tenantId: u.tenantId,
    dateJoined: u.dateJoined,
  }))

  return c.json({ rows: safeRows, total, page, size })
})

// Helper: get user IDs the current user can manage (admin: all; org owner: org-scoped; tenant owner: tenant-scoped)
async function getAllowedUserIds(
  currentUser: { id: number; profile?: string; organizationId?: number | null; tenantId?: number | null }
): Promise<number[]> {
  const isAdmin = currentUser.profile === 'admin'
  if (isAdmin) {
    const all = await db.select({ id: users.id }).from(users)
    return all.map((u) => u.id)
  }
  if (currentUser.tenantId != null) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, currentUser.tenantId))
    if (!tenant) return []
    const [isOwner] = await db.select().from(tenants).where(and(eq(tenants.id, currentUser.tenantId), eq(tenants.ownerId, currentUser.id)))
    if (!isOwner) return []
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.tenantId, currentUser.tenantId))
    return rows.map((u) => u.id)
  }
  if (currentUser.organizationId != null) {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, currentUser.organizationId))
    if (!org) return []
    const [isOwner] = await db.select().from(organizations).where(and(eq(organizations.id, currentUser.organizationId), eq(organizations.ownerId, currentUser.id)))
    if (!isOwner) return []
    const orgTenants = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.organizationId, currentUser.organizationId))
    const tenantIds = orgTenants.map((t) => t.id).filter((id): id is number => id != null)
    const orgCondition = eq(users.organizationId, currentUser.organizationId)
    const tenantConditions = tenantIds.map((tid) => eq(users.tenantId, tid))
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(tenantConditions.length > 0 ? or(orgCondition, ...tenantConditions) : orgCondition)
    return rows.map((u) => u.id)
  }
  return []
}

// Get single user (admin, org owner, or tenant owner)
authRoutes.get('/users/:id', authMiddleware, async (c) => {
  const user = c.get('user') as {
    id: number
    profile?: string
    organizationId?: number | null
    tenantId?: number | null
  }
  const targetId = Number(c.req.param('id'))
  if (!Number.isInteger(targetId) || targetId < 1) {
    return c.json({ message: 'Invalid user ID' }, 400)
  }
  const allowedIds = await getAllowedUserIds(user)
  if (!allowedIds.includes(targetId)) {
    return c.json({ message: 'User not found' }, 404)
  }
  const [target] = await db.select().from(users).where(eq(users.id, targetId))
  if (!target) return c.json({ message: 'User not found' }, 404)
  return c.json({
    id: target.id,
    username: target.username,
    email: target.email,
    firstName: target.firstName,
    lastName: target.lastName,
    profile: target.profile || 'standard-user',
    isActive: target.isActive,
    organizationId: target.organizationId,
    tenantId: target.tenantId,
    dateJoined: target.dateJoined,
    emailVerified: target.emailVerified,
    twoFactorEnabled: target.twoFactorEnabled,
    pendingEmail: target.pendingEmail,
    preferredLanguage: target.preferredLanguage,
    mustChangePassword: target.mustChangePassword ?? false,
  })
})

// Update user (admin, org owner, or tenant owner)
authRoutes.patch('/users/:id', authMiddleware, async (c) => {
  const user = c.get('user') as {
    id: number
    profile?: string
    organizationId?: number | null
    tenantId?: number | null
  }
  const targetId = Number(c.req.param('id'))
  if (!Number.isInteger(targetId) || targetId < 1) {
    return c.json({ message: 'Invalid user ID' }, 400)
  }
  const allowedIds = await getAllowedUserIds(user)
  if (!allowedIds.includes(targetId)) {
    return c.json({ message: 'User not found' }, 404)
  }
  const body = await c.req.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid request'
    return c.json({ message: msg }, 400)
  }
  const isAdmin = user.profile === 'admin'
  const updates: Record<string, unknown> = {}
  if (parsed.data.firstName !== undefined) updates.firstName = parsed.data.firstName?.trim() || null
  if (parsed.data.lastName !== undefined) updates.lastName = parsed.data.lastName?.trim() || null
  if (parsed.data.profile !== undefined) updates.profile = parsed.data.profile
  if (parsed.data.email !== undefined) {
    if (!isAdmin) return c.json({ message: 'Only admins can change user email' }, 403)
    const emailLower = parsed.data.email.trim().toLowerCase()
    const existing = await db.select().from(users).where(or(eq(users.email, emailLower), eq(users.pendingEmail, emailLower)))
    if (existing.some((u) => u.id !== targetId)) {
      return c.json({ message: 'Email is already in use' }, 400)
    }
    updates.email = emailLower
    updates.pendingEmail = null
    updates.pendingEmailToken = null
    updates.pendingEmailTokenExpires = null
  }
  if (parsed.data.organizationId !== undefined || parsed.data.tenantId !== undefined) {
    if (!isAdmin) return c.json({ message: 'Only admins can change organization or tenant' }, 403)
    if (parsed.data.organizationId !== undefined) updates.organizationId = parsed.data.organizationId
    if (parsed.data.tenantId !== undefined) updates.tenantId = parsed.data.tenantId
  }
  if (Object.keys(updates).length === 0) {
    return c.json({ message: 'No updates provided' }, 400)
  }
  await db.update(users).set(updates as any).where(eq(users.id, targetId))
  const [updated] = await db.select().from(users).where(eq(users.id, targetId))
  if (!updated) return c.json({ message: 'User not found' }, 404)
  return c.json({
    id: updated.id,
    username: updated.username,
    email: updated.email,
    firstName: updated.firstName,
    lastName: updated.lastName,
    profile: updated.profile || 'standard-user',
    isActive: updated.isActive,
    organizationId: updated.organizationId,
    tenantId: updated.tenantId,
    message: 'User updated successfully',
  })
})

// Change user password (admin, org owner, or tenant owner - no current password required)
authRoutes.post('/users/:id/change-password', authMiddleware, async (c) => {
  const user = c.get('user') as { id: number; profile?: string; organizationId?: number | null; tenantId?: number | null }
  const targetId = Number(c.req.param('id'))
  if (!Number.isInteger(targetId) || targetId < 1) {
    return c.json({ message: 'Invalid user ID' }, 400)
  }
  const allowedIds = await getAllowedUserIds(user)
  if (!allowedIds.includes(targetId)) {
    return c.json({ message: 'User not found' }, 404)
  }
  const body = await c.req.json()
  const parsed = adminChangePasswordSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid request'
    return c.json({ message: msg }, 400)
  }
  const [targetUser] = await db.select().from(users).where(eq(users.id, targetId))
  if (!targetUser) return c.json({ message: 'User not found' }, 404)

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10)
  const updates: Record<string, unknown> = { passwordHash: newHash }
  if (parsed.data.forceReset === true) {
    updates.mustChangePassword = true
  }
  await db.update(users).set(updates as any).where(eq(users.id, targetId))

  if (parsed.data.notifyUser === true && targetUser.emailVerified) {
    enqueueEmail(targetUser.email, 'password_changed', {
      user: { firstName: targetUser.firstName || 'User', email: targetUser.email },
      brandName: 'My App',
      logoOrBrand: 'My App',
    })
  }

  return c.json({ message: 'Password updated successfully' })
})

// Enable 2FA for user (admin, org owner, or tenant owner)
authRoutes.post('/users/:id/enable-2fa', authMiddleware, async (c) => {
  const user = c.get('user') as { id: number; profile?: string; organizationId?: number | null; tenantId?: number | null }
  if (!isEmailConfigured()) {
    return c.json({ message: 'Email is not configured. Two-factor authentication requires SMTP to be configured.' }, 400)
  }
  const targetId = Number(c.req.param('id'))
  if (!Number.isInteger(targetId) || targetId < 1) {
    return c.json({ message: 'Invalid user ID' }, 400)
  }
  const allowedIds = await getAllowedUserIds(user)
  if (!allowedIds.includes(targetId)) {
    return c.json({ message: 'User not found' }, 404)
  }
  await db.update(users).set({ twoFactorEnabled: true }).where(eq(users.id, targetId))
  return c.json({ message: 'Two-factor authentication enabled' })
})

// Disable 2FA for user (admin, org owner, or tenant owner - no password required)
authRoutes.post('/users/:id/disable-2fa', authMiddleware, async (c) => {
  const user = c.get('user') as { id: number; profile?: string; organizationId?: number | null; tenantId?: number | null }
  const targetId = Number(c.req.param('id'))
  if (!Number.isInteger(targetId) || targetId < 1) {
    return c.json({ message: 'Invalid user ID' }, 400)
  }
  const allowedIds = await getAllowedUserIds(user)
  if (!allowedIds.includes(targetId)) {
    return c.json({ message: 'User not found' }, 404)
  }
  await db.update(users).set({ twoFactorEnabled: false }).where(eq(users.id, targetId))
  return c.json({ message: 'Two-factor authentication disabled' })
})

// Create user with password (org/tenant owner only, scoped)
authRoutes.post('/users', authMiddleware, async (c) => {
  const user = c.get('user') as {
    id: number
    profile?: string
    organizationId?: number | null
    tenantId?: number | null
  }
  if (user.profile === 'admin') {
    return c.json({ message: 'Use POST /api/auth/admin/users for admin' }, 400)
  }
  const body = await c.req.json()
  const parsed = orgCreateUserSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid request'
    return c.json({ message: msg }, 400)
  }
  const { username, email, password, firstName, lastName, tenantId: reqTenantId, profile } = parsed.data
  const usernameTrim = username.trim().toLowerCase()
  const emailLower = email.trim().toLowerCase()

  const [existingUsername] = await db.select().from(users).where(eq(users.username, usernameTrim))
  if (existingUsername) {
    return c.json({ message: 'Username is already taken' }, 400)
  }
  const existingByEmail = await db
    .select()
    .from(users)
    .where(or(eq(users.email, emailLower), eq(users.pendingEmail, emailLower)))
  if (existingByEmail.length > 0) {
    return c.json({ message: 'Email is already in use' }, 400)
  }

  let targetOrgId: number
  let targetTenantId: number | null = null

  if (user.tenantId != null) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, user.tenantId))
    if (!tenant) return c.json({ message: 'Tenant not found' }, 404)
    const [isOwner] = await db.select().from(tenants).where(and(eq(tenants.id, user.tenantId), eq(tenants.ownerId, user.id)))
    if (!isOwner) return c.json({ message: 'Forbidden: tenant owner required' }, 403)
    targetOrgId = tenant.organizationId
    targetTenantId = tenant.id
  } else if (user.organizationId != null) {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, user.organizationId))
    if (!org) return c.json({ message: 'Organization not found' }, 404)
    const [isOwner] = await db.select().from(organizations).where(and(eq(organizations.id, user.organizationId), eq(organizations.ownerId, user.id)))
    if (!isOwner) return c.json({ message: 'Forbidden: organization owner required' }, 403)
    targetOrgId = org.id
    if (reqTenantId) {
      const [tenant] = await db.select().from(tenants).where(and(eq(tenants.id, reqTenantId), eq(tenants.organizationId, org.id)))
      if (!tenant) return c.json({ message: 'Tenant not found or not in your organization' }, 400)
      targetTenantId = tenant.id
    }
  } else {
    return c.json({ message: 'Forbidden: org owner or tenant owner required' }, 403)
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await db.insert(users).values({
    username: usernameTrim,
    email: emailLower,
    passwordHash,
    firstName: firstName?.trim() || null,
    lastName: lastName?.trim() || null,
    profile: profile || 'standard-user',
    isActive: true,
    dateJoined: new Date(),
    emailVerified: true,
    twoFactorEnabled: false,
    organizationId: targetOrgId,
    tenantId: targetTenantId,
  })
  const [newUser] = await db.select().from(users).where(eq(users.username, usernameTrim))
  if (!newUser) return c.json({ message: 'Failed to create user' }, 500)

  return c.json({
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    profile: newUser.profile || 'standard-user',
    organizationId: newUser.organizationId,
    tenantId: newUser.tenantId,
    message: 'User created successfully',
  })
})

// Admin: create user with password
authRoutes.post('/admin/users', authMiddleware, adminOnlyMiddleware, async (c) => {
  const body = await c.req.json()
  const parsed = adminCreateUserSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid request'
    return c.json({ message: msg }, 400)
  }
  const { username, email, password, firstName, lastName, organizationId, tenantId, profile } = parsed.data
  const usernameTrim = username.trim().toLowerCase()
  const emailLower = email.trim().toLowerCase()

  const [existingUsername] = await db.select().from(users).where(eq(users.username, usernameTrim))
  if (existingUsername) {
    return c.json({ message: 'Username is already taken' }, 400)
  }
  const existingByEmail = await db
    .select()
    .from(users)
    .where(or(eq(users.email, emailLower), eq(users.pendingEmail, emailLower)))
  if (existingByEmail.length > 0) {
    return c.json({ message: 'Email is already in use' }, 400)
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await db.insert(users).values({
    username: usernameTrim,
    email: emailLower,
    passwordHash,
    firstName: firstName?.trim() || null,
    lastName: lastName?.trim() || null,
    profile: profile || 'standard-user',
    isActive: true,
    dateJoined: new Date(),
    emailVerified: true,
    twoFactorEnabled: false,
    organizationId: organizationId ?? null,
    tenantId: tenantId ?? null,
  })
  const [newUser] = await db.select().from(users).where(eq(users.username, usernameTrim))
  if (!newUser) return c.json({ message: 'Failed to create user' }, 500)

  const response: Record<string, unknown> = {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    profile: newUser.profile || 'standard-user',
    message: 'User created successfully',
  }
  if (newUser.organizationId != null) response.organizationId = newUser.organizationId
  if (newUser.tenantId != null) response.tenantId = newUser.tenantId
  return c.json(response)
})

// Admin: invite user via email
authRoutes.post('/admin/invite', authMiddleware, adminOnlyMiddleware, async (c) => {
  const user = c.get('user') as { id: number }
  const body = await c.req.json()
  const parsed = adminInviteSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid request'
    return c.json({ message: msg }, 400)
  }
  const { email, organizationId, tenantId, profile } = parsed.data
  const emailLower = email.trim().toLowerCase()

  const existingByEmail = await db
    .select()
    .from(users)
    .where(or(eq(users.email, emailLower), eq(users.pendingEmail, emailLower)))
  if (existingByEmail.length > 0) {
    return c.json({ message: 'Email is already in use' }, 400)
  }

  if (tenantId != null && organizationId == null) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId))
    if (!tenant) return c.json({ message: 'Tenant not found' }, 400)
  }
  if (organizationId != null) {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId))
    if (!org) return c.json({ message: 'Organization not found' }, 400)
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await db.insert(inviteTokens).values({
    token,
    organizationId: organizationId ?? null,
    tenantId: tenantId ?? null,
    email: emailLower,
    profile: profile || 'standard-user',
    invitedById: user.id,
    expiresAt,
  })

  const inviteUrl = `${getAppUrl()}/sign-up?invite=${token}`

  if (isEmailConfigured()) {
    let organizationName = 'the platform'
    let tenantName: string | null = null
    if (organizationId) {
      const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId))
      organizationName = org?.name ?? 'Organization'
    }
    if (tenantId) {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId))
      tenantName = tenant?.name ?? null
    }
    const inviteTarget = tenantName ? `${organizationName} (${tenantName})` : organizationName
    enqueueEmail(emailLower, 'invite_user', {
      inviteUrl,
      inviteTarget,
      brandName: 'My App',
      logoOrBrand: 'My App',
    })
  }

  return c.json({
    inviteUrl,
    expiresAt: expiresAt.toISOString(),
    message: isEmailConfigured() ? 'Invite sent to email' : 'Invite created',
  })
})

// Admin: list users
authRoutes.get('/admin/users', authMiddleware, adminOnlyMiddleware, async (c) => {
  const page = Math.max(0, Number(c.req.query('page')) || 0)
  const size = Math.min(100, Math.max(1, Number(c.req.query('size')) || 20))
  const search = c.req.query('search')?.trim()

  let query = db.select().from(users).orderBy(users.username)
  const allRows = await query
  let filtered = allRows
  if (search) {
    const s = search.toLowerCase()
    filtered = allRows.filter(
      (u) =>
        (u.username?.toLowerCase().includes(s)) ||
        (u.email?.toLowerCase().includes(s)) ||
        (u.firstName?.toLowerCase().includes(s)) ||
        (u.lastName?.toLowerCase().includes(s))
    )
  }
  const total = filtered.length
  const rows = filtered.slice(page * size, page * size + size)

  const safeRows = rows.map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    profile: u.profile,
    isActive: u.isActive,
    organizationId: u.organizationId,
    tenantId: u.tenantId,
    dateJoined: u.dateJoined,
  }))

  return c.json({ rows: safeRows, total, page, size })
})
