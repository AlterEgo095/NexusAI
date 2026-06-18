import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDefaultUser, logActivity, incrementUsage } from "@/lib/ensure-user";
import { executeAgentAutonomously, TOOL_DEFINITIONS, type ToolName } from "@/lib/agent-tools";

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, agentId, message, messages, name, description, role, systemPrompt, tools, avatar } = body

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

      // Create execution record
      const execution = await db.agentExecution.create({
        data: {
          agentId,
          input: userMessage,
          status: 'running',
        },
      })

      try {
        const result = await executeAgentAutonomously(agent.systemPrompt, userMessage, agentTools)

        await db.agentExecution.update({
          where: { id: execution.id },
          data: {
            output: result.content,
            toolCalls: JSON.stringify(result.toolResults),
            status: 'completed',
            durationMs: Date.now() - startTime,
          },
        })

        await logActivity('agent', `Agent "${agent.name}" exécuté`, userMessage.slice(0, 100), { agentId, toolCount: result.toolResults.length })
        await incrementUsage('agentRequests')

        return NextResponse.json({
          success: true,
          content: result.content,
          toolResults: result.toolResults,
          executionId: execution.id,
          durationMs: Date.now() - startTime,
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