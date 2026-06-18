import { NextRequest, NextResponse } from 'next/server'
import { getProvider } from '@/lib/ai-provider'
import { db } from '@/lib/db'
import { ensureDefaultUser, logActivity, incrementUsage } from '@/lib/ensure-user'

/* ═══════════════════════════════════════════════════════════════════════
   Browser Agent API
   Actions: browse | ask | summarize | extract-links | history
   ═══════════════════════════════════════════════════════════════════════ */

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function extractLinks(html: string): Array<{ text: string; href: string }> {
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  const links: Array<{ text: string; href: string }> = []
  let match: RegExpExecArray | null
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1]
    const text = stripHtml(match[2]).slice(0, 100)
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      links.push({ text: text || href, href })
    }
  }
  return links
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (!action || typeof action !== 'string') {
      return NextResponse.json({ success: false, error: 'Action est requise' }, { status: 400 })
    }

    const user = await ensureDefaultUser()
    const provider = getProvider()

    /* ── BROWSE: Fetch page content ── */
    if (action === 'browse') {
      const { url } = body
      if (!url || typeof url !== 'string') {
        return NextResponse.json({ success: false, error: 'URL est requise' }, { status: 400 })
      }

      // Ensure URL has protocol
      let normalizedUrl = url.trim()
      if (!normalizedUrl.match(/^https?:\/\//i)) {
        normalizedUrl = 'https://' + normalizedUrl
      }

      const startTime = Date.now()
      let result
      try {
        result = await provider.webReader(normalizedUrl)
      } catch (fetchError) {
        console.error('Page fetch error:', fetchError)
        // Save error session
        await db.browserSession.create({
          data: {
            userId: user.id,
            url: normalizedUrl,
            title: null,
            status: 'error',
            actions: JSON.stringify([{ action: 'browse', error: 'Impossible de récupérer la page', timestamp: new Date().toISOString() }]),
          },
        })
        return NextResponse.json({
          success: false,
          error: 'Impossible de récupérer cette page. Vérifiez l\'URL et réessayez.',
        }, { status: 422 })
      }

      const fetchedAt = new Date().toISOString()
      const durationMs = Date.now() - startTime

      const title = result?.title || result?.data?.title || new URL(normalizedUrl).hostname
      const rawHtml = result?.html || result?.data?.html || ''
      const content = stripHtml(rawHtml)
      const wordCount = content.split(/\s+/).filter(Boolean).length
      const links = extractLinks(rawHtml)

      // Save session to DB
      const session = await db.browserSession.create({
        data: {
          userId: user.id,
          url: normalizedUrl,
          title,
          status: 'completed',
          actions: JSON.stringify([
            { action: 'browse', wordCount, durationMs, timestamp: fetchedAt },
          ]),
        },
      })

      await logActivity('search', 'Page visitée', `${title} — ${normalizedUrl}`, { wordCount, durationMs })

      return NextResponse.json({
        success: true,
        sessionId: session.id,
        title,
        content,
        wordCount,
        links,
        fetchedAt,
        durationMs,
        url: normalizedUrl,
      })
    }

    /* ── ASK: Answer a question about page content ── */
    if (action === 'ask') {
      const { url, question, pageContent } = body
      if (!question || typeof question !== 'string') {
        return NextResponse.json({ success: false, error: 'Question est requise' }, { status: 400 })
      }
      if (!pageContent || typeof pageContent !== 'string') {
        return NextResponse.json({ success: false, error: 'Contenu de la page requis' }, { status: 400 })
      }

      // Truncate content to avoid token limits (keep ~6000 words)
      const truncatedContent = pageContent.split(/\s+/).slice(0, 6000).join(' ')

      const systemPrompt = `Tu es un assistant de navigation web IA expert. Tu réponds aux questions des utilisateurs sur le contenu d'une page web.
Tu dois répondre uniquement en français. Base tes réponses UNIQUEMENT sur le contenu de la page fourni.
Si la réponse ne se trouve pas dans le contenu, dis-le honnêtement.
Sois précis et cite des passages pertinents quand c'est utile.

URL de la page : ${url || 'Non spécifiée'}

Contenu de la page :
---
${truncatedContent}
---`

      const response = await provider.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ])

      await logActivity('search', 'Question sur une page', question, { url })

      return NextResponse.json({ success: true, answer: response.content })
    }

    /* ── SUMMARIZE: Summarize page content ── */
    if (action === 'summarize') {
      const { content, url } = body
      if (!content || typeof content !== 'string') {
        return NextResponse.json({ success: false, error: 'Contenu est requis' }, { status: 400 })
      }

      // Truncate content
      const truncatedContent = content.split(/\s+/).slice(0, 6000).join(' ')

      const systemPrompt = `Tu es un assistant de navigation web IA. Tu résumes le contenu de pages web en français.
Fournis un résumé structuré et informatif avec :
1. **Résumé principal** (2-3 paragraphes)
2. **Points clés** (liste à puces)
3. **Thèmes abordés**

Sois concis mais complet. Utilise le formatage markdown. Réponds uniquement en français.

URL de la page : ${url || 'Non spécifiée'}

Contenu de la page :
---
${truncatedContent}
---`

      const response = await provider.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Résume le contenu de cette page web de manière claire et structurée.' },
      ])

      await logActivity('search', 'Page résumée', url || 'URL inconnue')

      return NextResponse.json({ success: true, summary: response.content })
    }

    /* ── EXTRACT-LINKS: Extract and categorize links ── */
    if (action === 'extract-links') {
      const { content, url } = body
      if (!content || typeof content !== 'string') {
        return NextResponse.json({ success: false, error: 'Contenu est requis' }, { status: 400 })
      }

      const systemPrompt = `Tu es un assistant de navigation web IA. Analyse le contenu de cette page et identifie les liens importants mentionnés dans le texte.
Extrais et catégorise les liens/URLs trouvés dans le contenu en les regroupant par type :
- **Liens internes** (même domaine)
- **Liens externes** (autres domaines)
- **Ressources** (documents, images, vidéos)

Pour chaque lien, donne son URL et une brève description si possible.
Réponds en français. Si aucun lien n'est trouvé, dis-le.

URL de la page : ${url || 'Non spécifiée'}

Contenu de la page :
---
${content.split(/\s+/).slice(0, 4000).join(' ')}
---`

      const response = await provider.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Extrais et catégorise tous les liens mentionnés dans cette page.' },
      ])

      return NextResponse.json({ success: true, extraction: response.content })
    }

    return NextResponse.json({ success: false, error: 'Action non reconnue' }, { status: 400 })
  } catch (error) {
    console.error('Browser API error:', error)
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

/* ── GET: List recent browser sessions ── */
export async function GET() {
  try {
    const user = await ensureDefaultUser()
    const sessions = await db.browserSession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    const formatted = sessions.map((s) => ({
      id: s.id,
      url: s.url,
      title: s.title,
      status: s.status,
      actions: s.actions,
      createdAt: s.createdAt,
    }))

    return NextResponse.json({ success: true, sessions: formatted })
  } catch (error) {
    console.error('Browser history fetch error:', error)
    return NextResponse.json({ success: false, error: 'Impossible de charger l\'historique' }, { status: 500 })
  }
}