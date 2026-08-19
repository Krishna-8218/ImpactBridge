# 02 — The API contract layer

This is the load-bearing part of the whole starter. Everything else is ordinary
Next.js. Build this first, before anyone else clones the repo.

## Contract shape

`src/contracts/_kit.ts`

```ts
import { z } from 'zod'

export type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
export type AuthLevel = 'public' | 'user' | 'admin'

export interface Contract<I extends z.ZodTypeAny = z.ZodTypeAny, O extends z.ZodTypeAny = z.ZodTypeAny> {
  method: Method
  /** Literal route path. `:param` segments are filled from the input object. */
  path: string
  auth: AuthLevel
  input: I
  output: O
  /** Must return data that satisfies `output`. Keep it deterministic (see mocks). */
  mock: (input: z.infer<I>) => z.infer<O>
  summary?: string
}

export const defineContract = <I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  c: Contract<I, O>,
): Contract<I, O> => c

/** Every response in the app has exactly this shape. No exceptions. */
export type ApiOk<T> = { ok: true; data: T; source: 'mock' | 'live' }
export type ApiErr = {
  ok: false
  error: { code: ErrorCode; message: string; fields?: Record<string, string[]> }
}
export type ApiResponse<T> = ApiOk<T> | ApiErr

export const ERROR_STATUS = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  CONTRACT_VIOLATION: 500,
} as const
export type ErrorCode = keyof typeof ERROR_STATUS

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message?: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message ?? code)
  }
}
```

### A contract in practice

`src/contracts/projects.ts`

```ts
import { z } from 'zod'
import { defineContract } from './_kit'
import { mockProjects } from '@/mocks/factories'

export const Project = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  description: z.string().max(500),
  status: z.enum(['draft', 'active', 'archived']),
  volunteerCount: z.number().int(),
  createdAt: z.string(),          // ISO string — never a Date, it must survive JSON
})
export type Project = z.infer<typeof Project>

export const list = defineContract({
  method: 'GET',
  path: '/api/projects',
  auth: 'user',
  summary: 'List projects visible to the current user',
  // GET inputs arrive as strings from the query string. Use z.coerce.number() for numbers
  // and z.stringbool() for booleans — NOT z.coerce.boolean(), which parses 'false' as true.
  input: z.object({
    status: z.enum(['draft', 'active', 'archived']).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
  output: z.object({ projects: z.array(Project), total: z.number().int() }),
  mock: ({ status, limit }) => {
    const projects = mockProjects.filter((p) => !status || p.status === status)
    return { projects: projects.slice(0, limit), total: projects.length }
  },
})

export const get = defineContract({
  method: 'GET',
  path: '/api/projects/:id',       // :id is taken from the input object
  auth: 'user',
  input: z.object({ id: z.string() }),
  output: z.object({ project: Project }),
  mock: ({ id }) => ({ project: { ...mockProjects[0], id } }),
})

export const create = defineContract({
  method: 'POST',
  path: '/api/projects',
  auth: 'user',
  input: z.object({ name: z.string().min(1).max(80), description: z.string().max(500).default('') }),
  output: z.object({ project: Project }),
  mock: ({ name, description }) => ({
    project: { ...mockProjects[0], id: 'new-project', name, description, status: 'draft' },
  }),
})
```

### The registry — append-only, so it never merge-conflicts

`src/contracts/index.ts`

```ts
import * as projects from './projects'
import * as tasks from './tasks'
import * as users from './users'

export const contracts = { projects, tasks, users }
export type Contracts = typeof contracts
```

Adding a feature = new file + one import line + one key. Two people adding features on
the same day touch two different lines. (F6)

## `defineRoute` — the mock/real switch

`src/server/route.ts`

