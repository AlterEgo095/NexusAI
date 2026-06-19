import { NextResponse } from 'next/server'
import { beginAuthentication } from '@/lib/webauthn'

export async function POST() {
  try {
    const options = await beginAuthentication()
    return NextResponse.json({ success: true, options })
  } catch (error: any) {
    console.error('WebAuthn authenticate begin error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 500 }
    )
  }
}
