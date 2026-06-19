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
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Plus,
  Save,
  FolderOpen,
  Download,
  Trash2,
  Type,
  Code2,
  FileText,
  StickyNote,
  Minus,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Eye,
  Pencil,
  GripVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

type BlockType = 'text' | 'code' | 'markdown' | 'note' | 'divider'

interface CanvasNodeData {
  label: string
  blockType: BlockType
  content: string
  [key: string]: unknown
}

type CanvasNode = Node<CanvasNodeData, 'blockNode'>

interface CanvasSummary {
  id: string
  name: string
  description: string | null
  nodeCount: number
  edgeCount: number
  createdAt: string
  updatedAt: string
}

/* ═══════════════════════════════════════════════════════════════
   Block type config
   ═══════════════════════════════════════════════════════════════ */

const BLOCK_CONFIG: Record<BlockType, { label: string; icon: typeof Type; color: string; headerBg: string }> = {
  text: { label: 'Texte', icon: Type, color: '#64748b', headerBg: 'bg-slate-500' },
  code: { label: 'Code', icon: Code2, color: '#22c55e', headerBg: 'bg-green-500' },
  markdown: { label: 'Markdown', icon: FileText, color: '#a855f7', headerBg: 'bg-purple-500' },
  note: { label: 'Note', icon: StickyNote, color: '#f59e0b', headerBg: 'bg-amber-500' },
  divider: { label: 'Séparateur', icon: Minus, color: '#6b7280', headerBg: 'bg-gray-400' },
}

/* ═══════════════════════════════════════════════════════════════
   Custom Node Component
   ═══════════════════════════════════════════════════════════════ */

