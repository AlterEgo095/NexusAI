/* ═══════════════════════════════════════════════════════════════
   NexusAI — Skills API
   GET: List all skill definitions grouped by category
   POST: Execute a skill (requires auth + deducts credits)
   ═══════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/ensure-user'
import { db } from '@/lib/db'
import {
  getAllSkillDefinitions,
  getSkillRegistry,
  type SkillDefinition,
  type SkillOutput,
} from '@/lib/skill-registry'

/* ═══════════════════════════════════════════════════════════════
   GET — Return all skill definitions grouped by category
   ═══════════════════════════════════════════════════════════════ */
export async function GET() {
  try {
    const definitions = getAllSkillDefinitions()
    const registry = getSkillRegistry()
    const categories = registry.getCategories()

    // Group skills by category
    const skillsByCategory: Record<string, SkillDefinition[]> = {}
    for (const skill of definitions) {
      const cat = skill.category
      if (!skillsByCategory[cat]) {
        skillsByCategory[cat] = []
      }
      skillsByCategory[cat].push(skill)
    }

    return NextResponse.json({
      success: true,
      categories,
      skillsByCategory,
      totalSkills: definitions.length,
    })
  } catch (error) {
    console.error('Skills fetch error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

/* ═══════════════════════════════════════════════════════════════
   POST — Execute a skill (auth required, 1 credit deducted)
   ═══════════════════════════════════════════════════════════════ */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()

    // Parse request body
    let body: { skillId?: string; input?: Record<string, unknown> }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body.' },
        { status: 400 }
      )
    }

    const { skillId, input } = body

    if (!skillId || typeof skillId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'skillId is required and must be a string.' },
        { status: 400 }
      )
    }

    // Verify the skill exists
    const registry = getSkillRegistry()
    const definition = registry.getDefinition(skillId)
    if (!definition) {
      return NextResponse.json(
        { success: false, error: `Unknown skill: "${skillId}".` },
        { status: 404 }
      )
    }

    // Check user has enough credits
    if (user.credits <= 0) {
      return NextResponse.json(
        { success: false, error: 'Insufficient credits. Please top up your account.' },
        { status: 402 }
      )
    }

    // Execute the skill
    const result: SkillOutput = await registry.execute(skillId, input || {})

    // Deduct 1 credit on execution (even if skill partially fails internally)
    await db.user.update({
      where: { id: user.id },
      data: { credits: { decrement: 1 } },
    })

    return NextResponse.json({
      success: true,
      skillId,
      skillName: definition.name,
      output: result,
      creditsRemaining: user.credits - 1,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }

    console.error('Skill execution error:', error)
    const message = error instanceof Error ? error.message : 'Unknown skill execution error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
