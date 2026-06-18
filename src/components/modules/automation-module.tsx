'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Workflow,
  Plus,
  ArrowLeft,
  Trash2,
  Search,
  FileText,
  Bell,
  Zap,
  ArrowRight,
  GitBranch,
  FileOutput,
  GripVertical,
  Save,
  MousePointer,
  Play,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useWorkspaceStore, type Workflow as WorkflowType, type WorkflowNode } from '@/store/workspace-store'

/* ─── Constants ─── */
const TEMPLATES = [
  {
    name: 'Surveillance Web',
    description: 'Recherche automatique et notification',
    icon: Search,
    trigger: 'Planifié',
    nodes: [
      { type: 'trigger' as const, label: 'Déclencheur Planifié', config: { interval: '1h' }, position: { x: 80, y: 120 } },
      { type: 'action' as const, label: 'Recherche Web', config: { query: 'IA et technologie' }, position: { x: 350, y: 120 } },
      { type: 'condition' as const, label: 'Nouveaux Résultats ?', config: { field: 'count', operator: '>', value: 0 }, position: { x: 620, y: 120 } },
      { type: 'output' as const, label: 'Envoyer Notification', config: { channel: 'email' }, position: { x: 890, y: 120 } },
    ],
  },
  {
    name: 'Rapport Hebdomadaire',
    description: 'Génération automatique de rapports',
    icon: FileText,
    trigger: 'Planifié',
    nodes: [
      { type: 'trigger' as const, label: 'Chaque Lundi', config: { cron: '0 9 * * 1' }, position: { x: 80, y: 120 } },
      { type: 'action' as const, label: 'Collecter Données', config: { source: 'analytics' }, position: { x: 350, y: 120 } },
      { type: 'action' as const, label: 'Générer Rapport', config: { format: 'pdf' }, position: { x: 620, y: 120 } },
      { type: 'output' as const, label: 'Partager Rapport', config: { to: 'team@company.com' }, position: { x: 890, y: 120 } },
    ],
  },
  {
    name: 'Agent de Veille',
    description: 'Veille technologique automatisée',
    icon: Bell,
    trigger: 'Webhook',
    nodes: [
      { type: 'trigger' as const, label: 'Webhook Entrant', config: { url: '/api/webhook' }, position: { x: 80, y: 120 } },
      { type: 'action' as const, label: 'Analyser Contenu', config: { model: 'gpt-4' }, position: { x: 350, y: 120 } },
      { type: 'condition' as const, label: 'Pertinent ?', config: { threshold: 0.8 }, position: { x: 620, y: 80 } },
      { type: 'output' as const, label: 'Sauvegarder', config: { db: 'veilles' }, position: { x: 890, y: 120 } },
      { type: 'output' as const, label: 'Notifier', config: { slack: '#veille' }, position: { x: 620, y: 200 } },
    ],
  },
]

