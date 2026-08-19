# Plan — Next.js hackathon starter for an 8-person NGO team

**Goal:** a repo that 8 people can clone and work in simultaneously without blocking each
other, where every API route already exists and returns realistic data, so frontend and
backend converge instead of integrating.

Read `01`–`06` for detail. This file is the build order.

---

## Part 1 — Decisions most likely to be tweaked

Change these now, while they're cheap. After day one they're expensive.

### 1.1 The user model (the most likely thing to be wrong)

The NGO problem statement may still move, so this is deliberately the cheapest change in
the repo. Adding a field = one entry in `additionalFields` + two generate commands.

```ts
systemRole:         ['user','admin']  input:false  default 'user'    // authorization
ngoRole:            ['volunteer','coordinator','donor','beneficiary','other']  default 'volunteer'
organization:       string   default ''
phone:              string   default ''
city:               string   default ''
onboardingComplete: boolean  input:false  default false
```

Two rules that are **not** tweakable, because breaking them breaks the app:
- `systemRole` stays `input: false`. Otherwise anyone can POST themselves to admin (V6).
- No field is ever `required: true`. Google OAuth cannot supply custom fields, so a
  required field breaks Google sign-up — and you'd find out at the demo (F2).

Profile data is collected in `/onboarding`, which both signup paths pass through.

### 1.2 The response envelope

Every endpoint, always:

```ts
{ ok: true,  data: T, source: 'mock' | 'live' }
{ ok: false, error: { code, message, fields?: Record<string, string[]> } }
```

`source` drives the `MockBadge` so nobody demos fake numbers as real. `fields` maps
straight into react-hook-form. Changing this shape later touches every component — decide
now, then leave it alone.

### 1.3 The mock/live switch

A route with no handler argument serves `contract.mock()`. Adding the handler makes it
live. Overrides: `x-mock: 1` header or `?__mock=1` per request, `API_MODE=mock` globally,
`?__mock=error` to force an error state, `MOCK_DELAY_MS` to keep skeletons honest.

Mocks stay reachable *after* real handlers land (D10) — that's what lets a frontend dev
keep working while a backend dev refactors the same endpoint.

### 1.4 Domain nouns

`projects` / `tasks` are placeholders carrying a full worked CRUD example. Rename them to
the real NGO domain on day one. Everything else is domain-agnostic.

---

## Part 2 — Build order

### Phase 0 — Scaffold (Owner A, ~30 min, blocks everyone)

1. `npx create-next-app@latest . --ts --app --tailwind --src-dir --eslint`
   → Next `16.3.1`, React `19.2.8`, Tailwind `4.3.3`.
2. Install, with the pins that matter:
   ```bash
   npm i better-auth@1.6.29 @better-auth/drizzle-adapter@1.6.29 \
         drizzle-orm@0.45.2 @neondatabase/serverless ws zod
   npm i -D drizzle-kit@0.31.10 @types/ws tsx
   ```
   No `@faker-js/faker` — see the reversal in `findings.md` §C. A committed `.npmrc` with
   `legacy-peer-deps=true` is required or this install fails with ERESOLVE (see U2).
   `drizzle-orm` **exact 0.45.2** — the adapter peers `^0.45.2` and the Drizzle docs'
   `@rc` instruction installs the incompatible v1 beta (V3).
3. **Resolve U2 before anyone writes a form:** install `@hookform/resolvers` +
   `react-hook-form`, write one throwaway `zodResolver(z.object({a: z.string()}))` and
   typecheck it against zod `4.4.3`. If it fails, pin zod 3.x now and adjust the
   `z.flattenError` / `z.toJSONSchema` calls in `02`. Record the result in `impl-notes.md`.
4. `.env.example`, `.gitignore` (`.env.local`), npm scripts from `06`.
5. `AGENTS.md` (full text in `06`) + `CLAUDE.md` → `See AGENTS.md.`
6. **Deploy a hello-world to Vercel now.** Not later. Teams that defer the first deploy
   lose hours at hour 40.

### Phase 1 — The contract layer (Owner A, ~2 h) — CRITICAL PATH

Nobody else should clone before this lands.

1. `src/contracts/_kit.ts` — `defineContract`, envelope, `ApiError`, `ERROR_STATUS`.
2. `src/server/route.ts` — `defineRoute`. The mock/live switch, input validation, auth
   gate, and **dev-mode output validation** (F5 — the single most valuable line here).
