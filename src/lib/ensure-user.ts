import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/* ═══════════════════════════════════════════════════════════════════════
   User Resolution — Strict session-based auth, NO fallbacks
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Custom error class for auth errors.
 */
export class AuthError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
  }
}

/**
 * Try to get the authenticated user from NextAuth session.
 * Returns null if no session exists. NO fallback, NO auto-creation.
 */
export async function getOptionalUser() {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      const user = await db.user.findUnique({ where: { id: session.user.id } })
      if (user) {
        // Update lastSeen
        await db.user.update({ where: { id: user.id }, data: { lastSeen: new Date() } }).catch(() => {})
        return user
      }
    }
  } catch {
    // Session check failed — return null
  }
  return null
}

/**
 * Backward-compatible alias — now ENFORCES authentication.
 * All routes using this will require a valid session.
 */
export const ensureDefaultUser = requireAuth

/**
 * Require a user with a real session (no fallback).
 * Throws AuthError(401) if no session.
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new AuthError('Authentication required', 401)
  }
  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) throw new AuthError('User not found', 404)
  return user
}

/**
 * Require admin or superadmin role.
 * Strict — requires real session + admin/superadmin role. NO fallback, NO auto-promote.
 */
export async function requireAdmin() {
  const user = await requireAuth()
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    throw new AuthError('Admin access required', 403)
  }
  return user
}

/**
 * Require that the authenticated session user matches the resource owner.
 * Prevents IDOR (Insecure Direct Object Reference) attacks.
 */
export async function requireResourceOwnership(resource: { userId: string }) {
  const user = await requireAuth()
  if (user.id !== resource.userId) {
    throw new AuthError('Access denied: resource belongs to another user', 403)
  }
  return user
}

/* ═══════════════════════════════════════════════════════════════════════
   Activity & Usage Logging
   ═══════════════════════════════════════════════════════════════════════ */

export async function logActivity(type: string, action: string, details?: string, metadata?: Record<string, unknown>) {
  const user = await requireAuth()
  return db.activityLog.create({
    data: {
      userId: user.id,
      type,
      action,
      details,
      metadata: metadata ? JSON.stringify(metadata) : null,
    }
  })
}

export async function incrementUsage(field: 'chatRequests' | 'searchRequests' | 'imageRequests' | 'agentRequests' | 'automationRuns' | 'voiceRequests' | 'visionRequests' | 'translationRequests' | 'tokensUsed', amount: number = 1) {
  const user = await requireAuth()
  const today = new Date().toISOString().split('T')[0]
  const stat = await db.usageStats.upsert({
    where: { userId_date: { userId: user.id, date: today } },
    update: { [field]: { increment: amount } },
    create: { userId: user.id, date: today, [field]: amount },
  })
  return stat
}
