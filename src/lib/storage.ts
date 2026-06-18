import { promises as fs } from 'fs'
import path from 'path'

/* ═══════════════════════════════════════════════════════════════════════
   NexusAI File Storage — Disk-based storage for large binary data
   Images and audio files stored on disk, DB stores only the file path.
   ═══════════════════════════════════════════════════════════════════════ */

const STORAGE_DIR = path.join(process.cwd(), 'public', 'generated')

// Ensure storage directory exists
async function ensureDir() {
  await fs.mkdir(STORAGE_DIR, { recursive: true })
}

// ── Image Storage ──

export async function saveImage(base64Data: string, prefix = 'img'): Promise<string> {
  await ensureDir()
  const id = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  const filename = `${id}.png`
  const filepath = path.join(STORAGE_DIR, filename)

  // Strip data URL prefix if present
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(cleanBase64, 'base64')
  await fs.writeFile(filepath, buffer)

  return filename // Return just the filename, not the full path
}

export async function getImagePath(filename: string): Promise<string | null> {
  const filepath = path.join(STORAGE_DIR, filename)
  try {
    await fs.access(filepath)
    return filepath
  } catch {
    return null
  }
}

export async function getImageBase64(filename: string): Promise<string | null> {
  const filepath = path.join(STORAGE_DIR, filename)
  try {
    const buffer = await fs.readFile(filepath)
    return buffer.toString('base64')
  } catch {
    return null
  }
}

export async function deleteImage(filename: string): Promise<boolean> {
  const filepath = path.join(STORAGE_DIR, filename)
  try {
    await fs.unlink(filepath)
    return true
  } catch {
    return false
  }
}

// ── Audio Storage ──

export async function saveAudio(base64Data: string, prefix = 'audio', ext = 'wav'): Promise<string> {
  await ensureDir()
  const id = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  const filename = `${id}.${ext}`
  const filepath = path.join(STORAGE_DIR, filename)

  const cleanBase64 = base64Data.replace(/^data:audio\/\w+;base64,/, '')
  const buffer = Buffer.from(cleanBase64, 'base64')
  await fs.writeFile(filepath, buffer)

  return filename
}

export async function getAudioBase64(filename: string): Promise<string | null> {
  const filepath = path.join(STORAGE_DIR, filename)
  try {
    const buffer = await fs.readFile(filepath)
    return buffer.toString('base64')
  } catch {
    return null
  }
}