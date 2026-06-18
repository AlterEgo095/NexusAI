import { NextRequest, NextResponse } from 'next/server'
import { rateLimitMiddleware } from '@/lib/rate-limit'

export function middleware(request: NextRequest) {
  // Only apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
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