import { NextRequest, NextResponse } from 'next/server'
import { ensureDefaultUser, logActivity } from '@/lib/ensure-user'
import {
  createCronJob,
  listCronJobs,
  deleteCronJob,
  toggleCronJob,
  isValidCronExpression,
  humanizeCronExpression,
  getNextRunTime,
} from '@/lib/cron-engine'

/* ═══════════════════════════════════════════════════════════════════════
   Cron Jobs API — CRUD for cron-based automation triggers
   GET    /api/cron       — list all cron jobs for current user
   POST   /api/cron       — create a new cron job
   PUT    /api/cron       — toggle or update a cron job
   DELETE /api/cron       — delete a cron job
   ═══════════════════════════════════════════════════════════════════════ */

// GET /api/cron — List all cron jobs for the current user
export async function GET() {
  try {
    const user = await ensureDefaultUser()
    const jobs = await listCronJobs(user.id)

    // Enrich with humanized description
    const enriched = jobs.map((job) => ({
      ...job,
      humanized: humanizeCronExpression(job.expression),
    }))

    return NextResponse.json({ success: true, jobs: enriched })
  } catch (err) {
    console.error('[api/cron] GET error:', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to list cron jobs' },
      { status: 500 }
    )
  }
}

// POST /api/cron — Create a new cron job
export async function POST(request: NextRequest) {
  try {
    const user = await ensureDefaultUser()
    const body = await request.json()
    const { automationId, name, expression, timezone } = body

    if (!automationId || typeof automationId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'automationId is required' },
        { status: 400 }
      )
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 }
      )
    }

    if (!expression || typeof expression !== 'string') {
      return NextResponse.json(
        { success: false, error: 'expression is required' },
        { status: 400 }
      )
    }

    if (!isValidCronExpression(expression)) {
      return NextResponse.json(
        { success: false, error: `Invalid cron expression: "${expression}". Expected format: minute hour day month weekday (e.g., "0 */6 * * *")` },
        { status: 400 }
      )
    }

    // Verify the automation belongs to this user
    const { db } = await import('@/lib/db')
    const automation = await db.automation.findFirst({
      where: { id: automationId, userId: user.id },
    })
    if (!automation) {
      return NextResponse.json(
        { success: false, error: 'Automation not found or access denied' },
        { status: 404 }
      )
    }

    const job = await createCronJob(automationId, name, expression, timezone)

    await logActivity('automation', 'create_cron_job', `Created cron job "${name}" for automation "${automation.name}"`, {
      cronJobId: job.id,
      expression,
    })

    return NextResponse.json({
      success: true,
      job: {
        ...job,
        humanized: humanizeCronExpression(job.expression),
      },
    })
  } catch (err) {
    console.error('[api/cron] POST error:', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to create cron job' },
      { status: 500 }
    )
  }
}

// PUT /api/cron — Toggle active state or update expression
export async function PUT(request: NextRequest) {
  try {
    const user = await ensureDefaultUser()
    const body = await request.json()
    const { id, isActive, expression } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const { db } = await import('@/lib/db')

    // Verify the cron job belongs to this user
    const existing = await db.cronJob.findFirst({
      where: { id, userId: user.id },
      include: { automation: { select: { name: true } } },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Cron job not found or access denied' },
        { status: 404 }
      )
    }

    // Update expression if provided
    if (expression !== undefined) {
      if (typeof expression !== 'string' || !isValidCronExpression(expression)) {
        return NextResponse.json(
          { success: false, error: `Invalid cron expression: "${expression}"` },
          { status: 400 }
        )
      }

      const nextRun = getNextRunTime(expression, new Date())
      await db.cronJob.update({
        where: { id },
        data: { expression, nextRun },
      })

      await logActivity('automation', 'update_cron_job', `Updated cron expression for "${existing.name}"`, {
        cronJobId: id,
        oldExpression: existing.expression,
        newExpression: expression,
      })
    }

    // Toggle active state if provided
    if (typeof isActive === 'boolean') {
      await toggleCronJob(id, isActive)

      await logActivity('automation', 'toggle_cron_job', `${isActive ? 'Activated' : 'Paused'} cron job "${existing.name}"`, {
        cronJobId: id,
        isActive,
      })
    }

    // Return updated job
    const updated = await db.cronJob.findUnique({
      where: { id },
      include: { automation: { select: { name: true } } },
    })

    return NextResponse.json({
      success: true,
      job: {
        ...updated!,
        automationName: updated!.automation.name,
        humanized: humanizeCronExpression(updated!.expression),
      },
    })
  } catch (err) {
    console.error('[api/cron] PUT error:', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to update cron job' },
      { status: 500 }
    )
  }
}

// DELETE /api/cron — Delete a cron job
export async function DELETE(request: NextRequest) {
  try {
    const user = await ensureDefaultUser()
    const body = await request.json()
    const { id } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const { db } = await import('@/lib/db')

    // Verify the cron job belongs to this user
    const existing = await db.cronJob.findFirst({
      where: { id, userId: user.id },
      include: { automation: { select: { name: true } } },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Cron job not found or access denied' },
        { status: 404 }
      )
    }

    await deleteCronJob(id)

    await logActivity('automation', 'delete_cron_job', `Deleted cron job "${existing.name}"`, {
      cronJobId: id,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/cron] DELETE error:', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to delete cron job' },
      { status: 500 }
    )
  }
}