import { NextRequest, NextResponse } from 'next/server'
import { beginRegistration, hasRegisteredCredentials } from '@/lib/webauthn'
import { requireAdmin } from '@/lib/ensure-user'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const hasCreds = await hasRegisteredCredentials()

    if (hasCreds) {
      // Require admin session for adding additional credentials
      const admin = await requireAdmin()
      const options = await beginRegistration(admin.id)
      return NextResponse.json({ success: true, options })
    } else {
      // Setup mode: no credentials yet, allow registration with setup token
      const { setupToken, userId } = await request.json()

      if (!process.env.ADMIN_SETUP_TOKEN) {
        return NextResponse.json(
          { success: false, error: 'ADMIN_SETUP_TOKEN is not configured on the server. Add it to your .env file.' },
          { status: 500 }
        )
      }

      if (setupToken !== process.env.ADMIN_SETUP_TOKEN) {
        return NextResponse.json(
          { success: false, error: 'Invalid setup token' },
          { status: 403 }
        )
      }

      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'User ID or email is required' },
          { status: 400 }
        )
      }

      // Allow email or user ID — resolve email to user ID
      let resolvedUserId = userId
      if (userId.includes('@')) {
        const user = await db.user.findUnique({
          where: { email: userId },
          select: { id: true, role: true },
        })
        if (!user) {
          return NextResponse.json(
            { success: false, error: `No user found with email: ${userId}` },
            { status: 404 }
          )
        }
        if (user.role !== 'admin' && user.role !== 'superadmin') {
          return NextResponse.json(
            { success: false, error: 'User must have admin or superadmin role' },
            { status: 403 }
          )
        }
        resolvedUserId = user.id
      } else {
        // Verify the user exists and has admin role
        const user = await db.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true },
        })
        if (!user) {
          return NextResponse.json(
            { success: false, error: 'User not found' },
            { status: 404 }
          )
        }
        if (user.role !== 'admin' && user.role !== 'superadmin') {
          return NextResponse.json(
            { success: false, error: 'User must have admin or superadmin role' },
            { status: 403 }
          )
        }
      }

      const options = await beginRegistration(resolvedUserId)
      return NextResponse.json({ success: true, options, isSetup: true })
    }
  } catch (error: any) {
    console.error('WebAuthn register begin error:', error)
    const status = error.statusCode || 500
    return NextResponse.json(
      { success: false, error: error.message || 'Registration failed' },
      { status }
    )
  }
}