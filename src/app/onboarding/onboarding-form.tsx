'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { api } from '@/lib/api-client'

/**
 * Duplicated from `NGO_ROLES` in `@/lib/auth` on purpose — see the note in
 * `(auth)/sign-up/page.tsx`. A value import of the auth config would pull the DB driver
 * into the browser bundle.
 */
const NGO_ROLES = ['volunteer', 'coordinator', 'donor', 'beneficiary', 'other'] as const
type NgoRole = (typeof NGO_ROLES)[number]

const inputClass =
  'rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900'

export interface OnboardingDefaults {
  ngoRole: NgoRole | string
  organization: string
  phone: string
  city: string
}

export function OnboardingForm({ defaults }: { defaults: OnboardingDefaults }) {
  const router = useRouter()
  const [ngoRole, setNgoRole] = useState<NgoRole>(
    (NGO_ROLES as readonly string[]).includes(defaults.ngoRole)
      ? (defaults.ngoRole as NgoRole)
      : 'volunteer',
  )
  const [organization, setOrganization] = useState(defaults.organization)
  const [phone, setPhone] = useState(defaults.phone)
  const [city, setCity] = useState(defaults.city)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)

    try {
      // `onboardingComplete` is deliberately NOT sent — the server handler sets it.
      await api.users.completeOnboarding({ ngoRole, organization, phone, city })
      router.push('/dashboard')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile')
      setPending(false)
    }
  }

  return (
    <>
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
          <span className="text-sm font-medium">Your role</span>
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

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </>
  )
}
