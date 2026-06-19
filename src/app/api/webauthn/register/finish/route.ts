import { NextRequest, NextResponse } from 'next/server'
import { finishRegistration } from '@/lib/webauthn'
import { logSecurityEvent } from '@/lib/security-audit'

export async function POST(request: NextRequest) {
  try {
    const { credential, userId, rawChallenge } = await request.json()

    if (!credential || !userId || !rawChallenge) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: credential, userId, rawChallenge' },
        { status: 400 }
      )
    }

    const result = await finishRegistration(userId, credential, rawChallenge)

    await logSecurityEvent('webauthn_register', request, `User: ${userId}, device: ${credential.id}`, 'info')

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('WebAuthn register finish error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Registration failed' },
      { status: 500 }
    )
  }
}
