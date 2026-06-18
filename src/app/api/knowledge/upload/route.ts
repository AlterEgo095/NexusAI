import { NextRequest, NextResponse } from 'next/server'
import { ensureDefaultUser, logActivity, incrementUsage } from '@/lib/ensure-user'
import { ingestFile } from '@/lib/rag'

/* ═══════════════════════════════════════════════════════════════════════
   Knowledge Upload API — File upload endpoint for RAG
   Accepts multipart/form-data with files
   ═══════════════════════════════════════════════════════════════════════ */

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const knowledgeBaseId = formData.get('knowledgeBaseId') as string

    if (!knowledgeBaseId) {
      return NextResponse.json({ success: false, error: 'knowledgeBaseId is required' }, { status: 400 })
    }

    const files = formData.getAll('files') as File[]
    if (files.length === 0) {
      return NextResponse.json({ success: false, error: 'No files provided' }, { status: 400 })
    }

    const results: Array<{
      filename: string
      size: number
      chunksCreated: number
      totalChars: number
      error?: string
    }> = []

    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const { chunksCreated, totalChars } = await ingestFile(knowledgeBaseId, buffer, file.name)
        results.push({ filename: file.name, size: file.size, chunksCreated, totalChars })
      } catch (error) {
        results.push({
          filename: file.name,
          size: file.size,
          chunksCreated: 0,
          totalChars: 0,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        })
      }
    }

    const totalChunks = results.reduce((sum, r) => sum + r.chunksCreated, 0)
    const totalChars = results.reduce((sum, r) => sum + r.totalChars, 0)
    const successCount = results.filter(r => !r.error).length

    await logActivity('knowledge', `${successCount}/${files.length} fichier(s) importé(s)`, `${totalChunks} chunks, ${totalChars} caractères`)
    await incrementUsage('agentRequests')

    return NextResponse.json({
      success: true,
      results,
      summary: {
        totalFiles: files.length,
        successCount,
        totalChunks,
        totalChars,
      },
    })
  } catch (error) {
    console.error('Knowledge upload error:', error)
    const message = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}