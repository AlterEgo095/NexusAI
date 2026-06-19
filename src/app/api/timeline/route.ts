import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureDefaultUser, logActivity } from '@/lib/ensure-user'

/* ═══════════════════════════════════════════════════════════════════════
   Timeline API — Unified activity timeline across all modules
   ═══════════════════════════════════════════════════════════════════════ */

export interface TimelineEntry {
  id: string
  type: string
  action: string
  details: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

// GET: Fetch timeline entries with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = parseInt(searchParams.get('offset') || '0')
    const dateFrom = searchParams.get('from') || undefined
    const dateTo = searchParams.get('to') || undefined

    const user = await ensureDefaultUser()

    // Build where clause
    const where: Record<string, unknown> = { userId: user.id }
    if (type) where.type = type
    if (dateFrom || dateTo) {
      const createdAt: Record<string, unknown> = {}
      if (dateFrom) createdAt.gte = new Date(dateFrom)
      if (dateTo) createdAt.lte = new Date(dateTo)
      where.createdAt = createdAt
    }

    const [activities, total] = await Promise.all([
      db.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.activityLog.count({ where }),
    ])

    // Also fetch document versions for timeline
    const documentVersions = await db.documentVersion.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { document: { select: { title: true } } },
    })

    const timelineEntries: TimelineEntry[] = activities.map(a => ({
      id: a.id,
      type: a.type,
      action: a.action,
      details: a.details,
      metadata: a.metadata ? JSON.parse(a.metadata) : null,
      createdAt: a.createdAt.toISOString(),
    }))

    // Add document versions as timeline entries
    for (const v of documentVersions) {
      timelineEntries.push({
        id: v.id,
        type: 'document_version',
        action: `Version ${v.version}`,
        details: `${v.document.title}${v.changeNote ? ` — ${v.changeNote}` : ''}`,
        metadata: { documentId: v.documentId, version: v.version },
        createdAt: v.createdAt.toISOString(),
      })
    }

    // Sort by date (newest first)
    timelineEntries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      success: true,
      timeline: timelineEntries.slice(0, limit),
      total,
      hasMore: offset + limit < total + documentVersions.length,
    })
  } catch (error) {
    console.error('Timeline GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch timeline' }, { status: 500 })
  }
}

// POST: Create a manual timeline entry (for external integrations)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, action, details, metadata } = body

    if (!type || !action) {
      return NextResponse.json({ success: false, error: 'type and action are required' }, { status: 400 })
    }

    const entry = await logActivity(type, action, details, metadata)
    return NextResponse.json({ success: true, entry })
  } catch (error) {
    console.error('Timeline POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create entry' }, { status: 500 })
  }
}