/* ═══════════════════════════════════════════════════════════════════════
   NexusAI RAG Engine — Retrieval-Augmented Generation
   Phase 1: File parsing + text chunking + keyword-based retrieval + LLM answer
   Supports: PDF, DOCX, TXT, MD, CSV, XLSX
   ═══════════════════════════════════════════════════════════════════════ */

import { db } from './db'
import { getProvider } from './ai-provider'
import { semanticSearch, vectorizeKnowledgeBase } from './embeddings'

export interface ParsedDocument {
  text: string
  metadata: Record<string, unknown>
}

export interface RetrievedChunk {
  id: string
  content: string
  sourceFile: string
  chunkIndex: number
  score: number
}

const CHUNK_SIZE = 800 // characters per chunk
const CHUNK_OVERLAP = 100 // overlap between chunks
const MAX_RETRIEVED = 8 // max chunks to feed to LLM

// ── File Parsing ──

export async function parseFile(buffer: Buffer, filename: string): Promise<ParsedDocument> {
  const ext = filename.split('.').pop()?.toLowerCase() || ''

  switch (ext) {
    case 'pdf':
      return parsePDF(buffer)
    case 'docx':
    case 'doc':
      return parseDOCX(buffer)
    case 'xlsx':
    case 'xls':
      return parseXLSX(buffer)
    case 'csv':
      return parseCSV(buffer)
    case 'txt':
    case 'md':
    case 'json':
    default:
      return { text: buffer.toString('utf-8'), metadata: { format: ext } }
  }
}

async function parsePDF(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    return {
      text: data.text || '',
      metadata: { format: 'pdf', pages: data.numpages },
    }
  } catch (error) {
    throw new Error(`Erreur de parsing PDF: ${error instanceof Error ? error.message : 'inconnu'}`)
  }
}

async function parseDOCX(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return {
      text: result.value || '',
      metadata: { format: 'docx' },
    }
  } catch (error) {
    throw new Error(`Erreur de parsing DOCX: ${error instanceof Error ? error.message : 'inconnu'}`)
  }
}

async function parseXLSX(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheets: string[] = []

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const csv = XLSX.utils.sheet_to_csv(sheet)
      sheets.push(`=== Feuille: ${sheetName} ===\n${csv}`)
    }

    return {
      text: sheets.join('\n\n'),
      metadata: { format: 'xlsx', sheets: workbook.SheetNames },
    }
  } catch (error) {
    throw new Error(`Erreur de parsing XLSX: ${error instanceof Error ? error.message : 'inconnu'}`)
  }
}

function parseCSV(buffer: Buffer): ParsedDocument {
  const text = buffer.toString('utf-8')
  const lines = text.split('\n')
  return {
    text,
    metadata: { format: 'csv', rows: lines.length, columns: lines[0]?.split(',').length || 0 },
  }
}

// ── Text Chunking ──

export function chunkText(text: string, filename: string): Array<{
  content: string
  metadata: Record<string, unknown>
}> {
  if (!text || text.trim().length === 0) return []

  // Clean up excessive whitespace
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

  if (cleaned.length <= CHUNK_SIZE) {
    return [{ content: cleaned, metadata: { source: filename, chunk: 0, total: 1 } }]
  }

  const chunks: Array<{ content: string; metadata: Record<string, unknown> }> = []
  let start = 0
  let index = 0

  while (start < cleaned.length) {
    let end = Math.min(start + CHUNK_SIZE, cleaned.length)

    // Try to break at a paragraph or sentence boundary
    if (end < cleaned.length) {
      const paragraphBreak = cleaned.lastIndexOf('\n\n', end)
      const sentenceBreak = cleaned.lastIndexOf('. ', end)
      const lineBreak = cleaned.lastIndexOf('\n', end)

      if (paragraphBreak > start + CHUNK_SIZE * 0.3) {
        end = paragraphBreak + 1
      } else if (sentenceBreak > start + CHUNK_SIZE * 0.3) {
        end = sentenceBreak + 2
      } else if (lineBreak > start + CHUNK_SIZE * 0.3) {
        end = lineBreak + 1
      }
    }

    const chunk = cleaned.slice(start, end).trim()
    if (chunk.length > 20) { // Skip very small chunks
      chunks.push({
        content: chunk,
        metadata: { source: filename, chunk: index },
      })
      index++
    }

    start = end - CHUNK_OVERLAP
    if (start < 0) start = 0
  }

  // Update total count in metadata
  for (const c of chunks) {
    c.metadata.total = chunks.length
  }

  return chunks
}

// ── Knowledge Base Management ──

export async function createKnowledgeBase(name: string, description?: string) {
  const { ensureDefaultUser } = await import('./ensure-user')
  const user = await ensureDefaultUser()

  return db.knowledgeBase.create({
    data: { userId: user.id, name, description },
  })
}

