import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDefaultUser, logActivity, incrementUsage } from "@/lib/ensure-user";
import { executeAgentAutonomously, TOOL_DEFINITIONS, executeTool, type ToolName, type ToolResult } from "@/lib/agent-tools";
import { getProvider, type ChatMessage } from "@/lib/ai-provider";

const DEFAULT_AGENTS = [
  {
    name: "Assistant Général",
    description: "Un assistant IA polyvalent avec recherche, traduction et synthèse vocale.",
    role: "assistant",
    systemPrompt: "Tu es un assistant IA utile et polyvalent. Réponds aux questions de manière claire et concise en français. Utilise les outils disponibles quand c'est pertinent.",
    tools: ["web_search", "summarization", "translation", "math_evaluation"] as ToolName[],
    avatar: "🤖",
  },
  {
    name: "Agent de Recherche",
    description: "Recherche web profonde, lecture d'articles et résumé intelligent.",
    role: "researcher",
    systemPrompt: "Tu es un spécialiste de la recherche. Aide les utilisateurs à trouver, lire et résumer des informations du web. Fournis des résumés bien organisés avec sources citées en français.",
    tools: ["web_search", "web_reader", "summarization", "keyword_extraction"] as ToolName[],
    avatar: "🔍",
  },
  {
    name: "Rédacteur Créatif",
    description: "Rédaction, édition, traduction et composition d'emails professionnels.",
    role: "writer",
    systemPrompt: "Tu es un rédacteur créatif et professionnel. Aide avec la rédaction créative, l'édition, la traduction et les emails. Sois imaginatif et expressif. Réponds en français sauf si on te demande d'écrire dans une autre langue.",
    tools: ["writing", "editing", "translation", "email_composer", "summarization"] as ToolName[],
    avatar: "✍️",
  },
  {
    name: "Expert Code",
    description: "Génération de code, review, débogage et explication technique.",
    role: "coder",
    systemPrompt: "Tu es un expert en programmation. Aide avec le code, le débogage, la génération de snippets et l'explication de concepts. Utilise des exemples de code clairs. Réponds en français.",
    tools: ["code_generation", "code_review", "math_evaluation"] as ToolName[],
    avatar: "💻",
  },
  {
    name: "Créateur Multimodal",
    description: "Génère et analyse des images, et synthétise la voix.",
    role: "artist",
    systemPrompt: "Tu es un directeur artistique et analyste visuel IA. Aide à créer des images et analyser le contenu visuel. Suggère des améliorations pour de meilleurs résultats. Réponds en français.",
    tools: ["image_generation", "image_analysis"] as ToolName[],
    avatar: "🎨",
  },
  {
    name: "Analyste de Données",
    description: "Analyse de données, visualisation, sentiment et extraction de mots-clés.",
    role: "analyst",
    systemPrompt: "Tu es un analyste de données expert. Analyse les données, identifie les tendances et fournis des insights actionnables avec des chiffres précis. Structure ta réponse avec des sections claires. Réponds en français.",
    tools: ["data_analysis", "visualization", "sentiment_analysis", "keyword_extraction", "summarization"] as ToolName[],
    avatar: "📊",
  },
];

async function seedDefaultAgents(userId: string) {
  const existing = await db.customAgent.count({ where: { userId } })
  if (existing === 0) {
    await db.customAgent.createMany({
      data: DEFAULT_AGENTS.map((a) => ({
        userId,
        name: a.name,
        description: a.description,
        role: a.role,
        systemPrompt: a.systemPrompt,
        tools: JSON.stringify(a.tools),
        avatar: a.avatar,
      })),
    })
  }
}

export async function GET() {
  try {
    const user = await ensureDefaultUser()
    await seedDefaultAgents(user.id)

    const agents = await db.customAgent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, agents, toolDefinitions: TOOL_DEFINITIONS })
  } catch (error) {
    console.error("Agents fetch error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch agents" }, { status: 500 })
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   SSE Streaming ReAct Agent — emits events as the agent progresses
   ═══════════════════════════════════════════════════════════════════════ */

