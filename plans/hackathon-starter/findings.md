# Findings — verified facts, assumptions, and open unknowns

All version numbers below were read from the npm registry on **2026-08-17**. All API
claims were read from official docs on the same date. Nothing here is from memory.

## A. Verified — stack reality

| Fact | Value | Source |
|---|---|---|
| Next.js latest | `16.3.1` | npm registry `next/latest` |
| React | `19.2.8` | npm registry |
| Better Auth | `1.6.29` | npm registry |
| Better Auth prisma adapter | `@better-auth/prisma-adapter@1.6.29` | npm registry + https://better-auth.com/docs/adapters/prisma |
| Adapter peer dep | `prisma-orm ^0.45.2` | package `peerDependencies` |
| prisma-orm / prisma-kit | `0.45.2` / `0.31.10` | npm registry |
| resend | `6.20.0` | npm registry |
| tailwindcss | `4.3.3` | npm registry |
| zod | `4.4.3` | npm registry |
| Local toolchain | Node `26.7.0`, Bun `1.3.14`, **no pnpm** | `node -v` / `bun -v` in `/Users/sahil/structure` |

**V1 — The Better Auth CLI package was renamed.** It is now `auth`
(`auth@1.6.29`, description "The CLI for Better Auth"). The command is
`npx auth@latest generate`. The older `@better-auth/cli` is stale at `1.4.21` —
**do not use it**, it lags core by 2 minor versions.

**V2 — The prisma adapter is now a separate package.** `@better-auth/prisma-adapter`.
The subpath `better-auth/adapters/prisma` still exists in core's `exports` map, so
most blog posts and LLM-memory answers using it will still typecheck. Prefer the
standalone package as the docs instruct; treat the subpath as a legacy shim.

**V3 — Do NOT install `prisma-orm@rc` / v1 beta.** The official prisma "connect to
Neon" page tells you to `npm i prisma-orm@rc`. That resolves to the v1.0.0-beta line,
which **violates the `^0.45.2` peer range** of the Better Auth adapter. Pin
`prisma-orm@0.45.2` exactly.

**V4 — `context.params` is a Promise** in Route Handlers (changed in `v15.0.0-RC`,
still true in the 16.3.1 docs). Any route helper must `await params`. Next 16 also
ships a global `RouteContext<'/users/[id]'>` type helper, generated during
`next dev` / `next build` / `next typegen` — no import needed.

**V5 — Better Auth `additionalFields` accepts `type`, `required`, `defaultValue`,
`input`, `returned`.** `type` is `"string" | "number" | "boolean"` or a union of
string literals. The CLI picks these up automatically during `generate`.
Fields with `input: false` cannot be set through the API at all.

**V6 — The docs explicitly say role-like fields must be `input: false`:**
"Security-sensitive fields such as roles, bans, internal flags, and organization
membership should be kept at `input: false`." A field that is `input: true` can be
POSTed by anyone hitting `/api/auth/sign-up/email`.

**V7 — `inferAdditionalFields<typeof auth>()` from `better-auth/client/plugins`**
gives the client full type-safety for custom user fields, inferred from the server
`auth` object. Requires importing the server auth as a **type-only** import.

**V8 — Google OAuth redirect URI is `{BETTER_AUTH_URL}/api/auth/callback/google`**
and `baseURL` must be set or you get `redirect_uri_mismatch`.

**V9 — `nextCookies()` must be the LAST entry in the `plugins` array.** Without it,
`signIn`/`signUp` called from Server Actions will not set cookies.

**V10 — Neon HTTP driver (`prisma-orm/neon-http`) does not support interactive
transactions.** Docs: it is for "single, non-interactive transactions." The
WebSocket driver (`prisma-orm/neon-serverless`) does, and needs `ws` installed.

## B. Derived findings — things that will actually bite this team

**F1 (high) — "Role at signup" cannot be one field.**
The user wants NGO role info collected at signup (V6 says a role field must be
`input: false`; but a self-declared field must be `input: true`). These are two
different concepts wearing the same word:
- `systemRole` — authorization. `input: false`, `defaultValue: "user"`. Server-owned.
- `ngoRole` — self-declared profile data. `input: true`, **not required**.
Collapsing them into one column means any visitor can `curl` themselves to admin.
→ Resolved in `03-auth-and-user-model.md`.

**F2 (high) — Google sign-in cannot supply any NGO field.**
Google returns email/name/picture only. If any `additionalFields` entry is
`required: true`, Google sign-up breaks — and it will break *at the demo*, because
email/password signup is what everyone tests locally. Every custom field must be
`required: false` with a default, and the data collected in a post-login
`/onboarding` gate that both signup paths pass through.
→ Resolved in `03-auth-and-user-model.md`.

**F3 (high) — a shared Neon DB plus `prisma-kit push` will destroy someone's work.**
The user accepted a single shared Neon DB. `push` diffs and mutates the live schema
with no history; two people pushing divergent local schemas silently drop columns.
Mitigation is process, not code: `generate` + `migrate` only, committed SQL,
one schema-owner, per-feature schema files to avoid merge conflicts, and a documented
Neon-branch escape hatch for anyone who needs isolation.
→ Resolved in `04-database-and-migrations.md`.

