'use client'

import React, { useState, useCallback, useRef, useEffect, type DragEvent } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type Connection,
  BackgroundVariant,
  type NodeTypes,
  type NodeProps,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Save,
  FolderOpen,
  Trash2,
  GripVertical,
  Workflow,
  Loader2,
  CheckCircle2,
  XCircle,
  Wrench,
  ChevronLeft,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

type AgentType = 'research' | 'writer' | 'coder' | 'analyst' | 'designer' | 'general'

interface AgentNodeData {
  agentType: AgentType
  label: string
  icon: string
  toolsCount: number
  [key: string]: unknown
}

type AgentNode = Node<AgentNodeData, 'agentNode'>

interface ExecutionResult {
  nodeId: string
  agentName: string
  status: 'pending' | 'running' | 'success' | 'error'
  output?: string
  durationMs?: number
  error?: string
}

/* ═══════════════════════════════════════════════════════════════
   Agent Type Config
   ═══════════════════════════════════════════════════════════════ */

const AGENT_TYPES: Record<AgentType, { label: string; icon: string; color: string; headerBg: string; toolsCount: number }> = {
  research: { label: 'Agent Recherche', icon: '🔬', color: '#0ea5e9', headerBg: 'bg-sky-500', toolsCount: 4 },
  writer: { label: 'Agent Rédacteur', icon: '✍️', color: '#a855f7', headerBg: 'bg-purple-500', toolsCount: 3 },
  coder: { label: 'Agent Codeur', icon: '💻', color: '#22c55e', headerBg: 'bg-green-500', toolsCount: 5 },
  analyst: { label: 'Agent Analyste', icon: '📊', color: '#f59e0b', headerBg: 'bg-amber-500', toolsCount: 4 },
  designer: { label: 'Agent Designer', icon: '🎨', color: '#ec4899', headerBg: 'bg-pink-500', toolsCount: 3 },
  general: { label: 'Agent Général', icon: '🤖', color: '#64748b', headerBg: 'bg-slate-500', toolsCount: 2 },
}

/* ═══════════════════════════════════════════════════════════════
   Custom Agent Node
   ═══════════════════════════════════════════════════════════════ */

function AgentNode({ id, data, selected }: NodeProps) {
  const nodeData = data as AgentNodeData
  const config = AGENT_TYPES[nodeData.agentType]

  return (
    <div
      className={`rounded-xl overflow-hidden shadow-lg border-2 transition-shadow duration-200 ${
        selected ? 'ring-2 ring-primary/60 shadow-primary/20 border-primary/40' : 'border-border/60'
      }`}
      style={{ minWidth: 200, maxWidth: 260 }}
    >
      {/* Header */}
      <div className={`${config.headerBg} px-4 py-2.5 flex items-center gap-2.5`}>
        <span className="text-lg">{config.icon}</span>
        <span className="text-white text-sm font-semibold truncate flex-1">{nodeData.label}</span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-white/20 text-white border-0">
          <Wrench className="w-2.5 h-2.5 mr-0.5" />
          {config.toolsCount}
        </Badge>
      </div>

      {/* Body with handles */}
      <div className="bg-card px-4 py-3 relative">
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-muted-foreground/50 !border-2 !border-card"
          style={{ top: '50%' }}
        />
        <p className="text-xs text-muted-foreground">{config.label}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">Entrée → Sortie</p>
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-muted-foreground/50 !border-2 !border-card"
          style={{ top: '50%' }}
        />
      </div>
    </div>
  )
}

const nodeTypes: NodeTypes = {
  agentNode: AgentNode,
}

/* ═══════════════════════════════════════════════════════════════
   Flow Editor (must be inside ReactFlowProvider)
   ═══════════════════════════════════════════════════════════════ */

