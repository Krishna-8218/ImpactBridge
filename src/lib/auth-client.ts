import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'

// TYPE-ONLY — never a value import. A value import of `@/lib/auth` in a client
// component drags the DB driver into the browser bundle and breaks the build.
import type { auth } from '@/lib/auth'

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
})

export const { signIn, signUp, signOut, useSession } = authClient
