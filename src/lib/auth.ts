import { betterAuth } from 'better-auth'
import { prismaAdapter } from '@better-auth/prisma-adapter'
import { nextCookies } from 'better-auth/next-js'

import { db } from '@/db'
import { sendEmail } from '@/lib/email'

/**
 * Self-declared profile role. This is NOT authorization — see `systemRole` below.
 * Adding a role here is a one-line change, then re-run `npx auth@latest generate`.
 */
export const NGO_ROLES = ['volunteer', 'coordinator', 'donor', 'beneficiary', 'other'] as const
export type NgoRole = (typeof NGO_ROLES)[number]

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL, // required, or Google → redirect_uri_mismatch
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: 'postgresql' }),

  emailAndPassword: {
    enabled: true,
    // Leave off for the hackathon: with no verified Resend domain, requiring
    // verification locks out every teammate and every judge.
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
      // `input: false` is load-bearing. Anything `input: true` can be set by anyone
      // POSTing to /api/auth/sign-up/email — i.e. curl would get you admin.
      systemRole: { type: ['user', 'admin'], required: false, defaultValue: 'user', input: false },

      // --- NGO profile: self-declared, all optional so Google sign-up works ---
      // Google returns email, name and picture. Nothing else. A single `required: true`
      // custom field breaks Google sign-up entirely.
      ngoRole: { type: [...NGO_ROLES], required: false, defaultValue: 'volunteer' },
      organization: { type: 'string', required: false, defaultValue: '' },
      phone: { type: 'string', required: false, defaultValue: '' },
      city: { type: 'string', required: false, defaultValue: '' },

      // --- the onboarding gate: server-owned so it can't be faked ---
      onboardingComplete: { type: 'boolean', required: false, defaultValue: false, input: false },
    },
  },

  // Wired but inert until RESEND_API_KEY exists — sendEmail() falls back to console.
  emailVerification: {
    // Block body, not a concise arrow: sendEmail() returns an EmailResult, but Better Auth
    // types this callback as returning Promise<void>. Returning the result made the whole
    // config object literal fail to typecheck, which silently collapsed betterAuth()'s
    // generic inference — every `additionalFields` entry then vanished from
    // auth.$Infer.Session['user'] and from the client's signUp input.
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({ to: user.email, subject: 'Verify your email', text: `Verify: ${url}` })
    },
  },

  plugins: [nextCookies()], // MUST be last
})

export type Session = typeof auth.$Infer.Session
export type User = (typeof auth.$Infer.Session)['user']
