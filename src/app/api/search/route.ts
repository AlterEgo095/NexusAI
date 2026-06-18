import { NextRequest, NextResponse } from 'next/server'
import { getProvider } from '@/lib/ai-provider'
import { db } from '@/lib/db'
import { ensureDefaultUser, logActivity, incrementUsage } from '@/lib/ensure-user'

export async function POST(request: NextRequest) {
  try {
    const { query, num = 8, filter = 'all' } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ success: false, error: 'Query is required' }, { status: 400 })
    }

    const user = await ensureDefaultUser()
    const provider = await getProvider()

    // Perform web search
    const searchResults = await provider.webSearch(query, Math.min(num, 10))

    if (!searchResults || !Array.isArray(searchResults)) {
      await logActivity('search', 'Recherche effectuée', query)
      await incrementUsage('searchRequests')
      return NextResponse.json({ success: true, results: [], summary: '' })
    }

    // Build AI summary from top results
    const topResults = searchResults.slice(0, 5)
    const searchContext = topResults
      .map((r: { name?: string; snippet?: string; url?: string }, i: number) =>
        `[${i + 1}] ${r.name}\n   ${r.snippet}\n   Source: ${r.url}`
      )
      .join('\n\n')

    let summary = ''
    try {
      const completion = await provider.chat([
          {
            role: 'system',
            content: 'Tu es un assistant de recherche IA. Résume les résultats de recherche de manière claire, concise et informative en français. Utilise des références numérotées [1], [2], etc. pour citer les sources. Fais des paragraphes courts et bien structurés.',
          },
          {
            role: 'user',
            content: `Recherche : "${query}"\n\nRésultats trouvés :\n${searchContext}\n\nFournis un résumé clair et concis de ces résultats en français, en citant les sources.`,
          },
        ])
      summary = completion || ''
    } catch {
      summary = `Voici les résultats pour "${query}". Consultez les sources ci-dessous pour plus d'informations.`
    }

    // Map search results to our interface
    const results = (searchResults as Record<string, unknown>[]).map((item) => ({
      url: String(item.url || ''),
      name: String(item.name || ''),
      snippet: String(item.snippet || ''),
      host_name: String(item.host_name || ''),
      rank: Number(item.rank || 0),
      date: String(item.date || ''),
      favicon: String(item.favicon || ''),
    }))

    // Save to search history
    await db.searchHistory.create({
      data: {
        userId: user.id,
        query,
        results: JSON.stringify(results.slice(0, 5)),
        summary,
        filter,
        resultCount: results.length,
      },
    })

    await logActivity('search', 'Recherche effectuée', query, { resultCount: results.length })
    await incrementUsage('searchRequests')

    return NextResponse.json({ success: true, results, summary })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const user = await ensureDefaultUser()
    const history = await db.searchHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json({ success: true, history })
  } catch (error) {
    console.error('Search history fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch history' }, { status: 500 })
  }
}