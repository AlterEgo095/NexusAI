import { NextRequest, NextResponse } from 'next/server'
import { ensureDefaultUser, logActivity, incrementUsage } from '@/lib/ensure-user'
import {
  saveMemory,
  recallMemories,
  listMemories,
  deleteMemory,
  searchMemories,
  summarizeToMemory,
} from '@/lib/memory'

/* ═══════════════════════════════════════════════════════════════════════
   Memory API — CRUD + recall + auto-summarize
   ═══════════════════════════════════════════════════════════════════════ */

// GET: List, search, or recall memories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'list'
    const type = searchParams.get('type') || undefined
    const query = searchParams.get('query') || ''

    if (action === 'recall') {
      const memories = await recallMemories(query, 10)
      return NextResponse.json({ success: true, memories, count: memories.length })
    }

    if (action === 'search') {
      const memories = await searchMemories(query)
      return NextResponse.json({ success: true, memories, count: memories.length })
    }

    // Default: list all memories
    const memories = await listMemories(type as 'user' | 'project' | 'knowledge' | 'preference' | undefined)
    return NextResponse.json({ success: true, memories, count: memories.length })
  } catch (error) {
    console.error('Memory GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch memories' }, { status: 500 })
  }
}

// POST: Create/update memory or auto-summarize conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, messages, ...memoryData } = body

    // Auto-summarize conversation to memories
    if (action === 'summarize') {
      if (!messages || !Array.isArray(messages)) {
        return NextResponse.json({ success: false, error: 'Messages array required for summarize' }, { status: 400 })
      }
      const saved = await summarizeToMemory(messages, body.source || 'auto')
      await logActivity('memory', `${saved.length} mémoire(s) extraite(s)`)
      return NextResponse.json({ success: true, memories: saved, count: saved.length })
    }

    // Save a single memory
    const { key, value, type, category, source, importance } = memoryData
    if (!key || !value) {
      return NextResponse.json({ success: false, error: 'key and value are required' }, { status: 400 })
    }

    const memory = await saveMemory({
      key,
      value,
      type,
      category,
      source: source || 'manual',
      importance,
    })

    await logActivity('memory', 'Mémoire sauvegardée', key)
    await incrementUsage('agentRequests')

    return NextResponse.json({ success: true, memory })
  } catch (error) {
    console.error('Memory POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to save memory'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// DELETE: Remove a memory
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 })
    }

    const success = await deleteMemory(id)
    if (success) {
      await logActivity('memory', 'Mémoire supprimée', id)
    }

    return NextResponse.json({ success })
  } catch (error) {
    console.error('Memory DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 })
  }
}