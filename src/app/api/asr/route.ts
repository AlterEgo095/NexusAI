import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { ensureDefaultUser, logActivity } from '@/lib/ensure-user'

export async function POST(request: NextRequest) {
  try {
    let base64Audio: string | null = null

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData with audio file
      const formData = await request.formData()
      const audioFile = formData.get('audio') as File | null

      if (!audioFile) {
        return NextResponse.json({ success: false, error: 'Audio file is required' }, { status: 400 })
      }

      const arrayBuffer = await audioFile.arrayBuffer()
      const buffer = Buffer.from(new Uint8Array(arrayBuffer))
      base64Audio = buffer.toString('base64')
    } else {
      // Handle JSON with base64 string
      const { audio } = await request.json()

      if (!audio || typeof audio !== 'string' || audio.length < 100) {
        return NextResponse.json({ success: false, error: 'Valid base64 audio data is required' }, { status: 400 })
      }

      base64Audio = audio
    }

    const user = await ensureDefaultUser()
    const zai = await ZAI.create()

    const response = await zai.audio.asr.create({ file_base64: base64Audio })
    const text = response.text || ''

    if (!text) {
      return NextResponse.json({ success: false, error: 'No transcription obtained from audio' }, { status: 500 })
    }

    const wordCount = text.trim().split(/\s+/).filter(Boolean).length

    await logActivity('voice', 'Transcription audio', text.slice(0, 100), { wordCount, inputType: contentType.includes('multipart') ? 'file' : 'base64' })

    return NextResponse.json({
      success: true,
      text,
      wordCount,
    })
  } catch (error) {
    console.error('ASR API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}