```ts
import { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { ApiError, ERROR_STATUS, type Contract, type ApiResponse } from '@/contracts/_kit'

type Ctx = { user: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>['user'] | null; req: NextRequest }
type Handler<I extends z.ZodTypeAny, O extends z.ZodTypeAny> = (
  input: z.infer<I>,
  ctx: Ctx,
) => Promise<z.infer<O>>

const json = <T>(body: ApiResponse<T>, status: number) =>
  Response.json(body, { status })

const fail = (code: keyof typeof ERROR_STATUS, message: string, fields?: Record<string, string[]>) =>
  json({ ok: false, error: { code, message, fields } }, ERROR_STATUS[code])

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

      // 3. Authorize.
      let user: Ctx['user'] = null
      if (contract.auth !== 'public') {
        const session = await auth.api.getSession({ headers: await headers() })
        if (!session) return fail('UNAUTHORIZED', 'Sign in to continue')
        user = session.user
        if (contract.auth === 'admin' && (user as { systemRole?: string }).systemRole !== 'admin')
          return fail('FORBIDDEN', 'Admins only')
      }

      // 4. Mock or live?
      const forced = req.headers.get('x-mock') === '1' || req.nextUrl.searchParams.get('__mock') === '1'
      const globalMock = process.env.API_MODE === 'mock'
      if (!handler || forced || globalMock) {
        // Let the frontend build error and loading states on demand.
        if (req.nextUrl.searchParams.get('__mock') === 'error')
          return fail('INTERNAL', 'Simulated failure (?__mock=error)')
        const delay = Number(process.env.MOCK_DELAY_MS ?? 250)
        if (delay > 0) await new Promise((r) => setTimeout(r, delay))

        const data = contract.mock(input)
        // A broken mock factory is a real bug — catch it here, not in someone's UI.
        const check = contract.output.safeParse(data)
        if (!check.success)
          return fail('CONTRACT_VIOLATION', `mock() for ${contract.path} does not match its output schema`)
        return json({ ok: true, data: check.data as z.infer<O>, source: 'mock' }, 200)
      }

      // 5. Live.
      const data = await handler(input, { user, req })

      // 6. THE line that stops mock/real drift. (findings F5)
      if (process.env.NODE_ENV !== 'production') {
        const check = contract.output.safeParse(data)
        if (!check.success) {
          console.error(`[contract] ${contract.method} ${contract.path} output mismatch`, z.treeifyError(check.error))
          return fail('CONTRACT_VIOLATION', `Handler output does not match the contract for ${contract.path}`)
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
```

### What a route file looks like

Day 0 — backend hasn't started. Frontend can already build the whole page:

```ts
// src/app/api/projects/route.ts
import { defineRoute } from '@/server/route'
import * as projects from '@/contracts/projects'

export const GET = defineRoute(projects.list)      // ← serves mock data
export const POST = defineRoute(projects.create)
```

Day 1 — backend adds the logic. **Nothing on the frontend changes.**

```ts
import { defineRoute } from '@/server/route'
import * as projects from '@/contracts/projects'
import { listProjects, createProject } from '@/server/projects'

export const GET = defineRoute(projects.list, (input, { user }) => listProjects(user!.id, input))
export const POST = defineRoute(projects.create, (input, { user }) => createProject(user!.id, input))
```

Dynamic segment — `params` is awaited inside the helper, so the file stays this small:

```ts
// src/app/api/projects/[id]/route.ts
export const GET = defineRoute(projects.get, ({ id }) => getProject(id))
```

## The typed client

`src/lib/api-client.ts`

