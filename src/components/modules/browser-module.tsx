'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Globe,
  ArrowRight,
  Loader2,
  Sparkles,
  Clock,
  FileText,
  MessageSquare,
  SendHorizontal,
  Link2,
  AlignLeft,
  HelpCircle,
  CameraOff,
  ChevronDown,
  ExternalLink,
  RotateCcw,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Type,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/* ─── Types ─── */

interface PageInfo {
  url: string
  title: string
  content: string
  wordCount: number
  links: Array<{ text: string; href: string }>
  fetchedAt: string
  durationMs: number
  sessionId: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
}

interface HistorySession {
  id: string
  url: string
  title: string | null
  status: string
  createdAt: string
}

/* ─── Example URLs ─── */

const EXAMPLE_URLS = [
  { label: 'Wikipedia — Intelligence artificielle', url: 'https://fr.wikipedia.org/wiki/Intelligence_artificielle' },
  { label: 'MDN Web Docs', url: 'https://developer.mozilla.org/fr/' },
  { label: 'Next.js Documentation', url: 'https://nextjs.org/docs' },
  { label: 'GitHub Trending', url: 'https://github.com/trending' },
]

/* ─── Animation variants ─── */

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3, ease: 'easeOut' },
}

const staggerChild = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06, duration: 0.25 },
})

/* ═══════════════════════════════════════════════════════════════════════
   Main Browser Module
   ═══════════════════════════════════════════════════════════════════════ */

