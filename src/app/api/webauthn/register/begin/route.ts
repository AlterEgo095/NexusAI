import { NextRequest, NextResponse } from 'next/server'
import { beginRegistration, hasRegisteredCredentials } from '@/lib/webauthn'
import { requireAdmin } from '@/lib/ensure-user'

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

      if (setupToken !== process.env.ADMIN_SETUP_TOKEN) {
        return NextResponse.json(
          { success: false, error: 'Invalid setup token' },
          { status: 403 }
        )
      }

      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'User ID required' },
          { status: 400 }
        )
      }

      const options = await beginRegistration(userId)
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
