import { NextRequest } from 'next/server'
import { requireAuth, logActivity, incrementUsage } from '@/lib/ensure-user'
import { db } from '@/lib/db'
import { getProvider } from '@/lib/ai-provider'
import { executeSkill, getSkillRegistry, getAllSkillDefinitions } from '@/lib/skill-registry'
import { executeAgentAutonomously, type ReActResult } from '@/lib/agent-tools'
import { streamOrchestration } from '@/lib/multi-agent'

/* ═══════════════════════════════════════════════════════════════════════
   SSE Streaming Chat API
   Modes: chat | agent | orchestrator | skill
   ═══════════════════════════════════════════════════════════════════════ */

type ChatMode = 'chat' | 'agent' | 'orchestrator' | 'skill'

interface StreamRequestBody {
  messages: Array<{ role: string; content: string }>
  mode?: ChatMode
  skillId?: string
  agentTools?: string[]
  conversationId?: string
  model?: string
  fileAttachments?: Array<{ name: string; type: string; content: string }>
}

export async function POST(request: NextRequest) {
  // ── Auth check (outside stream so we can return 401 immediately) ──
  let user
  try {
    user = await requireAuth()
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error && (error as { statusCode: number }).statusCode === 401) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ error: 'Authentication failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Parse body ──
  let body: StreamRequestBody
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const {
    messages,
    mode = 'chat',
    skillId,
    agentTools = [],
    conversationId,
    model,
    fileAttachments = [],
  } = body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Messages array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const validatedMode = ['chat', 'agent', 'orchestrator', 'skill'].includes(mode)
    ? (mode as ChatMode)
    : 'chat'

  // ── Build message content with file attachments ──
  const userMessage = messages[messages.length - 1]
  let enhancedContent = userMessage.content

  if (fileAttachments.length > 0) {
    const attachmentDescriptions = fileAttachments
      .map((f) => `[Fichier joint: ${f.name}] Description: fichier ${f.type} joint à la conversation.`)
      .join('\n')
    enhancedContent = `${userMessage.content}\n\n${attachmentDescriptions}`
  }

  const conversationHistory = messages.slice(0, -1)

  // ── SSE Stream ──
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      function send(event: string, data: Record<string, unknown>) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      let activeConversationId = conversationId
      let assistantContent = ''

      try {
        // ── Create or validate conversation ──
        const firstUserContent = messages.find((m) => m.role === 'user')?.content || 'Nouvelle conversation'
        const title = firstUserContent.slice(0, 50) + (firstUserContent.length > 50 ? '...' : '')

        if (activeConversationId) {
          const existing = await db.conversation.findFirst({
            where: { id: activeConversationId, userId: user!.id },
          })
          if (!existing) {
            const conv = await db.conversation.create({
              data: { userId: user!.id, title },
            })
            activeConversationId = conv.id
          }
        } else {
          const conv = await db.conversation.create({
            data: { userId: user!.id, title },
          })
          activeConversationId = conv.id
        }

        // ── Save user message ──
        if (activeConversationId) {
          await db.message.create({
            data: {
              conversationId: activeConversationId,
              role: 'user',
              content: enhancedContent,
            },
          })
        }

        // ── Execute based on mode ──
        switch (validatedMode) {
          // ═══════════════════════════════════════════
          // MODE: CHAT — Simple streaming response
          // ═══════════════════════════════════════════
          case 'chat': {
            const provider = await getProvider()
            const sdkMessages = messages.map((m) => ({
              role: m.role as 'system' | 'user' | 'assistant',
              content: m.content,
            }))

            // Inject file attachment context into the last user message for the AI
            if (fileAttachments.length > 0) {
              const lastMsg = sdkMessages[sdkMessages.length - 1]
              if (lastMsg && lastMsg.role === 'user') {
                const attachCtx = fileAttachments
                  .map((f) => `[Fichier joint: ${f.name} (${f.type})]`)
                  .join('\n')
                lastMsg.content += '\n\n' + attachCtx
              }
            }

            const gen = provider.chatStream(sdkMessages, model ? { model } : undefined)

            for await (const chunk of gen) {
              assistantContent += chunk
              send('chunk', { content: chunk })
            }

            send('done', { conversationId: activeConversationId })
            break
          }

          // ═══════════════════════════════════════════
          // MODE: AGENT — ReAct autonomous agent
          // ═══════════════════════════════════════════
          case 'agent': {
            const systemPrompt = `Tu es un assistant IA avancé avec accès à des outils. Réponds de manière précise et utile.`

            const result: ReActResult = await executeAgentAutonomously(
              systemPrompt,
              enhancedContent,
              agentTools as Array<'web_search' | 'web_reader' | 'code_generation' | 'code_review' | 'writing' | 'editing' | 'summarization' | 'translation' | 'data_analysis' | 'visualization' | 'sentiment_analysis' | 'keyword_extraction' | 'image_generation' | 'image_analysis' | 'text_to_speech' | 'speech_to_text' | 'email_composer' | 'math_evaluation'>,
              conversationHistory
            )

            // Stream each thinking step and tool result
            for (const step of result.steps) {
              if (step.tool) {
                send('thinking', {
                  thought: step.thought,
                  tool: step.tool,
                })
                // Find matching tool result for this step
                const toolResult = result.toolResults.find((tr) => tr.tool === step.tool)
                send('tool_result', {
                  tool: step.tool,
                  success: toolResult?.success ?? false,
                  data: step.result.substring(0, 1000),
                })
              } else {
                send('thinking', {
                  thought: step.thought,
                  tool: null,
                })
              }
            }

            assistantContent = result.content
            send('done', { content: assistantContent, iterations: result.iterations })
            break
          }

          // ═══════════════════════════════════════════
          // MODE: SKILL — Execute a specific skill
          // ═══════════════════════════════════════════
          case 'skill': {
            if (!skillId) {
              send('error', { error: 'skillId is required for skill mode' })
              return
            }

            // Verify skill exists
            const allSkills = getAllSkillDefinitions()
            const skillDef = allSkills.find((s) => s.id === skillId)
            if (!skillDef) {
              send('error', { error: `Skill "${skillId}" not found` })
              return
            }

            send('skill_start', { skillId, name: skillDef.name })

            const skillInput = {
              query: enhancedContent,
              messages: conversationHistory,
              fileAttachments,
            }

            const skillResult = await executeSkill(skillId, skillInput)

            assistantContent = skillResult.data
            send('skill_result', {
              success: skillResult.success,
              data: skillResult.data.substring(0, 2000),
              durationMs: skillResult.durationMs,
              metadata: skillResult.metadata,
            })
            send('done', {})
            break
          }

          // ═══════════════════════════════════════════
          // MODE: ORCHESTRATOR — Multi-agent orchestration
          // ═══════════════════════════════════════════
          case 'orchestrator': {
            const orchestratorStream = streamOrchestration(enhancedContent)

            for await (const event of orchestratorStream) {
              if (event.event === 'final') {
                assistantContent = String((event.data as { answer?: string }).answer || '')
              }
              // Pass through all events as SSE
              send(event.event, event.data)
            }
            break
          }
        }

        // ── Save assistant message to DB ──
        if (activeConversationId && assistantContent) {
          await db.message.create({
            data: {
              conversationId: activeConversationId,
              role: 'assistant',
              content: assistantContent,
            },
          })

          // Update conversation timestamp
          await db.conversation.update({
            where: { id: activeConversationId },
            data: { updatedAt: new Date() },
          })
        }

        // ── Update user credits ──
        await db.user.update({
          where: { id: user!.id },
          data: { credits: { decrement: 1 } },
        }).catch(() => {
          // Silently fail if credits column doesn't exist
        })

        // ── Log activity ──
        await logActivity(
          'chat_stream',
          `Chat stream (${validatedMode})`,
          activeConversationId ? `Conversation: ${activeConversationId}` : undefined,
          { mode: validatedMode, messageLength: assistantContent.length }
        )

        // ── Increment usage ──
        await incrementUsage('chatRequests')
        await incrementUsage('tokensUsed', assistantContent.length)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        send('error', { error: message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
