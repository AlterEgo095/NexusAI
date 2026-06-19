/* ═══════════════════════════════════════════════════════════════════════
   NexusAI Multi-Agent Orchestrator
   Planner → Workers (parallel) → Critic → Synthesizer
   Uses existing agent system as workers.
   ═══════════════════════════════════════════════════════════════════════ */

import { db } from './db'
import { getProvider, type ChatMessage } from './ai-provider'
import { executeTool, type ToolName, TOOL_DEFINITIONS } from './agent-tools'

// ── Types ──

export interface SubTask {
  id: string
  title: string
  description: string
  assignedAgent?: string // agent ID or agent role
  tools: ToolName[]
  dependsOn: string[] // IDs of sub-tasks this depends on
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: string
  durationMs?: number
}

export interface OrchestrationPlan {
  task: string
  subTasks: SubTask[]
  strategy: string
}

export interface OrchestrationResult {
  id: string
  task: string
  plan: OrchestrationPlan
  results: Array<{
    subTaskId: string
    title: string
    result: string
    durationMs: number
    agentUsed: string
  }>
  finalAnswer: string
  totalDurationMs: number
  status: string
}

// ── Available Agent Roles for Assignment ──

const AGENT_ROLES: Record<string, { tools: ToolName[]; systemPrompt: string }> = {
  researcher: {
    tools: ['web_search', 'web_reader', 'summarization', 'keyword_extraction'],
    systemPrompt: 'Tu es un chercheur expert. Trouve et analyse les informations pertinentes. Réponds en français avec des sources citées.',
  },
  writer: {
    tools: ['writing', 'editing', 'translation', 'email_composer'],
    systemPrompt: 'Tu es un rédacteur professionnel. Produis du contenu de haute qualité. Réponds en français.',
  },
  coder: {
    tools: ['code_generation', 'code_review', 'math_evaluation'],
    systemPrompt: 'Tu es un développeur expert. Écris du code propre et bien documenté. Réponds en français.',
  },
  analyst: {
    tools: ['data_analysis', 'visualization', 'sentiment_analysis', 'keyword_extraction'],
    systemPrompt: 'Tu es un analyste de données expert. Analyse en profondeur et fournis des insights actionnables. Réponds en français.',
  },
  designer: {
    tools: ['image_generation', 'image_analysis'],
    systemPrompt: 'Tu es un directeur artistique IA. Aide avec la création et l\'analyse visuelle. Réponds en français.',
  },
  general: {
    tools: ['web_search', 'summarization', 'translation', 'math_evaluation'],
    systemPrompt: 'Tu es un assistant IA polyvalent. Réponds en français de manière claire et structurée.',
  },
}

// ── Step 1: PLANNER — Decompose task into sub-tasks ──

async function planTask(task: string): Promise<OrchestrationPlan> {
  const provider = await getProvider()

  const rolesList = Object.keys(AGENT_ROLES).join(', ')

  const response = await provider.chat([
    {
      role: 'system',
      content: `You are a task planning expert. Decompose the user's task into sub-tasks.
Available agent roles: ${rolesList}

Return ONLY a JSON object (no markdown, no code fences):
{
  "strategy": "brief description of the approach",
  "subTasks": [
    {
      "title": "short title",
      "description": "what this sub-task should accomplish",
      "assignedAgent": "role name from the list",
      "dependsOn": []
    }
  ]
}

Rules:
- Create 1-5 sub-tasks (fewer is better)
- Each sub-task should be independent if possible (empty dependsOn)
- Assign the most appropriate agent role to each sub-task
- Sub-tasks should be specific and actionable
- Order matters: research before writing, analysis before synthesis`,
    },
    { role: 'user', content: task },
  ])

  // Parse the plan
  const jsonMatch = response.content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Le planner n\'a pas pu générer un plan valide')
  }

  const parsed = JSON.parse(jsonMatch[0])
  const subTasks: SubTask[] = (parsed.subTasks || []).map((st: Record<string, unknown>, i: number) => ({
    id: `task-${i + 1}`,
    title: String(st.title || `Sous-tâche ${i + 1}`),
    description: String(st.description || ''),
    assignedAgent: String(st.assignedAgent || 'general'),
    tools: AGENT_ROLES[String(st.assignedAgent) as keyof typeof AGENT_ROLES]?.tools || AGENT_ROLES.general.tools,
    dependsOn: Array.isArray(st.dependsOn) ? st.dependsOn.map(String) : [],
    status: 'pending' as const,
  }))

  return {
    task,
    subTasks,
    strategy: String(parsed.strategy || 'Approche séquentielle'),
  }
}

// ── Step 2: EXECUTOR — Run sub-tasks (with dependency resolution) ──