function FlowEditor({
  onRunWorkflow,
  onSave,
  onLoad,
  onClear,
  nodes,
  setNodes,
  onNodesChange,
  edges,
  setEdges,
  onEdgesChange,
  isRunning,
  resultsPanelOpen,
  results,
  setResultsPanelOpen,
}: {
  onRunWorkflow: () => void
  onSave: () => void
  onLoad: () => void
  onClear: () => void
  nodes: AgentNode[]
  setNodes: React.Dispatch<React.SetStateAction<AgentNode[]>>
  onNodesChange: (changes: unknown) => void
  edges: Edge[]
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  onEdgesChange: (changes: unknown) => void
  isRunning: boolean
  resultsPanelOpen: boolean
  results: ExecutionResult[]
  setResultsPanelOpen: (open: boolean) => void
}) {
  const { screenToFlowPosition } = useReactFlow()

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: '#64748b', strokeWidth: 2 },
          },
          eds
        )
      )
    },
    [setEdges]
  )

  /* ─── DnD from sidebar ─── */
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      const agentType = event.dataTransfer.getData('application/composer-agent') as AgentType
      if (!agentType) return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const config = AGENT_TYPES[agentType]
      const newNode: AgentNode = {
        id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'agentNode',
        position,
        data: {
          agentType,
          label: config.label,
          icon: config.icon,
          toolsCount: config.toolsCount,
        },
      }

      setNodes((nds) => [...nds, newNode])
    },
    [screenToFlowPosition, setNodes]
  )

  /* ─── Delete key handler ─── */
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
        const selectedIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id))
        if (selectedIds.size === 0) return
        setNodes((nds) => nds.filter((n) => !n.selected))
        setEdges((eds) => eds.filter((edge) => !selectedIds.has(edge.source) && !selectedIds.has(edge.target)))
      }
    }
    window.addEventListener('keydown', handler as EventListener)
    return () => window.removeEventListener('keydown', handler as EventListener)
  }, [setNodes, setEdges, nodes])

  return (
    <div className="flex-1 flex flex-col min-w-0 relative">
      {/* ─── Toolbar ─── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-card/30 backdrop-blur-sm shrink-0 z-10">
        <Button
          onClick={onRunWorkflow}
          disabled={isRunning || nodes.length === 0}
          size="sm"
          className="gap-1.5"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Exécution...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              Exécuter le workflow
            </>
          )}
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <Button variant="outline" size="sm" onClick={onSave} disabled={isRunning} className="gap-1.5">
          <Save className="w-3.5 h-3.5" /> Sauvegarder
        </Button>
        <Button variant="outline" size="sm" onClick={onLoad} disabled={isRunning} className="gap-1.5">
          <FolderOpen className="w-3.5 h-3.5" /> Charger
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          disabled={isRunning || nodes.length === 0}
          className="gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" /> Effacer
        </Button>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setResultsPanelOpen(!resultsPanelOpen)}
          className="gap-1.5"
        >
          {resultsPanelOpen ? (
            <PanelRightClose className="w-3.5 h-3.5" />
          ) : (
            <PanelRightOpen className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">Résultats</span>
          {results.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {results.filter((r) => r.status === 'success').length}/{results.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* ─── Canvas + Results ─── */}
      <div className="flex-1 flex min-h-0 relative">
        {/* ReactFlow Canvas */}
        <div className="flex-1 min-w-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            defaultEdgeOptions={{ animated: true, style: { stroke: '#64748b', strokeWidth: 2 } }}
            proOptions={{ hideAttribution: true }}
            className="bg-background"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="var(--muted-foreground)"
            />
            <Controls
              showInteractive={false}
              className="!bg-card/80 !border !border-border/50 !shadow-lg !rounded-lg overflow-hidden"
            />
            <MiniMap
              nodeStrokeColor={(n) => {
                const d = n.data as AgentNodeData | undefined
                if (d?.agentType) return AGENT_TYPES[d.agentType].color
                return '#64748b'
              }}
              nodeColor={(n) => {
                const d = n.data as AgentNodeData | undefined
                if (d?.agentType) return AGENT_TYPES[d.agentType].color + '40'
                return '#64748b40'
              }}
              className="!bg-card/80 !border !border-border/50 !shadow-lg !rounded-lg"
              maskColor="oklch(0 0 0 / 50%)"
            />
          </ReactFlow>
        </div>

        {/* ─── Results Panel ─── */}
        <AnimatePresence>
          {resultsPanelOpen && (
            <motion.div
              className="w-72 lg:w-80 border-l border-border/50 bg-card/30 backdrop-blur-sm flex flex-col shrink-0"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 288, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-4 py-3 border-b border-border/50 shrink-0">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Workflow className="w-4 h-4" /> Résultats d&apos;exécution
                </h3>
              </div>
              <ScrollArea className="flex-1 max-h-[calc(100vh-14rem)] overflow-y-auto">
                <div className="p-3 space-y-3">
                  {results.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      Aucun résultat. Exécutez un workflow pour voir les résultats.
                    </p>
                  ) : (
                    results.map((result, idx) => (
                      <motion.div
                        key={result.nodeId}
                        className="glass-panel p-3 rounded-lg space-y-2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium truncate">{result.agentName}</span>
                          {result.status === 'success' && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          )}
                          {result.status === 'error' && (
                            <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          )}
                          {result.status === 'running' && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                          )}
                          {result.status === 'pending' && (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                          )}
                        </div>
                        {result.output && (
                          <p className="text-[11px] text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                            {result.output}
                          </p>
                        )}
                        {result.error && (
                          <p className="text-[11px] text-red-500 line-clamp-2">{result.error}</p>
                        )}
                        {result.durationMs !== undefined && (
                          <p className="text-[10px] text-muted-foreground/60">
                            {result.durationMs}ms
                          </p>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Sidebar Agent Type Item (draggable)
   ═══════════════════════════════════════════════════════════════ */

function AgentTypeItem({ type }: { type: AgentType }) {
  const config = AGENT_TYPES[type]

  const onDragStart = (event: DragEvent) => {
    event.dataTransfer.setData('application/composer-agent', type)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-3 p-2.5 rounded-lg cursor-grab active:cursor-grabbing hover:bg-accent/50 transition-colors group"
    >
      <div
        className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 text-lg"
        style={{ backgroundColor: config.color + '20' }}
      >
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{config.label}</p>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Wrench className="w-2.5 h-2.5" /> {config.toolsCount} outils
        </p>
      </div>
      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Main Composer Module
   ═══════════════════════════════════════════════════════════════ */

export default function ComposerModule() {
  /* ─── State ─── */
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [resultsPanelOpen, setResultsPanelOpen] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState<AgentNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<ExecutionResult[]>([])

  /* ─── Run Workflow ─── */
  async function handleRun() {
    if (nodes.length === 0) return

    setIsRunning(true)
    // Initialize results with pending status
    const initialResults: ExecutionResult[] = nodes.map((n) => ({
      nodeId: n.id,
      agentName: (n.data as AgentNodeData).label,
      status: 'pending' as const,
    }))
    setResults(initialResults)
    setResultsPanelOpen(true)

    try {
      const res = await fetch('/api/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
          edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
        }),
      })

      if (!res.ok) throw new Error('Erreur d\'exécution')

      const data = await res.json()
      const executionResults: ExecutionResult[] = (data.results || data.agents || []).map(
        (r: { nodeId?: string; agentName?: string; status?: string; output?: string; durationMs?: number; error?: string }) => ({
          nodeId: r.nodeId || r.agentName || 'unknown',
          agentName: r.agentName || 'Agent',
          status: (r.status || 'success') as ExecutionResult['status'],
          output: r.output,
          durationMs: r.durationMs,
          error: r.error,
        })
      )

      setResults(executionResults)
      toast.success('Workflow exécuté avec succès !')
    } catch {
      // Fallback: simulate execution for demo
      const simulatedResults = nodes.map((n, idx) => ({
        nodeId: n.id,
        agentName: (n.data as AgentNodeData).label,
        status: 'success' as const,
        output: `[${(n.data as AgentNodeData).label}] Résultat simulé — connectez l'API orchestrateur pour de vraies exécutions.`,
        durationMs: 500 + idx * 200,
      }))
      setResults(simulatedResults)
      toast.info('Exécution simulée (API non disponible)')
    } finally {
      setIsRunning(false)
    }
  }

  /* ─── Save ─── */
  function handleSave() {
    const workflowData = {
      nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    }
    localStorage.setItem('composer-workflow', JSON.stringify(workflowData))
    toast.success('Workflow sauvegardé')
  }

  /* ─── Load ─── */
  function handleLoad() {
    const saved = localStorage.getItem('composer-workflow')
    if (!saved) {
      toast.error('Aucun workflow sauvegardé trouvé')
      return
    }
    try {
      const data = JSON.parse(saved)
      setNodes(data.nodes || [])
      setEdges(data.edges || [])
      toast.success('Workflow chargé')
    } catch {
      toast.error('Impossible de charger le workflow')
    }
  }

  /* ─── Clear ─── */
  function handleClear() {
    setNodes([])
    setEdges([])
    setResults([])
    toast.info('Workflow effacé')
  }

  /* ─── Keyboard shortcut for sidebar ─── */
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === '[' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSidebarOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler as EventListener)
    return () => window.removeEventListener('keydown', handler as EventListener)
  }, [])

  return (
    <ReactFlowProvider>
      <motion.div
        className="flex flex-col h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* ─── Header ─── */}
        <div className="px-4 sm:px-6 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Workflow className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Compositeur</h2>
              <p className="text-sm text-muted-foreground">
                Créez des workflows multi-agents en glissant-déposant des agents sur le canevas
              </p>
            </div>
          </div>
        </div>

        {/* ─── Main Layout: Sidebar + FlowEditor ─── */}
        <div className="flex-1 flex min-h-0 px-4 sm:px-6 pb-4 pt-2 gap-3">
          {/* ─── Sidebar ─── */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                className="w-56 shrink-0 glass-panel rounded-xl flex flex-col overflow-hidden"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 224, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between shrink-0">
                  <h3 className="text-sm font-semibold">Agents</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <ScrollArea className="flex-1 max-h-[calc(100vh-16rem)] overflow-y-auto">
                  <div className="p-2 space-y-1">
                    {(Object.keys(AGENT_TYPES) as AgentType[]).map((type) => (
                      <AgentTypeItem key={type} type={type} />
                    ))}
                  </div>
                </ScrollArea>
                <div className="px-4 py-2 border-t border-border/50 shrink-0">
                  <p className="text-[10px] text-muted-foreground text-center">
                    Glissez un agent sur le canevas
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sidebar toggle (when closed) */}
          {!sidebarOpen && (
            <Button
              variant="outline"
              size="sm"
              className="self-start mt-2 shrink-0"
              onClick={() => setSidebarOpen(true)}
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1 rotate-180" />
              Agents
            </Button>
          )}

          {/* ─── Flow Editor ─── */}
          <div className="flex-1 glass-panel rounded-xl overflow-hidden min-w-0">
            <FlowEditor
              onRunWorkflow={handleRun}
              onSave={handleSave}
              onLoad={handleLoad}
              onClear={handleClear}
              nodes={nodes}
              setNodes={setNodes}
              onNodesChange={onNodesChange}
              edges={edges}
              setEdges={setEdges}
              onEdgesChange={onEdgesChange}
              isRunning={isRunning}
              resultsPanelOpen={resultsPanelOpen}
              results={results}
              setResultsPanelOpen={setResultsPanelOpen}
            />
          </div>
        </div>
      </motion.div>
    </ReactFlowProvider>
  )
}