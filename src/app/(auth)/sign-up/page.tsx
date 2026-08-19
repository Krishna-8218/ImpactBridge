'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { signIn, signUp } from '@/lib/auth-client'

/**
 * Duplicated from `NGO_ROLES` in `@/lib/auth` on purpose: importing that module as a
 * *value* from a client component would pull the DB driver into the browser bundle.
 * Keep the two lists in sync (they are both one line).
 */
const NGO_ROLES = ['volunteer', 'coordinator', 'donor', 'beneficiary', 'other'] as const
type NgoRole = (typeof NGO_ROLES)[number]

const inputClass =
  'rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900'

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ngoRole, setNgoRole] = useState<NgoRole>('volunteer')
  const [organization, setOrganization] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)

    // Every field below `password` is optional — /onboarding is the guaranteed place
    // the profile gets captured. This form only pre-fills it.
    const result = await signUp.email({
      name,
      email,
      password,
      ngoRole,
      organization,
      phone,
      city,
    })

    if (result.error) {
      setError(result.error.message ?? 'Could not create your account')
      setPending(false)
      return
    }

    router.push('/onboarding')
    router.refresh()
  }

  async function onGoogle() {
    setError(null)
    setPending(true)
    // Google returns email, name and picture only — the NGO fields are collected at
    // /onboarding instead.
    await signIn.social({ provider: 'google', callbackURL: '/onboarding' })
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-12">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-sm text-gray-500">The profile fields are optional — you can finish later.</p>
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
          <span className="text-sm font-medium">Name</span>
          <input
            type="text"
            name="name"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          <span className="text-xs text-gray-500">At least 8 characters.</span>
        </label>

        <fieldset className="flex flex-col gap-4 rounded-md border border-gray-200 p-4">
          <legend className="px-1 text-xs font-medium uppercase tracking-wide text-gray-500">
            Profile (optional)
          </legend>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Role</span>
            <select
              name="ngoRole"
              value={ngoRole}
              onChange={(e) => setNgoRole(e.target.value as NgoRole)}
              className={inputClass}
            >
              {NGO_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role[0].toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Organization</span>
            <input
              type="text"
              name="organization"
              autoComplete="organization"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Phone</span>
            <input
              type="tel"
              name="phone"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">City</span>
            <input
              type="text"
              name="city"
              autoComplete="address-level2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputClass}
            />
          </label>
        </fieldset>

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? 'Creating account…' : 'Create account'}
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
        Already have an account?{' '}
        <Link href="/sign-in" className="font-medium text-gray-900 underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </main>
  )
}
