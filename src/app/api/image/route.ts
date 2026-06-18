import { NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

const SUPPORTED_SIZES = [
  '1024x1024',
  '768x1344',
  '864x1152',
  '1344x768',
  '1152x864',
  '1440x720',
  '720x1440',
]

export async function POST(request: Request) {
  try {
    const { prompt, size = '1024x1024' } = await request.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      )
    }

    if (!SUPPORTED_SIZES.includes(size)) {
      return NextResponse.json(
        { success: false, error: `Unsupported size. Supported: ${SUPPORTED_SIZES.join(', ')}` },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()

    const response = await zai.images.generations.create({
      prompt,
      size,
    })

    const imageBase64 = response.data?.[0]?.base64

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: 'No image generated' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      image: imageBase64,
    })
  } catch (error) {
    console.error('Image API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
