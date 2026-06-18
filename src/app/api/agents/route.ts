import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDefaultUser, logActivity, incrementUsage } from "@/lib/ensure-user";
import { executeAgentAutonomously, TOOL_DEFINITIONS, type ToolName } from "@/lib/agent-tools";

const DEFAULT_AGENTS = [
  {
    name: "Assistant Général",
    description: "Un assistant IA utile qui répond aux questions et aide dans diverses tâches.",
    role: "assistant",
    systemPrompt: "Tu es un assistant IA utile. Réponds aux questions de manière claire et concise en français.",
    tools: [] as ToolName[],
    avatar: "🤖",
  },
  {
    name: "Agent de Recherche",
    description: "Spécialisé dans la recherche web et le résumé de résultats.",
    role: "researcher",
    systemPrompt: "Tu es un spécialiste de la recherche. Aide les utilisateurs à trouver et résumer des informations. Fournis des résumés bien organisés et factuels en français.",
    tools: ["web_search", "web_reader", "summarization"] as ToolName[],
    avatar: "🔍",
  },
  {
    name: "Rédacteur Créatif",
    description: "Assistant de rédaction créative pour histoires, poèmes et contenu.",
    role: "writer",
    systemPrompt: "Tu es un rédacteur créatif. Aide les utilisateurs avec la rédaction créative : histoires, poèmes, scripts et création de contenu. Sois imaginatif et expressif. Réponds en français.",
    tools: ["writing", "editing"] as ToolName[],
    avatar: "✍️",
  },
  {
    name: "Expert Code",
    description: "Aide pour les questions de code, le débogage et la génération.",
    role: "coder",
    systemPrompt: "Tu es un expert en programmation. Aide les utilisateurs avec les questions de code, le débogage, la génération de snippets et l'explication de concepts techniques. Utilise des exemples de code clairs. Réponds en français.",
    tools: ["code_generation", "code_review"] as ToolName[],
    avatar: "💻",
  },
  {
    name: "Créateur d'Images",
    description: "Génère des images à partir de descriptions textuelles.",
    role: "artist",
    systemPrompt: "Tu es un directeur artistique IA. Aide les utilisateurs à créer des prompts détaillés et vivants pour la génération d'images. Suggère des améliorations pour de meilleurs résultats. Réponds en français.",
    tools: ["image_generation"] as ToolName[],
    avatar: "🎨",
  },
  {
    name: "Analyste de Données",
    description: "Analyse les données et fournit des insights avec des visualisations.",
    role: "analyst",
    systemPrompt: "Tu es un analyste de données expert. Analyse les données fournies, identifie les tendances et fournisse des insights actionnables avec des chiffres précis. Structure ta réponse avec des sections claires. Réponds en français.",
    tools: ["data_analysis", "visualization", "summarization"] as ToolName[],
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