export default function BrowserModule() {
  /* ── State ── */
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<HistorySession[]>([])
  const [showContent, setShowContent] = useState(true)
  const [aiActionLoading, setAiActionLoading] = useState<string | null>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  /* ── Load history on mount ── */
  useEffect(() => {
    fetchHistory()
    urlInputRef.current?.focus()
  }, [])

  /* ── Auto-scroll chat ── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  /* ── Fetch history from DB ── */
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/browser')
      const data = await res.json()
      if (data.success) setHistory(data.sessions)
    } catch {
      // silently fail
    }
  }, [])

  /* ── Browse a URL ── */
  const handleBrowse = useCallback(async (browseUrl?: string) => {
    const target = browseUrl || url.trim()
    if (!target) return

    let normalized = target
    if (!normalized.match(/^https?:\/\//i)) {
      normalized = 'https://' + normalized
    }

    setIsLoading(true)
    setChatMessages([])

    try {
      const res = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'browse', url: normalized }),
      })
      const data = await res.json()

      if (data.success) {
        setPageInfo({
          url: data.url,
          title: data.title,
          content: data.content,
          wordCount: data.wordCount,
          links: data.links || [],
          fetchedAt: data.fetchedAt,
          durationMs: data.durationMs,
          sessionId: data.sessionId,
        })
        setUrl(normalized)
        toast.success(`Page chargée : ${data.title}`)
        // Refresh history
        fetchHistory()
      } else {
        toast.error(data.error || 'Erreur lors du chargement de la page')
      }
    } catch {
      toast.error('Erreur de connexion au serveur')
    } finally {
      setIsLoading(false)
    }
  }, [url, fetchHistory])

  /* ── AI: Summarize ── */
  const handleSummarize = useCallback(async () => {
    if (!pageInfo) return
    setAiActionLoading('summarize')
    try {
      const res = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'summarize',
          content: pageInfo.content,
          url: pageInfo.url,
        }),
      })
      const data = await res.json()
      if (data.success) {
        const msg: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: data.summary,
          createdAt: new Date(),
        }
        setChatMessages((prev) => [
          { id: `msg-system-${Date.now()}`, role: 'user', content: '📋 Résume cette page', createdAt: new Date() },
          msg,
        ])
      } else {
        toast.error(data.error || 'Erreur lors du résumé')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setAiActionLoading(null)
    }
  }, [pageInfo])

  /* ── AI: Extract links ── */
  const handleExtractLinks = useCallback(async () => {
    if (!pageInfo) return
    setAiActionLoading('links')
    try {
      const res = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'extract-links',
          content: pageInfo.content,
          url: pageInfo.url,
        }),
      })
      const data = await res.json()
      if (data.success) {
        const msg: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: data.extraction,
          createdAt: new Date(),
        }
        setChatMessages((prev) => [
          { id: `msg-system-${Date.now()}`, role: 'user', content: '🔗 Extrais les liens de cette page', createdAt: new Date() },
          msg,
        ])
      } else {
        toast.error(data.error || 'Erreur lors de l\'extraction')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setAiActionLoading(null)
    }
  }, [pageInfo])

  /* ── AI: Ask question about page ── */
  const handleAskQuestion = useCallback(async () => {
    if (!chatInput.trim() || !pageInfo) return

    const question = chatInput.trim()
    setChatInput('')
    setIsChatLoading(true)

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: question,
      createdAt: new Date(),
    }
    setChatMessages((prev) => [...prev, userMsg])

    try {
      const res = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ask',
          url: pageInfo.url,
          question,
          pageContent: pageInfo.content,
        }),
      })
      const data = await res.json()
      if (data.success) {
        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: data.answer,
          createdAt: new Date(),
        }
        setChatMessages((prev) => [...prev, assistantMsg])
      } else {
        toast.error(data.error || 'Erreur lors de la réponse')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setIsChatLoading(false)
    }
  }, [chatInput, pageInfo])

  /* ── Re-browse current URL ── */
  const handleRefresh = useCallback(() => {
    if (pageInfo) handleBrowse(pageInfo.url)
  }, [pageInfo, handleBrowse])

  /* ── Load from history ── */
  const handleHistoryClick = useCallback((sessionUrl: string) => {
    setUrl(sessionUrl)
    handleBrowse(sessionUrl)
    setShowHistory(false)
  }, [handleBrowse])

  /* ═══════════════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex h-full">
      {/* ── Session History Sidebar (overlay) ── */}
      <AnimatePresence>
        {showHistory && (
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute left-0 top-0 z-30 h-full w-72 glass-strong border-r border-border/50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Historique de navigation</h3>
              </div>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setShowHistory(false)}>
                <PanelLeftClose className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              {history.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Aucun historique de navigation
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {history.map((session, i) => (
                    <motion.button
                      key={session.id}
                      {...staggerChild(i)}
                      onClick={() => handleHistoryClick(session.url)}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all group hover:bg-accent"
                    >
                      <div className="flex items-start gap-2">
                        {session.status === 'completed' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-500/60" />
                        ) : session.status === 'error' ? (
                          <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-destructive/60" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500/60" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{session.title || session.url}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{session.url}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {new Date(session.createdAt).toLocaleString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── URL Bar ── */}
        <div className="p-3 md:p-4 space-y-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            {/* History toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  {showHistory ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Historique de navigation</TooltipContent>
            </Tooltip>

            {/* URL Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleBrowse() }}
              className="flex-1 flex items-center"
            >
              <div className="glass-strong rounded-xl p-1 flex items-center gap-2 flex-1 transition-all focus-within:ring-2 focus-within:ring-primary/50 focus-within:glow-sm">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary ml-0.5 shrink-0">
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Globe className="w-4 h-4" />
                  )}
                </div>
                <input
                  ref={urlInputRef}
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Entrez une URL pour naviguer..."
                  className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/60 outline-none py-2.5 px-2 font-mono"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  disabled={!url.trim() || isLoading}
                  size="sm"
                  className="rounded-lg gap-1.5 shrink-0 mr-1"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span className="hidden sm:inline">Aller</span>
                </Button>
              </div>
            </form>

            {/* Refresh */}
            {pageInfo && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0"
                    onClick={handleRefresh}
                    disabled={isLoading}
                  >
                    <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rafraîchir la page</TooltipContent>
              </Tooltip>
            )}

            {/* Clear */}
            {pageInfo && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => { setPageInfo(null); setChatMessages([]); setUrl('') }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Nouvelle session</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* ── Page Info Bar ── */}
          <AnimatePresence>
            {pageInfo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="glass-subtle rounded-lg px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground truncate max-w-[300px]" title={pageInfo.title}>
                    📄 {pageInfo.title}
                  </span>
                  <Separator orientation="vertical" className="hidden sm:block h-4" />
                  <span className="flex items-center gap-1">
                    <Type className="w-3 h-3" />
                    {pageInfo.wordCount.toLocaleString('fr-FR')} mots
                  </span>
                  <span className="flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    {pageInfo.links.length} liens
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {(pageInfo.durationMs / 1000).toFixed(1)}s
                  </span>
                  <Badge variant="secondary" className="text-[10px] ml-auto">
                    {new Date(pageInfo.fetchedAt).toLocaleTimeString('fr-FR')}
                  </Badge>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Content Area ── */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {!pageInfo && !isLoading ? (
              /* ── Welcome State ── */
              <motion.div
                key="welcome"
                {...fadeInUp}
                className="flex flex-col items-center justify-center h-full px-4 text-center"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6"
                >
                  <Globe className="w-10 h-10 text-primary" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl md:text-3xl font-bold tracking-tight mb-3"
                >
                  Agent de Navigation IA
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-muted-foreground text-base md:text-lg mb-10 max-w-md"
                >
                  Naviguez sur le web et interagissez intelligemment avec le contenu des pages
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-col gap-3 w-full max-w-lg"
                >
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">
                    Exemples de pages
                  </p>
                  {EXAMPLE_URLS.map((example, i) => (
                    <motion.button
                      key={example.url}
                      {...staggerChild(i + 5)}
                      onClick={() => { setUrl(example.url); handleBrowse(example.url) }}
                      className="glass-subtle rounded-xl px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-all hover:shadow-md flex items-center gap-3 group text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Globe className="w-4 h-4 text-primary/70 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{example.label}</p>
                        <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{example.url}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-primary/60" />
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            ) : isLoading ? (
              /* ── Loading State ── */
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full gap-4"
              >
                <div className="relative">
                  <Loader2 className="w-12 h-12 animate-spin text-primary/40" />
                  <Globe className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Chargement de la page...</p>
                  <p className="text-xs text-muted-foreground mt-1">Extraction du contenu en cours</p>
                </div>
              </motion.div>
            ) : pageInfo ? (
              /* ── Browsing State: Split View ── */
              <motion.div
                key="browsing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col lg:flex-row h-full overflow-hidden"
              >
                {/* ── Left Panel: Page Content ── */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden border-r border-border/30">
                  {/* Toolbar */}
                  <div className="flex items-center gap-2 p-3 border-b border-border/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => setShowContent(!showContent)}
                    >
                      <ChevronDown className={`w-3 h-3 transition-transform ${showContent ? '' : '-rotate-90'}`} />
                      Contenu de la page
                    </Button>

                    {/* AI Actions */}
                    <Separator orientation="vertical" className="h-4" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 text-xs"
                          onClick={handleSummarize}
                          disabled={aiActionLoading !== null}
                        >
                          {aiActionLoading === 'summarize' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <AlignLeft className="w-3 h-3" />
                          )}
                          Résumer
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Résumer cette page avec l&apos;IA</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 text-xs"
                          onClick={handleExtractLinks}
                          disabled={aiActionLoading !== null}
                        >
                          {aiActionLoading === 'links' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Link2 className="w-3 h-3" />
                          )}
                          Extraire les liens
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Extraire et catégoriser les liens</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 text-xs"
                          onClick={() => {
                            setChatInput('Quelles sont les informations principales de cette page ?')
                          }}
                        >
                          <HelpCircle className="w-3 h-3" />
                          Questions
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Poser une question sur cette page</TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Screenshot Placeholder */}
                  <div className="mx-3 mt-3">
                    <div className="rounded-lg border border-dashed border-border/50 bg-muted/30 p-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <CameraOff className="w-4 h-4 shrink-0" />
                      Capture d&apos;écran non disponible en environnement sandbox
                    </div>
                  </div>

                  {/* Page Text Content */}
                  <AnimatePresence>
                    {showContent && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex-1 overflow-hidden"
                      >
                        <ScrollArea className="h-full custom-scrollbar">
                          <div className="p-4">
                            <pre className="text-xs leading-relaxed text-foreground/80 font-mono whitespace-pre-wrap break-words max-w-none">
                              {pageInfo.content.slice(0, 15000)}
                              {pageInfo.content.length > 15000 && (
                                <span className="text-muted-foreground">
                                  {'\n\n'}[... contenu tronqué — {pageInfo.wordCount.toLocaleString('fr-FR')} mots au total ...]
                                </span>
                              )}
                            </pre>
                          </div>
                        </ScrollArea>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ── Right Panel: AI Chat ── */}
                <div className="w-full lg:w-[420px] xl:w-[480px] shrink-0 flex flex-col min-h-0 lg:h-full bg-background/50">
                  {/* Chat Header */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">Assistant Page IA</p>
                      <p className="text-[10px] text-muted-foreground truncate">{pageInfo.title}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] ml-auto shrink-0">
                      Contexte : {pageInfo.wordCount > 1000 ? `${Math.round(pageInfo.wordCount / 1000)}k` : pageInfo.wordCount} mots
                    </Badge>
                  </div>

                  {/* Chat Messages */}
                  <ScrollArea className="flex-1 custom-scrollbar">
                    <div className="p-4 space-y-4 min-h-[200px]">
                      {chatMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center mb-3">
                            <Sparkles className="w-6 h-6 text-primary/40" />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            Posez une question sur cette page
                          </p>
                          <p className="text-xs text-muted-foreground/60 max-w-[250px]">
                            L&apos;IA peut résumer, répondre à vos questions ou extraire des informations du contenu
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2 justify-center">
                            {[
                              'Résumé principal',
                              'Points clés',
                              'Données importantes',
                            ].map((suggestion) => (
                              <button
                                key={suggestion}
                                onClick={() => setChatInput(suggestion)}
                                className="text-xs glass-subtle rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        chatMessages.map((msg) => (
                          <ChatBubble key={msg.id} message={msg} />
                        ))
                      )}
                      {isChatLoading && (
                        <div className="flex items-start gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="glass-subtle rounded-xl rounded-tl-sm px-4 py-3">
                            <div className="flex gap-1">
                              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/50" />
                              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/50" />
                              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/50" />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Chat Input */}
                  <div className="p-3 border-t border-border/30">
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleAskQuestion() }}
                      className="flex items-end gap-2"
                    >
                      <Textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Question sur cette page..."
                        className="min-h-[40px] max-h-[120px] resize-none text-sm"
                        rows={1}
                        disabled={isChatLoading || !pageInfo}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleAskQuestion()
                          }
                        }}
                      />
                      <Button
                        type="submit"
                        size="icon"
                        className="size-9 shrink-0 rounded-lg"
                        disabled={!chatInput.trim() || isChatLoading || !pageInfo}
                      >
                        {isChatLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <SendHorizontal className="w-4 h-4" />
                        )}
                      </Button>
                    </form>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Chat Bubble Component
   ═══════════════════════════════════════════════════════════════════════ */

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
          isUser ? 'bg-secondary' : 'bg-primary/10'
        }`}
      >
        {isUser ? (
          <span className="text-xs font-bold text-secondary-foreground">Vous</span>
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'glass-subtle rounded-tl-sm'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose-ai text-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  )
}