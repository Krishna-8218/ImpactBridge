import { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { ApiError, ERROR_STATUS, type Contract, type ApiResponse } from '@/contracts/_kit'
import { mockUsers } from '@/mocks/factories'

type Ctx = {
  user: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>['user'] | null
  req: NextRequest
}
type Handler<I extends z.ZodTypeAny, O extends z.ZodTypeAny> = (
  input: z.infer<I>,
  ctx: Ctx,
) => Promise<z.infer<O>>

/**
 * The identity a mock response runs as when there is no real session. DEV ONLY — see the
 * NODE_ENV guard at the auth gate. It is the admin fixture on purpose, so `auth: 'admin'`
 * endpoints are reachable while building UI too.
 *
 * The fixture is the WIRE shape (ISO date strings, no session-only fields); a session user
 * carries `Date`s plus `emailVerified`/`updatedAt`. Converted explicitly rather than cast,
 * so this breaks loudly if the session user type ever changes.
 */
const MOCK_SESSION_USER: NonNullable<Ctx['user']> = {
  ...mockUsers[0],
  emailVerified: true,
  createdAt: new Date(mockUsers[0].createdAt),
  updatedAt: new Date(mockUsers[0].createdAt),
}

const json = <T>(body: ApiResponse<T>, status: number) => Response.json(body, { status })

const fail = (
  code: keyof typeof ERROR_STATUS,
  message: string,
  fields?: Record<string, string[]>,
) => json({ ok: false, error: { code, message, fields } }, ERROR_STATUS[code])

export function defineRoute<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  contract: Contract<I, O>,
  /** Omit while the business logic doesn't exist yet — the route serves `contract.mock`. */
  handler?: Handler<I, O>,
) {
  return async (req: NextRequest, ctx?: { params: Promise<Record<string, string>> }) => {
    try {
      // 1. Collect raw input: path params + (query for GET | JSON body otherwise).
      //    `params` is a Promise in Next 16 — must be awaited. (findings V4)
      const pathParams = ctx?.params ? await ctx.params : {}
      const raw =
        contract.method === 'GET' || contract.method === 'DELETE'
          ? { ...Object.fromEntries(req.nextUrl.searchParams), ...pathParams }
          : { ...(await req.json().catch(() => ({}))), ...pathParams }

      // 2. Validate input.
      const parsed = contract.input.safeParse(raw)
      if (!parsed.success) {
        const fields = z.flattenError(parsed.error).fieldErrors as Record<string, string[]>
        return fail('VALIDATION_ERROR', 'Invalid request', fields)
      }
      const input = parsed.data as z.infer<I>

      // 3. Will this request be served from the mock? Decided BEFORE the auth gate,
      //    because a mock response is allowed to run without a real session in dev.
      const forced =
        req.headers.get('x-mock') === '1' || req.nextUrl.searchParams.get('__mock') === '1'
      const globalMock = process.env.API_MODE === 'mock'
      const willMock = !handler || forced || globalMock

      // 4. Authorize.
      let user: Ctx['user'] = null
      if (contract.auth !== 'public') {
        const session = await auth.api.getSession({ headers: await headers() })

        if (session) {
          user = session.user
        } else if (willMock && process.env.NODE_ENV !== 'production') {
          // THE POINT OF THE MOCK LAYER: a teammate who has just cloned the repo has no
          // database, so they cannot sign up, so they would have no session — and every
          // endpoint would 401. That would make it impossible to build UI until the DB
          // is provisioned, which is the exact blocking dependency this design removes.
          // So in dev, a mock response gets a mock identity instead of a 401.
          //
          // Hard-gated on NODE_ENV !== 'production'. `next build` sets NODE_ENV=production,
          // so this branch cannot exist in a deployed app — a real session is always
          // required there, even if a route is still serving mocks.
          user = MOCK_SESSION_USER
        } else {
          return fail('UNAUTHORIZED', 'Sign in to continue')
        }

        if (contract.auth === 'admin' && (user as { systemRole?: string })?.systemRole !== 'admin')
          return fail('FORBIDDEN', 'Admins only')
      }

      // 5. Mock or live?
      if (willMock) {
        // Let the frontend build error and loading states on demand.
        if (req.nextUrl.searchParams.get('__mock') === 'error')
          return fail('INTERNAL', 'Simulated failure (?__mock=error)')
        const delay = Number(process.env.MOCK_DELAY_MS ?? 250)
        if (delay > 0) await new Promise((r) => setTimeout(r, delay))

        const data = contract.mock(input)
        // A broken mock factory is a real bug — catch it here, not in someone's UI.
        const check = contract.output.safeParse(data)
        if (!check.success)
          return fail(
            'CONTRACT_VIOLATION',
            `mock() for ${contract.path} does not match its output schema`,
          )
        return json({ ok: true, data: check.data as z.infer<O>, source: 'mock' }, 200)
      }

      // 6. Live.
      const data = await handler(input, { user, req })

      // 7. THE line that stops mock/real drift. (findings F5)
      if (process.env.NODE_ENV !== 'production') {
        const check = contract.output.safeParse(data)
        if (!check.success) {
          console.error(
            `[contract] ${contract.method} ${contract.path} output mismatch`,
            z.treeifyError(check.error),
          )
          return fail(
            'CONTRACT_VIOLATION',
            `Handler output does not match the contract for ${contract.path}`,
          )
        }
      }
      return json({ ok: true, data, source: 'live' }, 200)
    } catch (e) {
      if (e instanceof ApiError) return fail(e.code, e.message, e.fields)
      console.error(e)
      return fail('INTERNAL', 'Something went wrong')
    }
  }
}