async function executeSubTask(subTask: SubTask, originalTask: string): Promise<{ result: string; durationMs: number; agentUsed: string }> {
  const start = Date.now()
  const agentRole = AGENT_ROLES[subTask.assignedAgent || 'general'] || AGENT_ROLES.general

  // Build messages for this sub-task
  const messages: ChatMessage[] = [
    { role: 'system', content: agentRole.systemPrompt },
    {
      role: 'user',
      content: `Tâche globale: ${originalTask}\n\nTa sous-tâche spécifique: ${subTask.title}\n${subTask.description ? `Détails: ${subTask.description}` : ''}`,
    },
  ]

  // If the agent has tools, use a simple tool-assisted approach
  if (subTask.tools.length > 0) {
    // One-shot: ask LLM if tools are needed, then execute if so
    const toolList = subTask.tools.map(t => {
      const def = TOOL_DEFINITIONS.find(d => d.value === t)
      return `- ${t}: ${def?.description || ''}`
    }).join('\n')

    messages[0] = {
      ...messages[0],
      content: `${agentRole.systemPrompt}\n\nOutils disponibles:\n${toolList}\n\nUtilise les outils si nécessaire pour accomplir ta sous-tâche. Si tu utilises un outil, FORMAT: [TOOL:nom_outil] input pour l'outil [/TOOL] puis donne ta réponse.`,
    }

    const response = await (await import('./ai-provider')).getProvider().chat(messages)
    let result = response.content

    // Check for tool calls in the response
    const toolCallPattern = /\[TOOL:(\w+)\](.*?)\[\/TOOL\]/gs
    let match
    while ((match = toolCallPattern.exec(result)) !== null) {
      const toolName = match[1] as ToolName
      const toolInput = match[2].trim()
      try {
        const toolResult = await executeTool(toolName, toolInput || subTask.description)
        result = result.replace(match[0], `[Résultat ${toolName}]: ${toolResult.data.substring(0, 500)}`)
      } catch {
        result = result.replace(match[0], `[Erreur ${toolName}]`)
      }
    }

    return { result, durationMs: Date.now() - start, agentUsed: subTask.assignedAgent || 'general' }
  }

  // No tools — direct LLM response
  const provider = await (await import('./ai-provider')).getProvider()
  const response = await provider.chat(messages)
  return { result: response.content, durationMs: Date.now() - start, agentUsed: subTask.assignedAgent || 'general' }
}

async function executePlan(plan: OrchestrationPlan): Promise<Array<{
  subTaskId: string
  title: string
  result: string
  durationMs: number
  agentUsed: string
}>> {
  const results: Array<{
    subTaskId: string
    title: string
    result: string
    durationMs: number
    agentUsed: string
  }> = []

  const remaining = [...plan.subTasks]

  while (remaining.length > 0) {
    // Find tasks whose dependencies are all completed
    const ready = remaining.filter(st =>
      st.dependsOn.every(depId => results.some(r => r.subTaskId === depId))
    )

    if (ready.length === 0) {
      // Deadlock — execute remaining sequentially
      for (const st of remaining) {
        const r = await executeSubTask(st, plan.task)
        results.push({ subTaskId: st.id, title: st.title, ...r })
      }
      break
    }

    // Execute ready tasks in parallel
    const parallelResults = await Promise.all(
      ready.map(async (st) => {
        const r = await executeSubTask(st, plan.task)
        return { subTaskId: st.id, title: st.title, ...r }
      })
    )

    results.push(...parallelResults)

    // Remove completed tasks
    for (const st of ready) {
      const idx = remaining.indexOf(st)
      if (idx !== -1) remaining.splice(idx, 1)
    }
  }

  return results
}

// ── Step 3: SYNTHESIZER — Combine all results into final answer ──

async function synthesizeResults(
  task: string,
  strategy: string,
  results: Array<{
    subTaskId: string
    title: string
    result: string
    agentUsed: string
  }>
): Promise<string> {
  const provider = await getProvider()

  const resultsText = results
    .map((r, i) => `### ${i + 1}. ${r.title} (Agent: ${r.agentUsed})\n${r.result}`)
    .join('\n\n---\n\n')

  const response = await provider.chat([
    {
      role: 'system',
      content: `Tu es un synthétiseur expert. Tu combines les résultats de plusieurs agents spécialisés en une réponse cohérente et complète.

Règles:
- Réponds EN FRANÇAIS
- Intègre les résultats de tous les agents de manière fluide
- Ne répète pas les mêmes informations
- Structure clairement avec des titres et sections
- Si les résultats sont contradictoires, mentionne-le
- Sois concis mais complet`,
    },
    {
      role: 'user',
      content: `Tâche originale: ${task}\nStratégie: ${strategy}\n\nRésultats des agents:\n${resultsText}`,
    },
  ])

  return response.content
}

// ── Main Orchestrator Entry Point ──

