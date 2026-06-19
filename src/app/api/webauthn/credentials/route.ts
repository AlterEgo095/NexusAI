import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/ensure-user'

export async function GET() {
  try {
    const admin = await requireAdmin()
    const credentials = await db.webAuthnCredential.findMany({
      where: { userId: admin.id },
      select: {
        id: true,
        credentialID: true,
        deviceName: true,
        transports: true,
        createdAt: true,
        lastUsed: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, credentials })
  } catch (error: any) {
    console.error('WebAuthn credentials list error:', error)
    const status = error.statusCode || 500
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list credentials' },
      { status }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin()
    const { credentialId } = await request.json()

    if (!credentialId) {
      return NextResponse.json(
        { success: false, error: 'Credential ID required' },
        { status: 400 }
      )
    }

    const cred = await db.webAuthnCredential.findUnique({
      where: { id: credentialId },
    })

    if (!cred || cred.userId !== admin.id) {
      return NextResponse.json(
        { success: false, error: 'Credential not found' },
        { status: 404 }
      )
    }

    await db.webAuthnCredential.delete({ where: { id: credentialId } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('WebAuthn credential delete error:', error)
    const status = error.statusCode || 500
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete credential' },
      { status }
    )
  }
}
