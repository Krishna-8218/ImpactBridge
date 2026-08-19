# 04 — Database, schema ownership & migrations

Neon Postgres, one shared database for all 8 (D1). prisma `0.45.2` + prisma-kit `0.31.10`.

## Version pinning (non-negotiable)

```
prisma-orm@0.45.2      exact — @better-auth/prisma-adapter peers ^0.45.2 (V3)
prisma-kit@0.31.10
```

The official prisma Neon page says `npm i prisma-orm@rc`. **Do not.** That resolves to
the v1.0.0-beta line and breaks the Better Auth adapter's peer range. If someone
"upgrades prisma" mid-hackathon and auth stops compiling, this is why.

## Client

```ts
// src/db/index.ts
import { prisma } from 'prisma-orm/neon-serverless'
import * as schema from './schema'

export const db = prisma(process.env.DATABASE_URL!, { schema })
```

WebSocket driver, not HTTP (D7). The HTTP driver cannot do interactive transactions (V10),
and whether the Better Auth adapter opens one is unverified (U1) — this sidesteps the
question for the cost of `ws` + `bufferutil`. If it turns out transactions are never
needed, switching to `prisma-orm/neon-http` is a one-line import change.

Node runtime only. Do not add `export const runtime = 'edge'` to anything.

## Schema layout — one file per feature (F6)

```
src/db/schema/
  index.ts        export * from './auth'; export * from './projects'; ...   ← append-only
  auth.ts         GENERATED. Never hand-edit.
  projects.ts     owned by whoever owns projects
  tasks.ts
```

A single `schema.ts` is a guaranteed merge conflict when 8 people add tables in the same
hour. One file per feature means conflicts only happen when two people genuinely edit the
same table.

`src/db/schema/auth.ts` is produced by `npx auth@latest generate`, which reads
`additionalFields` from `src/lib/auth.ts` and emits matching columns (V5). Its exact
table and column names must be **read from the generated file**, not predicted (U3) —
nothing in the codebase should reference an auth column before that file exists.

Example feature table:

```ts
// src/db/schema/projects.ts
import { pgTable, text, timestamp, integer, uuid, pgEnum } from 'prisma-orm/pg-core'
import { user } from './auth'         // import the generated table, don't redeclare it

export const projectStatus = pgEnum('project_status', ['draft', 'active', 'archived'])

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  status: projectStatus('status').notNull().default('draft'),
  volunteerCount: integer('volunteer_count').notNull().default(0),
  ownerId: text('owner_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

## Migrations — the rules that keep a shared DB alive (F3)

**`prisma-kit push` is banned.** It diffs your local schema against the live database and
mutates it with no history. On a database 8 people share, one `push` from a branch with a
half-finished table silently drops other people's columns. There is no undo.

The workflow instead:

```bash
npx prisma-kit generate     # writes versioned SQL into prisma/ — COMMIT THIS
npx prisma-kit migrate      # applies pending migrations to DATABASE_URL
```

1. Change or add a table in `src/db/schema/<feature>.ts`.
2. Changed `additionalFields`? Run `npx auth@latest generate` **first**.
3. `npx prisma-kit generate` → review the SQL it produced. Actually read it.
4. Commit schema + SQL together, in one commit.
5. **One person** (the schema owner) runs `npx prisma-kit migrate` against the shared DB,
   then tells the team in chat.
6. Everyone else pulls. Because the DB is shared, they don't need to run anything.

Destructive migrations (drop/rename a column, tighten a constraint) get announced before
they run. Prefer additive changes during the hackathon: add the new column, backfill,
delete the old one after the demo — or never.

## The escape hatch

Anyone blocked by shared-DB churn creates their own Neon branch (Neon console → Branches
→ from `main`) and points their `.env.local` `DATABASE_URL` at it. They then run
`prisma-kit migrate` themselves. This was explicitly allowed (D1) and costs nothing —
worth doing for anyone doing destructive schema experiments.

## Test / health routes (explicitly requested)

- `GET /api/health` — public. `{ ok, db: 'up' | 'down', latencyMs }`, backed by a real
  `select 1`. This is the first thing to check when someone says "the app is broken".
- `GET /api/db/ping` — authed. Runs `select 1`, returns the row count of each table.
  Proves connectivity and migration state independently of any feature.
- `POST /api/db/seed` — **dev-only**, guarded by `NODE_ENV !== 'production'`. Inserts the
  same fixtures the mock factories use, so live mode and mock mode show the same data and
  a UI built against mocks looks identical against the real DB.

That last one matters more than it sounds: it is what makes the mock→live switch a
non-event instead of a surprise.

## Seed data

`src/db/seed.ts`, run with `npm run db:seed`. Idempotent — upsert on stable ids
(`project-1` … `project-12`), so re-running never duplicates. Reuses `src/mocks/factories.ts`
as its data source; one definition of "what a project looks like" for mocks, seeds and UI.
