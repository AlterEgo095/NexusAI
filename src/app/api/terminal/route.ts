export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureDefaultUser, incrementUsage } from '@/lib/ensure-user'
import { getProvider } from '@/lib/ai-provider'

/* ═══════════════════════════════════════════════════════════════
   Security
   ═══════════════════════════════════════════════════════════════ */
const DANGEROUS_PATTERNS = [
  /\brm\b/, /\brmdir\b/, /\bexec\b/, /\bspawn\b/, /\beval\b/,
  /\bwget\b/, /\bcurl\b/, /\bnc\b/, /\bsudo\b/, /\bsu\b/,
]

function isDangerous(input: string): boolean {
  return DANGEROUS_PATTERNS.some(p => p.test(input))
}

/* ═══════════════════════════════════════════════════════════════
   Command handlers (no fs/path imports — all in-memory/DB)
   ═══════════════════════════════════════════════════════════════ */

function handleHelp(): string {
  return `╔══════════════════════════════════════════════════════════════╗
║  🖥️  Terminal IA — NexusAI Workspace                          ║
║  Commandes disponibles :                                      ║
╠══════════════════════════════════════════════════════════════╣
║  help              Afficher ce message d'aide                 ║
║  clear             Effacer le terminal                        ║
║  echo <texte>      Afficher du texte                          ║
║  date              Afficher la date et l'heure actuelles      ║
║  whoami            Afficher les informations utilisateur      ║
║  pwd               Afficher le répertoire courant             ║
║  ls                Lister la structure du projet               ║
║  ai <question>     Poser une question à l'IA                  ║
║  stats             Statistiques de la plateforme              ║
║  neofetch          Afficher les infos système NexusAI         ║
╚══════════════════════════════════════════════════════════════╝`
}

function handleEcho(args: string): string { return args || '' }

function handleDate(): string {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZoneName: 'short',
  })
}

async function handleWhoami(): Promise<string> {
  try {
    const user = await ensureDefaultUser()
    return `👤 Utilisateur : ${user.name}\n📧 Email      : ${user.email}\n🔑 Rôle       : ${user.role}\n💰 Crédits    : ${user.credits.toLocaleString('fr-FR')}`
  } catch {
    return '👤 Utilisateur : NexusAI User\n📧 Email : user@nexusai.local'
  }
}

function handlePwd(): string { return '/home/z/my-project' }

function handleLs(): string {
  return `📁 src/
  📁 app/
    📁 api/          (16 routes API)
    📁 modules/      (pas utilisé en App Router)
  📁 components/
    📁 modules/      (17 modules frontend)
    📁 ui/           (shadcn/ui)
    📁 workspace/    (sidebar, palette, thème)
  📁 lib/            (utilitaires, DB, IA)
  📁 store/          (Zustand store)
  📁 hooks/
  📁 prisma/
  📁 public/
  📁 mini-services/
  📄 next.config.mjs
  📄 tailwind.config.ts
  📄 tsconfig.json
  📄 package.json`
}

async function handleStats(): Promise<string> {
  try {
    const user = await ensureDefaultUser()
    const today = new Date().toISOString().split('T')[0]
    const [conv, msg, search, img, agents, autos, docs, mems, voice, trans] = await Promise.all([
      db.conversation.count({ where: { userId: user.id } }),
      db.message.count({ where: { conversation: { userId: user.id } } }),
      db.searchHistory.count({ where: { userId: user.id } }),
      db.imageGeneration.count({ where: { userId: user.id } }),
      db.customAgent.count({ where: { userId: user.id } }),
      db.automation.count({ where: { userId: user.id, isActive: true } }),
      db.document.count({ where: { userId: user.id } }),
      db.memory.count({ where: { userId: user.id } }),
      db.voiceGeneration.count({ where: { userId: user.id } }),
      db.translation.count({ where: { userId: user.id } }),
    ])
    const todayStats = await db.usageStats.findUnique({ where: { userId_date: { userId: user.id, date: today } } })
    return `╔══════════════════════════════════════════════════════════════╗
║  📊 Statistiques NexusAI                                     ║
╠══════════════════════════════════════════════════════════════╣
║  💬 Conversations   : ${String(conv).padEnd(38)}║
║  💭 Messages        : ${String(msg).padEnd(38)}║
║  🔍 Recherches      : ${String(search).padEnd(38)}║
║  🖼️  Images          : ${String(img).padEnd(38)}║
║  🤖 Agents IA       : ${String(agents).padEnd(38)}║
║  ⚡ Automatisations  : ${String(autos).padEnd(38)}║
║  📄 Documents       : ${String(docs).padEnd(38)}║
║  🧠 Mémoires        : ${String(mems).padEnd(38)}║
║  🔊 Voix            : ${String(voice).padEnd(38)}║
║  🌐 Traductions     : ${String(trans).padEnd(38)}║
╠══════════════════════════════════════════════════════════════╣
║  📅 Aujourd'hui : ${today}${' '.repeat(31 - today.length)}║
║  🔥 Tokens aujourd'hui : ${String(todayStats?.tokensUsed ?? 0).padEnd(25)}║
║  💰 Crédits restants  : ${String(user.credits ?? 0).toLocaleString('fr-FR').padEnd(25)}║
╚══════════════════════════════════════════════════════════════╝`
  } catch {
    return '❌ Erreur lors de la récupération des statistiques'
  }
}

