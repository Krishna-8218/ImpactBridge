import type { z } from 'zod'

import { ApiError } from '@/contracts/_kit'
import type * as users from '@/contracts/users'
import { db } from '@/db'

/**
 * Business logic for the `users.*` contracts.
 *
 * Reads and writes the Better Auth `user` table from the GENERATED
 * `src/db/schema/auth.ts`. Regenerate with `npm run auth:generate` after changing
 * `additionalFields` in `src/lib/auth.ts` — never hand-edit that file.
 */

/**
 * Types come from the contract, never from a hand-written duplicate — that is what
 * keeps the handler and the wire format from drifting. `defineRoute` re-validates the
 * output against the same schema in dev.
 */
export type PublicUser = z.infer<typeof users.User>
export type UpdateProfileInput = z.infer<(typeof users.updateProfile)['input']>
export type CompleteOnboardingInput = z.infer<(typeof users.completeOnboarding)['input']>

/**
 * Row → wire mapper.
 *
 * Two mismatches to absorb, both real:
 *  1. `createdAt` is a Date in the row and MUST become an ISO string — the contract says
 *     `z.string()`, and a Date would not survive JSON intact.
 *  2. The `additionalFields` columns are generated as `.default(...)` but NOT `.notNull()`,
 *     so Drizzle types them nullable, while the contract's `User` requires non-null. Every
 *     one of them is coalesced here. Without this the route would return null for a fresh
 *     Google sign-up and `defineRoute`'s dev-mode check would (correctly) fire
 *     CONTRACT_VIOLATION.
 *
 * Nothing outside the contract's `User` shape may leak out — note `password` and the
 * OAuth tokens live on other tables, but keep this an explicit allow-list regardless.
 */
const toPublicUser = (row: any): PublicUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  image: row.image ?? null,
  ngoRole: row.ngoRole ?? 'volunteer',
  organization: row.organization ?? '',
  phone: row.phone ?? '',
  city: row.city ?? '',
  systemRole: row.systemRole ?? 'user',
  onboardingComplete: row.onboardingComplete ?? false,
  createdAt: row.createdAt.toISOString(),
})

/** Drop `undefined` keys so a partial update never blanks a column it didn't mention. */
const definedOnly = <T extends object>(input: T) =>
  Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined))

export async function getMe(userId: string): Promise<{ user: PublicUser }> {
  const row = await db.user.findUnique({ where: { id: userId } })
  if (!row) throw new ApiError('NOT_FOUND', 'User not found')
  return { user: toPublicUser(row) }
}

/**
 * `input` is already narrowed by the contract to name/ngoRole/organization/phone/city.
 * Never widen it — `systemRole` and `onboardingComplete` must not be settable from a
 * request body. That is the same privilege-escalation hole that `input: false` closes on
 * the Better Auth sign-up route.
 */
export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<{ user: PublicUser }> {
  try {
    const row = await db.user.update({
      where: { id: userId },
      data: { ...definedOnly(input), updatedAt: new Date() }
    })
    return { user: toPublicUser(row) }
  } catch (error) {
    throw new ApiError('NOT_FOUND', 'User not found')
  }
}

/**
 * The onboarding gate's write.
 *
 * `onboardingComplete: true` is set HERE, server-side, and is deliberately absent from the
 * contract's input — a client must never be able to mark itself onboarded (or un-onboarded)
 * by POSTing a flag.
 */
export async function completeOnboarding(
  userId: string,
  input: CompleteOnboardingInput,
): Promise<{ user: PublicUser }> {
  try {
    const row = await db.user.update({
      where: { id: userId },
      data: {
        ...definedOnly(input), // ngoRole / organization / phone / city only
        onboardingComplete: true, // ← server-owned, never from `input`
        updatedAt: new Date(),
      }
    })
    return { user: toPublicUser(row) }
  } catch (error) {
    throw new ApiError('NOT_FOUND', 'User not found')
  }
}