const NODE_TYPE_CONFIG: Record<string, { icon: typeof Zap; color: string; bg: string; label: string }> = {
  trigger: { icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Déclencheur' },
  action: { icon: ArrowRight, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Action' },
  condition: { icon: GitBranch, color: 'text-violet-500', bg: 'bg-violet-500/10', label: 'Condition' },
  output: { icon: FileOutput, color: 'text-sky-500', bg: 'bg-sky-500/10', label: 'Sortie' },
}

const ADDABLE_NODE_TYPES: { type: WorkflowNode['type']; label: string }[] = [
  { type: 'trigger', label: 'Déclencheur' },
  { type: 'action', label: 'Action' },
  { type: 'condition', label: 'Condition' },
  { type: 'output', label: 'Sortie' },
]

/* ─── Helpers ─── */
function relativeTime(date: Date | null): string {
  if (!date) return 'Jamais'
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (minutes < 1) return "À l'instant"
  if (minutes < 60) return `Il y a ${minutes} min`
  if (hours < 24) return `Il y a ${hours}h`
  if (days < 7) return `Il y a ${days}j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

/* ─── Animation variants ─── */
const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.06, type: 'spring' as const, stiffness: 200, damping: 20 },
  }),
  exit: { opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.2 } },
}

/* ─── Main Component ─── */
export default function AutomationModule() {
  const workflows = useWorkspaceStore((s) => s.workflows)
  const addWorkflow = useWorkspaceStore((s) => s.addWorkflow)
  const updateWorkflow = useWorkspaceStore((s) => s.updateWorkflow)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')

  const selectedWorkflow = selectedId ? workflows.find((w) => w.id === selectedId) : null

  const handleCreateFromTemplate = useCallback(
    (template: (typeof TEMPLATES)[number]) => {
      const id = `wf-${Date.now()}`
      addWorkflow({
        id,
        name: template.name,
        trigger: template.trigger,
        nodes: template.nodes.map((n, i) => ({
          ...n,
          id: `node-${id}-${i}`,
        })),
        isActive: false,
        lastRun: null,
      })
      setSelectedId(id)
    },
    [addWorkflow]
  )

  const handleCreateBlank = useCallback(() => {
    if (!newName.trim()) return
    const id = `wf-${Date.now()}`
    addWorkflow({
      id,
      name: newName.trim(),
      trigger: 'Manuel',
      nodes: [
        {
          id: `node-${id}-0`,
          type: 'trigger',
          label: 'Déclencheur Manuel',
          config: { type: 'manual' },
          position: { x: 100, y: 200 },
        },
        {
          id: `node-${id}-1`,
          type: 'action',
          label: 'Nouvelle Action',
          config: {},
          position: { x: 400, y: 200 },
        },
      ],
      isActive: false,
      lastRun: null,
    })
    setNewName('')
    setCreateOpen(false)
    setSelectedId(id)
  }, [newName, addWorkflow])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Workflow className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Automatisation</h1>
            <p className="text-sm text-muted-foreground">Créez des workflows intelligents</p>
          </div>
        </div>

        {!selectedWorkflow && (
          <div className="flex items-center gap-2">
            <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setNewName('') }}>
              <DialogTrigger asChild>
                <Button className="gap-2 rounded-xl">
                  <Plus className="w-4 h-4" />
                  Nouveau Workflow
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-subtle max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Workflow className="w-5 h-5 text-primary" />
                    Nouveau Workflow
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="wf-name">Nom du workflow</Label>
                    <Input
                      id="wf-name"
                      placeholder="Mon Workflow"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="input-glow"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateBlank() }}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" className="rounded-xl">Annuler</Button>
                  </DialogClose>
                  <Button
                    onClick={handleCreateBlank}
                    disabled={!newName.trim()}
                    className="rounded-xl gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Créer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden px-4 md:px-6 pb-4 md:pb-6">
        <AnimatePresence mode="wait">
          {selectedWorkflow ? (
            <WorkflowEditor
              key={`editor-${selectedWorkflow.id}`}
              workflow={selectedWorkflow}
              onUpdate={(updates) => updateWorkflow(selectedWorkflow.id, updates)}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full overflow-y-auto custom-scrollbar space-y-8"
            >
              {/* Workflow List */}
              <section>
                <h2 className="text-lg font-semibold mb-4">Mes Workflows</h2>
                {workflows.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-16 text-center"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                      <Workflow className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Aucun workflow</h3>
                    <p className="text-muted-foreground max-w-sm mb-6">
                      Créez votre premier workflow automatisé ou utilisez un template pour démarrer rapidement.
                    </p>
                    <div className="flex gap-3">
                      <Button onClick={() => setCreateOpen(true)} className="gap-2 rounded-xl">
                        <Plus className="w-4 h-4" />
                        Créer vide
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {workflows.map((wf, i) => (
                        <WorkflowCard
                          key={wf.id}
                          workflow={wf}
                          index={i}
                          onSelect={() => setSelectedId(wf.id)}
                          onToggleActive={() => updateWorkflow(wf.id, { isActive: !wf.isActive })}
                          onDelete={() => { updateWorkflow(wf.id, { nodes: [] }) }}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </section>

              <Separator className="opacity-50" />

              {/* Templates */}
              <section className="pb-8">
                <h2 className="text-lg font-semibold mb-4">Templates populaires</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {TEMPLATES.map((template, i) => (
                    <motion.div
                      key={template.name}
                      custom={i}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <Card
                        className="glass module-card p-5 cursor-pointer h-full"
                        onClick={() => handleCreateFromTemplate(template)}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0`}>
                            <template.icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm">{template.name}</h3>
                            <Badge variant="secondary" className="text-[10px] mt-1">
                              {template.trigger}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-primary/70">
                          <Play className="w-3 h-3" />
                          <span>{template.nodes.length} étapes</span>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ─── Workflow Card ─── */
function WorkflowCard({
  workflow,
  index,
  onSelect,
  onToggleActive,
  onDelete,
}: {
  workflow: WorkflowType
  index: number
  onSelect: () => void
  onToggleActive: () => void
  onDelete: () => void
}) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
    >
      <Card className="glass module-card p-5 h-full flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Workflow className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{workflow.name}</h3>
              <Badge variant="outline" className="text-[10px] mt-0.5">
                {workflow.trigger}
              </Badge>
            </div>
          </div>
          <Switch
            checked={workflow.isActive}
            onCheckedChange={onToggleActive}
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`status-dot ${workflow.isActive ? 'active' : 'idle'}`} />
          <span>{workflow.isActive ? 'Actif' : 'Inactif'}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Dernière exécution : {relativeTime(workflow.lastRun)}</span>
        </div>

        <p className="text-xs text-muted-foreground/70">{workflow.nodes.length} nœuds</p>

        <div className="mt-auto flex items-center gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1.5 rounded-lg text-xs" onClick={onSelect}>
            <MousePointer className="w-3 h-3" />
            Modifier
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-lg">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-subtle">
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer le workflow</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir supprimer <strong>{workflow.name}</strong> ?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>
    </motion.div>
  )
}