const STREAM_MAX_ITERATIONS = 5

const STREAM_REACT_SYSTEM = `You are an advanced AI agent with access to tools. You MUST use the following JSON format for EVERY response:

{"thought": "Your reasoning about what to do next", "tool": "tool_name_or_null", "tool_input": "input_for_tool_or_empty", "final_answer": "your_final_answer_or_empty"}

Rules:
- If you need to use a tool, set "tool" to the tool name and "tool_input" to the input, leave "final_answer" empty.
- If you have enough information to answer, set "final_answer" to your complete answer, leave "tool" and "tool_input" empty/null.
- You can use up to ${STREAM_MAX_ITERATIONS} tool calls in a chain. Think carefully about efficiency.
- Always think before acting. Explain your reasoning in the "thought" field.
- When using web_search before web_reader, do it in one step: search first, then use the URL found.
- Respond in the same language as the user's message.`

interface StreamStep {
  thought: string
  tool: string | null
  toolInput: string
  finalAnswer: string
}

function parseStreamResponse(text: string): StreamStep {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return { thought: '', tool: null, toolInput: '', finalAnswer: text }
  }
  try {
    const parsed = JSON.parse(jsonMatch[0])
    return {
      thought: String(parsed.thought || ''),
      tool: parsed.tool ? String(parsed.tool) : null,
      toolInput: String(parsed.tool_input || parsed.toolInput || ''),
      finalAnswer: String(parsed.final_answer || parsed.finalAnswer || ''),
    }
  } catch {
    return { thought: '', tool: null, toolInput: '', finalAnswer: text }
  }
}

