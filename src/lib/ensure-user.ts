import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function ensureDefaultUser() {
  let user = await db.user.findFirst({ where: { email: 'user@nexusai.local' } })
  if (!user) {
    try {
      user = await db.user.create({
        data: { email: 'user@nexusai.local', name: 'NexusAI User', role: 'admin', credits: 10000 }
      })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        user = await db.user.findFirst({ where: { email: 'user@nexusai.local' } })
      } else {
        throw e
      }
    }
  }
  return user
}

export async function logActivity(type: string, action: string, details?: string, metadata?: Record<string, unknown>) {
  const user = await ensureDefaultUser()
  return db.activityLog.create({
    data: {
      userId: user.id,
      type,
      action,
      details,
      metadata: metadata ? JSON.stringify(metadata) : null,
    }
  })
}

export async function incrementUsage(field: 'chatRequests' | 'searchRequests' | 'imageRequests' | 'agentRequests' | 'automationRuns' | 'voiceRequests' | 'visionRequests' | 'translationRequests' | 'tokensUsed', amount: number = 1) {
  const user = await ensureDefaultUser()
  const today = new Date().toISOString().split('T')[0]
  const stat = await db.usageStats.upsert({
    where: { userId_date: { userId: user.id, date: today } },
    update: { [field]: { increment: amount } },
    create: { userId: user.id, date: today, [field]: amount },
  })
  return stat
}