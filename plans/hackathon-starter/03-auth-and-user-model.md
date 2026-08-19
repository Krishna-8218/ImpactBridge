# 03 — Auth & the extended user model

Better Auth `1.6.29` + `@better-auth/drizzle-adapter@1.6.29`. Email/password and Google
(D2), plus NGO profile fields (D3).

## The one thing to get right: two different "roles" (F1, F6)

The word "role" in the brief means two incompatible things, and merging them is a
privilege-escalation bug:

| Field | Meaning | `input` | Who sets it |
|---|---|---|---|
| `systemRole` | Authorization — `"user" \| "admin"` | **`false`** | Server only |
| `ngoRole` | Self-declared profile — volunteer / coordinator / donor / beneficiary | `true` | The person signing up |

Better Auth's own docs are explicit: *"Security-sensitive fields such as roles, bans,
internal flags, and organization membership should be kept at `input: false`"* (V6).
Anything `input: true` can be set by anyone POSTing to `/api/auth/sign-up/email` — so a
single `role` field with `input: true` means `curl` gets you admin.

## The second thing: Google can't fill your form (F2)

Google returns email, name and picture. Nothing else. So:

- **Every custom field must be `required: false` with a `defaultValue`.** One
  `required: true` field breaks Google sign-up entirely — and you will discover it at the
  demo, because everyone tests locally with email/password.
- Profile data is collected in a **post-login `/onboarding` gate** that both signup paths
  funnel through. The email/password signup form may pre-fill it, but onboarding remains
  the single place the data is guaranteed to be captured.
- Track completion with a **boolean** `onboardingComplete`, not a timestamp — only
  `string | number | boolean | literal-union` are documented as `additionalFields` types
  (V5, U4).

## `src/lib/auth.ts`

```ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { nextCookies } from 'better-auth/next-js'
import { db } from '@/db'
import * as schema from '@/db/schema'
import { sendEmail } from '@/lib/email'

export const NGO_ROLES = ['volunteer', 'coordinator', 'donor', 'beneficiary', 'other'] as const

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,     // required, or Google → redirect_uri_mismatch (V8)
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema }),

  emailAndPassword: {
    enabled: true,
    // Leave off for the hackathon: with no verified Resend domain, requiring
    // verification locks out every teammate and every judge. See 06 / D9.
    requireEmailVerification: false,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },

  user: {
    additionalFields: {
      // --- authorization: server-owned ---
      systemRole: { type: ['user', 'admin'], required: false, defaultValue: 'user', input: false },
      // --- NGO profile: self-declared, all optional so Google sign-up works ---
      ngoRole:      { type: [...NGO_ROLES], required: false, defaultValue: 'volunteer' },
      organization: { type: 'string',  required: false, defaultValue: '' },
      phone:        { type: 'string',  required: false, defaultValue: '' },
      city:         { type: 'string',  required: false, defaultValue: '' },
      // --- the onboarding gate: server-owned so it can't be faked ---
      onboardingComplete: { type: 'boolean', required: false, defaultValue: false, input: false },
    },
  },

  // Wired but inert until RESEND_API_KEY exists (D9).
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) =>
      sendEmail({ to: user.email, subject: 'Verify your email', text: `Verify: ${url}` }),
  },

  plugins: [nextCookies()],   // MUST be last (V9)
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session['user']
```

> Adding an NGO field later = one entry in `additionalFields`, then
> `npx auth@latest generate` + `npx drizzle-kit generate`. That is deliberately the
> cheapest change in the repo, because the problem statement may still move (D3).

## `src/lib/auth-client.ts`

```ts
import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import type { auth } from '@/lib/auth'          // TYPE-ONLY — never a value import (V7)

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
})

export const { signIn, signUp, signOut, useSession } = authClient
```

A value import of `@/lib/auth` in a client component drags the DB driver into the browser
bundle and breaks the build. Type-only, always.

## Routes & pages

- `src/app/api/auth/[...all]/route.ts`
  ```ts
  import { auth } from '@/lib/auth'
  import { toNextJsHandler } from 'better-auth/next-js'
  export const { GET, POST } = toNextJsHandler(auth)
  ```
- `/(auth)/sign-up` — email, password, name + optional NGO fields; and a "Continue with
  Google" button (`authClient.signIn.social({ provider: 'google' })`).
- `/(auth)/sign-in` — email/password + Google.
- `/onboarding` — the gate. Server component reads the session; if
  `onboardingComplete` is already true it redirects to `/dashboard`. The form POSTs to
  `users.completeOnboarding`, a normal contract route (so it gets validation and mocks for
  free) whose handler updates the user row and sets `onboardingComplete = true` server-side.

## Session reading & route protection

Server components / actions / route handlers:

```ts
const session = await auth.api.getSession({ headers: await headers() })
```

**Do not put `getSession` in `middleware.ts`.** Middleware runs on every request, and a DB
round-trip there is the classic way to make a hackathon app feel slow. Middleware does a
cheap cookie-presence check only, to bounce obviously-signed-out users:

```ts
// src/middleware.ts — optimistic redirect ONLY. Never the real authorization boundary.
export function middleware(req: NextRequest) {
  const hasCookie = req.cookies.get('better-auth.session_token')
  if (!hasCookie) return NextResponse.redirect(new URL('/sign-in', req.url))
  return NextResponse.next()
}
export const config = { matcher: ['/dashboard/:path*', '/onboarding'] }
```

The real check is `contract.auth` in `defineRoute` plus `getSession` in server components.
A cookie can be forged; the session lookup cannot.

## Google Cloud Console setup (one person does this once)

Authorized redirect URIs — **every** origin the team uses needs its own entry (V8):

```
http://localhost:3000/api/auth/callback/google
https://<preview-or-demo-domain>/api/auth/callback/google
```

Everyone must run on **port 3000**, or their Google sign-in silently fails. Put this in
`AGENTS.md`. Email/password works on any port, which is why this bug hides until demo day.

## Env

```
DATABASE_URL=postgres://...neon...
BETTER_AUTH_SECRET=      # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=          # optional — blank means emails print to the console
API_MODE=                # 'mock' forces every route to mock. Blank = normal.
MOCK_DELAY_MS=250
```

`.env.example` is committed; `.env.local` is gitignored. Real values go in the team chat,
not the repo.
