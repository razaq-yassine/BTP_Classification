import { z } from 'zod'

const userStatusSchema = z.union([
  z.literal('active'),
  z.literal('inactive'),
  z.literal('invited'),
  z.literal('suspended'),
])
export type UserStatus = z.infer<typeof userStatusSchema>

const userRoleSchema = z.union([
  z.literal('superadmin'),
  z.literal('admin'),
  z.literal('cashier'),
  z.literal('manager'),
  z.string(),
])

const userSchema = z.object({
  id: z.union([z.string(), z.number()]),
  firstName: z.string(),
  lastName: z.string(),
  username: z.string(),
  email: z.string(),
  phoneNumber: z.string().optional().default(''),
  status: userStatusSchema,
  role: userRoleSchema,
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  dateJoined: z.string().optional(),
})
export type User = z.infer<typeof userSchema>

export const userListSchema = z.array(userSchema)

export function mapAdminUserToUser(row: {
  id: number
  username: string
  email: string
  firstName: string | null
  lastName: string | null
  profile: string
  isActive: boolean
  dateJoined?: string
}): User {
  return {
    id: row.id,
    firstName: row.firstName ?? '',
    lastName: row.lastName ?? '',
    username: row.username,
    email: row.email,
    phoneNumber: '',
    status: row.isActive ? 'active' : 'inactive',
    role: row.profile,
    dateJoined: row.dateJoined,
  }
}
