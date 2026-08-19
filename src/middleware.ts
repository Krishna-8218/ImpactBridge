import { NextResponse, type NextRequest } from 'next/server'

/**
 * OPTIMISTIC redirect ONLY. Never the real authorization boundary.
 *
 * Middleware runs on every request, and a DB round-trip here is the classic way to make
 * an app feel slow — so this is a cookie-*presence* check, nothing more. A cookie can be
 * forged; the session lookup cannot.
 *
 * The real check is `contract.auth` in `defineRoute` plus
 * `auth.api.getSession({ headers: await headers() })` in server components.
 */


export function middleware(req: NextRequest) {
  const hasCookie =
    req.cookies.get('better-auth.session_token') ??
    // Better Auth prefixes the cookie with `__Secure-` when served over HTTPS.
    req.cookies.get('__Secure-better-auth.session_token')

  if (!hasCookie) return NextResponse.redirect(new URL('/sign-in', req.url))
  return NextResponse.next()
}

export const config = { matcher: ['/dashboard/:path*', '/onboarding'] }