export async function listKnowledgeBases() {
  const { ensureDefaultUser } = await import('./ensure-user')
  const user = await ensureDefaultUser()

  return db.knowledgeBase.findMany({
    where: { userId: user.id },
    include: { _count: { select: { chunks: true } } },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function deleteKnowledgeBase(id: string) {
  // Chunks are cascade-deleted
  return db.knowledgeBase.delete({ where: { id } })
}

// ── Ingest Files into Knowledge Base ──

export async function ingestFile(
  knowledgeBaseId: string,
  buffer: Buffer,
  filename: string
): Promise<{ chunksCreated: number; totalChars: number }> {
  // Parse the file
  const parsed = await parseFile(buffer, filename)

  if (!parsed.text || parsed.text.trim().length === 0) {
    return { chunksCreated: 0, totalChars: 0 }
  }

  // Chunk the text
  const chunks = chunkText(parsed.text, filename)

  // Store chunks in DB
  const created = await db.knowledgeChunk.createMany({
    data: chunks.map((c, i) => ({
      knowledgeBaseId,
      content: c.content,
      sourceFile: filename,
      chunkIndex: i,
      metadata: JSON.stringify({ ...c.metadata, ...parsed.metadata }),
    })),
  })

  // Re-index knowledge base with TF-IDF embeddings in the background
  try {
    await vectorizeKnowledgeBase(knowledgeBaseId)
  } catch {
    // Vectorization failure should not block ingestion
  }

  return {
    chunksCreated: created.count,
    totalChars: parsed.text.length,
  }
}

// ── Retrieval (semantic search with keyword fallback) ──

export async function retrieveChunks(
  knowledgeBaseId: string,
  query: string,
  limit = MAX_RETRIEVED
): Promise<RetrievedChunk[]> {
  // Get all chunks for this knowledge base
  const allChunks = await db.knowledgeChunk.findMany({
    where: { knowledgeBaseId },
    orderBy: { chunkIndex: 'asc' },
  })

  if (allChunks.length === 0) return []

  // Check if embeddings are available — use semantic search if so
  const hasEmbeddings = allChunks.some(c => c.embedding !== null && c.embedding.length > 2)

  if (hasEmbeddings) {
    try {
      const results = await semanticSearch(knowledgeBaseId, query, limit)
      if (results.length > 0) return results
    } catch {
      // Semantic search failed, fall through to keyword matching
    }
  }

  // Keyword-based fallback
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const scored = allChunks.map(chunk => {
    const chunkText = chunk.content.toLowerCase()
    let score = 0
    for (const word of queryWords) {
      const occurrences = chunkText.split(word).length - 1
      score += occurrences
    }
    // Boost exact phrase matches
    const phrase = query.toLowerCase().slice(0, 50)
    if (chunkText.includes(phrase)) score += 5
    return { ...chunk, score }
  })

  scored.sort((a, b) => b.score - a.score)

  // Return top chunks (only those with score > 0, or top N if no matches)
  const filtered = scored.filter(s => s.score > 0)
  const results = filtered.length > 0 ? filtered : scored.slice(0, 3)

  return results.slice(0, limit).map(c => ({
    id: c.id,
    content: c.content,
    sourceFile: c.sourceFile,
    chunkIndex: c.chunkIndex,
    score: c.score,
  }))
}

// ── RAG Query: Retrieve + Generate ──

export async function ragQuery(
  knowledgeBaseId: string,
  query: string,
  systemPrompt?: string
): Promise<{ answer: string; sources: RetrievedChunk[] }> {
  // Retrieve relevant chunks
  const sources = await retrieveChunks(knowledgeBaseId, query)

  if (sources.length === 0) {
    // Fall back to direct LLM answer
    const provider = await getProvider()
    const response = await provider.chat([
      {
        role: 'system',
        content: systemPrompt || 'Tu es un assistant utile. Réponds en français.',
      },
      { role: 'user', content: query },
    ])
    return { answer: response.content, sources: [] }
  }

  // Build context from retrieved chunks
  const context = sources
    .map((s, i) => `[Source ${i + 1} — ${s.sourceFile}]:\n${s.content}`)
    .join('\n\n---\n\n')

  // Generate answer using LLM with context
  const provider = await getProvider()
  const response = await provider.chat([
    {
      role: 'system',
      content: `${systemPrompt || 'Tu es un assistant qui répond aux questions en te basant sur les documents fournis.'}
      
Règles:
- Réponds EN FRANÇAIS
- Base ta réponse UNIQUEMENT sur les documents fournis ci-dessous
- Cite tes sources entre crochets [Source N]
- Si les documents ne contiennent pas la réponse, dis-le honnêtement
- Structure ta réponse avec des sections claires

Documents de référence:
${context}`,
    },
    { role: 'user', content: query },
  ])

  return { answer: response.content, sources }
}