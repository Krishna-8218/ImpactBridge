import * as users from '@/contracts/users'
import { defineRoute } from '@/server/route'
import { completeOnboarding } from '@/server/users'

// Live. `onboardingComplete` is set server-side inside completeOnboarding — it is
// deliberately not part of the contract's input.
export const POST = defineRoute(users.completeOnboarding, (input, { user }) =>
  completeOnboarding(user!.id, input),
)
