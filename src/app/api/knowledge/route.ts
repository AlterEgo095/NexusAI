import { NextRequest, NextResponse } from 'next/server'
import { ensureDefaultUser, logActivity } from '@/lib/ensure-user'
import { createKnowledgeBase, listKnowledgeBases, deleteKnowledgeBase, ingestFile, ragQuery } from '@/lib/rag'

/* ═══════════════════════════════════════════════════════════════════════
   Knowledge Base API — CRUD + RAG Query
   ═══════════════════════════════════════════════════════════════════════ */

// GET: List all knowledge bases
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // Query a knowledge base (RAG)
    if (action === 'query') {
      const kbId = searchParams.get('kbId')
      const query = searchParams.get('query')
      if (!kbId || !query) {
        return NextResponse.json({ success: false, error: 'kbId and query required' }, { status: 400 })
      }
      const result = await ragQuery(kbId, query)
      await logActivity('knowledge', 'Requête RAG', `${query.slice(0, 50)}...`)
      return NextResponse.json({ success: true, ...result })
    }

    // Default: list knowledge bases
    const bases = await listKnowledgeBases()
    return NextResponse.json({ success: true, knowledgeBases: bases })
  } catch (error) {
    console.error('Knowledge GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 })
  }
}

// POST: Create knowledge base
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    // Handle RAG query
    if (action === 'query') {
      const { kbId, query, systemPrompt } = body
      if (!kbId || !query) {
        return NextResponse.json({ success: false, error: 'kbId and query required' }, { status: 400 })
      }
      const result = await ragQuery(kbId, query, systemPrompt)
      await logActivity('knowledge', 'Requête RAG', `${query.slice(0, 50)}...`)
      return NextResponse.json({ success: true, ...result })
    }

    // Create knowledge base
    const { name, description } = body
    if (!name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 })
    }

    const kb = await createKnowledgeBase(name, description)
    await logActivity('knowledge', 'Base de connaissances créée', name)

    return NextResponse.json({ success: true, knowledgeBase: kb })
  } catch (error) {
    console.error('Knowledge POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// DELETE: Delete a knowledge base
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 })
    }

    await deleteKnowledgeBase(id)
    await logActivity('knowledge', 'Base de connaissances supprimée')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Knowledge DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 })
  }
}