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
  Loader2,
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
import { toast } from 'sonner'

/* ─── Types ─── */
interface WorkflowNode {
  id: string
  type: 'trigger' | 'action' | 'condition' | 'output'
  label: string
  config: Record<string, unknown>
  position: { x: number; y: number }
}

interface Automation {
  id: string
  name: string
  description: string | null
  trigger: string
  triggerConfig: string | null
  workflow: string
  isActive: boolean
  lastRun: string | null
  runCount: number
  createdAt: string
  updatedAt: string
  _count: { executions: number }
}

interface ExecutionStep {
  nodeId: string
  label: string
  result: string
  durationMs: number
}

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
function relativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Jamais'
  const date = new Date(dateStr)
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

function getNodeIcon(nodeId: string): string {
  if (nodeId.toLowerCase().includes('trigger') || nodeId.toLowerCase().includes('déclencheur')) return '⚡'
  if (nodeId.toLowerCase().includes('condition')) return '🔀'
  if (nodeId.toLowerCase().includes('output') || nodeId.toLowerCase().includes('sortie') || nodeId.toLowerCase().includes('notif')) return '📤'
  return '▶️'
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
  const [automations, setAutomations] = useState<Automation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')

  /* ─── Fetch automations on mount ─── */
  useEffect(() => {
    async function fetchAutomations() {
      try {
        const res = await fetch('/api/automations')
        const data = await res.json()
        if (data.success) {
          setAutomations(data.automations || [])
        }
      } catch {
        toast.error('Erreur lors du chargement des automations')
      } finally {
        setIsLoading(false)
      }
    }
    fetchAutomations()
  }, [])

  const selectedAutomation = selectedId ? automations.find((a) => a.id === selectedId) : null
  const selectedNodes = selectedAutomation
    ? (() => {
        try {
          const parsed = typeof selectedAutomation.workflow === 'string'
            ? JSON.parse(selectedAutomation.workflow)
            : selectedAutomation.workflow
          return Array.isArray(parsed) ? parsed : []
        } catch {
          return []
        }
      })()
    : []

  const handleCreateFromTemplate = useCallback(
    async (template: (typeof TEMPLATES)[number]) => {
      try {
        const nodesWithIds = template.nodes.map((n, i) => ({
          ...n,
          id: `node-${Date.now()}-${i}`,
        }))
        const res = await fetch('/api/automations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: template.name,
            description: template.description,
            trigger: template.trigger,
            workflow: JSON.stringify(nodesWithIds),
            isActive: false,
          }),
        })
        const data = await res.json()
        if (data.success && data.automation) {
          const newAuto: Automation = {
            ...data.automation,
            _count: data.automation._count || { executions: 0 },
          }
          setAutomations((prev) => [newAuto, ...prev])
          setSelectedId(newAuto.id)
          toast.success(`Workflow "${newAuto.name}" créé`)
        } else {
          toast.error(data.error || 'Erreur lors de la création')
        }
      } catch {
        toast.error('Erreur de connexion au serveur')
      }
    },
    []
  )

  const handleCreateBlank = useCallback(async () => {
    if (!newName.trim()) return
    try {
      const nodes = [
        {
          id: `node-${Date.now()}-0`,
          type: 'trigger',
          label: 'Déclencheur Manuel',
          config: { type: 'manual' },
          position: { x: 100, y: 200 },
        },
        {
          id: `node-${Date.now()}-1`,
          type: 'action',
          label: 'Nouvelle Action',
          config: {},
          position: { x: 400, y: 200 },
        },
      ]
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          trigger: 'Manuel',
          workflow: JSON.stringify(nodes),
          isActive: false,
        }),
      })
      const data = await res.json()
      if (data.success && data.automation) {
        const newAuto: Automation = {
          ...data.automation,
          _count: data.automation._count || { executions: 0 },
        }
        setAutomations((prev) => [newAuto, ...prev])
        setNewName('')
        setCreateOpen(false)
        setSelectedId(newAuto.id)
        toast.success(`Workflow "${newAuto.name}" créé`)
      } else {
        toast.error(data.error || 'Erreur lors de la création')
      }
    } catch {
      toast.error('Erreur de connexion au serveur')
    }
  }, [newName])

  const handleToggleActive = useCallback(async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/automations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      })
      const data = await res.json()
      if (data.success && data.automation) {
        setAutomations((prev) =>
          prev.map((a) => a.id === id ? { ...a, isActive: data.automation.isActive, updatedAt: data.automation.updatedAt } : a)
        )
      } else {
        toast.error(data.error || 'Erreur lors de la mise à jour')
      }
    } catch {
      toast.error('Erreur de connexion au serveur')
    }
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/automations/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setAutomations((prev) => prev.filter((a) => a.id !== id))
        if (selectedId === id) setSelectedId(null)
        toast.success('Workflow supprimé')
      } else {
        toast.error(data.error || 'Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur de connexion au serveur')
    }
  }, [selectedId])

  const handleUpdateWorkflow = useCallback(async (id: string, nodes: WorkflowNode[]) => {
    try {
      const res = await fetch(`/api/automations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow: JSON.stringify(nodes) }),
      })
      const data = await res.json()
      if (data.success && data.automation) {
        setAutomations((prev) =>
          prev.map((a) => a.id === id ? { ...a, workflow: data.automation.workflow, updatedAt: data.automation.updatedAt } : a)
        )
      }
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    }
  }, [])

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

        {!selectedAutomation && (
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
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-full"
            >
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </motion.div>
          ) : selectedAutomation ? (
            <WorkflowEditor
              key={`editor-${selectedAutomation.id}`}
              automation={selectedAutomation}
              initialNodes={selectedNodes}
              onSave={(nodes) => handleUpdateWorkflow(selectedAutomation.id, nodes)}
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
                {automations.length === 0 ? (
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
                      {automations.map((auto, i) => (
                        <WorkflowCard
                          key={auto.id}
                          automation={auto}
                          index={i}
                          onSelect={() => setSelectedId(auto.id)}
                          onToggleActive={() => handleToggleActive(auto.id, auto.isActive)}
                          onDelete={() => handleDelete(auto.id)}
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
  automation,
  index,
  onSelect,
  onToggleActive,
  onDelete,
}: {
  automation: Automation
  index: number
  onSelect: () => void
  onToggleActive: () => void
  onDelete: () => void
}) {
  let nodeCount = 0
  try {
    const parsed = typeof automation.workflow === 'string' ? JSON.parse(automation.workflow) : automation.workflow
    nodeCount = Array.isArray(parsed) ? parsed.length : 0
  } catch {
    // ignore
  }

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
              <h3 className="font-semibold text-sm">{automation.name}</h3>
              <Badge variant="outline" className="text-[10px] mt-0.5">
                {automation.trigger}
              </Badge>
            </div>
          </div>
          <Switch
            checked={automation.isActive}
            onCheckedChange={onToggleActive}
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`status-dot ${automation.isActive ? 'active' : 'idle'}`} />
          <span>{automation.isActive ? 'Actif' : 'Inactif'}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Dernière exécution : {relativeTime(automation.lastRun)}</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{nodeCount} nœuds</span>
          <span>·</span>
          <span>{automation.runCount} exécutions</span>
          <span>·</span>
          <span>{automation._count?.executions ?? 0} logs</span>
        </div>

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
                  Êtes-vous sûr de vouloir supprimer <strong>{automation.name}</strong> ?
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
  automation,
  initialNodes,
  onSave,
  onBack,
}: {
  automation: Automation
  initialNodes: WorkflowNode[]
  onSave: (nodes: WorkflowNode[]) => void
  onBack: () => void
}) {
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialNodes)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [dragInfo, setDragInfo] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([])
  const [totalDurationMs, setTotalDurationMs] = useState(0)

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null

  /* ─── Persist nodes on change ─── */
  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => onSave(nodes), 1000)
      return () => clearTimeout(timer)
    }
  }, [nodes, onSave])

  /* ─── Drag handlers ─── */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, nodeId: string) => {
      e.preventDefault()
      const node = nodes.find((n) => n.id === nodeId)
      if (!node) return
      setDragInfo({
        nodeId,
        offsetX: e.clientX - node.position.x,
        offsetY: e.clientY - node.position.y,
      })
      setSelectedNodeId(nodeId)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [nodes]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragInfo) return
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = Math.max(0, e.clientX - rect.left - dragInfo.offsetX + canvas.scrollLeft)
      const y = Math.max(0, e.clientY - rect.top - dragInfo.offsetY + canvas.scrollTop)
      setNodes((prev) =>
        prev.map((n) =>
          n.id === dragInfo.nodeId ? { ...n, position: { x: Math.round(x), y: Math.round(y) } } : n
        )
      )
    },
    [dragInfo]
  )

  const handlePointerUp = useCallback(() => {
    setDragInfo(null)
  }, [])

  /* ─── Node config handlers ─── */
  const updateNodeConfig = useCallback(
    (nodeId: string, updates: Partial<WorkflowNode>) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId ? { ...n, ...updates } : n
        )
      )
    },
    []
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
      setNodes((prev) => [...prev, newNode])
      setSelectedNodeId(newNode.id)
      setAddMenuOpen(false)
    },
    []
  )

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId))
      if (selectedNodeId === nodeId) setSelectedNodeId(null)
    },
    [selectedNodeId]
  )

  /* ─── Execute Workflow ─── */
  const handleExecute = useCallback(async () => {
    setIsExecuting(true)
    try {
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute', automationId: automation.id }),
      })
      const data = await res.json()
      if (data.success) {
        setExecutionSteps(data.steps || [])
        setTotalDurationMs(data.totalDurationMs || 0)
        setShowResults(true)
        toast.success(`Workflow exécuté en ${data.totalDurationMs || 0}ms`)
      } else {
        toast.error(data.error || "Erreur lors de l'exécution")
      }
    } catch {
      toast.error('Erreur de connexion au serveur')
    } finally {
      setIsExecuting(false)
    }
  }, [automation.id])

  /* ─── SVG connections ─── */
  const renderConnections = () => {
    const lines: React.ReactNode[] = []
    for (let i = 0; i < nodes.length - 1; i++) {
      const from = nodes[i]
      const to = nodes[i + 1]
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
          <h2 className="font-semibold text-sm truncate">{automation.name}</h2>
          <Badge variant="secondary" className="text-[10px]">
            {nodes.length} nœuds
          </Badge>
          <div className="flex-1" />
          <Button
            variant="default"
            size="sm"
            className="gap-1.5 rounded-lg"
            onClick={handleExecute}
            disabled={isExecuting || nodes.length === 0}
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Exécution...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Exécuter
              </>
            )}
          </Button>
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
              {nodes.map((node) => {
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
                  onClick={() => onSave(nodes)}
                >
                  <Save className="w-3.5 h-3.5" />
                  Enregistrer
                </Button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Execution Results Dialog */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Résultat de l&apos;exécution</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {executionSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <span className="text-lg">{getNodeIcon(step.label)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{step.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 max-h-20 overflow-y-auto">{step.result}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{step.durationMs}ms</p>
                </div>
              </div>
            ))}
            <div className="text-sm font-medium text-center pt-2">
              Durée totale: {totalDurationMs}ms
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}