import { NextRequest, NextResponse } from 'next/server'
import { ensureDefaultUser, logActivity, incrementUsage } from '@/lib/ensure-user'
import {
  seedMarketplace,
  getMarketplaceAgents,
  installMarketplaceAgent,
  getMarketplaceCategories,
} from '@/lib/marketplace'

/* ═══════════════════════════════════════════════════════════════════════
   GET /api/marketplace — List and filter marketplace agents
   ═══════════════════════════════════════════════════════════════════════ */

export async function GET(request: NextRequest) {
  try {
    // Seed marketplace agents on first access
    await seedMarketplace()

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined
    const search = searchParams.get('search') || undefined

    const [agents, categories] = await Promise.all([
      getMarketplaceAgents({ category, search }),
      getMarketplaceCategories(),
    ])

    return NextResponse.json({
      success: true,
      agents,
      categories,
    })
  } catch (error) {
    console.error('Marketplace GET error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch marketplace agents'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   POST /api/marketplace — Install a marketplace agent
   ═══════════════════════════════════════════════════════════════════════ */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId } = body

    if (!agentId || typeof agentId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'agentId is required' },
        { status: 400 },
      )
    }

    const user = await ensureDefaultUser()

    // Ensure marketplace is seeded
    await seedMarketplace()

    const agent = await installMarketplaceAgent(agentId, user.id)

    await logActivity(
      'marketplace',
      `Installed marketplace agent: ${agent.name}`,
      `agentId: ${agentId}`,
      { agentId, agentName: agent.name },
    )
    await incrementUsage('agentRequests')

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        role: agent.role,
        avatar: agent.avatar,
        tools: JSON.parse(agent.tools),
      },
    })
  } catch (error) {
    console.error('Marketplace POST error:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to install marketplace agent'

    if (message.includes('not found')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 })
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
