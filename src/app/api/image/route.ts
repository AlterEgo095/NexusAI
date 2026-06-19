import { NextRequest, NextResponse } from 'next/server'
import { getProvider } from '@/lib/ai-provider'
import { db } from '@/lib/db'
import { ensureDefaultUser, logActivity, incrementUsage } from '@/lib/ensure-user'
import { saveImage, getImageBase64 } from '@/lib/storage'

const SUPPORTED_SIZES = [
  '1024x1024',
  '768x1344',
  '864x1152',
  '1344x768',
  '1152x864',
  '1440x720',
  '720x1440',
]

export async function POST(request: NextRequest) {
  try {
    const { prompt, size = '1024x1024', style } = await request.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 })
    }

    if (!SUPPORTED_SIZES.includes(size)) {
      return NextResponse.json(
        { success: false, error: `Unsupported size. Supported: ${SUPPORTED_SIZES.join(', ')}` },
        { status: 400 }
      )
    }

    const user = await ensureDefaultUser()
    const provider = await getProvider()

    const response = await provider.imageGeneration({ prompt, size })

    const imageBase64 = response.base64

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: 'No image generated' }, { status: 500 })
    }

    // Save image to disk, store path in DB
    const filePath = await saveImage(imageBase64, 'img')

    const imageRecord = await db.imageGeneration.create({
      data: {
        userId: user.id,
        prompt,
        size,
        style: style || null,
        imageData: '',
        filePath: `generated/${filePath}`,
      },
    })

    await logActivity('image', 'Image générée', prompt.slice(0, 100), { size, style, imageId: imageRecord.id, storage: 'disk' })
    await incrementUsage('imageRequests')

    return NextResponse.json({
      success: true,
      image: imageBase64,
      id: imageRecord.id,
      filePath: `/generated/${filePath}`,
    })
  } catch (error) {
    console.error('Image API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const user = await ensureDefaultUser()
    const images = await db.imageGeneration.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        prompt: true,
        size: true,
        style: true,
        createdAt: true,
      },
    })
    return NextResponse.json({ success: true, images })
  } catch (error) {
    console.error('Image history fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch images' }, { status: 500 })
  }
}