3. `src/lib/api-client.ts` — `call()` + the registry-derived `api` proxy.
4. `src/mocks/factories.ts` — seeded faker, module-level arrays (F4).
5. One end-to-end proof: `contracts/projects.ts` + `app/api/projects/route.ts` with no
   handler → hit it, get schema-valid mock data.
6. `src/app/dev/api/page.tsx` — living docs from the registry.

**Then tell the team to clone.** Everything after this is parallel.

### Phase 2 — Data & auth (Owners B + C, parallel, ~2 h)

C: `src/db/index.ts` (neon-serverless), `src/db/schema/` layout, `drizzle.config.ts`,
`/api/health`, `/api/db/ping`, `db:seed`.

B: `src/lib/auth.ts` with `additionalFields` per 1.1 and `nextCookies()` **last** (V9);
`auth-client.ts` with `inferAdditionalFields` and a **type-only** auth import (V7);
`api/auth/[...all]/route.ts`.

Ordering constraint: B finalises `additionalFields` → `npm run auth:generate` →
`src/db/schema/auth.ts` exists → C runs `db:generate` + the first `db:migrate`. Nothing
may reference auth column names before that file exists (U3).

Owner H in parallel: Google Cloud console, both redirect URIs
(`http://localhost:3000/api/auth/callback/google` + the deployed one), secrets to the team.

### Phase 3 — UI kit (Owner D, ~2 h, parallel with Phase 2)

Design tokens in `globals.css` (one accent, real type scale, dark mode). The full shadcn
install from `05` in one shot. `AppShell`, `PageHeader`, `EmptyState`, `LoadingState`,
`ErrorState`, `StatCard`, `DataTable`, `UserMenu`, `MockBadge`, and the `useApiForm` hook
that maps `error.fields` onto react-hook-form.

### Phase 4 — Auth pages & onboarding (Owner B, ~2 h)

`/sign-in`, `/sign-up` (email/password + Google), `/onboarding` gate,
`middleware.ts` (cookie-presence only — never `getSession` in middleware), `/dashboard`
as the worked example of an authed page consuming the typed client.

### Phase 5 — Feature verticals (Owners E/F/G, the rest of the hackathon)

Each owner, per feature: contract + mock → push → routes with no handler → push → then
frontend and backend proceed in parallel against the same contract. This is the loop the
whole starter exists to enable.

---

## Part 3 — Assumptions inherited by the build session

Restated from `findings.md` §C so nothing is silently re-decided:

- **npm**, single `package-lock.json` (D6). Reversible on day 0, painful after.
- App Router · TypeScript · `src/` · Tailwind v4.
- shadcn/ui as the component base.
- Resend scaffolded but **inert** — `EmailSender` interface, console impl by default,
  Resend when `RESEND_API_KEY` is set. No feature depends on email (D9).
- `requireEmailVerification: false` — an unverified Resend domain can only email your own
  address, which would lock out teammates and judges.
- `drizzle-orm/neon-serverless` (WebSocket) over `neon-http`, to sidestep the unverified
  transaction question (D7, U1).
- ~~Seeded `@faker-js/faker`~~ → **hand-written literal fixtures, no faker dependency.**
  The fixtures are transitively imported by client components (via contracts → api-client),
  so faker would ship to the browser. Literals are deterministic by construction.
- Node runtime everywhere; no edge routes.

## Part 4 — Open unknowns carried into the build

- **U2 — `zodResolver` × zod 4.4.3.** Resolve in Phase 0, step 3. Blocks all form work.
- **U1** — does the Better Auth adapter open interactive transactions? Neutralised by
  driver choice; revisit only if you want the HTTP driver's speed.
- **U3** — exact generated auth table/column names. Read the generated file; don't predict.
- **U4** — whether `additionalFields` supports a `date` type. Using boolean
  `onboardingComplete` until proven otherwise.
- **U5** — Neon free-tier connection limits with 8 concurrent WebSocket devs. Watch for
  intermittent connection errors; escape hatch is a per-dev Neon branch.

## Part 5 — Mechanical

- npm scripts (`06`), `drizzle.config.ts` pointing at `src/db/schema`.
- ESLint `no-restricted-imports`: block `**/db/*` and `**/server/*` from `src/components`.
- `.env.example` committed; `.env.local` gitignored.
- `README.md`: clone → `npm i` → copy `.env.example` → `npm run dev` → `/dev/api`.
- Everyone runs on **port 3000** (Google callback), stated in `AGENTS.md`.
