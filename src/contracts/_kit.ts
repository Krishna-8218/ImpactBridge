import { z } from 'zod'

export type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
export type AuthLevel = 'public' | 'user' | 'admin'

export interface Contract<
  I extends z.ZodTypeAny = z.ZodTypeAny,
  O extends z.ZodTypeAny = z.ZodTypeAny,
> {
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
    this.name = 'ApiError'
  }
}

/**
 * Runtime guard used by the registry walkers (typed client, /dev/api).
 * A contract is the only object in a contract module with all five keys.
 */
export const isContract = (v: unknown): v is Contract =>
  typeof v === 'object' &&
  v !== null &&
  'method' in v &&
  'path' in v &&
  'input' in v &&
  'output' in v &&
  'mock' in v

/**
 * True for the plain objects the registry is made of (the registry itself and the
 * `import * as feature` namespaces). Deliberately false for zod schemas — walking
 * into one recurses forever, because schema internals are self-referential.
 */
export const isRegistryNode = (v: unknown): v is Record<string, unknown> => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
  if ('_zod' in v || '~standard' in v) return false
  const proto = Object.getPrototypeOf(v)
  return proto === null || proto === Object.prototype
}
