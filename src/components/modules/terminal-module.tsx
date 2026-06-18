'use client'

import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Trash2,
  Sparkles,
  Download,
  PanelRightOpen,
  PanelRightClose,
  TerminalSquare,
  Copy,
  Check,
  Loader2,
  Sun,
  Moon,
  ChevronRight,
  Bot,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

interface TerminalLine {
  id: string
  type: 'input' | 'output' | 'ai' | 'error' | 'system'
  content: string
  timestamp: number
}

/* ═══════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════ */

const PROMPT = 'nexusai@workspace ~ $'

const WELCOME_MESSAGE = [
  { id: 'welcome-1', type: 'system' as const, content: '╔══════════════════════════════════════════════════════════════╗', timestamp: Date.now() },
  { id: 'welcome-2', type: 'system' as const, content: '║  🖥️  Terminal IA — NexusAI Workspace                        ║', timestamp: Date.now() },
  { id: 'welcome-3', type: 'system' as const, content: '║  Tapez "help" pour voir les commandes disponibles.          ║', timestamp: Date.now() },
  { id: 'welcome-4', type: 'system' as const, content: '║  Activez le mode IA (🧠) pour l\'assistance intelligente.    ║', timestamp: Date.now() },
  { id: 'welcome-5', type: 'system' as const, content: '╚══════════════════════════════════════════════════════════════╝', timestamp: Date.now() },
]

const QUICK_COMMANDS = [
  { cmd: 'help', label: 'Aide' },
  { cmd: 'ls', label: 'Fichiers' },
  { cmd: 'stats', label: 'Stats' },
  { cmd: 'ai Explique React Server Components', label: 'Demander à l\'IA' },
]

/* ═══════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════ */

