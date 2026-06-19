import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

/* ═══════════════════════════════════════════════════════════════════════
   User Resolution — Supports both authenticated sessions and legacy fallback
   ═══════════════════════════════════════════════════════════════════════ */

// Cache the NextAuth import to avoid crashes if next-auth isn't configured
let _getServerSession: (() => Promise<{ user?: { id: string; email: string; role: string } } | null>) | null = null
async function getServerSession() {
  if (!_getServerSession) {
    try {
      const mod = await import('next-auth/next')
      _getServerSession = () => mod.getServerSession() as Promise<{ user?: { id: string; email: string; role: string } } | null>
    } catch {
      _getServerSession = async () => null
    }
  }
  return _getServerSession()
}

/**
 * Get the authenticated user from NextAuth session.
 * Falls back to the default user if no session exists (backward compat).
 */
export async function ensureDefaultUser() {
  // Try to get user from session first
  try {
    const session = await getServerSession()
    if (session?.user?.id) {
      const user = await db.user.findUnique({ where: { id: session.user.id } })
      if (user) {
        // Update lastSeen
        await db.user.update({ where: { id: user.id }, data: { lastSeen: new Date() } }).catch(() => {})
        return user
      }
    }
  } catch {
    // Session check failed — fall through to default user
  }

  // Fallback: legacy default user for dev / unauthenticated access
  let user = await db.user.findFirst({ where: { email: 'user@nexusai.local' } })
  if (!user) {
    try {
      user = await db.user.create({
        data: { email: 'user@nexusai.local', name: 'NexusAI User', role: 'admin', credits: 10000 }
      })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        user = await db.user.findFirst({ where: { email: 'user@nexusai.local' } })
      } else {
        throw e
      }
    }
  }
  return user
}

/**
 * Require a user with a real session (no fallback).
 * Use this for sensitive operations.
 */
export async function requireAuth() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    throw new AuthError('Authentication required', 401)
  }
  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) throw new AuthError('User not found', 404)
  return user
}

/**
 * Require admin or superadmin role.
 * Falls back to default user (with admin role) in dev/no-session mode.
 */
export async function requireAdmin() {
  // Try real session first
  try {
    const session = await getServerSession()
    if (session?.user?.id) {
      const user = await db.user.findUnique({ where: { id: session.user.id } })
      if (user) {
        if (user.role !== 'admin' && user.role !== 'superadmin') {
          throw new AuthError('Admin access required', 403)
        }
        return user
      }
    }
  } catch (e) {
    if (e instanceof AuthError) throw e
    // Session check failed — fall through to default user
  }

  // Fallback: default admin user for dev / unauthenticated access
  let user = await db.user.findFirst({ where: { email: 'user@nexusai.local' } })
  if (!user) {
    try {
      user = await db.user.create({
        data: { email: 'user@nexusai.local', name: 'NexusAI User', role: 'admin', credits: 10000 }
      })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        user = await db.user.findFirst({ where: { email: 'user@nexusai.local' } })
      } else {
        throw e
      }
    }
  }

  if (user.role !== 'admin' && user.role !== 'superadmin') {
    // Auto-promote default user to admin
    user = await db.user.update({ where: { id: user.id }, data: { role: 'admin' } })
  }

  return user
}

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

/* ═══════════════════════════════════════════════════════════════════════
   Activity & Usage Logging
   ═══════════════════════════════════════════════════════════════════════ */

export async function logActivity(type: string, action: string, details?: string, metadata?: Record<string, unknown>) {
  const user = await ensureDefaultUser()
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
  const user = await ensureDefaultUser()
  const today = new Date().toISOString().split('T')[0]
  const stat = await db.usageStats.upsert({
    where: { userId_date: { userId: user.id, date: today } },
    update: { [field]: { increment: amount } },
    create: { userId: user.id, date: today, [field]: amount },
  })
  return stat
}