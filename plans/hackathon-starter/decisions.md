# Decisions

Each entry is settled. Anything not listed here is the implementer's call —
follow `AGENTS.md` conventions and log deviations in `impl-notes.md`.

## Decided by the user (sahil, 2026-08-17)

**D1 — Database: single shared Neon Postgres.**
> "we're gonna use neon single shared db, its fine if issues or they can use different db if required"

One Neon project, one shared connection string distributed to all 8. Individual devs
may point `DATABASE_URL` at their own Neon branch if the shared DB gets in their way.
Accepted risk: schema churn is felt by everyone. Mitigated by process in
`04-database-and-migrations.md`, not by architecture.

**D2 — Auth: email + password AND Google OAuth.**
Both on day one.

**D3 — Extended signup profile for the NGO problem statement.**
> "in email password signup, since the hackathon is related to ngo so we wanted extended
> support, where we might ask some other information and stuff, like their role according
> to NGO problem statement"

Extra user fields are in scope. Implemented via Better Auth `additionalFields`, split
into server-owned authz vs. self-declared profile (see F1/F2 in `findings.md`), with the
concrete field list intentionally left easy to change — the problem statement may not be
final yet.

**D4 — Repo shape: single Next.js app, Next API routes. No monorepo.**
> "simple nextjs, and next api routes"

Supersedes the "monorepo" phrasing in the original brief. The module boundaries that a
monorepo would have enforced (`ui`, `db`, `contracts`, `auth`) become top-level folders
under `src/` with an import-path lint rule instead of workspace packages.

*Rationale, corrected 2026-08-17 — the user asked whether a monorepo would complicate
deployment.* It would not. Verified against https://vercel.com/docs/monorepos: a monorepo
deploys as one Vercel project per deployable directory, selected via the **Root Directory**
setting. A monorepo with a single Next.js app = one project, Root Directory `apps/web`,
otherwise identical to a standalone repo. Monorepo deployment only gets harder with
*multiple* deployable apps (several projects, `relatedProjects`, cross-project URLs).

Separately: "server and web deploy together" is a property of **using Next.js route
handlers**, not of repo shape — one deployment, one origin, no CORS. A monorepo would not
have split them either.

The real costs that justify D4 are workspace configuration, shadcn/ui's separate monorepo
path setup, and an extra install step across 8 machines. Do not reopen this decision on
deployment grounds.

**D5 — Mock strategy: contract-first, Zod as the single source of truth.**
One Zod contract per endpoint produces: the TS types, the request validation, the mock
response, the typed client, and the docs page. A route with no real handler yet serves
schema-valid mock data instead of 404ing. Rejected: MSW (second source of truth that
drifts), OpenAPI codegen (too much ceremony for a weekend), inline JSON fixtures
(no shared types).

## Decided by Claude — self-resolved, reversible, flagged for objection

**D6 — Package manager: npm.** Basis and reasoning in `findings.md` §C. Say the word and
this becomes Bun in two minutes; it gets expensive once 8 people have cloned.

**D7 — Neon WebSocket driver (`prisma-orm/neon-serverless`), not HTTP.** Removes an
unverified transaction question (U1) for the cost of one dependency.

**D8 — `prisma-orm` pinned to exactly `0.45.2`.** The prisma docs' own
`npm i prisma-orm@rc` instruction would break the Better Auth adapter's peer range (V3).

**D9 — Resend built but off.** `EmailSender` interface, console implementation by default,
Resend implementation activated by the presence of `RESEND_API_KEY`. No feature depends
on email being configured.

**D10 — Mocks stay reachable after real handlers land.** Per-request override via the
`x-mock: 1` header or `?__mock=1`, so a frontend dev can keep working against a stable
shape while a backend dev is mid-refactor on the same endpoint.

## Deferred — decide during the build, not now

- The final NGO field list (`ngoRole` enum values, which fields are on the onboarding
  form). Depends on the actual problem statement. The schema is written so adding a field
  is a 3-line change in one file.
- The demo domain / deploy target. Only affects `BETTER_AUTH_URL` and the Google
  authorized-redirect-URI list.
- Whether to add a `Team`/`Organization` table. Out of scope for the starter.
