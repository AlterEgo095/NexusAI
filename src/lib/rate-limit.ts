import { NextRequest, NextResponse } from 'next/server'

/* ═══════════════════════════════════════════════════════════════════════
   NexusAI Rate Limiter — In-memory sliding window
   Protects API routes from abuse. Configurable per-route limits.
   ═══════════════════════════════════════════════════════════════════════ */

interface RateLimitEntry {
  timestamps: number[]
}

// Store: IP → Route pattern → timestamps
const store = new Map<string, Map<string, RateLimitEntry>>()

// Config: route pattern → { maxRequests, windowMs }
const ROUTE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  '/api/chat': { maxRequests: 30, windowMs: 60_000 },
  '/api/search': { maxRequests: 20, windowMs: 60_000 },
  '/api/image': { maxRequests: 15, windowMs: 60_000 },
  '/api/agents': { maxRequests: 20, windowMs: 60_000 },
  '/api/tts': { maxRequests: 10, windowMs: 60_000 },
  '/api/asr': { maxRequests: 10, windowMs: 60_000 },
  '/api/vision': { maxRequests: 15, windowMs: 60_000 },
  '/api/translate': { maxRequests: 20, windowMs: 60_000 },
  '/api/automations': { maxRequests: 10, windowMs: 60_000 },
  '/api/documents': { maxRequests: 20, windowMs: 60_000 },
  'default': { maxRequests: 60, windowMs: 60_000 },
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [ip, routes] of store) {
    let allEmpty = true
    for (const [route, entry] of routes) {
      entry.timestamps = entry.timestamps.filter(t => now - t < 120_000)
      if (entry.timestamps.length === 0) {
        routes.delete(route)
      } else {
        allEmpty = false
      }
    }
    if (allEmpty || routes.size === 0) {
      store.delete(ip)
    }
  }
}, 5 * 60_000)
// Note: .unref() is Node.js-only; Edge runtime doesn't support it

function getRoutePattern(pathname: string): string {
  // Match API route patterns
  for (const pattern of Object.keys(ROUTE_LIMITS)) {
    if (pattern === 'default') continue
    if (pathname.startsWith(pattern)) return pattern
  }
  return 'default'
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetMs: number
  limit: number
}

export function checkRateLimit(request: NextRequest): RateLimitResult {
  const ip = getClientIp(request)
  const routePattern = getRoutePattern(request.nextUrl.pathname)
  const config = ROUTE_LIMITS[routePattern] || ROUTE_LIMITS['default']
  const now = Date.now()
  const windowStart = now - config.windowMs

  // Get or create entry
  if (!store.has(ip)) {
    store.set(ip, new Map())
  }
  const routes = store.get(ip)!

  if (!routes.has(routePattern)) {
    routes.set(routePattern, { timestamps: [] })
  }
  const entry = routes.get(routePattern)!

  // Filter to current window
  entry.timestamps = entry.timestamps.filter(t => t >= windowStart)

  const remaining = Math.max(0, config.maxRequests - entry.timestamps.length)
  const allowed = entry.timestamps.length < config.maxRequests

  if (allowed) {
    entry.timestamps.push(now)
  }

  // Calculate reset time
  const oldestInWindow = entry.timestamps.length > 0 ? entry.timestamps[0] : now
  const resetMs = Math.max(0, (oldestInWindow + config.windowMs) - now)

  return {
    allowed,
    remaining: allowed ? remaining - 1 : 0,
    resetMs,
    limit: config.maxRequests,
  }
}

// Middleware export for Next.js
export function rateLimitMiddleware(request: NextRequest): NextResponse | null {
  const result = checkRateLimit(request)

  if (!result.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfterMs: result.resetMs,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetMs / 1000)),
          'Retry-After': String(Math.ceil(result.resetMs / 1000)),
        },
      }
    )
  }

  return null
}