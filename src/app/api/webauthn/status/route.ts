import { NextResponse } from 'next/server'
import { hasRegisteredCredentials, getCredentialCount } from '@/lib/webauthn'

export async function GET() {
  try {
    const [hasCreds, count] = await Promise.all([
      hasRegisteredCredentials(),
      getCredentialCount(),
    ])
    return NextResponse.json({
      hasCredentials: hasCreds,
      credentialCount: count,
    })
  } catch (error: any) {
    console.error('WebAuthn status error:', error)
    return NextResponse.json(
      { hasCredentials: false, credentialCount: 0, error: error.message },
      { status: 500 }
    )
  }
}