/* ─── Workflow Editor ─── */
function WorkflowEditor({
  workflow,
  onUpdate,
  onBack,
}: {
  workflow: WorkflowType
  onUpdate: (updates: Partial<WorkflowType>) => void
  onBack: () => void
}) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [dragInfo, setDragInfo] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)

  const selectedNode = workflow.nodes.find((n) => n.id === selectedNodeId) || null

  /* ─── Drag handlers ─── */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, nodeId: string) => {
      e.preventDefault()
      const node = workflow.nodes.find((n) => n.id === nodeId)
      if (!node) return
      setDragInfo({
        nodeId,
        offsetX: e.clientX - node.position.x,
        offsetY: e.clientY - node.position.y,
      })
      setSelectedNodeId(nodeId)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [workflow.nodes]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragInfo) return
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = Math.max(0, e.clientX - rect.left - dragInfo.offsetX + canvas.scrollLeft)
      const y = Math.max(0, e.clientY - rect.top - dragInfo.offsetY + canvas.scrollTop)
      const updatedNodes = workflow.nodes.map((n) =>
        n.id === dragInfo.nodeId ? { ...n, position: { x: Math.round(x), y: Math.round(y) } } : n
      )
      onUpdate({ nodes: updatedNodes })
    },
    [dragInfo, workflow.nodes, onUpdate]
  )

  const handlePointerUp = useCallback(() => {
    setDragInfo(null)
  }, [])

  /* ─── Node config handlers ─── */
  const updateNodeConfig = useCallback(
    (nodeId: string, updates: Partial<WorkflowNode>) => {
      const updatedNodes = workflow.nodes.map((n) =>
        n.id === nodeId ? { ...n, ...updates } : n
      )
      onUpdate({ nodes: updatedNodes })
    },
    [workflow.nodes, onUpdate]
  )

  const addNode = useCallback(
    (type: WorkflowNode['type']) => {
      const newNode: WorkflowNode = {
        id: `node-${Date.now()}`,
        type,
        label: type === 'trigger' ? 'Nouveau Déclencheur' : type === 'action' ? 'Nouvelle Action' : type === 'condition' ? 'Nouvelle Condition' : 'Nouvelle Sortie',
        config: {},
        position: { x: 200 + Math.random() * 300, y: 100 + Math.random() * 200 },
      }
      onUpdate({ nodes: [...workflow.nodes, newNode] })
      setSelectedNodeId(newNode.id)
      setAddMenuOpen(false)
    },
    [workflow.nodes, onUpdate]
  )

  const deleteNode = useCallback(
    (nodeId: string) => {
      const updatedNodes = workflow.nodes.filter((n) => n.id !== nodeId)
      onUpdate({ nodes: updatedNodes })
      if (selectedNodeId === nodeId) setSelectedNodeId(null)
    },
    [workflow.nodes, onUpdate, selectedNodeId]
  )

  /* ─── SVG connections ─── */
  const renderConnections = () => {
    const lines: React.ReactNode[] = []
    for (let i = 0; i < workflow.nodes.length - 1; i++) {
      const from = workflow.nodes[i]
      const to = workflow.nodes[i + 1]
      const nodeWidth = 200
      const nodeHeight = 80
      const x1 = from.position.x + nodeWidth
      const y1 = from.position.y + nodeHeight / 2
      const x2 = to.position.x
      const y2 = to.position.y + nodeHeight / 2
      const midX = (x1 + x2) / 2

      lines.push(
        <path
          key={`conn-${from.id}-${to.id}`}
          d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary/30"
          strokeLinecap="round"
        />
      )
    }
    return lines
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex gap-4 h-[calc(100vh-160px)]"
    >
      {/* Canvas Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Editor Toolbar */}
        <div className="flex items-center gap-3 mb-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <h2 className="font-semibold text-sm truncate">{workflow.name}</h2>
          <Badge variant="secondary" className="text-[10px]">
            {workflow.nodes.length} nœuds
          </Badge>
          <div className="flex-1" />
          <Switch
            checked={workflow.isActive}
            onCheckedChange={(checked) => onUpdate({ isActive: checked })}
          />
          <span className="text-xs text-muted-foreground">
            {workflow.isActive ? 'Actif' : 'Inactif'}
          </span>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 glass-subtle rounded-2xl relative overflow-auto custom-scrollbar"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            backgroundImage:
              'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: '1200px', minHeight: '500px' }}>
            {renderConnections()}
          </svg>

          <div className="relative" style={{ minWidth: '1200px', minHeight: '500px' }}>
            <AnimatePresence>
              {workflow.nodes.map((node) => {
                const typeCfg = NODE_TYPE_CONFIG[node.type] || NODE_TYPE_CONFIG.action
                const Icon = typeCfg.icon
                const isSelected = node.id === selectedNodeId

                return (
                  <motion.div
                    key={node.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onPointerDown={(e) => handlePointerDown(e, node.id)}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`absolute cursor-grab active:cursor-grabbing select-none ${
                      dragInfo?.nodeId === node.id ? 'z-20' : 'z-10'
                    }`}
                    style={{
                      left: node.position.x,
                      top: node.position.y,
                      width: 200,
                    }}
                  >
                    <div
                      className={`rounded-xl p-3 transition-all duration-200 ${
                        isSelected
                          ? 'glass-strong ring-2 ring-primary/50 shadow-lg'
                          : 'glass module-card'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 cursor-grab" style={{ background: 'var(--accent)' }}>
                          <Icon className={`w-4 h-4 ${typeCfg.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{node.label}</p>
                          <Badge
                            variant="outline"
                            className="text-[10px] mt-1"
                          >
                            {typeCfg.label}
                          </Badge>
                        </div>
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-1" />
                      </div>

                      {/* Connection point (right) */}
                      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary/30 border-2 border-primary/60" />
                      {/* Connection point (left) */}
                      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-muted-foreground/20 border-2 border-muted-foreground/40" />
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Add Node Button */}
          <div className="absolute bottom-4 left-4 z-30">
            <div className="relative">
              <Button
                onClick={() => setAddMenuOpen(!addMenuOpen)}
                size="sm"
                className="rounded-xl gap-1.5 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Ajouter un nœud
              </Button>
              <AnimatePresence>
                {addMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-2 glass-strong rounded-xl p-2 min-w-[160px] z-50"
                  >
                    {ADDABLE_NODE_TYPES.map((item) => {
                      const cfg = NODE_TYPE_CONFIG[item.type]
                      const ItemIcon = cfg.icon
                      return (
                        <button
                          key={item.type}
                          onClick={() => addNode(item.type)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors text-left"
                        >
                          <ItemIcon className={`w-4 h-4 ${cfg.color}`} />
                          {item.label}
                        </button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Node Config */}
      <AnimatePresence>
        {selectedNode && (
          <motion.aside
            initial={{ opacity: 0, x: 20, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 288 }}
            exit={{ opacity: 0, x: 20, width: 0 }}
            className="w-72 shrink-0 overflow-hidden"
          >
            <div className="glass-subtle rounded-2xl p-4 h-full overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Configuration</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive/60 hover:text-destructive rounded-lg"
                  onClick={() => deleteNode(selectedNode.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Node Type */}
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${NODE_TYPE_CONFIG[selectedNode.type]?.bg}`}>
                      {(() => {
                        const Icon = NODE_TYPE_CONFIG[selectedNode.type]?.icon || Zap
                        return <Icon className={`w-3.5 h-3.5 ${NODE_TYPE_CONFIG[selectedNode.type]?.color}`} />
                      })()}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {NODE_TYPE_CONFIG[selectedNode.type]?.label}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Label */}
                <div className="space-y-2">
                  <Label htmlFor="node-label">Nom</Label>
                  <Input
                    id="node-label"
                    value={selectedNode.label}
                    onChange={(e) => updateNodeConfig(selectedNode.id, { label: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>

                {/* Type-specific config */}
                {selectedNode.type === 'trigger' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="trigger-type">Type de déclencheur</Label>
                      <Input
                        id="trigger-type"
                        value={(selectedNode.config.type as string) || 'manual'}
                        onChange={(e) =>
                          updateNodeConfig(selectedNode.id, {
                            config: { ...selectedNode.config, type: e.target.value },
                          })
                        }
                        className="h-8 text-sm"
                        placeholder="manual, scheduled, webhook..."
                      />
                    </div>
                    {selectedNode.config.interval && (
                      <div className="space-y-2">
                        <Label htmlFor="trigger-interval">Intervalle</Label>
                        <Input
                          id="trigger-interval"
                          value={selectedNode.config.interval as string}
                          onChange={(e) =>
                            updateNodeConfig(selectedNode.id, {
                              config: { ...selectedNode.config, interval: e.target.value },
                            })
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    )}
                  </>
                )}

                {selectedNode.type === 'action' && (
                  <div className="space-y-2">
                    <Label htmlFor="action-desc">Description de l&apos;action</Label>
                    <Input
                      id="action-desc"
                      value={(selectedNode.config.description as string) || ''}
                      onChange={(e) =>
                        updateNodeConfig(selectedNode.id, {
                          config: { ...selectedNode.config, description: e.target.value },
                        })
                      }
                      className="h-8 text-sm"
                      placeholder="Décrivez cette action..."
                    />
                  </div>
                )}

                {selectedNode.type === 'condition' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="cond-field">Champ</Label>
                      <Input
                        id="cond-field"
                        value={(selectedNode.config.field as string) || ''}
                        onChange={(e) =>
                          updateNodeConfig(selectedNode.id, {
                            config: { ...selectedNode.config, field: e.target.value },
                          })
                        }
                        className="h-8 text-sm"
                        placeholder="ex: count, status..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="cond-op">Opérateur</Label>
                        <Input
                          id="cond-op"
                          value={(selectedNode.config.operator as string) || ''}
                          onChange={(e) =>
                            updateNodeConfig(selectedNode.id, {
                              config: { ...selectedNode.config, operator: e.target.value },
                            })
                          }
                          className="h-8 text-sm"
                          placeholder=">, <, =="
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cond-val">Valeur</Label>
                        <Input
                          id="cond-val"
                          value={String(selectedNode.config.value || '')}
                          onChange={(e) =>
                            updateNodeConfig(selectedNode.id, {
                              config: { ...selectedNode.config, value: e.target.value },
                            })
                          }
                          className="h-8 text-sm"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </>
                )}

                {selectedNode.type === 'output' && (
                  <div className="space-y-2">
                    <Label htmlFor="output-target">Cible de sortie</Label>
                    <Input
                      id="output-target"
                      value={(selectedNode.config.channel as string) || (selectedNode.config.to as string) || (selectedNode.config.db as string) || ''}
                      onChange={(e) =>
                        updateNodeConfig(selectedNode.id, {
                          config: { ...selectedNode.config, channel: e.target.value },
                        })
                      }
                      className="h-8 text-sm"
                      placeholder="email, slack, fichier..."
                    />
                  </div>
                )}

                <Separator />

                {/* Position info */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Position : ({selectedNode.position.x}, {selectedNode.position.y})</p>
                  <p>ID : {selectedNode.id}</p>
                </div>

                <Button
                  size="sm"
                  className="w-full gap-2 rounded-xl"
                  onClick={() => {
                    // Save is implicit via the store updates
                  }}
                >
                  <Save className="w-3.5 h-3.5" />
                  Enregistrer
                </Button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </motion.div>
  )
}