async function* streamAgentExecution(
  systemPrompt: string,
  userMessage: string,
  tools: ToolName[],
  conversationHistory: Array<{ role: string; content: string }>,
): AsyncGenerator<{ event: string; data: Record<string, unknown> }> {
  const provider = getProvider()
  const toolResults: ToolResult[] = []
  const steps: Array<{ thought: string; tool: string | null; result: string }> = []

  // Build conversation messages
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: STREAM_REACT_SYSTEM + '\n\n' + systemPrompt + '\n\nQuand tu utilises des outils, intègre leurs résultats naturellement dans ta réponse finale. Réponds en français.',
    },
  ]

  // Append conversation history (last 6 for context window)
  const recentHistory = conversationHistory.slice(-6)
  for (const msg of recentHistory) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({ role: msg.role, content: msg.content })
    }
  }

  // Current user message
  messages.push({ role: 'user', content: userMessage })

  // Append tool descriptions to system prompt
  const toolDescriptions = tools.length > 0
    ? `\n\nAvailable tools: ${tools.join(', ')}\nTool details:\n${tools.map(t => {
        const def = TOOL_DEFINITIONS.find(d => d.value === t)
        return `- ${t}: ${def?.description || 'No description'}`
      }).join('\n')}`
    : ''

  if (toolDescriptions) {
    messages[0] = { ...messages[0], content: messages[0].content + toolDescriptions }
  }

  // ── ReAct Loop with SSE yields ──
  for (let iteration = 0; iteration < STREAM_MAX_ITERATIONS; iteration++) {
    yield { event: 'thinking', data: { iteration: iteration + 1, maxIterations: STREAM_MAX_ITERATIONS } }

    const response = await provider.chat(messages)
    const parsed = parseStreamResponse(response.content)

    if (parsed.thought) {
      yield { event: 'thought', data: { thought: parsed.thought, iteration: iteration + 1 } }
    }

    // Agent provided a final answer
    if (parsed.finalAnswer && !parsed.tool) {
      steps.push({ thought: parsed.thought, tool: null, result: parsed.finalAnswer })
      yield {
        event: 'final',
        data: {
          content: parsed.finalAnswer,
          iterations: iteration + 1,
          steps,
          toolResults,
        },
      }
      return
    }

    // Agent wants to use a tool
    if (parsed.tool && tools.includes(parsed.tool as ToolName)) {
      yield {
        event: 'tool_start',
        data: { tool: parsed.tool, toolInput: parsed.toolInput || userMessage, iteration: iteration + 1 },
      }

      const toolResult = await executeTool(parsed.tool as ToolName, parsed.toolInput || userMessage)
      toolResults.push(toolResult)

      const observation = toolResult.success
        ? `[Result of ${parsed.tool}]:\n${toolResult.data}`
        : `[Error in ${parsed.tool}]: ${toolResult.data}`

      steps.push({ thought: parsed.thought, tool: parsed.tool, result: observation })

      yield {
        event: 'tool_result',
        data: {
          tool: parsed.tool,
          success: toolResult.success,
          data: toolResult.data,
          durationMs: toolResult.durationMs,
          observation,
          iteration: iteration + 1,
        },
      }

      // Feed observation back into conversation
      messages.push({ role: 'assistant', content: response.content })
      messages.push({
        role: 'user',
        content: `OBSERVATION:\n${observation}\n\nNow continue. Think about what to do next. If you have enough information, provide your final_answer. Otherwise, use another tool. Remember: respond ONLY with JSON.`,
      })

      continue
    }

    // No tool selected, no final answer — treat raw response as the answer
    steps.push({ thought: parsed.thought, tool: null, result: response.content })
    yield {
      event: 'final',
      data: {
        content: response.content,
        iterations: iteration + 1,
        steps,
        toolResults,
      },
    }
    return
  }

  // Max iterations reached — synthesize a final answer
  yield { event: 'synthesizing', data: { message: 'Maximum iterations reached, synthesizing results…' } }

  const toolSummary = toolResults
    .map(r => `[${r.tool}]: ${r.data.substring(0, 300)}`)
    .join('\n\n')

  const synthesisResponse = await provider.chat([
    {
      role: 'system',
      content:
        systemPrompt +
        '\n\nTu as utilisé plusieurs outils pour répondre. Synthétise les résultats en une réponse claire et complète en français.',
    },
    { role: 'user', content: `Question originale: ${userMessage}\n\nRésultats des outils:\n${toolSummary}` },
  ])

  yield {
    event: 'final',
    data: {
      content: synthesisResponse.content,
      iterations: STREAM_MAX_ITERATIONS,
      steps,
      toolResults,
    },
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   POST Handler
   ═══════════════════════════════════════════════════════════════════════ */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, agentId, message, messages, name, description, role, systemPrompt, tools, avatar, stream } = body

    // Handle agent chat execution
    if (action === 'chat') {
      if (!agentId) {
        return NextResponse.json({ success: false, error: "agentId is required for chat" }, { status: 400 })
      }

      const agent = await db.customAgent.findUnique({ where: { id: agentId } })
      if (!agent) {
        return NextResponse.json({ success: false, error: "Agent not found" }, { status: 404 })
      }

      const userMessage = message || (Array.isArray(messages) && messages.length > 0 ? messages[messages.length - 1].content : '')
      if (!userMessage) {
        return NextResponse.json({ success: false, error: "Message is required" }, { status: 400 })
      }

      const agentTools: ToolName[] = JSON.parse(agent.tools || '[]')
      const startTime = Date.now()

      // ── Conversation Memory: fetch last 10 completed executions ──
      const pastExecutions = await db.agentExecution.findMany({
        where: { agentId, status: 'completed' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { input: true, output: true },
      })

      const conversationHistory: Array<{ role: string; content: string }> = pastExecutions
        .reverse() // oldest first for correct temporal order
        .flatMap(exec => [
          { role: 'user' as const, content: exec.input || '' },
          { role: 'assistant' as const, content: exec.output || '' },
        ])
        .filter(msg => msg.content.length > 0)

      // Create execution record
      const execution = await db.agentExecution.create({
        data: {
          agentId,
          input: userMessage,
          status: 'running',
        },
      })

      // ── SSE Streaming Path ──
      if (stream === true) {
        const encoder = new TextEncoder()

        const readable = new ReadableStream({
          async start(controller) {
            let finalContent = ''
            let finalSteps: Array<{ thought: string; tool: string | null; result: string }> = []
            let finalToolResults: ToolResult[] = []
            let finalIterations = 0

            try {
              for await (const { event, data } of streamAgentExecution(
                agent!.systemPrompt,
                userMessage,
                agentTools,
                conversationHistory,
              )) {
                // Capture final state for DB persistence
                if (event === 'final') {
                  finalContent = (data.content as string) || ''
                  finalSteps = (data.steps as typeof finalSteps) || []
                  finalToolResults = (data.toolResults as ToolResult[]) || []
                  finalIterations = (data.iterations as number) || 0
                }

                controller.enqueue(
                  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
                )
              }

              // Signal stream completion
              controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'))

              // Persist execution result to DB
              await db.agentExecution.update({
                where: { id: execution.id },
                data: {
                  output: finalContent,
                  toolCalls: JSON.stringify(finalToolResults),
                  status: 'completed',
                  durationMs: Date.now() - startTime,
                },
              })

              await logActivity(
                'agent',
                `Agent "${agent!.name}" exécuté (stream)`,
                userMessage.slice(0, 100),
                { agentId, toolCount: finalToolResults.length, iterations: finalIterations },
              )
              await incrementUsage('agentRequests')
            } catch (error) {
              const msg = error instanceof Error ? error.message : 'Agent stream execution failed'

              controller.enqueue(
                encoder.encode(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`),
              )

              await db.agentExecution.update({
                where: { id: execution.id },
                data: { status: 'failed', durationMs: Date.now() - startTime },
              })

              console.error('Agent stream error:', error)
            } finally {
              controller.close()
            }
          },
        })

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
          },
        })
      }

      // ── Non-Streaming Path ──
      try {
        const result = await executeAgentAutonomously(
          agent.systemPrompt,
          userMessage,
          agentTools,
          conversationHistory,
        )

        await db.agentExecution.update({
          where: { id: execution.id },
          data: {
            output: result.content,
            toolCalls: JSON.stringify(result.toolResults),
            status: 'completed',
            durationMs: Date.now() - startTime,
          },
        })

        await logActivity(
          'agent',
          `Agent "${agent.name}" exécuté`,
          userMessage.slice(0, 100),
          { agentId, toolCount: result.toolResults.length, iterations: result.iterations },
        )
        await incrementUsage('agentRequests')

        return NextResponse.json({
          success: true,
          content: result.content,
          toolResults: result.toolResults,
          executionId: execution.id,
          durationMs: Date.now() - startTime,
          iterations: result.iterations,
          steps: result.steps,
        })
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Agent execution failed'
        await db.agentExecution.update({
          where: { id: execution.id },
          data: { status: 'failed', durationMs: Date.now() - startTime },
        })
        return NextResponse.json({ success: false, error: msg }, { status: 500 })
      }
    }

    // Handle agent creation
    if (!name || !systemPrompt) {
      return NextResponse.json({ success: false, error: "Name and systemPrompt are required" }, { status: 400 })
    }

    const user = await ensureDefaultUser()
    const agent = await db.customAgent.create({
      data: {
        userId: user.id,
        name,
        description: description || null,
        role: role || 'assistant',
        systemPrompt,
        tools: JSON.stringify(Array.isArray(tools) ? tools : []),
        avatar: avatar || '🤖',
      },
    })

    await logActivity('agent', 'Agent créé', name)

    return NextResponse.json({ success: true, agent })
  } catch (error) {
    console.error("Agents API error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}