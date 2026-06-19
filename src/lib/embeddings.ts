/* ═══════════════════════════════════════════════════════════════════════
   NexusAI Embeddings — TF-IDF Vectorization + Cosine Similarity
   Provides semantic search without requiring external embedding APIs
   ═══════════════════════════════════════════════════════════════════════ */

import { db } from '@/lib/db'

// ── Stop Words (English + French) ──

const STOP_WORDS = new Set([
  // English
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
  'should', 'may', 'might', 'must', 'can', 'could', 'of', 'in', 'to',
  'for', 'with', 'on', 'at', 'by', 'from', 'as', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'between', 'out', 'off',
  'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
  'when', 'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and',
  'or', 'if', 'while', 'about', 'up', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he',
  'him', 'his', 'she', 'her', 'they', 'them', 'their', 'what', 'which',
  'who', 'whom', 'also',
  // French
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'en', 'est',
  'dans', 'que', 'qui', 'sur', 'pour', 'ne', 'pas', 'plus', 'par', 'ce',
  'se', 'au', 'avec', 'son', 'sa', 'ses',
])

// ── Suffix stripping (basic English/French stemming) ──

function stem(word: string): string {
  // Basic suffix stripping — not a full Porter stemmer but covers common patterns
  let s = word
  if (s.length > 6 && s.endsWith('ement')) s = s.slice(0, -5)
  if (s.length > 5 && s.endsWith('ment')) s = s.slice(0, -4)
  if (s.length > 5 && s.endsWith('tion')) s = s.slice(0, -4)
  if (s.length > 5 && s.endsWith('sion')) s = s.slice(0, -4)
  if (s.length > 5 && s.endsWith('ance')) s = s.slice(0, -4)
  if (s.length > 5 && s.endsWith('ence')) s = s.slice(0, -4)
  if (s.length > 4 && s.endsWith('able')) s = s.slice(0, -4)
  if (s.length > 4 && s.endsWith('ible')) s = s.slice(0, -4)
  if (s.length > 4 && s.endsWith('ings')) s = s.slice(0, -4)
  if (s.length > 4 && s.endsWith('tion')) s = s.slice(0, -4)
  if (s.length > 3 && s.endsWith('ing')) s = s.slice(0, -3)
  if (s.length > 3 && s.endsWith('ies')) s = s.slice(0, -3) // e.g. queries -> quer
  if (s.length > 3 && s.endsWith('ied')) s = s.slice(0, -3)
  if (s.length > 3 && s.endsWith('ant')) s = s.slice(0, -3) // French
  if (s.length > 3 && s.endsWith('ent')) s = s.slice(0, -3) // French
  if (s.length > 3 && s.endsWith('eur')) s = s.slice(0, -3) // French
  if (s.length > 2 && s.endsWith('es')) s = s.slice(0, -2)
  if (s.length > 2 && s.endsWith('ed')) s = s.slice(0, -2)
  if (s.length > 2 && s.endsWith('er')) s = s.slice(0, -2)
  if (s.length > 2 && s.endsWith('ix')) s = s.slice(0, -2) // French
  if (s.length > 1 && s.endsWith('s')) s = s.slice(0, -1)
  if (s.length > 1 && s.endsWith('e')) s = s.slice(0, -1)
  return s
}

// ── Tokenizer ──

function tokenize(text: string): string[] {
  // Split on non-alphanumeric, lowercase, filter stop words & short tokens, stem
  return text
    .toLowerCase()
    .replace(/[^a-zàâäéèêëïîôùûüÿçæœ0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w))
    .map(stem)
}

// ── Build Vocabulary ──

/**
 * Build a vocabulary mapping from a corpus of text chunks.
 * Returns word -> index mapping sorted by frequency (most common first).
 */
export function buildVocabulary(chunks: string[]): Map<string, number> {
  const freq = new Map<string, number>()

  for (const chunk of chunks) {
    const tokens = tokenize(chunk)
    const seen = new Set<string>()
    for (const token of tokens) {
      if (!seen.has(token)) {
        freq.set(token, (freq.get(token) || 0) + 1)
        seen.add(token)
      }
    }
  }

  // Sort by frequency descending, assign indices
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1])
  const vocab = new Map<string, number>()
  for (const [word, _count] of sorted) {
    vocab.set(word, vocab.size)
  }

  return vocab
}

// ── Compute IDF ──

/**
 * Compute Inverse Document Frequency for each term in the corpus.
 * IDF(t) = log(N / df(t) + 1) where N = total docs, df(t) = docs containing term t.
 */
