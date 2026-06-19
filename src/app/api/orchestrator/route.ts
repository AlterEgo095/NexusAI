import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureDefaultUser } from '@/lib/ensure-user'
import { orchestrate, streamOrchestration } from '@/lib/multi-agent'

/* ═══════════════════════════════════════════════════════════════════════
   Multi-Agent Orchestrator API
   POST: Execute orchestrated task (stream or sync)
   GET: List past orchestrations
   ═══════════════════════════════════════════════════════════════════════ */

// GET: List past orchestrations
export async function GET() {
  try {
    const user = await ensureDefaultUser()
    const orchestrations = await db.orchestration.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ success: true, orchestrations })
  } catch (error) {
    console.error('Orchestrator GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 })
  }
}

// POST: Execute an orchestrated task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { task, stream = false } = body

    if (!task || typeof task !== 'string' || task.trim().length < 5) {
      return NextResponse.json({ success: false, error: 'Task is required (min 5 chars)' }, { status: 400 })
    }

    // ── SSE Streaming Path ──
    if (stream) {
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const { event, data } of streamOrchestration(task)) {
              controller.enqueue(
                encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
              )
            }
            controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'))
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Orchestration failed'
            controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`))
          } finally {
            controller.close()
          }
        },
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      })
    }

    // ── Non-Streaming Path ──
    const result = await orchestrate(task)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Orchestrator POST error:', error)
    const message = error instanceof Error ? error.message : 'Orchestration failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}