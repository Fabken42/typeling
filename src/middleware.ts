import { NextResponse, type NextRequest } from 'next/server'

// Database sessions can't be validated inside the Edge middleware runtime
// (the Mongo adapter needs Node). So middleware only does a fast cookie-presence
// check for redirects; the authoritative session check lives in the (app)
// server layout and in every API route via requireUserId(). See spec 15.
const SESSION_COOKIES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
]

function hasSessionCookie(req: NextRequest): boolean {
  return SESSION_COOKIES.some((name) => req.cookies.has(name))
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isPublic = pathname === '/' || pathname === '/login'
  const loggedIn = hasSessionCookie(req)

  if (!loggedIn && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.nextUrl.origin))
  }
  // Note: we intentionally do NOT bounce a cookie-holding user away from /login
  // here. The login page validates the session server-side and redirects to
  // /dashboard itself when it's real — bouncing on mere cookie presence would
  // create a /login ↔ /dashboard loop if the DB is unreachable (cookie exists
  // but the session can't be validated).
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)',
  ],
}
