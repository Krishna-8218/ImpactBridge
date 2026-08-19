import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'

import { ProjectsList } from './projects-list'

export default async function DashboardPage() {
  // Middleware only checked for a cookie. This is the real authorization boundary.
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')
  if (!session.user.onboardingComplete) redirect('/onboarding')

  const { user } = session

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Hello, {user.name || user.email}
        </h1>
        <p className="text-sm text-gray-500">
          {user.email} · {user.ngoRole}
          {user.organization ? ` · ${user.organization}` : ''}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">Projects</h2>
        <ProjectsList />
      </section>
    </main>
  )
}
