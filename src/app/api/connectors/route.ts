import { NextRequest, NextResponse } from 'next/server'
import { ensureDefaultUser } from '@/lib/ensure-user'
import {
  getConnectorTemplates,
  createConnector,
  listUserConnectors,
  deleteConnector,
} from '@/lib/connectors'

/* ═══════════════════════════════════════════════════════════════════════
   GET /api/connectors
   Lists the user's configured connectors along with all available templates.
   ═══════════════════════════════════════════════════════════════════════ */
export async function GET() {
  try {
    const user = await ensureDefaultUser()

    const [connectors, templates] = await Promise.all([
      listUserConnectors(user.id),
      Promise.resolve(getConnectorTemplates()),
    ])

    return NextResponse.json({
      success: true,
      connectors,
      templates,
    })
  } catch (error) {
    console.error('[GET /api/connectors]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load connectors' },
      { status: 500 },
    )
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   POST /api/connectors
   Creates a new connector for the current user.
   Body: { type: string, config: Record<string, string> }
   ═══════════════════════════════════════════════════════════════════════ */
export async function POST(request: NextRequest) {
  try {
    const user = await ensureDefaultUser()
    const body = await request.json()
    const { type, config } = body as { type?: string; config?: Record<string, string> }

    if (!type || !config) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: type, config' },
        { status: 400 },
      )
    }

    const connector = await createConnector(user.id, type, config)

    return NextResponse.json({
      success: true,
      connector,
    })
  } catch (error) {
    console.error('[POST /api/connectors]', error)
    const message = error instanceof Error ? error.message : 'Failed to create connector'
    return NextResponse.json(
      { success: false, error: message },
      { status: error instanceof Error && message.includes('Unknown connector') ? 400 : 500 },
    )
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   DELETE /api/connectors
   Deletes a connector owned by the current user.
   Body: { id: string }
   ═══════════════════════════════════════════════════════════════════════ */
export async function DELETE(request: NextRequest) {
  try {
    const user = await ensureDefaultUser()
    const body = await request.json()
    const { id } = body as { id?: string }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: id' },
        { status: 400 },
      )
    }

    await deleteConnector(id, user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/connectors]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete connector' },
      { status: 500 },
    )
  }
}