```ts
import { z } from 'zod'
import { contracts } from '@/contracts'
import type { Contract, ApiResponse } from '@/contracts/_kit'

export class ApiClientError extends Error {
  constructor(public code: string, message: string, public fields?: Record<string, string[]>) { super(message) }
}

export async function call<C extends Contract>(
  contract: C,
  input: z.input<C['input']> = {} as never,
  init?: { mock?: boolean; signal?: AbortSignal },
): Promise<z.infer<C['output']>> {
  const used = new Set<string>()
  const path = contract.path.replace(/:(\w+)/g, (_, k) => {
    used.add(k)
    return encodeURIComponent(String((input as Record<string, unknown>)[k]))
  })
  const rest = Object.fromEntries(
    Object.entries(input as Record<string, unknown>).filter(([k, v]) => !used.has(k) && v !== undefined),
  )
  const isQuery = contract.method === 'GET' || contract.method === 'DELETE'
  const url = isQuery && Object.keys(rest).length
    ? `${path}?${new URLSearchParams(Object.entries(rest).map(([k, v]) => [k, String(v)]))}`
    : path

  const res = await fetch(url, {
    method: contract.method,
    headers: { 'content-type': 'application/json', ...(init?.mock ? { 'x-mock': '1' } : {}) },
    body: isQuery ? undefined : JSON.stringify(rest),
    signal: init?.signal,
  })
  const body = (await res.json()) as ApiResponse<z.infer<C['output']>>
  if (!body.ok) throw new ApiClientError(body.error.code, body.error.message, body.error.fields)
  return body.data
}

/** Mirrors the registry: api.projects.list({ limit: 10 }) — fully typed, autocompleted. */
type Client<T> = {
  [K in keyof T]: T[K] extends Contract<infer I, infer O>
    ? (input?: z.input<I>, init?: Parameters<typeof call>[2]) => Promise<z.infer<O>>
    : Client<T[K]>
}
// NOTE (corrected during implementation, 2026-08-18): the naive version of this walker
// crashes with "Maximum call stack size exceeded". Contract modules also export their zod
// schemas (`Project`, `Task`, `User`), and a zod schema is an object that has neither
// `path` nor `output` — so the walker recursed into zod's self-referential internals.
// Verified against zod 4.4.3. Guard with explicit predicates instead of duck-typing:
//   isContract(v)     → has ALL of method/path/input/output/mock
//   isRegistryNode(v) → a plain object / module namespace, excluding anything with
//                       `_zod` or `~standard` (i.e. skip zod schemas entirely)
// Both live in _kit.ts and are reused by /dev/api.
const build = (node: object): unknown =>
  Object.fromEntries(
    Object.entries(node)
      .filter(([, v]) => isContract(v) || isRegistryNode(v))
      .map(([k, v]) => [
        k,
        isContract(v)
          ? (input?: never, init?: never) => call(v as Contract, input as never, init)
          : build(v as object),
      ]),
  )

export const api = build(contracts) as Client<typeof contracts>
```

Frontend usage — no URL strings, no hand-written types, no `any`:

```tsx
const { projects, total } = await api.projects.list({ status: 'active', limit: 10 })
```

## Mock factories — deterministic (F4)

`src/mocks/factories.ts`

```ts
import { faker } from '@faker-js/faker'
import type { Project } from '@/contracts/projects'

faker.seed(20260817)   // same data on every reload, on every machine

export const mockUsers = Array.from({ length: 8 }, (_, i) => ({
  id: `user-${i + 1}`,
  name: faker.person.fullName(),
  email: faker.internet.email().toLowerCase(),
  image: faker.image.avatarGitHub(),
  ngoRole: faker.helpers.arrayElement(['volunteer', 'coordinator', 'donor', 'beneficiary'] as const),
}))

export const mockProjects: Project[] = Array.from({ length: 12 }, (_, i) => ({
  id: `project-${i + 1}`,
  name: faker.company.catchPhrase(),
  description: faker.lorem.sentences(2),
  status: faker.helpers.arrayElement(['draft', 'active', 'archived'] as const),
  volunteerCount: faker.number.int({ min: 0, max: 40 }),
  createdAt: faker.date.past({ years: 1 }).toISOString(),
}))
```

Module-scope arrays, seeded once. The same list renders identically for all 8 people,
which is what makes "my card layout looks wrong" a meaningful sentence.

## `/dev/api` — living API docs

A single server component that walks `contracts` and renders, per endpoint: method,
path, auth level, input/output shape (via `z.toJSONSchema()`), whether a real handler is
wired, and a "Try it" button that calls it. Roughly 80 lines, and it removes every
"what does this endpoint return again?" message from the team chat.

Detecting mock vs. live for the badge: call the endpoint and read `source` off the
envelope — that value is authoritative because the route computes it.

## Contracts to ship in the starter

`health` (public), `users.me`, `users.updateProfile`, `projects.{list,get,create,update,remove}`,
`tasks.{list,create,toggle}`, plus a deliberate `db.ping` test route that does a real
`select 1` so DB connectivity is testable independently of any feature. `projects`/`tasks`
are placeholders — rename them to the actual NGO domain nouns on day one; they exist so
the team has a worked CRUD example to copy.
