/* ═══════════════════════════════════════════════════════════════
   NexusAI — File Upload API
   Handles multipart file uploads with auth, validation, and storage.
   Files are saved to public/uploads/{userId}/{timestamp}-{filename}
   ═══════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, readFile } from 'fs/promises'
import path from 'path'
import { requireAuth, AuthError } from '@/lib/ensure-user'
import { db } from '@/lib/db'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_BASE64_SIZE = 2 * 1024 * 1024 // 2MB — return base64 content only for small files
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided. Use multipart/form-data with a "file" field.' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.` },
        { status: 400 }
      )
    }

    if (file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'File is empty.' },
        { status: 400 }
      )
    }

    // Validate file type — reject unknown/binary types with no extension
    const fileName = file.name.trim()
    if (!fileName) {
      return NextResponse.json(
        { success: false, error: 'File name is required.' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Ensure upload directory for this user exists
    const userDir = path.join(UPLOAD_DIR, user.id)
    await mkdir(userDir, { recursive: true })

    // Generate unique filename: timestamp-originalname
    const timestamp = Date.now()
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const savedName = `${timestamp}-${safeName}`
    const filePath = path.join(userDir, savedName)

    // Write file to disk
    await writeFile(filePath, buffer)

    // Build the public URL path
    const fileUrl = `/uploads/${user.id}/${savedName}`

    // For small files (< 2MB), return base64 content
    let fileContent = ''
    if (buffer.length < MAX_BASE64_SIZE) {
      fileContent = buffer.toString('base64')
    }

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      fileContent,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }

    console.error('Upload error:', error)
    const message = error instanceof Error ? error.message : 'Unknown upload error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

// Reject all other HTTP methods
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}
