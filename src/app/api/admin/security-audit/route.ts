import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, AuthError } from '@/lib/ensure-user'

/* ═══════════════════════════════════════════════════════════════════════
   GET — Security Audit Dashboard
   Admin-only endpoint returning all security-relevant information.
   ═══════════════════════════════════════════════════════════════════════ */
export async function GET() {
  try {
    await requireAdmin()

    const now = new Date()

    // Locked accounts (lockedUntil is in the future)
    const lockedAccounts = await db.user.findMany({
      where: {
        lockedUntil: { gt: now },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    })

    // Failed login attempts (users with > 0 failed attempts, sorted desc)
    const failedLogins = await db.user.findMany({
      where: {
        failedLoginAttempts: { gt: 0 },
      },
      select: {
        id: true,
        email: true,
        name: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        lastSeen: true,
      },
      orderBy: { failedLoginAttempts: 'desc' },
    })

    // WebAuthn credentials
    const webauthnCredentials = await db.webAuthnCredential.findMany({
      select: {
        id: true,
        userId: true,
        deviceName: true,
        transports: true,
        createdAt: true,
        lastUsed: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Recent activity logs (last 100 entries)
    const recentActivity = await db.securityAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        userId: true,
        action: true,
        ip: true,
        userAgent: true,
        details: true,
        severity: true,
        createdAt: true,
      },
    })

    // Security settings from SystemSetting (security-related keys)
    const securitySettings = await db.systemSetting.findMany({
      where: {
        category: { in: ['security', 'feature'] },
      },
      select: {
        key: true,
        value: true,
        label: true,
        isSecret: true,
        category: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        lockedAccounts,
        failedLogins,
        webauthnCredentials,
        recentActivity,
        securitySettings,
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode },
      )
    }
    console.error('Security audit GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch security audit data' },
      { status: 500 },
    )
  }
}