function handleNeofetch(): string {
  return `        ╱╲               nexusai@workspace
       ╱  ╲              ─────────────────
      ╱    ╲             OS: NexusAI Workspace v1.0
     ╱  ▲   ╲            Host: Next.js 16 + TypeScript
    ╱  ╱ ╲   ╲           Kernel: Bun Runtime
   ╱  ╱   ╲   ╲          Uptime: ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m
  ╱  ╱     ╲   ╲         Shell: Terminal IA
                          AI: ${process.env.AI_PROVIDER || 'zai'}
                          DB: SQLite + Prisma ORM
                          Modules: 17
                          Framework: React 19`
}

/* ═══════════════════════════════════════════════════════════════
   AI
   ═══════════════════════════════════════════════════════════════ */

const SYSTEM_PROMPT = `Tu es l'assistant Terminal IA de NexusAI Workspace. Tu réponds TOUJOURS en français. Sois concis, technique et précis. Utilise du formatage markdown. Tu es un expert en développement web et DevOps.`

async function handleAI(question: string): Promise<string> {
  try {
    const provider = getProvider()
    const response = await provider.chat([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: question },
    ], { temperature: 0.7, maxTokens: 2048 })
    await incrementUsage('chatRequests')
    return response.content
  } catch {
    return "❌ Erreur lors de la communication avec l'IA."
  }
}

async function handleAIInterpret(command: string): Promise<string> {
  try {
    const provider = getProvider()
    const response = await provider.chat([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `L'utilisateur a tapé: "${command}"\nExplique brièvement (3-5 lignes max).` },
    ], { temperature: 0.5, maxTokens: 512 })
    await incrementUsage('chatRequests')
    return response.content
  } catch {
    return `💡 Commande non reconnue : "${command}"\n   Tapez "help" pour voir les commandes disponibles.`
  }
}

/* ═══════════════════════════════════════════════════════════════
   Handlers
   ═══════════════════════════════════════════════════════════════ */

export async function GET() {
  return NextResponse.json({ success: true, help: handleHelp() })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { command, aiMode = false } = body

    if (!command || typeof command !== 'string') {
      return NextResponse.json({ success: false, output: '❌ Commande invalide', type: 'error' }, { status: 400 })
    }

    const trimmed = command.trim()
    if (!trimmed) return NextResponse.json({ success: true, output: '', type: 'command' })

    if (isDangerous(trimmed)) {
      return NextResponse.json({ success: false, output: '🚫 Commande bloquée pour des raisons de sécurité.', type: 'error' })
    }

    const spaceIndex = trimmed.indexOf(' ')
    const cmd = spaceIndex === -1 ? trimmed.toLowerCase() : trimmed.slice(0, spaceIndex).toLowerCase()
    const args = spaceIndex === -1 ? '' : trimmed.slice(spaceIndex + 1)

    let output: string
    let type: 'command' | 'ai' | 'error' = 'command'

    switch (cmd) {
      case 'help': output = handleHelp(); break
      case 'clear': return NextResponse.json({ success: true, output: '__CLEAR__', type: 'command' })
      case 'echo': output = handleEcho(args); break
      case 'date': output = handleDate(); break
      case 'whoami': output = await handleWhoami(); break
      case 'pwd': output = handlePwd(); break
      case 'ls': output = handleLs(); break
      case 'ai':
        if (!args.trim()) { output = '❌ Usage: ai <question>'; type = 'error' }
        else { output = await handleAI(args); type = 'ai' }
        break
      case 'stats': output = await handleStats(); break
      case 'neofetch': output = handleNeofetch(); break
      default:
        if (aiMode) { output = await handleAIInterpret(trimmed); type = 'ai' }
        else { output = `❌ Commande non trouvée : "${cmd}"\n   Tapez "help" ou activez le mode IA (🧠).`; type = 'error' }
    }

    return NextResponse.json({ success: true, output, type })
  } catch (error) {
    console.error('Terminal API error:', error)
    return NextResponse.json({ success: false, output: '❌ Erreur interne du serveur', type: 'error' }, { status: 500 })
  }
}