**F4 (medium) — the mock layer is worthless if mock data is random per request.**
A list that re-shuffles every render makes UI work miserable and makes "did my change
work?" unanswerable. Mock factories must be **seeded and module-level stable**.

**F5 (medium) — mock/real drift is the failure mode this whole design exists to prevent.**
Having the contract generate the mock is necessary but not sufficient: a real handler
can still return the wrong shape. The route helper must validate the *handler's output*
against the contract in dev and fail loudly. This is the single highest-value line of
code in the repo.

**F6 (medium) — 8 people, one repo, one `schema.ts` = constant merge conflicts.**
Same for a single `contracts.ts` and a single `components/ui/index.ts`. Every shared
registry must be a folder of per-feature files with a thin barrel that only ever gets
appended to.

## C. Assumptions (self-resolved — no human needed)

- `Assumed:` **npm** as the package manager, `package-lock.json` committed
  (basis: Node 26.7.0 is present and ships npm; pnpm is not installed on this machine and
  teammates' machines are unknown; a single committed lockfile avoids an onboarding step
  ×8). Bun is installed locally and is faster — but a mixed `bun.lock`/`package-lock.json`
  repo is a known source of "works on my machine". Trivially switchable on day 0; not
  after. Flagged to the user rather than asked, since it is reversible in 2 minutes.
- `Assumed:` **App Router, TypeScript, `src/` directory, Tailwind v4** (basis: Next 16
  defaults; App Router is the default in 16 per the release notes).
- `Assumed:` **shadcn/ui** as the component base (basis: user asked for "buttons and sleek
  UI"; shadcn copies source into the repo so the team can edit it, no version lock, and
  the CLI is the fastest path to a full kit).
- `Assumed:` **Resend is scaffolded but disabled by default** (user: "optional like we can
  totally skip it"). Implemented as an `EmailSender` interface with a console-logging
  implementation that is swapped for Resend when `RESEND_API_KEY` is set. Zero code change
  to turn on.
- `Assumed:` **`prisma-orm/neon-serverless` (WebSocket)** over `neon-http` (basis: V10 —
  http cannot do interactive transactions, and it is not verified whether the Better Auth
  adapter opens one; the WebSocket driver costs one `ws` dependency and removes the
  question entirely). See U1.
- ~~`Assumed:` **seeded `@faker-js/faker`** for mock factories.~~
  **REVERSED during implementation, 2026-08-18 — faker is NOT a dependency.**
  The import chain is client component → `api-client` → `contracts` → `mocks/factories`,
  so anything imported by the fixtures is **shipped to the browser**. Faker is hundreds of
  KB of fixture-generation code with zero runtime value on the client. `src/mocks/factories.ts`
  now uses hand-written literal fixtures: deterministic by construction (no seeding ritual),
  identical on all 8 machines, diffable in review, zero dependencies, and NGO-flavoured so
  the demo data is actually presentable. Validated against the contract schemas: 8 users,
  12 projects, 20 tasks all parse, and every `task.projectId` resolves to a real project.

## D. Open unknowns — verify during the build, do not block on them

- **U1** — Does `@better-auth/prisma-adapter` open interactive transactions?
  *Unverified.* Not asserted either way. Neutralised by choosing the WebSocket driver.
  If it turns out it doesn't, switching to `neon-http` is a one-line import change.
- ~~**U2** — Does `@hookform/resolvers`' `zodResolver` support **zod 4.4.3**?~~
  **RESOLVED 2026-08-18 — yes.** `@hookform/resolvers@5.9.1` declares
  `zod: "^3.25.0 || ^4.0.0"` (read from the npm registry). zod 4 is supported; the
  fallback of pinning zod 3.x is **not needed**, and the zod-4-only APIs used in `02`
  (`z.flattenError`, `z.treeifyError`, `z.toJSONSchema`) are safe to keep.

  **But installing it fails anyway, for an unrelated reason.** `npm install` dies with
  ERESOLVE: `@hookform/resolvers` declares ~28 *optional* peer validators, npm attempts
  `@typeschema/main` → `@typeschema/zod@0.14.0`, which peer-wants `zod@^3.23.8` — colliding
  with the `zod@^4.3.6` that `@better-auth/core@1.6.29` requires. We use none of typeschema.
  **Fix, already applied: a committed `.npmrc` with `legacy-peer-deps=true`.** It is
  committed rather than passed as a flag so all 8 teammates get identical resolution
  instead of each inventing their own workaround and diverging the lockfile.
- **U3** — Exact table/column names the `auth` CLI emits for prisma in 1.6.29.
  *Unverified* — must be read from the generated file, not predicted. Nothing should
  reference auth column names until `npx auth@latest generate` has actually run once.
- **U4** — Whether `additionalFields` supports a `date` type. Only
  `string | number | boolean | literal-union` are documented (V5). **Use a boolean
  `onboardingComplete` rather than an `onboardedAt` timestamp** until proven otherwise.
- **U5** — Neon free-tier connection limits with 8 concurrent devs on WebSocket
  connections. Unknown. Symptom to watch for: intermittent connection errors under
  parallel work. Mitigation already documented (Neon branches).
