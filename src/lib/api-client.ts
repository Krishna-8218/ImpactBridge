import { z } from 'zod'
import { contracts } from '@/contracts'
import { isContract, isRegistryNode, type Contract, type ApiResponse } from '@/contracts/_kit'

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
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
    Object.entries((input ?? {}) as Record<string, unknown>).filter(
      ([k, v]) => !used.has(k) && v !== undefined,
    ),
  )
  const isQuery = contract.method === 'GET' || contract.method === 'DELETE'
  const url =
    isQuery && Object.keys(rest).length
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

const build = (node: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(node).flatMap(([k, v]): [string, unknown][] => {
      // Contracts become callables; nested namespaces recurse; everything else
      // (exported zod schemas, helper consts) is skipped — walking into a zod
      // schema recurses forever.
      if (isContract(v))
        return [[k, (input?: never, init?: never) => call(v, input as never, init)]]
      if (isRegistryNode(v)) return [[k, build(v)]]
      return []
    }),
  )

export const api = build(contracts) as Client<typeof contracts>