export async function orchestrate(task: string): Promise<OrchestrationResult> {
  const { ensureDefaultUser, logActivity, incrementUsage } = await import('./ensure-user')
  const user = await ensureDefaultUser()
  const startTime = Date.now()

  // Create orchestration record
  const orchestration = await db.orchestration.create({
    data: {
      userId: user.id,
      task,
      status: 'planning',
    },
  })

  try {
    // Step 1: Plan
    const plan = await planTask(task)
    await db.orchestration.update({
      where: { id: orchestration.id },
      data: { status: 'executing', plan: JSON.stringify(plan.subTasks) },
    })

    // Step 2: Execute
    const results = await executePlan(plan)

    // Step 3: Synthesize
    await db.orchestration.update({
      where: { id: orchestration.id },
      data: { status: 'synthesizing', results: JSON.stringify(results) },
    })

    const finalAnswer = await synthesizeResults(task, plan.strategy, results)

    const totalDurationMs = Date.now() - startTime

    // Update record
    await db.orchestration.update({
      where: { id: orchestration.id },
      data: {
        status: 'completed',
        finalAnswer,
        durationMs: totalDurationMs,
        results: JSON.stringify(results),
        agentIds: JSON.stringify(results.map(r => r.agentUsed)),
      },
    })

    await logActivity('orchestration', `Tâche orchestrée: ${task.slice(0, 80)}`, `${plan.subTasks.length} sous-tâches, ${totalDurationMs}ms`)
    await incrementUsage('agentRequests', plan.subTasks.length)

    return {
      id: orchestration.id,
      task,
      plan,
      results,
      finalAnswer,
      totalDurationMs,
      status: 'completed',
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    await db.orchestration.update({
      where: { id: orchestration.id },
      data: { status: 'failed', durationMs: Date.now() - startTime },
    })
    throw error
  }
}

// ── SSE Streaming Orchestrator ──

export async function* streamOrchestration(
  task: string
): AsyncGenerator<{ event: string; data: Record<string, unknown> }> {
  const { ensureDefaultUser, logActivity, incrementUsage } = await import('./ensure-user')
  const user = await ensureDefaultUser()
  const startTime = Date.now()

  const orchestration = await db.orchestration.create({
    data: { userId: user.id, task, status: 'planning' },
  })

  try {
    // Step 1: Plan
    yield { event: 'status', data: { status: 'planning', message: 'Analyse de la tâche et planification...' } }
    const plan = await planTask(task)
    yield { event: 'plan', data: { strategy: plan.strategy, subTasks: plan.subTasks.map(st => ({ id: st.id, title: st.title, agent: st.assignedAgent })) } }

    await db.orchestration.update({
      where: { id: orchestration.id },
      data: { status: 'executing', plan: JSON.stringify(plan.subTasks) },
    })

    // Step 2: Execute sub-tasks
    const results: Array<{ subTaskId: string; title: string; result: string; durationMs: number; agentUsed: string }> = []

    const remaining = [...plan.subTasks]
    while (remaining.length > 0) {
      const ready = remaining.filter(st =>
        st.dependsOn.every(depId => results.some(r => r.subTaskId === depId))
      )

      if (ready.length === 0) {
        for (const st of remaining) {
          yield { event: 'task_start', data: { subTaskId: st.id, title: st.title, agent: st.assignedAgent } }
          const r = await executeSubTask(st, task)
          results.push({ subTaskId: st.id, title: st.title, ...r })
          yield { event: 'task_done', data: { subTaskId: st.id, title: st.title, agent: r.agentUsed, durationMs: r.durationMs, preview: r.result.slice(0, 200) } }
        }
        break
      }

      // Execute ready tasks
      for (const st of ready) {
        yield { event: 'task_start', data: { subTaskId: st.id, title: st.title, agent: st.assignedAgent } }
      }

      const parallelResults = await Promise.all(
        ready.map(async (st) => {
          const r = await executeSubTask(st, task)
          return { subTaskId: st.id, title: st.title, ...r }
        })
      )

      for (const r of parallelResults) {
        results.push(r)
        yield { event: 'task_done', data: { subTaskId: r.subTaskId, title: r.title, agent: r.agentUsed, durationMs: r.durationMs, preview: r.result.slice(0, 200) } }
      }

      for (const st of ready) {
        const idx = remaining.indexOf(st)
        if (idx !== -1) remaining.splice(idx, 1)
      }
    }

    // Step 3: Synthesize
    yield { event: 'status', data: { status: 'synthesizing', message: 'Synthèse des résultats...' } }
    await db.orchestration.update({
      where: { id: orchestration.id },
      data: { status: 'synthesizing', results: JSON.stringify(results) },
    })

    const finalAnswer = await synthesizeResults(task, plan.strategy, results)
    const totalDurationMs = Date.now() - startTime

    await db.orchestration.update({
      where: { id: orchestration.id },
      data: { status: 'completed', finalAnswer, durationMs: totalDurationMs, results: JSON.stringify(results), agentIds: JSON.stringify(results.map(r => r.agentUsed)) },
    })

    await logActivity('orchestration', `Tâche orchestrée: ${task.slice(0, 80)}`, `${plan.subTasks.length} sous-tâches, ${totalDurationMs}ms`)
    await incrementUsage('agentRequests', plan.subTasks.length)

    yield { event: 'final', data: { answer: finalAnswer, totalDurationMs, subTaskCount: plan.subTasks.length } }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    await db.orchestration.update({
      where: { id: orchestration.id },
      data: { status: 'failed', durationMs: Date.now() - startTime },
    })
    yield { event: 'error', data: { error: msg } }
  }
}