export function computeIdf(chunks: string[]): Map<string, number> {
  const n = chunks.length
  const df = new Map<string, number>()

  for (const chunk of chunks) {
    const tokens = tokenize(chunk)
    const seen = new Set<string>()
    for (const token of tokens) {
      if (!seen.has(token)) {
        df.set(token, (df.get(token) || 0) + 1)
        seen.add(token)
      }
    }
  }

  const idf = new Map<string, number>()
  for (const [term, docFreq] of df) {
    idf.set(term, Math.log((n + 1) / (docFreq + 1)) + 1) // smoothed IDF
  }

  return idf
}

// ── Compute TF-IDF Vector ──

/**
 * Compute the TF-IDF vector for a text against the given vocabulary and IDF map.
 * Returns a number array of length vocabulary.size.
 */
export function computeTfIdf(
  text: string,
  vocabulary: Map<string, number>,
  idf: Map<string, number>
): number[] {
  const tokens = tokenize(text)
  const tfMap = new Map<string, number>()

  for (const token of tokens) {
    tfMap.set(token, (tfMap.get(token) || 0) + 1)
  }

  const totalTerms = tokens.length || 1
  const vector = new Array(vocabulary.size).fill(0)

  for (const [term, count] of tfMap) {
    const idx = vocabulary.get(term)
    if (idx !== undefined) {
      const tf = count / totalTerms
      const idfVal = idf.get(term) || 1
      vector[idx] = tf * idfVal
    }
  }

  return vector
}

// ── Cosine Similarity ──

/**
 * Compute cosine similarity between two vectors.
 * Returns a value between 0 and 1 (0 = unrelated, 1 = identical direction).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dotProduct / denom
}

// ── Vectorize a Single Chunk ──

/**
 * Generate a TF-IDF vector for a single chunk and return it as a JSON string
 * suitable for storage in the database.
 */
export function vectorizeChunk(
  content: string,
  vocabulary: Map<string, number>,
  idf: Map<string, number>
): string {
  const vector = computeTfIdf(content, vocabulary, idf)
  return JSON.stringify(vector)
}

// ── Vectorize Entire Knowledge Base ──

/**
 * Re-index all chunks in a knowledge base with TF-IDF embeddings.
 * Builds vocabulary from all chunks, computes IDF, and updates the embedding
 * field for each chunk.
 */
export async function vectorizeKnowledgeBase(
  knowledgeBaseId: string
): Promise<{ vectorized: number }> {
  // Load all chunks
  const chunks = await db.knowledgeChunk.findMany({
    where: { knowledgeBaseId },
    orderBy: { chunkIndex: 'asc' },
  })

  if (chunks.length === 0) return { vectorized: 0 }

  // Build vocabulary and IDF from the corpus
  const texts = chunks.map(c => c.content)
  const vocabulary = buildVocabulary(texts)
  const idf = computeIdf(texts)

  // Compute and store embeddings for each chunk
  let vectorized = 0
  for (const chunk of chunks) {
    const embedding = vectorizeChunk(chunk.content, vocabulary, idf)
    await db.knowledgeChunk.update({
      where: { id: chunk.id },
      data: { embedding },
    })
    vectorized++
  }

  return { vectorized }
}

// ── Semantic Search ──

/**
 * Perform semantic search across a knowledge base using TF-IDF cosine similarity.
 * Returns the top N chunks most similar to the query.
 * Falls back gracefully if some chunks don't have embeddings (they are skipped).
 */
export async function semanticSearch(
  knowledgeBaseId: string,
  query: string,
  limit = 8
): Promise<
  Array<{
    id: string
    content: string
    sourceFile: string
    chunkIndex: number
    score: number
  }>
> {
  // Load all chunks with embeddings
  const chunks = await db.knowledgeChunk.findMany({
    where: {
      knowledgeBaseId,
      embedding: { not: null },
    },
    orderBy: { chunkIndex: 'asc' },
  })

  if (chunks.length === 0) return []

  // Rebuild vocabulary and IDF from the same chunks that have embeddings
  // We need to build from ALL chunks (including non-embedded) for consistency,
  // but vectorize only the embedded ones. Actually, for query matching,
  // we build vocab from the embedded chunks to ensure dimension alignment.
  const texts = chunks.map(c => c.content)
  const vocabulary = buildVocabulary(texts)
  const idf = computeIdf(texts)

  // Vectorize the query
  const queryVector = computeTfIdf(query, vocabulary, idf)

  // Score each chunk by cosine similarity
  const scored = chunks
    .map(chunk => {
      let chunkVector: number[]
      try {
        chunkVector = JSON.parse(chunk.embedding || '[]')
      } catch {
        return null
      }

      // Skip if vector dimension doesn't match query vector
      if (chunkVector.length !== queryVector.length) return null

      const score = cosineSimilarity(queryVector, chunkVector)
      return {
        id: chunk.id,
        content: chunk.content,
        sourceFile: chunk.sourceFile,
        chunkIndex: chunk.chunkIndex,
        score,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  // Sort by score descending, return top N
  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, limit)
}
