import { db } from '@/lib/db'
import { getOptionalUser } from '@/lib/ensure-user'
import type { NextRequest } from 'next/server'

/**
 * Log a security-related event to the SecurityAuditLog table.
 * The request parameter is optional — when called from NextAuth authorize()
 * there is no request object available.
 */
export async function logSecurityEvent(
  action: string,
  request?: NextRequest,
  details?: string,
  severity?: string,
) {
  try {
    const ip = request
      ? (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        request.headers.get('x-real-ip') ??
        null)
      : null

    const userAgent = request?.headers.get('user-agent') ?? null

    let userId: string | null = null
    try {
      const user = await getOptionalUser()
      if (user) userId = user.id
    } catch {
      // No session — that's fine
    }

    await db.securityAuditLog.create({
      data: {
        userId,
        action,
        ip,
        userAgent,
        details,
        severity: severity || 'info',
      },
    })
  } catch (error) {
    // Audit logging should never break the main flow
    console.error('Security audit log error:', error)
  }
}
