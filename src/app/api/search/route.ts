import { NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: Request) {
  try {
    const { query, num = 8 } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()

    // Perform web search
    const searchResults = await zai.functions.invoke('web_search', {
      query,
      num: Math.min(num, 10),
    })

    if (!searchResults || !Array.isArray(searchResults)) {
      return NextResponse.json({
        success: true,
        results: [],
        summary: '',
      })
    }

    // Build AI summary from top results
    const topResults = searchResults.slice(0, 5)
    const searchContext = topResults
      .map(
        (r, i) =>
          `[${i + 1}] ${r.name}\n   ${r.snippet}\n   Source: ${r.url}`
      )
      .join('\n\n')

    let summary = ''
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content:
              'Tu es un assistant de recherche IA. Résume les résultats de recherche de manière claire, concise et informative en français. Utilise des références numérotées [1], [2], etc. pour citer les sources. Fais des paragraphes courts et bien structurés.',
          },
          {
            role: 'user',
            content: `Recherche : "${query}"\n\nRésultats trouvés :\n${searchContext}\n\nFournis un résumé clair et concis de ces résultats en français, en citant les sources.`,
          },
        ],
        thinking: { type: 'disabled' },
      })

      summary =
        completion.choices?.[0]?.message?.content || ''
    } catch {
      // Fallback if summary generation fails
      summary =
        `Voici les résultats pour "${query}". Consultez les sources ci-dessous pour plus d'informations.`
    }

    // Map search results to our interface
    const results = searchResults.map((item) => ({
      url: item.url || '',
      name: item.name || '',
      snippet: item.snippet || '',
      host_name: item.host_name || '',
      rank: item.rank || 0,
      date: item.date || '',
      favicon: item.favicon || '',
    }))

    return NextResponse.json({
      success: true,
      results,
      summary,
    })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
