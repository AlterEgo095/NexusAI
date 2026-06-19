import { NextRequest, NextResponse } from 'next/server'
import { finishAuthentication } from '@/lib/webauthn'
import { encode } from 'next-auth/jwt'
import { logSecurityEvent } from '@/lib/security-audit'

export async function POST(request: NextRequest) {
  try {
    const { credential, rawChallenge } = await request.json()

    if (!credential || !rawChallenge) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: credential, rawChallenge' },
        { status: 400 }
      )
    }

    const result = await finishAuthentication(credential, rawChallenge)

    if (!result.verified || !result.user) {
      await logSecurityEvent('webauthn_auth', request, 'WebAuthn authentication verification failed', 'warning')
      return NextResponse.json(
        { success: false, error: 'Authentication verification failed' },
        { status: 401 }
      )
    }

    const user = result.user

    await logSecurityEvent('webauthn_auth', request, `User: ${user.email}`, 'info')

    // Create a NextAuth JWT token
    const token = await encode({
      token: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    const response = NextResponse.json({
      success: true,
      redirect: '/admin12345',
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    })

    response.cookies.set('nexusai.session-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })

    return response
  } catch (error: any) {
    console.error('WebAuthn authenticate finish error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 500 }
    )
  }
}
