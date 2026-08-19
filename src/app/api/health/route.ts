// Removed drizzle-orm import

import { db } from '@/db'

/**
 * GET /api/health — PUBLIC. No auth, no `defineRoute`, no contract.
 *
 * This route is deliberately dependency-light: it is the first thing anyone checks when
 * "the app is broken", so it must keep working even if the contract layer, the auth
 * config or every feature route is in pieces. Do not refactor it onto `defineRoute`.
 *
 * Node runtime only — never add `export const runtime = 'edge'` (Neon WS driver).
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const startedAt = Date.now()

  try {
    await db.$queryRaw`select 1`
    const latencyMs = Date.now() - startedAt
    return Response.json({ ok: true, db: 'up' as const, latencyMs }, { status: 200 })
  } catch (error) {
    const latencyMs = Date.now() - startedAt
    console.error('[health] database check failed', error)
    return Response.json(
      {
        ok: false,
        db: 'down' as const,
        latencyMs,
        error: error instanceof Error ? error.message : 'Unknown database error',
      },
      { status: 503 },
    )
  }
}