export default function TerminalModule() {
  /* ── State ── */
  const [lines, setLines] = useState<TerminalLine[]>(WELCOME_MESSAGE)
  const [input, setInput] = useState('')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [aiMode, setAiMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [terminalTheme, setTerminalTheme] = useState<'dark' | 'light'>('dark')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])

  /* ── Refs ── */
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const linesEndRef = useRef<HTMLDivElement>(null)

  /* ── Auto-scroll to bottom on new lines ── */
  useEffect(() => {
    linesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  /* ── Auto-focus input ── */
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  /* ── Click on terminal area focuses input ── */
  const handleTerminalClick = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  /* ── Copy line content ── */
  const copyLine = useCallback(async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
      toast.success('Copié dans le presse-papiers')
    } catch {
      toast.error('Impossible de copier')
    }
  }, [])

  /* ── Generate unique ID ── */
  const genId = () => `term-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  /* ── Update suggestions based on input ── */
  useEffect(() => {
    if (!input.trim()) {
      setSuggestions([])
      return
    }
    const allCommands = ['help', 'clear', 'echo', 'date', 'whoami', 'pwd', 'ls', 'cat', 'ai', 'stats', 'neofetch', 'history', 'theme']
    const matched = allCommands.filter(c => c.startsWith(input.trim().toLowerCase()))
    setSuggestions(matched.length > 0 && matched[0] !== input.trim().toLowerCase() ? matched : [])
  }, [input])

  /* ── Execute command ── */
  const executeCommand = useCallback(async (cmd: string) => {
    if (!cmd.trim()) return

    const trimmed = cmd.trim()

    // Add input line
    const inputLine: TerminalLine = {
      id: genId(),
      type: 'input',
      content: trimmed,
      timestamp: Date.now(),
    }

    setLines(prev => [...prev, inputLine])
    setCommandHistory(prev => [...prev, trimmed])
    setHistoryIndex(-1)
    setInput('')
    setSuggestions([])
    setIsLoading(true)

    try {
      const res = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: trimmed, aiMode }),
      })

      const data = await res.json()

      if (data.output === '__CLEAR__') {
        setLines([])
      } else if (data.output) {
        const outputLine: TerminalLine = {
          id: genId(),
          type: data.type || 'output',
          content: data.output,
          timestamp: Date.now(),
        }
        setLines(prev => [...prev, outputLine])
      }
    } catch {
      const errorLine: TerminalLine = {
        id: genId(),
        type: 'error',
        content: '❌ Erreur de connexion au serveur. Vérifiez votre connexion.',
        timestamp: Date.now(),
      }
      setLines(prev => [...prev, errorLine])
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [aiMode])

  /* ── Keyboard handler ── */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        executeCommand(input)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (commandHistory.length === 0) return
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1)
        setHistoryIndex(newIndex)
        setInput(commandHistory[newIndex])
        setSuggestions([])
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (historyIndex === -1) return
        const newIndex = historyIndex + 1
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1)
          setInput('')
        } else {
          setHistoryIndex(newIndex)
          setInput(commandHistory[newIndex])
        }
        setSuggestions([])
      } else if (e.key === 'Tab') {
        e.preventDefault()
        if (suggestions.length > 0) {
          setInput(suggestions[0] + ' ')
          setSuggestions([])
        }
      } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault()
        setLines([])
      }
    },
    [input, executeCommand, commandHistory, historyIndex, suggestions]
  )

  /* ── Clear terminal ── */
  const clearTerminal = useCallback(() => {
    setLines([])
    toast.success('Terminal effacé')
  }, [])

  /* ── Export session ── */
  const exportSession = useCallback(() => {
    const content = lines
      .map(line => {
        const time = new Date(line.timestamp).toLocaleTimeString('fr-FR')
        switch (line.type) {
          case 'input':
            return `[${time}] ${PROMPT} ${line.content}`
          case 'error':
            return `[${time}] [ERREUR] ${line.content}`
          case 'ai':
            return `[${time}] [IA] ${line.content}`
          case 'system':
            return `[${time}] ${line.content}`
          default:
            return `[${time}] ${line.content}`
        }
      })
      .join('\n')

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nexusai-terminal-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Session exportée')
  }, [lines])

  /* ── Render line based on type ── */
  const renderLine = (line: TerminalLine) => {
    switch (line.type) {
      case 'input':
        return (
          <div key={line.id} className="flex items-start gap-2 group">
            <span className="shrink-0 text-emerald-400 font-bold select-none">{PROMPT}</span>
            <span className="text-cyan-300 break-all flex-1">{line.content}</span>
            <button
              onClick={() => copyLine(line.content, line.id)}
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/10"
              aria-label="Copier"
            >
              {copiedId === line.id ? (
                <Check className="size-3.5 text-emerald-400" />
              ) : (
                <Copy className="size-3.5 text-zinc-500" />
              )}
            </button>
          </div>
        )

      case 'output':
        return (
          <div key={line.id} className="group relative">
            <pre className="text-zinc-300 whitespace-pre-wrap break-words text-sm leading-relaxed font-mono">
              {line.content}
            </pre>
            <button
              onClick={() => copyLine(line.content, line.id)}
              className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
              aria-label="Copier"
            >
              {copiedId === line.id ? (
                <Check className="size-3.5 text-emerald-400" />
              ) : (
                <Copy className="size-3.5 text-zinc-500" />
              )}
            </button>
          </div>
        )

      case 'ai':
        return (
          <div key={line.id} className="relative rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 my-1 group">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="size-4 text-violet-400" />
              <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Assistant IA</span>
              <button
                onClick={() => copyLine(line.content, line.id)}
                className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
                aria-label="Copier"
              >
                {copiedId === line.id ? (
                  <Check className="size-3.5 text-emerald-400" />
                ) : (
                  <Copy className="size-3.5 text-zinc-500" />
                )}
              </button>
            </div>
            <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-pre:my-2 prose-headings:text-violet-300 prose-code:text-emerald-300 prose-a:text-cyan-400">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {line.content}
              </ReactMarkdown>
            </div>
          </div>
        )

      case 'error':
        return (
          <div key={line.id} className="text-red-400 text-sm whitespace-pre-wrap break-words font-mono">
            {line.content}
          </div>
        )

      case 'system':
        return (
          <pre key={line.id} className="text-zinc-400 text-sm whitespace-pre font-mono">
            {line.content}
          </pre>
        )

      default:
        return null
    }
  }

  /* ── Theme classes ── */
  const isDark = terminalTheme === 'dark'
  const termBg = isDark ? 'bg-[#0d1117]' : 'bg-zinc-100'
  const termText = isDark ? 'text-zinc-300' : 'text-zinc-800'
  const termInputBg = isDark ? 'bg-transparent' : 'bg-transparent'
  const termPromptColor = isDark ? 'text-emerald-400' : 'text-emerald-600'

  return (
    <div className="flex h-full flex-col">
      {/* ── Toolbar ── */}
      <div className="glass-strong flex items-center gap-2 border-b border-border/50 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded-full bg-red-500/80" />
            <div className="size-3 rounded-full bg-yellow-500/80" />
            <div className="size-3 rounded-full bg-green-500/80" />
          </div>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <TerminalSquare className="size-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Terminal IA</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-mono">
            bash
          </Badge>
        </div>

        <div className="flex-1" />

        {/* AI Mode Toggle */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setAiMode(!aiMode)}>
                <Sparkles className={`size-3.5 ${aiMode ? 'text-violet-400' : 'text-muted-foreground'}`} />
                <span className="text-xs text-muted-foreground hidden sm:inline">IA</span>
                <Switch
                  checked={aiMode}
                  onCheckedChange={setAiMode}
                  className="scale-75"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {aiMode ? 'Désactiver le mode IA' : 'Activer le mode IA — les commandes inconnues seront interprétées'}
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-5" />

          {/* Theme Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setTerminalTheme(prev => prev === 'dark' ? 'light' : 'dark')}
              >
                {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isDark ? 'Thème clair' : 'Thème sombre'}
            </TooltipContent>
          </Tooltip>

          {/* Clear */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7" onClick={clearTerminal}>
                <Trash2 className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Effacer le terminal</TooltipContent>
          </Tooltip>

          {/* Export */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7" onClick={exportSession}>
                <Download className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Exporter la session</TooltipContent>
          </Tooltip>

          {/* Panel Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setPanelOpen(!panelOpen)}
              >
                {panelOpen ? (
                  <PanelRightClose className="size-3.5" />
                ) : (
                  <PanelRightOpen className="size-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {panelOpen ? 'Fermer le panneau' : 'Ouvrir le panneau IA'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Terminal Area ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            className={`flex-1 overflow-y-auto ${termBg} transition-colors duration-300`}
            onClick={handleTerminalClick}
            ref={scrollRef}
          >
            <div className="p-4 min-h-full">
              {/* Terminal output */}
              <div className={`font-mono text-sm leading-relaxed ${termText} space-y-1`}>
                {lines.map(renderLine)}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex items-center gap-2 text-violet-400 py-1">
                    <Loader2 className="size-3.5 animate-spin" />
                    <span className="text-xs">
                      {aiMode ? '🧠 Interprétation IA en cours...' : 'Exécution en cours...'}
                    </span>
                  </div>
                )}
              </div>

              {/* Quick commands (shown when terminal is empty/minimal) */}
              {lines.length <= 5 && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                  className="mt-4 flex flex-wrap gap-2"
                >
                  {QUICK_COMMANDS.map(qc => (
                    <button
                      key={qc.cmd}
                      onClick={() => {
                        setInput(qc.cmd)
                        inputRef.current?.focus()
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/5 font-mono"
                    >
                      <ChevronRight className="size-3" />
                      <span>{qc.label}</span>
                      <span className="text-zinc-600 ml-1">{qc.cmd}</span>
                    </button>
                  ))}
                </motion.div>
              )}

              {/* Input line */}
              <div className="mt-2 flex items-center gap-2">
                <span className={`shrink-0 font-bold font-mono text-sm select-none ${termPromptColor}`}>
                  {PROMPT}
                </span>
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={`w-full bg-transparent font-mono text-sm outline-none ${termText} ${isDark ? 'caret-emerald-400' : 'caret-emerald-600'} placeholder:text-zinc-600`}
                    placeholder={isLoading ? '' : 'Tapez une commande...'}
                    disabled={isLoading}
                    spellCheck={false}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                  />
                  {/* Autocomplete suggestions */}
                  <AnimatePresence>
                    {suggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute bottom-full left-0 mb-1 rounded-md border border-zinc-700 bg-zinc-900/95 backdrop-blur-sm p-1 shadow-lg z-10"
                      >
                        {suggestions.map(s => (
                          <button
                            key={s}
                            onClick={() => {
                              setInput(s + ' ')
                              setSuggestions([])
                              inputRef.current?.focus()
                            }}
                            className="block w-full text-left px-2 py-1 text-xs text-zinc-300 hover:bg-emerald-500/10 hover:text-emerald-400 rounded font-mono"
                          >
                            {s}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Scroll anchor */}
              <div ref={linesEndRef} />
            </div>
          </div>

          {/* Status bar */}
          <div className={`flex items-center gap-3 px-4 py-1.5 text-[11px] font-mono border-t ${
            isDark
              ? 'bg-zinc-900/80 border-zinc-800 text-zinc-500'
              : 'bg-zinc-200/80 border-zinc-300 text-zinc-500'
          }`}>
            <div className="flex items-center gap-1.5">
              <div className={`size-1.5 rounded-full ${aiMode ? 'bg-violet-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span>{aiMode ? 'Mode IA actif' : 'Mode standard'}</span>
            </div>
            <Separator orientation="vertical" className="h-3" />
            <span>{lines.length} lignes</span>
            <Separator orientation="vertical" className="h-3" />
            <span>{commandHistory.length} commandes</span>
            <div className="flex-1" />
            <span className="hidden sm:inline">Ctrl+L pour effacer · Tab pour autocompléter · ↑↓ pour l'historique</span>
          </div>
        </div>

        {/* ── Right Panel (AI Suggestions) ── */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="glass-strong border-l border-border/50 overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-violet-400" />
                  <h3 className="text-sm font-semibold text-foreground">Assistant IA</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Suggestions et explications de l'IA
                </p>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* AI Mode Status */}
                  <div className={`rounded-lg border p-3 ${
                    aiMode
                      ? 'border-violet-500/30 bg-violet-500/5'
                      : 'border-zinc-700 bg-zinc-800/50'
                  }`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Bot className={`size-4 ${aiMode ? 'text-violet-400' : 'text-zinc-500'}`} />
                      <span className="text-xs font-semibold text-foreground">Mode IA</span>
                      <Badge variant={aiMode ? 'default' : 'secondary'} className="ml-auto text-[10px] h-5">
                        {aiMode ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {aiMode
                        ? 'Les commandes inconnues seront analysées et expliquées par l\'IA avant exécution.'
                        : 'Activez le mode IA pour obtenir de l\'assistance intelligente sur vos commandes.'}
                    </p>
                  </div>

                  {/* Commandes populaires */}
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <Info className="size-3 text-zinc-400" />
                      Commandes rapides
                    </h4>
                    <div className="space-y-1.5">
                      {[
                        { cmd: 'help', desc: 'Afficher l\'aide' },
                        { cmd: 'ls', desc: 'Lister les fichiers' },
                        { cmd: 'ai <question>', desc: 'Poser une question' },
                        { cmd: 'stats', desc: 'Voir les statistiques' },
                        { cmd: 'cat <fichier>', desc: 'Lire un fichier' },
                        { cmd: 'neofetch', desc: 'Infos système' },
                        { cmd: 'whoami', desc: 'Infos utilisateur' },
                        { cmd: 'date', desc: 'Date et heure' },
                      ].map(item => (
                        <button
                          key={item.cmd}
                          onClick={() => {
                            const fullCmd = item.cmd.includes('<') ? item.cmd.split(' ')[0] : item.cmd
                            setInput(fullCmd + ' ')
                            inputRef.current?.focus()
                          }}
                          className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors group"
                        >
                          <ChevronRight className="size-3 text-zinc-500 group-hover:text-emerald-400 transition-colors shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-mono text-emerald-400">{item.cmd}</span>
                            <span className="text-xs text-muted-foreground ml-2">— {item.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Last AI responses */}
                  {lines.filter(l => l.type === 'ai').length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <Bot className="size-3 text-violet-400" />
                        Dernières réponses IA
                      </h4>
                      <div className="space-y-2">
                        {lines
                          .filter(l => l.type === 'ai')
                          .slice(-5)
                          .map(line => (
                            <div
                              key={line.id}
                              className="rounded-md border border-zinc-700/50 bg-zinc-800/30 p-2.5"
                            >
                              <p className="text-xs text-zinc-300 line-clamp-4 leading-relaxed">
                                {line.content.slice(0, 200)}
                                {line.content.length > 200 ? '...' : ''}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Tips */}
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <h4 className="text-xs font-semibold text-amber-400 mb-1">💡 Astuce</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Utilisez <code className="text-emerald-400 font-mono">ai</code> suivi de votre question pour interroger l'IA sur n'importe quel sujet technique.
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}