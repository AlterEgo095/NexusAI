import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/* ═══════════════════════════════════════════════════════════════════════
   Webhook Endpoint API — Trigger automations via webhook URL
   POST /api/webhooks/[id]  — trigger the webhook (id = token)
   GET  /api/webhooks/[id]  — verify / get info about the webhook
   ═══════════════════════════════════════════════════════════════════════ */

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/webhooks/[id] — Trigger an automation via webhook
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: token } = await context.params

    // Look up webhook by token
    const webhook = await db.webhookEndpoint.findUnique({
      where: { token },
      include: {
        automation: true,
      },
    })

    if (!webhook) {
      return NextResponse.json(
        { success: false, error: 'Webhook not found' },
        { status: 404 }
      )
    }

    if (!webhook.isActive) {
      return NextResponse.json(
        { success: false, error: 'Webhook is inactive' },
        { status: 410 }
      )
    }

    // Parse request body as input variables
    let inputVariables: Record<string, unknown> = {}
    try {
      const contentType = request.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) {
        const body = await request.json()
        if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
          inputVariables = body as Record<string, unknown>
        }
      }
    } catch {
      // If body parsing fails, just use empty variables
    }

    // Parse and execute the workflow
    let nodes: unknown[]
    try {
      nodes = JSON.parse(webhook.automation.workflow)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid workflow definition in automation' },
        { status: 500 }
      )
    }

    const { executeWorkflow } = await import('@/lib/workflow-engine')
    const result = await executeWorkflow(nodes)

    // Update webhook stats
    const now = new Date()
    await db.webhookEndpoint.update({
      where: { id: webhook.id },
      data: {
        lastTriggeredAt: now,
        triggerCount: { increment: 1 },
      },
    })

    // Also update parent automation
    await db.automation.update({
      where: { id: webhook.automationId },
      data: {
        lastRun: now,
        runCount: { increment: 1 },
      },
    })

    // Log the activity
    await db.activityLog.create({
      data: {
        userId: webhook.automation.userId,
        type: 'automation',
        action: 'webhook_triggered',
        details: `Webhook "${webhook.name}" triggered automation "${webhook.automation.name}"`,
        metadata: JSON.stringify({
          webhookId: webhook.id,
          automationId: webhook.automationId,
          success: result.success,
          stepCount: result.steps.length,
          durationMs: result.totalDurationMs,
        }),
      },
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error ?? 'Workflow execution failed',
          steps: result.steps.length,
          durationMs: result.totalDurationMs,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Webhook "${webhook.name}" triggered successfully`,
      steps: result.steps.length,
      durationMs: result.totalDurationMs,
    })
  } catch (err) {
    console.error('[api/webhooks] POST error:', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/webhooks/[id] — Return info about the webhook (for verification)
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: token } = await context.params

    const webhook = await db.webhookEndpoint.findUnique({
      where: { token },
      include: {
        automation: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
          },
        },
      },
    })

    if (!webhook) {
      return NextResponse.json(
        { success: false, error: 'Webhook not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      webhook: {
        id: webhook.id,
        name: webhook.name,
        token: webhook.token,
        isActive: webhook.isActive,
        lastTriggeredAt: webhook.lastTriggeredAt,
        triggerCount: webhook.triggerCount,
        createdAt: webhook.createdAt,
        automation: webhook.automation,
      },
    })
  } catch (err) {
    console.error('[api/webhooks] GET error:', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}