/* ═══════════════════════════════════════════════════════════════════════
   NexusAI Long Term Memory — Persistent memory system for AI context
   Types: user | project | knowledge | preference
   ═══════════════════════════════════════════════════════════════════════ */

import { db } from './db'
import { getProvider } from './ai-provider'

export type MemoryType = 'user' | 'project' | 'knowledge' | 'preference'

export interface MemoryEntry {
  id: string
  type: MemoryType
  key: string
  value: string
  category: string | null
  source: string | null
  importance: number
  createdAt: Date
  updatedAt: Date
}

// ── Save a memory ──
export async function saveMemory(data: {
  type?: MemoryType
  key: string
  value: string
  category?: string
  source?: string
  importance?: number
}): Promise<MemoryEntry> {
  const { ensureDefaultUser } = await import('./ensure-user')
  const user = await ensureDefaultUser()

  // Upsert by key (same key = update)
  const existing = await db.memory.findFirst({
    where: { userId: user.id, key: data.key },
  })

  if (existing) {
    const updated = await db.memory.update({
      where: { id: existing.id },
      data: {
        value: data.value,
        type: data.type || existing.type,
        category: data.category ?? existing.category,
        source: data.source ?? existing.source,
        importance: data.importance ?? existing.importance,
      },
    })
    return mapToEntry(updated)
  }

  const created = await db.memory.create({
    data: {
      userId: user.id,
      type: data.type || 'general',
      key: data.key,
      value: data.value,
      category: data.category || null,
      source: data.source || 'manual',
      importance: data.importance || 5,
    },
  })
  return mapToEntry(created)
}

// ── Recall relevant memories for a query ──
export async function recallMemories(query: string, limit = 10): Promise<MemoryEntry[]> {
  const { ensureDefaultUser } = await import('./ensure-user')
  const user = await ensureDefaultUser()

  // Simple keyword-based relevance (no vector DB needed for MVP)
  const allMemories = await db.memory.findMany({
    where: { userId: user.id },
    orderBy: { importance: 'desc' },
  })

  if (allMemories.length === 0) return []

  // Score each memory by keyword overlap with query
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const scored = allMemories.map(mem => {
    const memText = `${mem.key} ${mem.value} ${mem.category || ''}`.toLowerCase()
    let score = 0
    for (const word of queryWords) {
      if (memText.includes(word)) score++
    }
    // Boost by importance
    score += mem.importance * 0.1
    return { mem, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map(s => mapToEntry(s.mem))
}

// ── Get memories as formatted context for system prompt injection ──
export async function getMemoryContext(query: string): Promise<string> {
  const memories = await recallMemories(query, 8)
  if (memories.length === 0) return ''

  const sections: Record<string, string[]> = {}
  for (const m of memories) {
    const section = m.type || 'general'
    if (!sections[section]) sections[section] = []
    sections[section].push(`- ${m.key}: ${m.value}`)
  }

  let context = '\n\n[Memory Context]\n'
  for (const [type, items] of Object.entries(sections)) {
    context += `## ${type.charAt(0).toUpperCase() + type.slice(1)} Memories\n`
    context += items.join('\n') + '\n\n'
  }
  context += '[End Memory Context]\n'
  return context
}

// ── Auto-summarize a conversation into memories ──
export async function summarizeToMemory(
  conversationMessages: Array<{ role: string; content: string }>,
  source = 'auto'
): Promise<MemoryEntry[]> {
  if (conversationMessages.length < 3) return []

  try {
    const provider = getProvider()
    const lastMessages = conversationMessages.slice(-10)
    const conversationText = lastMessages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 300)}`)
      .join('\n')

    const response = await provider.chat([
      {
        role: 'system',
        content: `Extract 1-3 important facts, preferences, or decisions from this conversation.
Return ONLY a JSON array of objects with "key" and "value" fields.
Keys should be short labels (2-5 words). Values should be concise (1-2 sentences).
If nothing worth remembering, return an empty array [].
Respond in the same language as the conversation.`,
      },
      { role: 'user', content: conversationText },
    ])

    // Parse the LLM response
    const jsonMatch = response.content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const facts = JSON.parse(jsonMatch[0]) as Array<{ key: string; value: string }>
    const saved: MemoryEntry[] = []

    for (const fact of facts) {
      if (fact.key && fact.value) {
        const entry = await saveMemory({
          key: fact.key,
          value: fact.value,
          type: 'knowledge',
          source,
          importance: 6,
        })
        saved.push(entry)
      }
    }

    return saved
  } catch {
    // Silently fail — memory extraction should never break the main flow
    return []
  }
}

// ── List all memories (with optional type filter) ──
export async function listMemories(type?: MemoryType): Promise<MemoryEntry[]> {
  const { ensureDefaultUser } = await import('./ensure-user')
  const user = await ensureDefaultUser()

  const where = type ? { userId: user.id, type } : { userId: user.id }
  const memories = await db.memory.findMany({
    where,
    orderBy: [{ importance: 'desc' }, { updatedAt: 'desc' }],
  })

  return memories.map(mapToEntry)
}

// ── Delete a memory ──
export async function deleteMemory(id: string): Promise<boolean> {
  try {
    await db.memory.delete({ where: { id } })
    return true
  } catch {
    return false
  }
}

// ── Search memories by text ──
export async function searchMemories(query: string): Promise<MemoryEntry[]> {
  const { ensureDefaultUser } = await import('./ensure-user')
  const user = await ensureDefaultUser()

  const all = await db.memory.findMany({
    where: { userId: user.id },
  })

  const queryLower = query.toLowerCase()
  const filtered = all.filter(m => {
    const text = `${m.key} ${m.value} ${m.category || ''}`.toLowerCase()
    return text.includes(queryLower)
  })

  return filtered.map(mapToEntry)
}

// ── Internal mapper ──
function mapToEntry(m: { id: string; type: string; key: string; value: string; category: string | null; source: string | null; importance: number; createdAt: Date; updatedAt: Date }): MemoryEntry {
  return {
    id: m.id,
    type: m.type as MemoryType,
    key: m.key,
    value: m.value,
    category: m.category,
    source: m.source,
    importance: m.importance,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }
}