export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureDefaultUser } from '@/lib/ensure-user'
import { getProvider } from '@/lib/ai-provider'
import { readdir, stat, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

/* ═══════════════════════════════════════════════════════════════════════
   MCP Server Definitions & Tool Schemas
   ═══════════════════════════════════════════════════════════════════════ */

interface ToolDef {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, { type: string; description: string }>
    required?: string[]
  }
}

interface ServerDef {
  name: string
  icon: string
  description: string
  tools: ToolDef[]
}

const MCP_SERVERS: Record<string, ServerDef> = {
  filesystem: {
    name: 'Filesystem',
    icon: '📁',
    description: 'Accès aux fichiers et répertoires du système',
    tools: [
      {
        name: 'list_files',
        description: 'Liste les fichiers dans un répertoire',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Chemin du répertoire' },
          },
          required: ['path'],
        },
      },
      {
        name: 'read_file',
        description: "Lit le contenu d'un fichier",
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Chemin du fichier' },
          },
          required: ['path'],
        },
      },
      {
        name: 'get_file_info',
        description: "Obtient les métadonnées d'un fichier",
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Chemin du fichier' },
          },
          required: ['path'],
        },
      },
    ],
  },
  web_search: {
    name: 'Web Search',
    icon: '🔍',
    description: 'Recherche web et lecture de pages',
    tools: [
      {
        name: 'web_search',
        description: 'Recherche sur le web',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Requête de recherche' },
            num: { type: 'number', description: 'Nombre de résultats (défaut: 5)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'web_reader',
        description: "Lit le contenu d'une page web",
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL de la page' },
          },
          required: ['url'],
        },
      },
    ],
  },
  code_analysis: {
    name: 'Code Analysis',
    icon: '💻',
    description: 'Analyse et explication de code par IA',
    tools: [
      {
        name: 'analyze_code',
        description: "Analyse du code et suggestions d'amélioration",
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code à analyser' },
            language: { type: 'string', description: 'Langage de programmation' },
          },
          required: ['code'],
        },
      },
      {
        name: 'explain_code',
        description: 'Explique un bout de code en détail',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code à expliquer' },
          },
          required: ['code'],
        },
      },
    ],
  },
  system_info: {
    name: 'System Info',
    icon: 'ℹ️',
    description: "Informations sur la plateforme et l'environnement",
    tools: [
      {
        name: 'get_stats',
        description: 'Statistiques de la plateforme',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_models',
        description: 'Liste les modèles IA disponibles',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  },
}

/* ═══════════════════════════════════════════════════════════════════════
   Tool Execution Implementations
   ═══════════════════════════════════════════════════════════════════════ */

const SAFE_ROOTS = [
  '/home/z/my-project/src',
  '/home/z/my-project/public',
  '/home/z/my-project/prisma',
  '/home/z/my-project/examples',
]

function isPathSafe(inputPath: string): string | null {
  const resolved = path.resolve(inputPath)
  for (const root of SAFE_ROOTS) {
    if (resolved.startsWith(root) || resolved === root) {
      return resolved
    }
  }
  return null
}

async function executeFilesystemTool(toolName: string, params: Record<string, unknown>) {
  switch (toolName) {
    case 'list_files': {
      const inputPath = String(params.path || '.')
      const safePath = isPathSafe(inputPath)
      if (!safePath) {
        return { error: `Accès refusé : le chemin "${inputPath}" est en dehors des répertoires autorisés` }
      }
      if (!existsSync(safePath)) {
        return { error: `Le répertoire "${inputPath}" n'existe pas` }
      }
      try {
        const entries = await readdir(safePath, { withFileTypes: true })
        const files = await Promise.all(
          entries.map(async (e) => ({
            name: e.name,
            type: e.isDirectory() ? 'directory' : 'file',
            size: e.isFile() ? (await stat(path.join(safePath, e.name))).size : null,
          }))
        )
        return { path: safePath, files, total: files.length }
      } catch {
        return { error: `Impossible de lire le répertoire "${inputPath}"` }
      }
    }

    case 'read_file': {
      const inputPath = String(params.path || '')
      const safePath = isPathSafe(inputPath)
      if (!safePath) {
        return { error: `Accès refusé : le chemin "${inputPath}" est en dehors des répertoires autorisés` }
      }
      if (!existsSync(safePath)) {
        return { error: `Le fichier "${inputPath}" n'existe pas` }
      }
      try {
        const content = await readFile(safePath, 'utf-8')
        const stats = await stat(safePath)
        const maxLen = 10000
        const truncated = content.length > maxLen
        return {
          path: safePath,
          content: truncated ? content.slice(0, maxLen) + '\n\n... [contenu tronqué]' : content,
          size: stats.size,
          truncated,
        }
      } catch {
        return { error: `Impossible de lire le fichier "${inputPath}"` }
      }
    }

    case 'get_file_info': {
      const inputPath = String(params.path || '')
      const safePath = isPathSafe(inputPath)
      if (!safePath) {
        return { error: `Accès refusé : le chemin "${inputPath}" est en dehors des répertoires autorisés` }
      }
      if (!existsSync(safePath)) {
        return { error: `Le fichier "${inputPath}" n'existe pas` }
      }
      try {
        const stats = await stat(safePath)
        return {
          path: safePath,
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          accessed: stats.atime,
          sizeFormatted: stats.size < 1024
            ? `${stats.size} B`
            : stats.size < 1024 * 1024
              ? `${(stats.size / 1024).toFixed(1)} KB`
              : `${(stats.size / (1024 * 1024)).toFixed(1)} MB`,
        }
      } catch {
        return { error: `Impossible d'obtenir les infos du fichier "${inputPath}"` }
      }
    }

    default:
      return { error: `Outil inconnu : ${toolName}` }
  }
}

async function executeWebSearchTool(toolName: string, params: Record<string, unknown>) {
  const provider = getProvider()

  switch (toolName) {
    case 'web_search': {
      const query = String(params.query || '')
      if (!query.trim()) {
        return { error: 'La requête de recherche est vide' }
      }
      try {
        const num = Number(params.num) || 5
        const results = await provider.webSearch(query, num)
        return {
          query,
          results: results.map((r, i) => ({
            rank: i + 1,
            title: r.name || 'Sans titre',
            snippet: r.snippet || '',
            url: r.url || '',
            hostname: r.host_name || '',
            date: r.date || '',
          })),
          totalResults: results.length,
        }
      } catch (err: unknown) {
        return { error: `Erreur de recherche : ${err instanceof Error ? err.message : 'Erreur inconnue'}` }
      }
    }

    case 'web_reader': {
      const url = String(params.url || '')
      if (!url.trim()) {
        return { error: "L'URL est vide" }
      }
      try {
        const result = await provider.webReader(url)
        const htmlContent = result.html || result.data?.html || ''
        const textContent = htmlContent
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        const maxLen = 8000
        const truncated = textContent.length > maxLen
        return {
          url,
          title: result.title || result.data?.title || '',
          content: truncated ? textContent.slice(0, maxLen) + '\n\n... [contenu tronqué]' : textContent,
          publishedTime: result.publishedTime || result.data?.publishedTime || null,
          truncated,
        }
      } catch (err: unknown) {
        return { error: `Erreur de lecture : ${err instanceof Error ? err.message : 'Erreur inconnue'}` }
      }
    }

    default:
      return { error: `Outil inconnu : ${toolName}` }
  }
}

async function executeCodeAnalysisTool(toolName: string, params: Record<string, unknown>) {
  const provider = getProvider()

  switch (toolName) {
    case 'analyze_code': {
      const code = String(params.code || '')
      if (!code.trim()) {
        return { error: 'Le code à analyser est vide' }
      }
      const language = String(params.language || 'détecté automatiquement')
      try {
        const response = await provider.chat([
          {
            role: 'system',
            content: `Tu es un expert en analyse de code. Analyse le code fourni et donne :
1. Un résumé de ce que fait le code
2. Les problèmes potentiels (bugs, vulnérabilités, performances)
3. Des suggestions d'amélioration
4. Une note de qualité (1-10)
Réponds en français de manière structurée.`,
          },
          { role: 'user', content: `Langage : ${language}\n\nCode :\n\`\`\`\n${code}\n\`\`\`` },
        ])
        return { analysis: response.content, language, codeLength: code.length }
      } catch (err: unknown) {
        return { error: `Erreur d'analyse : ${err instanceof Error ? err.message : 'Erreur inconnue'}` }
      }
    }

    case 'explain_code': {
      const code = String(params.code || '')
      if (!code.trim()) {
        return { error: 'Le code à expliquer est vide' }
      }
      try {
        const response = await provider.chat([
          {
            role: 'system',
            content: `Tu es un excellent enseignant en programmation. Explique le code fourni de façon claire et pédagogique en français :
1. L'objectif global du code
2. Explication ligne par ligne ou bloc par bloc
3. Les concepts clés utilisés
4. Des exemples d'utilisation si pertinent
Réponds en français avec des sections claires.`,
          },
          { role: 'user', content: `Explique ce code :\n\`\`\`\n${code}\n\`\`\`` },
        ])
        return { explanation: response.content, codeLength: code.length }
      } catch (err: unknown) {
        return { error: `Erreur d'explication : ${err instanceof Error ? err.message : 'Erreur inconnue'}` }
      }
    }

    default:
      return { error: `Outil inconnu : ${toolName}` }
  }
}

async function executeSystemInfoTool(toolName: string) {
  switch (toolName) {
    case 'get_stats': {
      try {
        const [
          conversationCount,
          agentCount,
          documentCount,
          automationCount,
          memoryCount,
          knowledgeBaseCount,
          mcpConnectionCount,
        ] = await Promise.all([
          db.conversation.count(),
          db.customAgent.count(),
          db.document.count(),
          db.automation.count(),
          db.memory.count(),
          db.knowledgeBase.count(),
          db.mcpConnection.count(),
        ])

        const today = new Date().toISOString().split('T')[0]
        const todayStats = await db.usageStats.findUnique({
          where: { userId_date: { userId: (await ensureDefaultUser()).id, date: today } },
        })

        const uptime = process.uptime()
        const hours = Math.floor(uptime / 3600)
        const minutes = Math.floor((uptime % 3600) / 60)

        return {
          platform: 'NexusAI Workspace',
          version: '1.0.0',
          uptime: `${hours}h ${minutes}m`,
          database: {
            conversations: conversationCount,
            agents: agentCount,
            documents: documentCount,
            automations: automationCount,
            memories: memoryCount,
            knowledgeBases: knowledgeBaseCount,
            mcpConnections: mcpConnectionCount,
          },
          todayUsage: todayStats
            ? {
                chat: todayStats.chatRequests,
                search: todayStats.searchRequests,
                images: todayStats.imageRequests,
                agents: todayStats.agentRequests,
                automations: todayStats.automationRuns,
                voice: todayStats.voiceRequests,
                vision: todayStats.visionRequests,
                translations: todayStats.translationRequests,
                tokens: todayStats.tokensUsed,
              }
            : null,
          environment: {
            node: process.version,
            platform: process.platform,
            aiProvider: (process.env.AI_PROVIDER || 'zai').toUpperCase(),
          },
        }
      } catch (err: unknown) {
        return { error: `Erreur : ${err instanceof Error ? err.message : 'Erreur inconnue'}` }
      }
    }

    case 'list_models': {
      try {
        const provider = getProvider()
        const models = [
          {
            id: 'default',
            name: 'Modèle par défaut',
            provider: provider.name.toUpperCase(),
            status: 'available',
            capabilities: ['chat', 'vision', 'code'],
          },
          {
            id: 'fast',
            name: 'Modèle rapide',
            provider: provider.name.toUpperCase(),
            status: 'available',
            capabilities: ['chat'],
          },
          {
            id: 'reasoning',
            name: 'Modèle de raisonnement',
            provider: provider.name.toUpperCase(),
            status: 'available',
            capabilities: ['chat', 'code', 'analysis'],
          },
          {
            id: 'tts-default',
            name: 'Voix par défaut (TTS)',
            provider: provider.name.toUpperCase(),
            status: 'available',
            capabilities: ['tts'],
          },
          {
            id: 'asr-default',
            name: 'Reconnaissance vocale (ASR)',
            provider: provider.name.toUpperCase(),
            status: 'available',
            capabilities: ['asr'],
          },
          {
            id: 'image-gen',
            name: "Génération d'images",
            provider: provider.name.toUpperCase(),
            status: 'available',
            capabilities: ['image'],
          },
        ]

        return {
          provider: provider.name.toUpperCase(),
          models,
          totalModels: models.length,
        }
      } catch (err: unknown) {
        return { error: `Erreur : ${err instanceof Error ? err.message : 'Erreur inconnue'}` }
      }
    }

    default:
      return { error: `Outil inconnu : ${toolName}` }
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   API Route Handler
   ═══════════════════════════════════════════════════════════════════════ */

export async function GET() {
  try {
    const user = await ensureDefaultUser()
    const connections = await db.mcpConnection.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    const formatted = connections.map((c) => {
      let toolCount = 0
      try {
        const tools = JSON.parse(c.tools) as unknown[]
        toolCount = tools.length
      } catch {
        /* ignore parse error */
      }
      return {
        id: c.id,
        name: c.name,
        serverType: c.serverType,
        status: c.status,
        toolCount,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }
    })

    const availableServers = Object.entries(MCP_SERVERS).map(([key, val]) => ({
      type: key,
      name: val.name,
      icon: val.icon,
      description: val.description,
      toolCount: val.tools.length,
    }))

    return NextResponse.json({ connections: formatted, availableServers })
  } catch (err: unknown) {
    console.error('[MCP GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await ensureDefaultUser()
    const body = await request.json()
    const { action } = body

    // ── Connect ──
    if (action === 'connect') {
      const { serverType, name } = body as { serverType: string; name?: string }
      const serverDef = MCP_SERVERS[serverType]
      if (!serverDef) {
        return NextResponse.json({ error: `Type de serveur inconnu : ${serverType}` }, { status: 400 })
      }

      // Already connected?
      const existing = await db.mcpConnection.findFirst({
        where: { userId: user.id, serverType, status: 'connected' },
      })
      if (existing) {
        return NextResponse.json({
          error: `${serverDef.name} est déjà connecté`,
          connectionId: existing.id,
        })
      }

      const prior = await db.mcpConnection.findFirst({
        where: { userId: user.id, serverType },
        select: { id: true },
      })

      const connection = prior
        ? await db.mcpConnection.update({
            where: { id: prior.id },
            data: { status: 'connected', tools: JSON.stringify(serverDef.tools), lastError: null },
          })
        : await db.mcpConnection.create({
            data: {
              userId: user.id,
              name: name || serverDef.name,
              serverType,
              status: 'connected',
              tools: JSON.stringify(serverDef.tools),
            },
          })

      return NextResponse.json({
        connection: {
          id: connection.id,
          name: connection.name,
          serverType: connection.serverType,
          status: connection.status,
          toolCount: serverDef.tools.length,
          createdAt: connection.createdAt,
        },
        tools: serverDef.tools,
      })
    }

    // ── Disconnect ──
    if (action === 'disconnect') {
      const { connectionId } = body as { connectionId: string }
      if (!connectionId) {
        return NextResponse.json({ error: 'connectionId requis' }, { status: 400 })
      }

      const connection = await db.mcpConnection.findUnique({
        where: { id: connectionId, userId: user.id },
      })
      if (!connection) {
        return NextResponse.json({ error: 'Connexion non trouvée' }, { status: 404 })
      }

      const updated = await db.mcpConnection.update({
        where: { id: connectionId },
        data: { status: 'disconnected' },
      })

      return NextResponse.json({
        connection: {
          id: updated.id,
          name: updated.name,
          serverType: updated.serverType,
          status: updated.status,
          toolCount: 0,
          createdAt: updated.createdAt,
        },
      })
    }

    // ── Execute ──
    if (action === 'execute') {
      const { connectionId, toolName, params } = body as {
        connectionId: string
        toolName: string
        params: Record<string, unknown>
      }
      if (!connectionId || !toolName) {
        return NextResponse.json({ error: 'connectionId et toolName requis' }, { status: 400 })
      }

      const connection = await db.mcpConnection.findUnique({
        where: { id: connectionId, userId: user.id },
      })
      if (!connection) {
        return NextResponse.json({ error: 'Connexion non trouvée' }, { status: 404 })
      }
      if (connection.status !== 'connected') {
        return NextResponse.json(
          { error: `Serveur "${connection.name}" n'est pas connecté` },
          { status: 400 }
        )
      }

      const serverDef = MCP_SERVERS[connection.serverType]
      if (!serverDef) {
        return NextResponse.json({ error: 'Type de serveur inconnu' }, { status: 400 })
      }
      const toolDef = serverDef.tools.find((t) => t.name === toolName)
      if (!toolDef) {
        return NextResponse.json(
          { error: `Outil "${toolName}" non trouvé sur "${serverDef.name}"` },
          { status: 404 }
        )
      }

      // Validate required params
      const requiredParams = toolDef.inputSchema.required || []
      const missingParams = requiredParams.filter((p) => !params[p] && params[p] !== 0)
      if (missingParams.length > 0) {
        return NextResponse.json(
          { error: `Paramètres manquants : ${missingParams.join(', ')}` },
          { status: 400 }
        )
      }

      const startTime = Date.now()
      let result: unknown

      switch (connection.serverType) {
        case 'filesystem':
          result = await executeFilesystemTool(toolName, params)
          break
        case 'web_search':
          result = await executeWebSearchTool(toolName, params)
          break
        case 'code_analysis':
          result = await executeCodeAnalysisTool(toolName, params)
          break
        case 'system_info':
          result = await executeSystemInfoTool(toolName)
          break
        default:
          return NextResponse.json(
            { error: `Type de serveur non implémenté : ${connection.serverType}` },
            { status: 500 }
          )
      }

      const durationMs = Date.now() - startTime

      return NextResponse.json({
        success: true,
        toolName,
        serverName: serverDef.name,
        serverIcon: serverDef.icon,
        result,
        durationMs,
      })
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
  } catch (err: unknown) {
    console.error('[MCP POST]', err)
    return NextResponse.json(
      { error: `Erreur serveur : ${err instanceof Error ? err.message : 'Erreur inconnue'}` },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await ensureDefaultUser()
    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('id')

    if (!connectionId) {
      return NextResponse.json({ error: 'id requis en query param' }, { status: 400 })
    }

    const connection = await db.mcpConnection.findUnique({
      where: { id: connectionId, userId: user.id },
    })
    if (!connection) {
      return NextResponse.json({ error: 'Connexion non trouvée' }, { status: 404 })
    }

    await db.mcpConnection.delete({ where: { id: connectionId } })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('[MCP DELETE]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}