function BlockNode({ id, data, selected }: NodeProps) {
  const nodeData = data as CanvasNodeData
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(nodeData.content)
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false)
  const [editLabel, setEditLabel] = useState(nodeData.label)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [editing])

  const handleDoubleClick = () => {
    if (nodeData.blockType === 'divider') return
    setEditContent(nodeData.content)
    setEditLabel(nodeData.label)
    setEditing(true)
  }

  const handleSave = () => {
    setEditing(false)
    const event = new CustomEvent('canvas-node-update', {
      detail: { id, content: editContent, label: editLabel },
    })
    window.dispatchEvent(event)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setEditing(false)
    }
    if (e.key === 'Enter' && !e.shiftKey && nodeData.blockType === 'note') {
      e.preventDefault()
      handleSave()
    }
  }

  const config = BLOCK_CONFIG[nodeData.blockType]

  if (nodeData.blockType === 'divider') {
    return (
      <div className="relative flex items-center justify-center" style={{ width: 200, height: 8 }}>
        <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-gray-400" />
        <div className="w-full h-0.5 bg-gray-400 rounded-full opacity-60" />
        <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-gray-400" />
      </div>
    )
  }

  const minWidth = nodeData.blockType === 'note' ? 180 : 260
  const minHeight = nodeData.blockType === 'note' ? 100 : 160

  return (
    <div
      className={`rounded-lg overflow-hidden shadow-lg border transition-shadow duration-200 ${selected ? 'ring-2 ring-primary/60 shadow-primary/10' : ''}`}
      style={{ minWidth, minHeight, maxWidth: 400 }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Header */}
      <div className={`${config.headerBg} px-3 py-1.5 flex items-center gap-2`}>
        <config.icon className="w-3.5 h-3.5 text-white/80" />
        {editing ? (
          <input
            className="bg-white/20 text-white text-xs rounded px-1.5 py-0.5 outline-none flex-1 min-w-0"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSave() } }}
          />
        ) : (
          <span className="text-white text-xs font-medium truncate flex-1">{nodeData.label}</span>
        )}
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-white/20 text-white border-0">
          {config.label}
        </Badge>
      </div>

      {/* Content */}
      <div className="bg-card p-0">
        <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-muted-foreground/40 !border-2 !border-card" />

        {editing ? (
          <div className="relative">
            {nodeData.blockType === 'markdown' && (
              <div className="flex items-center gap-1 px-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-6 text-[10px] px-2 ${!showMarkdownPreview ? 'bg-muted' : ''}`}
                  onClick={() => setShowMarkdownPreview(false)}
                >
                  <Pencil className="w-3 h-3 mr-1" />Éditer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-6 text-[10px] px-2 ${showMarkdownPreview ? 'bg-muted' : ''}`}
                  onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
                >
                  <Eye className="w-3 h-3 mr-1" />Aperçu
                </Button>
              </div>
            )}
            {showMarkdownPreview && nodeData.blockType === 'markdown' ? (
              <div className="p-3 prose-ai text-xs max-w-none min-h-[120px] overflow-auto max-h-[300px]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{editContent}</ReactMarkdown>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                className={`w-full p-3 text-xs bg-transparent outline-none resize-none ${
                  nodeData.blockType === 'code' ? 'font-mono leading-relaxed' : ''
                }`}
                style={{ minHeight: nodeData.blockType === 'note' ? 60 : 120, color: 'var(--foreground)' }}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        ) : (
          <div
            className={`p-3 text-xs overflow-auto max-h-[300px] ${
              nodeData.blockType === 'code' ? 'font-mono' : ''
            }`}
            style={{ color: nodeData.content ? 'var(--foreground)' : 'var(--muted-foreground)', minHeight: nodeData.blockType === 'note' ? 60 : 120 }}
          >
            {nodeData.content ? (
              nodeData.blockType === 'markdown' ? (
                <div className="prose-ai">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{nodeData.content}</ReactMarkdown>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-words">{nodeData.content}</pre>
              )
            ) : (
              <span className="italic">Double-cliquez pour éditer…</span>
            )}
          </div>
        )}

        <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-muted-foreground/40 !border-2 !border-card" />
      </div>
    </div>
  )
}

const nodeTypes: NodeTypes = {
  blockNode: BlockNode,
}

/* ═══════════════════════════════════════════════════════════════
   Flow Editor (wraps ReactFlow with Provider)
   ═══════════════════════════════════════════════════════════════ */

function FlowEditor({
  initialNodes,
  initialEdges,
  activeCanvasId,
  onAutoSave,
}: {
  initialNodes: CanvasNode[]
  initialEdges: Edge[]
  activeCanvasId: string | null
  onAutoSave: (nodes: CanvasNode[], edges: Edge[]) => void
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const { screenToFlowPosition } = useReactFlow()
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Listen for custom node update events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string; content: string; label: string }
      setNodes((nds) =>
        nds.map((n) =>
          n.id === detail.id
            ? { ...n, data: { ...n.data, content: detail.content, label: detail.label } }
            : n
        )
      )
    }
    window.addEventListener('canvas-node-update', handler)
    return () => window.removeEventListener('canvas-node-update', handler)
  }, [setNodes])

  // Auto-save on changes
  const triggerAutoSave = useCallback(
    (n: CanvasNode[], e: Edge[]) => {
      if (!activeCanvasId) return
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      autoSaveTimer.current = setTimeout(() => {
        onAutoSave(n, e)
      }, 2000)
    },
    [activeCanvasId, onAutoSave]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: '#64748b', strokeWidth: 2 } }, eds))
    },
    [setEdges]
  )

  // Watch for node/edge changes to auto-save
  useEffect(() => {
    triggerAutoSave(nodes, edges)
  }, [nodes, edges, triggerAutoSave])

  // Reset when canvas changes
  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  // Handle drag-and-drop from sidebar
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      const blockType = event.dataTransfer.getData('application/canvas-block') as BlockType
      if (!blockType) return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const config = BLOCK_CONFIG[blockType]
      const newNode: CanvasNode = {
        id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'blockNode',
        position,
        data: {
          label: `${config.label} ${nodes.length + 1}`,
          blockType,
          content: blockType === 'divider' ? '' : '',
        },
      }

      setNodes((nds) => [...nds, newNode])
    },
    [screenToFlowPosition, setNodes, nodes.length]
  )

  // Delete key handler
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
    <div className="flex-1 h-full">
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
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--muted-foreground)" />
        <Controls
          showInteractive={false}
          className="!bg-card/80 !border !border-border/50 !shadow-lg !rounded-lg overflow-hidden"
        />
        <MiniMap
          nodeStrokeColor={(n) => {
            const d = n.data as CanvasNodeData | undefined
            if (d?.blockType) return BLOCK_CONFIG[d.blockType].color
            return '#64748b'
          }}
          nodeColor={(n) => {
            const d = n.data as CanvasNodeData | undefined
            if (d?.blockType) return BLOCK_CONFIG[d.blockType].color + '40'
            return '#64748b40'
          }}
          className="!bg-card/80 !border !border-border/50 !shadow-lg !rounded-lg"
          maskColor="oklch(0 0 0 / 50%)"
        />
      </ReactFlow>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Sidebar Block Item (draggable)
   ═══════════════════════════════════════════════════════════════ */

function BlockTypeItem({ type }: { type: BlockType }) {
  const config = BLOCK_CONFIG[type]
  const Icon = config.icon

  const onDragStart = (event: DragEvent) => {
    event.dataTransfer.setData('application/canvas-block', type)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-3 p-2.5 rounded-lg cursor-grab active:cursor-grabbing hover:bg-accent/50 transition-colors group"
    >
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
        style={{ backgroundColor: config.color + '20' }}
      >
        <Icon className="w-4 h-4" style={{ color: config.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{config.label}</p>
        <p className="text-[11px] text-muted-foreground">Glisser sur le canevas</p>
      </div>
      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Main Canvas Module
   ═══════════════════════════════════════════════════════════════ */

export default function CanvasModule() {
  /* ─── State ─── */
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [canvases, setCanvases] = useState<CanvasSummary[]>([])
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null)
  const [activeCanvasName, setActiveCanvasName] = useState('')
  const [canvasNodes, setCanvasNodes] = useState<CanvasNode[]>([])
  const [canvasEdges, setCanvasEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Dialogs
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [newCanvasName, setNewCanvasName] = useState('')
  const [newCanvasDesc, setNewCanvasDesc] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [canvasToDelete, setCanvasToDelete] = useState<string | null>(null)

  /* ─── Load canvases ─── */
  const loadCanvases = useCallback(async () => {
    try {
      const res = await fetch('/api/canvas')
      const data = await res.json()
      if (data.success) {
        setCanvases(data.canvases)
      }
    } catch {
      toast.error('Erreur lors du chargement des canevas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCanvases()
  }, [loadCanvases])

  /* ─── Create canvas ─── */
  const handleCreateCanvas = async () => {
    if (!newCanvasName.trim()) {
      toast.error('Veuillez entrer un nom')
      return
    }
    try {
      const res = await fetch('/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCanvasName.trim(), description: newCanvasDesc.trim() || null }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Canevas « ${data.canvas.name} » créé`)
        setNewDialogOpen(false)
        setNewCanvasName('')
        setNewCanvasDesc('')
        await loadCanvases()
        handleLoadCanvas(data.canvas.id, data.canvas.name)
      }
    } catch {
      toast.error('Erreur lors de la création')
    }
  }

  /* ─── Load canvas ─── */
  const handleLoadCanvas = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/canvas/${id}`)
      const data = await res.json()
      if (data.success) {
        let nodes: CanvasNode[] = []
        let edges: Edge[] = []
        try { nodes = JSON.parse(data.canvas.nodes) } catch { /* ignore */ }
        try { edges = JSON.parse(data.canvas.edges) } catch { /* ignore */ }

        setActiveCanvasId(id)
        setActiveCanvasName(name)
        setCanvasNodes(nodes)
        setCanvasEdges(edges)
        toast.success(`Canevas « ${name} » chargé`)
      }
    } catch {
      toast.error('Erreur lors du chargement')
    }
  }

  /* ─── Auto-save ─── */
  const handleAutoSave = useCallback(
    async (nodes: CanvasNode[], edges: Edge[]) => {
      if (!activeCanvasId) return
      try {
        await fetch('/api/canvas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save',
            id: activeCanvasId,
            nodes: JSON.stringify(nodes),
            edges: JSON.stringify(edges),
          }),
        })
      } catch {
        // Silent auto-save failure
      }
    },
    [activeCanvasId]
  )

  /* ─── Manual save ─── */
  const handleSave = async () => {
    if (!activeCanvasId) return
    setSaving(true)
    try {
      await handleAutoSave(canvasNodes, canvasEdges)
      toast.success('Canevas enregistré')
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  /* ─── Export JSON ─── */
  const handleExport = () => {
    if (!activeCanvasId) return
    const json = JSON.stringify({ name: activeCanvasName, nodes: canvasNodes, edges: canvasEdges }, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeCanvasName.replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Canevas exporté en JSON')
  }

  /* ─── Clear canvas ─── */
  const handleClear = () => {
    setCanvasNodes([])
    setCanvasEdges([])
    toast.info('Canevas vidé')
  }

  /* ─── Delete canvas ─── */
  const handleDeleteCanvas = async () => {
    if (!canvasToDelete) return
    try {
      const res = await fetch(`/api/canvas/${canvasToDelete}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Canevas supprimé')
        if (canvasToDelete === activeCanvasId) {
          setActiveCanvasId(null)
          setActiveCanvasName('')
          setCanvasNodes([])
          setCanvasEdges([])
        }
        await loadCanvases()
      }
    } catch {
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeleteDialogOpen(false)
      setCanvasToDelete(null)
    }
  }

  /* ─── Key for re-mounting FlowEditor ─── */
  const flowKey = activeCanvasId || 'empty'

  /* ═══════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════ */

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full overflow-hidden">
        {/* ─── Left Sidebar ─── */}
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="h-full overflow-hidden shrink-0 border-r border-border/50"
            >
              <div className="glass-strong h-full w-[280px] flex flex-col">
                {/* Sidebar Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                  <h2 className="text-sm font-semibold">Canevas</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>

                <ScrollArea className="flex-1">
                  {/* Block Types */}
                  <div className="p-3">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
                      Types de blocs
                    </p>
                    <div className="space-y-1">
                      {(['text', 'code', 'markdown', 'note', 'divider'] as BlockType[]).map((type) => (
                        <BlockTypeItem key={type} type={type} />
                      ))}
                    </div>
                  </div>

                  <Separator className="mx-3" />

                  {/* Canvas List */}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Mes canevas
                      </p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setNewDialogOpen(true)}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Nouveau canevas</TooltipContent>
                      </Tooltip>
                    </div>

                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      </div>
                    ) : canvases.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        Aucun canevas sauvegardé
                      </p>
                    ) : (
                      <div className="space-y-1 max-h-72 overflow-y-auto custom-scrollbar">
                        {canvases.map((c) => (
                          <div
                            key={c.id}
                            className={`group flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                              activeCanvasId === c.id
                                ? 'bg-primary/10 border border-primary/20'
                                : 'hover:bg-accent/50'
                            }`}
                            onClick={() => handleLoadCanvas(c.id, c.name)}
                          >
                            <LayoutGrid className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{c.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {c.nodeCount} bloc{c.nodeCount !== 1 ? 's' : ''} · {c.edgeCount} lien{c.edgeCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                setCanvasToDelete(c.id)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ─── Main Area ─── */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Top Toolbar */}
          <div className="glass-subtle border-b border-border/50 px-3 py-2 flex items-center gap-2 shrink-0">
            {!sidebarOpen && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Ouvrir le panneau</TooltipContent>
              </Tooltip>
            )}

            {activeCanvasId && (
              <Badge variant="outline" className="text-xs font-medium max-w-[200px] truncate">
                {activeCanvasName}
              </Badge>
            )}

            <Separator orientation="vertical" className="h-6 mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setNewDialogOpen(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Nouveau</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Nouveau canevas</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  disabled={!activeCanvasId || saving}
                  onClick={handleSave}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{saving ? '…' : 'Enregistrer'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Enregistrer (auto toutes les 2s)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={loadCanvases}>
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Rafraîchir</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Rafraîchir la liste</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  disabled={!activeCanvasId}
                  onClick={handleExport}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Exporter</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Exporter en JSON</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
                  disabled={!activeCanvasId}
                  onClick={handleClear}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Vider</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Vider le canevas</TooltipContent>
            </Tooltip>

            <div className="flex-1" />

            {activeCanvasId && (
              <p className="text-[10px] text-muted-foreground hidden md:block">
                Sauvegarde auto toutes les 2s
              </p>
            )}
          </div>

          {/* Canvas / Welcome */}
          {activeCanvasId ? (
            <ReactFlowProvider>
              <FlowEditor
                key={flowKey}
                initialNodes={canvasNodes}
                initialEdges={canvasEdges}
                activeCanvasId={activeCanvasId}
                onAutoSave={handleAutoSave}
              />
            </ReactFlowProvider>
          ) : (
            <WelcomeState onCreateNew={() => setNewDialogOpen(true)} />
          )}
        </div>

        {/* ─── New Canvas Dialog ─── */}
        <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
          <DialogContent className="glass-strong">
            <DialogHeader>
              <DialogTitle>Nouveau canevas</DialogTitle>
              <DialogDescription>
                Créez un nouveau canevas visuel pour organiser vos idées.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nom</label>
                <Input
                  placeholder="Mon canevas"
                  value={newCanvasName}
                  onChange={(e) => setNewCanvasName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCanvas() }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description (optionnel)</label>
                <Textarea
                  placeholder="Description du canevas…"
                  value={newCanvasDesc}
                  onChange={(e) => setNewCanvasDesc(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateCanvas}>
                <Plus className="w-4 h-4 mr-1.5" />
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Delete Confirmation Dialog ─── */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="glass-strong">
            <DialogHeader>
              <DialogTitle>Supprimer le canevas</DialogTitle>
              <DialogDescription>
                Cette action est irréversible. Tous les blocs et connexions seront perdus.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleDeleteCanvas}>
                <Trash2 className="w-4 h-4 mr-1.5" />
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Welcome State
   ═══════════════════════════════════════════════════════════════ */

function WelcomeState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="text-center max-w-md mx-auto px-6"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
          <LayoutGrid className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Éditeur de canevas</h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Créez des diagrammes visuels en glissant-déposant des blocs de texte, code, markdown et notes. Connectez-les pour organiser vos idées.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {(['text', 'code', 'markdown', 'note'] as BlockType[]).map((type, i) => {
            const config = BLOCK_CONFIG[type]
            const Icon = config.icon
            return (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + i * 0.08 }}
                className="glass-subtle rounded-lg p-4 flex flex-col items-center gap-2"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: config.color + '20' }}
                >
                  <Icon className="w-5 h-5" style={{ color: config.color }} />
                </div>
                <span className="text-sm font-medium">{config.label}</span>
              </motion.div>
            )
          })}
        </div>

        <Button size="lg" onClick={onCreateNew} className="gap-2">
          <Plus className="w-5 h-5" />
          Créer un canevas
        </Button>
      </motion.div>
    </div>
  )
}