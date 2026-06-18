import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'
import { ensureDefaultUser, logActivity, incrementUsage } from '@/lib/ensure-user'

export async function POST(request: NextRequest) {
  try {
    const { text, targetLang = 'French', sourceLang = 'auto-detect' } = await request.json()

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Text is required and cannot be empty' }, { status: 400 })
    }

    const user = await ensureDefaultUser()
    const zai = await ZAI.create()

    const systemPrompt = `You are a professional translator. Your task is to translate the given text from ${sourceLang === 'auto-detect' ? 'the detected language' : sourceLang} to ${targetLang}.

Rules:
- If the source language is "auto-detect", detect the source language from the text content
- Preserve all formatting (markdown, lists, code blocks, line breaks)
- Maintain the original tone, style, and register
- Return ONLY the translated text, no explanations or notes
- If the text is already in the target language, return it unchanged

Respond with the translation in this exact JSON format (no markdown, no code fences):
{"translatedText": "your translation here", "detectedSourceLang": "the detected or provided source language name"}`

    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      thinking: { type: 'disabled' },
    })

    const raw = response.choices?.[0]?.message?.content || ''

    // Parse the JSON response
    let translatedText = raw
    let detectedLang = sourceLang === 'auto-detect' ? 'detected' : sourceLang

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        translatedText = parsed.translatedText || raw
        detectedLang = parsed.detectedSourceLang || 'detected'
      }
    } catch {
      // If JSON parsing fails, use the raw response as the translation
      translatedText = raw
    }

    // Save to database
    const translationRecord = await db.translation.create({
      data: {
        userId: user.id,
        sourceText: text.trim(),
        translatedText,
        sourceLang: detectedLang,
        targetLang,
      },
    })

    await logActivity('document', 'Traduction', `${detectedLang} → ${targetLang}: ${text.slice(0, 50)}`, { sourceLang: detectedLang, targetLang, translationId: translationRecord.id })
    await incrementUsage('translationRequests' as 'chatRequests')

    return NextResponse.json({
      success: true,
      translatedText,
      sourceLang: detectedLang,
      targetLang,
    })
  } catch (error) {
    console.error('Translation API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const user = await ensureDefaultUser()
    const translations = await db.translation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json({ success: true, translations })
  } catch (error) {
    console.error('Translation history fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch translations' }, { status: 500 })
  }
}