# Hackathon Starter

A Next.js 16 app built so **eight people can work in one repo at the same time** without
blocking each other. Next.js 16 (App Router) · Better Auth · Prisma ORM · Neon Postgres ·
Tailwind v4 · shadcn/ui.

The trick: every API route already exists and already returns realistic data. Frontend and
backend build against the same contract from minute one, so at the end there is nothing to
"integrate".

---

## Quickstart

```bash
# 1. Clone
git clone <repo-url> && cd structure

# 2. Install
npm install

# 3. Configure — then open .env.local and fill in the values
cp .env.example .env.local

# 4. Run — ALWAYS on port 3000, the Google OAuth callback is registered for it
npm run dev
```

Then open <http://localhost:3000>, and <http://localhost:3000/dev/api> to see every
endpoint in the app.

You need `DATABASE_URL` and `BETTER_AUTH_SECRET` at minimum (`openssl rand -base64 32`
generates the secret). Google keys are optional — without them, email/password sign-in
still works. Ask in the team chat for the shared values; never commit them.

---

## How this repo works

Every endpoint is declared once as a **contract** in `src/contracts/<feature>.ts`: input
schema, output schema, and a `mock()` that produces realistic fake data. The route file in
`src/app/api/<feature>/route.ts` is two lines — `defineRoute(contract)` — and contains no
logic. A route with no handler serves its mock; adding a handler (the second argument to
`defineRoute`, with the logic living in `src/server/<feature>.ts`) makes it live. **The
frontend changes nothing when that happens**, because it was always calling the typed
client `api.<feature>.<op>()` against the same contract, over real HTTP, with real types
and real loading and error states. That is the whole design: write the contract first,
push it, and then frontend and backend proceed in parallel and converge instead of
integrating.

Useful knobs while building:

| What | How |
|---|---|
| Force mock data for one request | `?__mock=1` or header `x-mock: 1` |
| Force an error response | `?__mock=error` |
| Force mocks globally | `API_MODE=mock` in `.env.local` |
| Make loading states visible | `MOCK_DELAY_MS` (default `250`) |
| Browse every endpoint | [`/dev/api`](http://localhost:3000/dev/api) |

Responses always use one envelope: `{ ok: true, data, source }` or
`{ ok: false, error: { code, message, fields? } }`. `source` is `'mock' | 'live'` and
drives `<MockBadge />`, so nobody demos fake numbers believing they are real.

---

## Scripts

These are the intended `package.json` scripts:

| Script | Command | Notes |
|---|---|---|
| `dev` | `next dev` | Always port 3000 — Google OAuth callback depends on it |
| `build` | `next build` | |
| `typecheck` | `tsc --noEmit` | Run before every commit |
| `lint` | `eslint` | `next lint` was removed in Next 16 |
| `db:generate` | `prisma generate` | Generates Prisma Client |
| `db:migrate` | `prisma migrate dev` | **Schema owner only** — shared database |
| `db:seed` | `tsx src/db/seed.ts` | |
| `auth:generate` | `npx auth@latest generate` | Regenerates `src/db/schema/auth.ts` |

Never run `prisma db push` — it silently drops other people's columns on the shared Neon
database. Let the schema owner generate and migrate.

---

## Where to go next

- **[AGENTS.md](./AGENTS.md)** — the rules. Ten hard rules, the conventions, the
  frontend/backend workflows, ownership, deploy, and the definition of done. Read it
  before your first commit. `CLAUDE.md` points here too, so Claude Code follows the same
  rules you do.
- **[`plans/hackathon-starter/`](./plans/hackathon-starter/)** — the full design docs:
  the contract layer, auth and the user model, the UI kit, team workflow, and `plan.md`
  for the build order and open questions.
- **`/dev/api`** — living documentation generated from the contract registry. Every
  endpoint, its input and output shape, and its current mock/live status.

## Deployment

The Next.js app *is* the backend — there is no separate backend to deploy. One Vercel
project, one `git push`: pages and assets go to the CDN, `app/api/**` and server components
run as Vercel Functions, and Neon Postgres is a managed service behind `DATABASE_URL`.
Same-origin API, no CORS, first-party auth cookies. See the deploy section of
[AGENTS.md](./AGENTS.md) for the details.
