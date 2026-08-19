import { z } from 'zod'
import { defineContract } from './_kit'
import { mockUsers } from '@/mocks/factories'

export const NGO_ROLES = ['volunteer', 'coordinator', 'donor', 'beneficiary', 'other'] as const
export const NgoRole = z.enum(NGO_ROLES)
export type NgoRole = z.infer<typeof NgoRole>

/** The public profile shape. Never include anything the client must not see. */
export const User = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
  ngoRole: NgoRole,
  organization: z.string(),
  phone: z.string(),
  city: z.string(),
  systemRole: z.enum(['user', 'admin']),
  onboardingComplete: z.boolean(),
  createdAt: z.string(), // ISO string
})
export type User = z.infer<typeof User>

export const me = defineContract({
  method: 'GET',
  path: '/api/users/me',
  auth: 'user',
  summary: 'The signed-in user profile',
  input: z.object({}),
  output: z.object({ user: User }),
  mock: () => ({ user: mockUsers[0] }),
})

export const updateProfile = defineContract({
  method: 'PATCH',
  path: '/api/users/me',
  auth: 'user',
  summary: 'Update the signed-in user profile',
  input: z.object({
    name: z.string().min(1).max(80).optional(),
    ngoRole: NgoRole.optional(),
    organization: z.string().max(120).optional(),
    phone: z.string().max(40).optional(),
    city: z.string().max(80).optional(),
  }),
  output: z.object({ user: User }),
  mock: (patch) => ({
    user: {
      ...mockUsers[0],
      ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
    },
  }),
})

export const completeOnboarding = defineContract({
  method: 'POST',
  path: '/api/users/onboarding',
  auth: 'user',
  summary: 'Finish the onboarding gate — sets onboardingComplete server-side',
  input: z.object({
    ngoRole: NgoRole,
    organization: z.string().max(120).optional(),
    phone: z.string().max(40).optional(),
    city: z.string().max(80).optional(),
  }),
  output: z.object({ user: User }),
  mock: ({ ngoRole, organization, phone, city }) => ({
    user: {
      ...mockUsers[0],
      ngoRole,
      organization: organization ?? mockUsers[0].organization,
      phone: phone ?? mockUsers[0].phone,
      city: city ?? mockUsers[0].city,
      onboardingComplete: true,
    },
  }),
})
