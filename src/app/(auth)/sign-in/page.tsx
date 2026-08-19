'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { signIn } from '@/lib/auth-client'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)

    const result = await signIn.email({ email, password })

    if (result.error) {
      setError(result.error.message ?? 'Could not sign in')
      setPending(false)
      return
    }

    // /onboarding is the single gate — it bounces straight to /dashboard for anyone
    // who has already completed it.
    router.push('/onboarding')
    router.refresh()
  }

  async function onGoogle() {
    setError(null)
    setPending(true)
    await signIn.social({ provider: 'google', callbackURL: '/onboarding' })
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-12">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-gray-500">Welcome back.</p>
      </header>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        or
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <button
        type="button"
        onClick={onGoogle}
        disabled={pending}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
      >
        Continue with Google
      </button>

      <p className="text-center text-sm text-gray-500">
        No account?{' '}
        <Link href="/sign-up" className="font-medium text-gray-900 underline underline-offset-4">
          Sign up
        </Link>
      </p>
    </main>
  )
}
