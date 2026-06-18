'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Users,
  Play,
  Loader2,
  Brain,
  Search,
  Code,
  PenTool,
  BarChart3,
  Palette,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Zap,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

/* ─── Types ─── */
type AgentRole = 'researcher' | 'writer' | 'coder' | 'analyst' | 'designer' | 'general'
type ExecutionStatus = 'idle' | 'planning' | 'executing' | 'synthesizing' | 'completed' | 'error'

interface PlanStep {
  id: string
  title: string
  agent: AgentRole
}

interface TaskResult {
  subTaskId: string
  title: string
  agent: AgentRole
  durationMs: number
  preview: string
  status: 'pending' | 'running' | 'completed' | 'failed'
}

interface HistoryItem {
  id: string
  task: string
  status: 'completed' | 'failed'
  date: string
  durationMs: number
  answer?: string
  plan?: PlanStep[]
}

/* ─── Agent Role Config ─── */
const AGENT_CONFIG: Record<
  AgentRole,
  { label: string; color: string; bgLight: string; bgDark: string; textLight: string; textDark: string; icon: typeof Search }
> = {
  researcher: {
    label: 'Chercheur',
    color: 'text-blue-500',
    bgLight: 'bg-blue-500/10',
    bgDark: 'dark:bg-blue-500/15',
    textLight: 'text-blue-600',
    textDark: 'dark:text-blue-400',
    icon: Search,
  },
  writer: {
    label: 'Rédacteur',
    color: 'text-emerald-500',
    bgLight: 'bg-emerald-500/10',
    bgDark: 'dark:bg-emerald-500/15',
    textLight: 'text-emerald-600',
    textDark: 'dark:text-emerald-400',
    icon: PenTool,
  },
  coder: {
    label: 'Développeur',
    color: 'text-purple-500',
    bgLight: 'bg-purple-500/10',
    bgDark: 'dark:bg-purple-500/15',
    textLight: 'text-purple-600',
    textDark: 'dark:text-purple-400',
    icon: Code,
  },
  analyst: {
    label: 'Analyste',
    color: 'text-amber-500',
    bgLight: 'bg-amber-500/10',
    bgDark: 'dark:bg-amber-500/15',
    textLight: 'text-amber-600',
    textDark: 'dark:text-amber-400',
    icon: BarChart3,
  },
  designer: {
    label: 'Designer',
    color: 'text-pink-500',
    bgLight: 'bg-pink-500/10',
    bgDark: 'dark:bg-pink-500/15',
    textLight: 'text-pink-600',
    textDark: 'dark:text-pink-400',
    icon: Palette,
  },
  general: {
    label: 'Général',
    color: 'text-gray-500',
    bgLight: 'bg-gray-500/10',
    bgDark: 'dark:bg-gray-500/15',
    textLight: 'text-gray-600',
    textDark: 'dark:text-gray-400',
    icon: Brain,
  },
}

/* ─── Example Tasks ─── */
const EXAMPLE_TASKS = [
  {
    icon: Search,
    text: 'Fais une recherche approfondie sur l\'IA en 2025 et rédige un rapport',
    tag: 'Recherche & Rédaction',
  },
  {
    icon: BarChart3,
    text: 'Analyse les tendances du marché SaaS et propose une stratégie',
    tag: 'Analyse & Stratégie',
  },
  {
    icon: Code,
    text: 'Crée un plan de développement pour une application mobile',
    tag: 'Planification & Code',
  },
]

/* ─── Helpers ─── */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.floor(ms / 1000)
  const centis = Math.floor((ms % 1000) / 100)
  return seconds > 0 ? `${seconds}.${centis}s` : `${centis}ms`
}

function getAgentIcon(role: AgentRole) {
  return AGENT_CONFIG[role].icon
}

function getStatusIcon(status: TaskResult['status']) {
  switch (status) {
    case 'running':
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-emerald-500" />
    case 'failed':
      return <XCircle className="h-4 w-4 text-destructive" />
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

/* ─── Animation Variants ─── */
const fadeSlideUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
}

const scaleIn = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.25 },
}

