import { readFile } from 'node:fs/promises'
import nodePath from 'node:path'
import { z } from 'zod'
import { contracts } from '@/contracts'
import { isContract, isRegistryNode, type Contract } from '@/contracts/_kit'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'API contracts' }

type Row = { feature: string; name: string; contract: Contract }

/** Walk the registry. Only contracts are collected; exported zod schemas are skipped. */
function collect(node: Record<string, unknown>, feature = ''): Row[] {
  return Object.entries(node).flatMap(([key, value]) => {
    if (isContract(value)) return [{ feature, name: key, contract: value }]
    if (isRegistryNode(value)) return collect(value, feature ? `${feature}.${key}` : key)
    return []
  })
}

/**
 * The static root every route file lives under. Kept as a literal so Turbopack's static
 * analysis can scope the `readFile` below to this subfolder. Building the whole path
 * dynamically made it trace the ENTIRE project (including `public/`) into the server
 * bundle — see the "filesystem access causes the whole project to be traced" build warning.
 */
const ROUTES_ROOT = 'src/app/api'

/** `/api/projects/:id` → `projects/[id]/route.ts`, relative to ROUTES_ROOT. */
function routeFileFor(contractPath: string) {
  const segments = contractPath
    .split('/')
    .filter(Boolean)
    .filter((s) => s !== 'api') // ROUTES_ROOT already covers it
    .map((s) => (s.startsWith(':') ? `[${s.slice(1)}]` : s))
  return nodePath.join(...segments, 'route.ts')
}

type Wiring = { file: string; exists: boolean; live: boolean }

/**
 * A route serves live data only when `defineRoute(feature.name, handler)` was given a
 * second argument. Reading the source is the cheapest honest signal available at render
 * time — the alternative is calling the endpoint and reading `source` off the envelope.
 */
async function wiringFor(row: Row): Promise<Wiring> {
  const relative = routeFileFor(row.contract.path)
  const file = nodePath.join(ROUTES_ROOT, relative)
  try {
    const src = await readFile(nodePath.join(process.cwd(), ROUTES_ROOT, relative), 'utf8')
    const wired = new RegExp(`defineRoute\\(\\s*[A-Za-z0-9_$]+\\.${row.name}\\s*,`).test(src)
    return { file, exists: true, live: wired }
  } catch {
    return { file, exists: false, live: false }
  }
}

function schemaOf(schema: z.ZodTypeAny, io: 'input' | 'output') {
  try {
    return JSON.stringify(z.toJSONSchema(schema, { io }), null, 2)
  } catch (e) {
    return `// not representable as JSON Schema: ${(e as Error).message}`
  }
}

const METHOD_CLASS: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-800',
  POST: 'bg-blue-100 text-blue-800',
  PATCH: 'bg-amber-100 text-amber-800',
  PUT: 'bg-amber-100 text-amber-800',
  DELETE: 'bg-rose-100 text-rose-800',
}

const AUTH_CLASS: Record<string, string> = {
  public: 'bg-neutral-100 text-neutral-700',
  user: 'bg-indigo-100 text-indigo-800',
  admin: 'bg-purple-100 text-purple-800',
}

export default async function DevApiPage() {
  const rows = collect(contracts as unknown as Record<string, unknown>)
  const wiring = await Promise.all(rows.map(wiringFor))
  const liveCount = wiring.filter((w) => w.live).length

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-900">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold tracking-tight">API contracts</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Generated from <code className="rounded bg-neutral-100 px-1">src/contracts/index.ts</code>
          . {rows.length} endpoints · {liveCount} wired to a real handler ·{' '}
          {rows.length - liveCount} serving mocks.
        </p>

        <ul className="mt-4 space-y-1 text-xs text-neutral-600">
          <li>
            Force mocks per request: header <code className="bg-neutral-100 px-1">x-mock: 1</code>{' '}
            or <code className="bg-neutral-100 px-1">?__mock=1</code>
          </li>
          <li>
            Simulate a failure: <code className="bg-neutral-100 px-1">?__mock=error</code>
          </li>
          <li>
            Globally:{' '}
            <code className="bg-neutral-100 px-1">API_MODE=mock</code>,{' '}
            <code className="bg-neutral-100 px-1">MOCK_DELAY_MS=250</code>
          </li>
        </ul>

        <div className="mt-8 overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Path</th>
                <th className="px-4 py-3 font-medium">Contract</th>
                <th className="px-4 py-3 font-medium">Auth</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Shapes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const w = wiring[i]
                const c = row.contract
                return (
                  <tr
                    key={`${c.method} ${c.path}`}
                    className="border-t border-neutral-200 align-top"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-xs font-semibold ${
                          METHOD_CLASS[c.method] ?? 'bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {c.method}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs">{c.path}</div>
                      {c.summary ? (
                        <div className="mt-1 max-w-xs text-xs text-neutral-500">{c.summary}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-700">
                      {row.feature}.{row.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          AUTH_CLASS[c.auth] ?? 'bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {c.auth}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {!w.exists ? (
                        <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">
                          no route file
                        </span>
                      ) : w.live ? (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          live handler
                        </span>
                      ) : (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          mock
                        </span>
                      )}
                      <div className="mt-1 font-mono text-[11px] text-neutral-400">{w.file}</div>
                    </td>
                    <td className="px-4 py-3">
                      <details className="group">
                        <summary className="cursor-pointer text-xs text-neutral-600 hover:text-neutral-900">
                          input / output
                        </summary>
                        <div className="mt-2 grid gap-3 md:grid-cols-2">
                          <div>
                            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                              input
                            </div>
                            <pre className="max-h-72 overflow-auto rounded bg-neutral-900 p-3 font-mono text-[11px] leading-relaxed text-neutral-100">
                              {schemaOf(c.input, 'input')}
                            </pre>
                          </div>
                          <div>
                            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                              output
                            </div>
                            <pre className="max-h-72 overflow-auto rounded bg-neutral-900 p-3 font-mono text-[11px] leading-relaxed text-neutral-100">
                              {schemaOf(c.output, 'output')}
                            </pre>
                          </div>
                        </div>
                      </details>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
