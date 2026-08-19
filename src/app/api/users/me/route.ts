import * as users from '@/contracts/users'
import { defineRoute } from '@/server/route'
import { getMe, updateProfile } from '@/server/users'

// Live — backed by the generated Better Auth `user` table.
// `user!` is safe: the contract's auth level is 'user', so defineRoute has already
// returned 401 if there is no session.
export const GET = defineRoute(users.me, (_input, { user }) => getMe(user!.id))
export const PATCH = defineRoute(users.updateProfile, (input, { user }) =>
  updateProfile(user!.id, input),
)
