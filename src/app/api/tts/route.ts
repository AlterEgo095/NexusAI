import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'
import { ensureDefaultUser, logActivity, incrementUsage } from '@/lib/ensure-user'
import { splitTextForTTS } from '@/lib/agent-tools'

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'tongtong', speed = 1.0, format = 'wav' } = await request.json()

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Text is required and cannot be empty' }, { status: 400 })
    }

    const clampedSpeed = Math.min(2.0, Math.max(0.5, Number(speed) || 1.0))

    const user = await ensureDefaultUser()
    const zai = await ZAI.create()

    const chunks = splitTextForTTS(text)

    // Generate audio for the first chunk
    const response = await zai.audio.tts.create({
      input: chunks[0],
      voice,
      speed: clampedSpeed,
      response_format: format,
      stream: false,
    })

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(new Uint8Array(arrayBuffer))
    const base64Audio = buffer.toString('base64')

    // Save to database
    const voiceRecord = await db.voiceGeneration.create({
      data: {
        userId: user.id,
        text: text.trim(),
        voice,
        speed: clampedSpeed,
        format,
        audioData: base64Audio,
      },
    })

    await logActivity('voice', 'Voix générée', text.slice(0, 100), { voice, speed: clampedSpeed, format, chunks: chunks.length, voiceId: voiceRecord.id })
    await incrementUsage('voiceRequests' as 'chatRequests')

    return NextResponse.json({
      success: true,
      audio: base64Audio,
      id: voiceRecord.id,
      chunks: chunks.length,
    })
  } catch (error) {
    console.error('TTS API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const user = await ensureDefaultUser()
    const voices = await db.voiceGeneration.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        text: true,
        voice: true,
        speed: true,
        format: true,
        createdAt: true,
      },
    })
    return NextResponse.json({ success: true, voices })
  } catch (error) {
    console.error('Voice history fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch voice generations' }, { status: 500 })
  }
}