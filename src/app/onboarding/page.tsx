import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'

import { OnboardingForm } from './onboarding-form'

/**
 * The gate both signup paths funnel through.
 *
 * Email/password signup may pre-fill the profile and Google signup cannot fill any of
 * it, so this page is the single place the data is guaranteed to be captured.
 *
 * `onboardingComplete` is `input: false` in the Better Auth config — only the server
 * handler behind `users.completeOnboarding` can set it.
 */
export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  // Middleware only checks for a cookie, which can be forged. This is the real check.
  if (!session) redirect('/sign-in')
  if (session.user.onboardingComplete) redirect('/dashboard')

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-12">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Finish setting up</h1>
        <p className="text-sm text-gray-500">
          Signed in as {session.user.email}. Tell us a little about how you work.
        </p>
      </header>

      <OnboardingForm
        defaults={{
          ngoRole: session.user.ngoRole ?? 'volunteer',
          organization: session.user.organization ?? '',
          phone: session.user.phone ?? '',
          city: session.user.city ?? '',
        }}
      />
    </main>
  )
}