/* ─── Component ─── */
export default function OrchestratorModule() {
  /* State */
  const [taskInput, setTaskInput] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<ExecutionStatus>('idle')
  const [plan, setPlan] = useState<PlanStep[] | null>(null)
  const [taskResults, setTaskResults] = useState<TaskResult[]>([])
  const [finalAnswer, setFinalAnswer] = useState('')
  const [totalDurationMs, setTotalDurationMs] = useState(0)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const executionStartRef = useRef<number>(0)

  /* ─── Fetch History ─── */
  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/orchestrator')
        if (res.ok) {
          const data = await res.json()
          setHistory(data.history ?? [])
        }
      } catch {
        // Silently fail – history is non-critical
      }
    }
    fetchHistory()
  }, [])

  /* ─── Reset State ─── */
  const resetState = useCallback(() => {
    setCurrentStatus('idle')
    setPlan(null)
    setTaskResults([])
    setFinalAnswer('')
    setTotalDurationMs(0)
    setErrorMessage(null)
    setViewingHistoryId(null)
  }, [])

  /* ─── Execute Task (SSE) ─── */
  const executeTask = useCallback(async () => {
    const trimmed = taskInput.trim()
    if (!trimmed || isExecuting) return

    resetState()
    setIsExecuting(true)
    executionStartRef.current = Date.now()

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch('/api/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: trimmed, stream: true }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let currentEvent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (trimmedLine.startsWith('event: ')) {
            currentEvent = trimmedLine.slice(7).trim()
            continue
          }
          if (trimmedLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmedLine.slice(6))
              handleSSEEvent(currentEvent, data)
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      // Compute total duration
      setTotalDurationMs(Date.now() - executionStartRef.current)
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setErrorMessage(message)
      setCurrentStatus('error')
    } finally {
      setIsExecuting(false)
      abortRef.current = null
      // Refresh history
      try {
        const res = await fetch('/api/orchestrator')
        if (res.ok) {
          const data = await res.json()
          setHistory(data.history ?? [])
        }
      } catch {
        // Silently fail
      }
    }
  }, [taskInput, isExecuting, resetState])

  /* ─── SSE Event Handler ─── */
  const handleSSEEvent = useCallback((event: string, data: Record<string, unknown>) => {
    switch (event) {
      case 'status': {
        const msg = data.message as string
        if (msg?.toLowerCase().includes('planif')) {
          setCurrentStatus('planning')
        } else if (msg?.toLowerCase().includes('synth')) {
          setCurrentStatus('synthesizing')
        } else if (currentStatus !== 'completed') {
          setCurrentStatus('executing')
        }
        break
      }
      case 'plan': {
        setPlan(data.steps as PlanStep[])
        setTaskResults(
          (data.steps as PlanStep[]).map((s) => ({
            subTaskId: s.id,
            title: s.title,
            agent: s.agent,
            durationMs: 0,
            preview: '',
            status: 'pending' as const,
          }))
        )
        break
      }
      case 'task_start': {
        setTaskResults((prev) =>
          prev.map((r) =>
            r.subTaskId === data.id ? { ...r, status: 'running' as const } : r
          )
        )
        if (currentStatus === 'planning') setCurrentStatus('executing')
        break
      }
      case 'task_done': {
        setTaskResults((prev) =>
          prev.map((r) =>
            r.subTaskId === data.id
              ? {
                  ...r,
                  status: (data.success ? 'completed' : 'failed') as TaskResult['status'],
                  durationMs: (data.durationMs as number) ?? 0,
                  preview: (data.preview as string) ?? '',
                }
              : r
          )
        )
        break
      }
      case 'final': {
        setFinalAnswer(data.answer as string)
        setCurrentStatus('completed')
        break
      }
      case 'error': {
        setErrorMessage(data.message as string)
        setCurrentStatus('error')
        break
      }
      case 'done': {
        if (currentStatus !== 'error') {
          setCurrentStatus('completed')
        }
        setTotalDurationMs(Date.now() - executionStartRef.current)
        break
      }
    }
  }, [currentStatus])

  /* ─── View History Item ─── */
  const viewHistoryItem = useCallback((item: HistoryItem) => {
    setViewingHistoryId(item.id)
    setTaskInput(item.task)
    if (item.plan) {
      setPlan(item.plan)
      setTaskResults(
        item.plan.map((s) => ({
          subTaskId: s.id,
          title: s.title,
          agent: s.agent,
          durationMs: 0,
          preview: '',
          status: 'completed' as const,
        }))
      )
    }
    setFinalAnswer(item.answer ?? '')
    setTotalDurationMs(item.durationMs)
    setCurrentStatus('completed')
    setErrorMessage(null)
  }, [])

  /* ─── Abort Execution ─── */
  const abortExecution = useCallback(() => {
    abortRef.current?.abort()
    setIsExecuting(false)
    setCurrentStatus('idle')
  }, [])

  /* ─── Status Label ─── */
  const statusLabel: Record<ExecutionStatus, string> = {
    idle: '',
    planning: 'Planification en cours…',
    executing: 'Exécution des agents…',
    synthesizing: 'Synthèse en cours…',
    completed: 'Terminé',
    error: 'Erreur',
  }

  return (
    <div className="relative h-full flex flex-col gap-6 overflow-y-auto custom-scrollbar pb-6">
      {/* ─── Header ─── */}
      <motion.div {...fadeSlideUp} className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Orchestrateur Multi-Agents</h1>
            <p className="text-sm text-muted-foreground">
              Décomposez vos tâches complexes entre plusieurs agents IA spécialisés
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="glass-subtle gap-1.5 text-xs font-medium">
            <Zap className="h-3 w-3 text-amber-500" />
            6 agents disponibles
          </Badge>
          <Badge variant="secondary" className="glass-subtle gap-1.5 text-xs font-medium">
            <Sparkles className="h-3 w-3 text-primary" />
            Parallélisation automatique
          </Badge>
        </div>
      </motion.div>

      {/* ─── Task Input Area ─── */}
      <AnimatePresence mode="wait">
        {currentStatus === 'idle' && !viewingHistoryId && (
          <motion.section key="input-area" {...fadeSlideUp} className="flex flex-col gap-4">
            <div className="glass-strong rounded-2xl p-4 sm:p-6">
              <Textarea
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Décrivez votre tâche complexe…"
                rows={5}
                className="min-h-[120px] resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
                disabled={isExecuting}
              />
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="hidden sm:block text-xs text-muted-foreground">
                  Les agents analyseront et décomposeront automatiquement votre demande
                </p>
                <Button
                  size="lg"
                  onClick={executeTask}
                  disabled={!taskInput.trim() || isExecuting}
                  className="ml-auto gap-2 rounded-xl px-6 font-semibold glow-sm"
                >
                  <Play className="h-4 w-4" />
                  Exécuter
                </Button>
              </div>
            </div>

            {/* Example Tasks */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Exemples de tâches
              </p>
              <motion.div
                className="grid gap-2 sm:grid-cols-3"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {EXAMPLE_TASKS.map((example, idx) => {
                  const Icon = example.icon
                  return (
                    <motion.button
                      key={idx}
                      variants={scaleIn}
                      onClick={() => setTaskInput(example.text)}
                      className="module-card glass-subtle group flex flex-col gap-2 rounded-xl p-3 text-left transition-colors hover:bg-accent/50"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-xs font-medium text-muted-foreground">
                          {example.tag}
                        </span>
                      </div>
                      <p className="text-sm leading-snug text-foreground/80 line-clamp-2">
                        {example.text}
                      </p>
                    </motion.button>
                  )
                })}
              </motion.div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ─── Execution Area ─── */}
      <AnimatePresence>
        {(currentStatus !== 'idle' || viewingHistoryId) && (
          <motion.section
            key="execution-area"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-col gap-5"
          >
            {/* Status Banner */}
            <div className="glass rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStatus}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isExecuting ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : currentStatus === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    ) : currentStatus === 'error' ? (
                      <XCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <Brain className="h-5 w-5 text-muted-foreground" />
                    )}
                  </motion.div>
                </AnimatePresence>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {viewingHistoryId && !isExecuting
                      ? 'Résultat précédent'
                      : statusLabel[currentStatus]}
                  </p>
                  {isExecuting && (
                    <motion.p
                      className="text-xs text-muted-foreground truncate"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {taskInput}
                    </motion.p>
                  )}
                  {totalDurationMs > 0 && currentStatus === 'completed' && (
                    <p className="text-xs text-muted-foreground">
                      Durée totale : {formatDuration(totalDurationMs)} · {taskResults.length} sous-tâches
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isExecuting && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetState}
                    className="gap-1.5 rounded-lg text-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Nouvelle tâche
                  </Button>
                )}
                {isExecuting && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={abortExecution}
                    className="gap-1.5 rounded-lg text-xs text-destructive hover:text-destructive"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Annuler
                  </Button>
                )}
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Card className="border-destructive/30 bg-destructive/5 p-4">
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-destructive">Une erreur est survenue</p>
                        <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Plan & Task Results */}
            <AnimatePresence>
              {plan && plan.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-3"
                >
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-primary" />
                    Plan d&apos;exécution
                    <span className="text-muted-foreground font-normal">
                      ({plan.length} étapes)
                    </span>
                  </h2>

                  <div className="glass rounded-2xl p-4 sm:p-6">
                    <div className="relative flex flex-col gap-0">
                      {plan.map((step, idx) => {
                        const config = AGENT_CONFIG[step.agent]
                        const AgentIcon = config.icon
                        const result = taskResults.find((r) => r.subTaskId === step.id)
                        const isLast = idx === plan.length - 1

                        return (
                          <motion.div
                            key={step.id}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.06, duration: 0.3 }}
                            className="relative flex gap-3 sm:gap-4"
                          >
                            {/* Connecting line + status */}
                            <div className="flex flex-col items-center">
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                                  result?.status === 'completed'
                                    ? 'border-emerald-500 bg-emerald-500/10'
                                    : result?.status === 'running'
                                      ? 'border-primary bg-primary/10'
                                      : result?.status === 'failed'
                                        ? 'border-destructive bg-destructive/10'
                                        : 'border-border bg-muted/50'
                                }`}
                              >
                                {result ? (
                                  getStatusIcon(result.status)
                                ) : (
                                  <span className="text-xs font-bold text-muted-foreground">
                                    {idx + 1}
                                  </span>
                                )}
                              </div>
                              {!isLast && (
                                <div
                                  className={`w-0.5 flex-1 min-h-[24px] transition-colors duration-500 ${
                                    result?.status === 'completed'
                                      ? 'bg-emerald-500/40'
                                      : result?.status === 'running'
                                        ? 'bg-primary/30'
                                        : 'bg-border'
                                  }`}
                                />
                              )}
                            </div>

                            {/* Step Content */}
                            <div className={`flex-1 pb-5 ${isLast ? 'pb-0' : ''}`}>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium leading-snug">{step.title}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge
                                    variant="outline"
                                    className={`gap-1 text-xs font-medium ${config.bgLight} ${config.bgDark} ${config.textLight} ${config.textDark} border-0`}
                                  >
                                    <AgentIcon className="h-3 w-3" />
                                    {config.label}
                                  </Badge>
                                  {result?.status === 'completed' && result.durationMs > 0 && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatDuration(result.durationMs)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {result?.preview && (
                                <motion.p
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed"
                                >
                                  {result.preview}
                                </motion.p>
                              )}
                              {/* Running animation bar */}
                              {result?.status === 'running' && (
                                <motion.div
                                  className="mt-2 h-1 w-full rounded-full bg-primary/20 overflow-hidden"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                >
                                  <motion.div
                                    className="h-full rounded-full bg-primary"
                                    initial={{ width: '0%' }}
                                    animate={{ width: '100%' }}
                                    transition={{
                                      duration: 8,
                                      ease: 'linear',
                                      repeat: Infinity,
                                    }}
                                  />
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Planning Phase Indicator */}
            <AnimatePresence>
              {currentStatus === 'planning' && !plan && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="glass rounded-2xl p-8 flex flex-col items-center justify-center gap-4"
                >
                  <div className="relative">
                    <Brain className="h-10 w-10 text-primary/60" />
                    <motion.div
                      className="absolute inset-0 rounded-full bg-primary/10"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Analyse de la tâche…</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      L&apos;orchestrateur décompose votre demande en sous-tâches
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Synthesizing Indicator */}
            <AnimatePresence>
              {currentStatus === 'synthesizing' && !finalAnswer && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="glass rounded-2xl p-8 flex flex-col items-center justify-center gap-4"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="h-10 w-10 text-primary/60" />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Synthèse en cours…</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Assemblage des résultats de tous les agents
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Final Answer */}
            <AnimatePresence>
              {finalAnswer && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col gap-3"
                >
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Résultat final
                  </h2>
                  <Card className="glass-strong overflow-hidden">
                    <div className="p-4 sm:p-6">
                      <div className="prose-ai max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{finalAnswer}</ReactMarkdown>
                      </div>
                    </div>
                    {totalDurationMs > 0 && (
                      <div className="border-t border-border/50 bg-muted/30 px-4 py-2.5 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {formatDuration(totalDurationMs)}
                        </span>
                        <span>{taskResults.length} sous-tâches complétées</span>
                      </div>
                    )}
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ─── History ─── */}
      <motion.div {...fadeSlideUp} className="mt-auto pt-4">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent/50"
        >
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Historique
            {history.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {history.length}
              </Badge>
            )}
          </span>
          {showHistory ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-2 flex flex-col gap-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                {history.length === 0 ? (
                  <div className="glass-subtle rounded-xl p-6 text-center">
                    <p className="text-sm text-muted-foreground">Aucune exécution précédente</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Vos orchestrations apparaîtront ici
                    </p>
                  </div>
                ) : (
                  history.map((item) => (
                    <motion.button
                      key={item.id}
                      onClick={() => viewHistoryItem(item)}
                      className="module-card glass-subtle group flex items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-accent/50 w-full"
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="mt-0.5 shrink-0">
                        {item.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.task}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${
                              item.status === 'completed'
                                ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                : 'border-destructive/30 text-destructive'
                            }`}
                          >
                            {item.status === 'completed' ? 'Terminé' : 'Échoué'}
                          </Badge>
                          <span>{new Date(item.date).toLocaleDateString('fr-FR')}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(item.durationMs)}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors mt-0.5 shrink-0" />
                    </motion.button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}