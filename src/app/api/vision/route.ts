import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'
import { ensureDefaultUser, logActivity, incrementUsage } from '@/lib/ensure-user'

export async function POST(request: NextRequest) {
  try {
    const { image, question = 'Describe this image in detail' } = await request.json()

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ success: false, error: 'Image (URL or base64) is required' }, { status: 400 })
    }

    const imageUrl = image.trim()

    const user = await ensureDefaultUser()
    const zai = await ZAI.create()

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: question },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    })

    const analysis = response.choices?.[0]?.message?.content || 'No analysis generated.'

    await logActivity('image', 'Analyse d\'image', question.slice(0, 100), { imageLength: imageUrl.length })
    await incrementUsage('visionRequests' as 'chatRequests')

    return NextResponse.json({
      success: true,
      analysis,
    })
  } catch (error) {
    console.error('Vision API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}