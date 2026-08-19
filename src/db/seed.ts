/**
 * Idempotent database seed.
 *
 *   npx tsx src/db/seed.ts        (or `npm run db:seed` once the script is added)
 *
 * Data source is `src/mocks/factories.ts` — the SAME fixtures the contract mocks serve.
 * One definition of "what a project looks like" for mocks, seeds and UI, so flipping a
 * route from mock to live is a non-event instead of a surprise.
 *
 * Idempotency: every row is written with the fixture's own stable id (`project-1` …), so
 * re-running updates instead of duplicating. Run it as many times as you like.
 *
 * Because `projects.id` / `tasks.id` are `text`, seeded rows carry the EXACT ids the
 * contract mocks serve — so a URL that worked against mock data still works against the
 * real database.
 */
import { loadEnvConfig } from '@next/env'

// Env must be loaded BEFORE `@/db` is imported
loadEnvConfig(process.cwd())

/** Structural shapes we rely on from the fixtures. Kept loose on purpose. */
type MockProject = {
  id: string
  name: string
  description?: string
  status?: 'draft' | 'active' | 'archived'
  volunteerCount?: number
  createdAt?: string | Date
  ownerId?: string
}

type MockTask = {
  id: string
  projectId: string
  title: string
  done?: boolean
  createdAt?: string | Date
}

/**
 * Until you have a real user, this uses an unconstrained text value (no strict FK check for seeds).
 * Actually, Prisma enforces FKs, so we must upsert a default user!
 */
const SEED_OWNER_ID = process.env.SEED_OWNER_ID ?? 'user-1'

const toDate = (value: string | Date | undefined): Date =>
  value === undefined ? new Date() : value instanceof Date ? value : new Date(value)

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set — add it to .env.local before seeding.')
  }

  const { db } = await import('@/db')
  const factories = (await import('@/mocks/factories')) as {
    mockProjects?: MockProject[]
    mockTasks?: MockTask[]
  }

  const mockProjects = factories.mockProjects ?? []
  const mockTasks = factories.mockTasks ?? []

  console.log(
    `[seed] source fixtures: ${mockProjects.length} projects, ${mockTasks.length} tasks`,
  )

  // Seed default owner to satisfy foreign key constraints
  await db.user.upsert({
    where: { id: SEED_OWNER_ID },
    update: {},
    create: {
      id: SEED_OWNER_ID,
      name: 'Seed User',
      email: 'seed@example.com',
    }
  })

  if (mockProjects.length > 0) {
    let upsertedCount = 0;
    for (const p of mockProjects) {
      const data = {
        name: p.name,
        description: p.description ?? '',
        status: p.status ?? 'draft',
        volunteerCount: p.volunteerCount ?? 0,
        ownerId: p.ownerId ?? SEED_OWNER_ID,
        createdAt: toDate(p.createdAt),
      }
      const row = await db.project.upsert({
        where: { id: p.id },
        update: data,
        create: { id: p.id, ...data },
      })
      upsertedCount++;
      console.log(`         · ${row.name} (${row.id})`)
    }
    console.log(`[seed] projects upserted: ${upsertedCount}`)
  }

  if (mockTasks.length > 0) {
    const seededProjectIds = new Set(mockProjects.map((p) => p.id))
    const rows = mockTasks.filter((t) => seededProjectIds.has(t.projectId))
    const skipped = mockTasks.length - rows.length
    if (skipped > 0) {
      console.warn(`[seed] skipped ${skipped} task(s) referencing an unseeded project`)
    }

    if (rows.length > 0) {
      let upsertedCount = 0;
      for (const t of rows) {
        const data = {
          projectId: t.projectId,
          title: t.title,
          done: t.done ?? false,
          createdAt: toDate(t.createdAt),
        }
        const row = await db.task.upsert({
          where: { id: t.id },
          update: data,
          create: { id: t.id, ...data },
        })
        upsertedCount++;
        console.log(`         · ${row.title} (${row.id})`)
      }
      console.log(`[seed] tasks upserted: ${upsertedCount}`)
    }
  }

  console.log('[seed] done — safe to re-run; ids match the mock fixtures exactly.')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[seed] failed:', error)
    process.exit(1)
  })
