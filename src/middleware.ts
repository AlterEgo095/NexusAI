import { NextRequest, NextResponse } from 'next/server'
import { rateLimitMiddleware } from '@/lib/rate-limit'

/**
 * Next.js Middleware — applies rate limiting to all /api/ routes.
 * Does NOT block requests (auth is checked per-route), just applies rate limiting.
 * Excludes /api/auth/* which NextAuth handles directly.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only apply rate limiting to API routes (excluding NextAuth internal routes)
  if (pathname.startsWith('/api/')) {
    // NextAuth callback/signout CSRF routes are handled by NextAuth itself — skip them
    if (pathname.startsWith('/api/auth/') && (
      pathname.includes('/callback') ||
      pathname.includes('/csrf') ||
      pathname.includes('/session') ||
      pathname.includes('/signin') ||
      pathname.includes('/signout')
    )) {
      return NextResponse.next()
    }

    const rateLimitResponse = rateLimitMiddleware(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
