'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Plus,
  Search,
  Trash2,
  Tag,
  Star,
  BookOpen,
  User,
  Folder,
  Lightbulb,
  Shield,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
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
type MemoryType = 'user' | 'project' | 'knowledge' | 'preference'
type MemorySource = 'manual' | 'auto' | 'chat' | 'agent'

interface Memory {
  id: string
  key: string
  value: string
  type: MemoryType
  category?: string | null
  source: MemorySource
  importance: number
  createdAt: string
  updatedAt: string
}

type FilterTab = 'all' | MemoryType

/* ─── Type Config ─── */
const TYPE_CONFIG: Record<
  MemoryType,
  { icon: typeof User; color: string; label: string }
> = {
  user: { icon: User, color: 'text-blue-500', label: 'Utilisateur' },
  project: { icon: Folder, color: 'text-amber-500', label: 'Projet' },
  knowledge: { icon: Lightbulb, color: 'text-emerald-500', label: 'Connaissance' },
  preference: { icon: Shield, color: 'text-purple-500', label: 'Préférence' },
}

const SOURCE_CONFIG: Record<MemorySource, { label: string }> = {
  manual: { label: 'Manuel' },
  auto: { label: 'Auto' },
  chat: { label: 'Chat' },
  agent: { label: 'Agent' },
}

const TABS: { value: FilterTab; label: string; icon: typeof Brain }[] = [
  { value: 'all', label: 'Tous', icon: Brain },
  { value: 'user', label: 'Utilisateur', icon: User },
  { value: 'project', label: 'Projet', icon: Folder },
  { value: 'knowledge', label: 'Connaissance', icon: Lightbulb },
  { value: 'preference', label: 'Préférence', icon: Shield },
]

/* ─── Animation Variants ─── */
const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.05,
      type: 'spring' as const,
      stiffness: 200,
      damping: 20,
    },
  }),
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
}

/* ─── Helpers ─── */
function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  const diffMonth = Math.floor(diffDay / 30)

  if (diffSec < 60) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  if (diffHr < 24) return `il y a ${diffHr}h`
  if (diffDay < 30) return `il y a ${diffDay}j`
  return `il y a ${diffMonth}mo`
}

function ImportanceStars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Importance: ${value}/10`}>
      {Array.from({ length: 10 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 transition-colors ${
            i < value
              ? 'fill-amber-400 text-amber-400'
              : 'fill-transparent text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  )
}

/* ─── Loading Skeleton ─── */
function MemorySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass module-card rounded-xl p-5 space-y-3">
          <div className="flex items-start justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex items-center gap-2 pt-2">
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-4 w-14 rounded-full" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
          <div className="flex items-center justify-between pt-1">
            <Skeleton className="h-3 w-24" />
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }).map((_, j) => (
                <Skeleton key={j} className="h-3 w-3 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Memory Card ─── */
function MemoryCard({
  memory,
  index,
  onDelete,
}: {
  memory: Memory
  index: number
  onDelete: (id: string) => void
}) {
  const typeInfo = TYPE_CONFIG[memory.type]
  const TypeIcon = typeInfo.icon

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
        {/* Key + Type Badge */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-snug break-words line-clamp-2">
            {memory.key}
          </h3>
          <Badge
            variant="secondary"
            className={`shrink-0 gap-1 text-[10px] ${typeInfo.color}`}
          >
            <TypeIcon className="w-3 h-3" />
            {typeInfo.label}
          </Badge>
        </div>

        {/* Value */}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 break-words">
          {memory.value}
        </p>

        {/* Tags Row */}
        <div className="flex flex-wrap items-center gap-1.5">
          {memory.category && (
            <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0">
              <Tag className="w-2.5 h-2.5" />
              {memory.category}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {SOURCE_CONFIG[memory.source]?.label ?? memory.source}
          </Badge>
        </div>

        {/* Bottom Row: Time + Stars + Delete */}
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-[11px] text-muted-foreground">
            {getRelativeTime(memory.createdAt)}
          </span>
          <div className="flex items-center gap-2">
            <ImportanceStars value={memory.importance} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass-subtle">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-destructive" />
                    Supprimer la mémoire
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Êtes-vous sûr de vouloir supprimer la mémoire{' '}
                    <strong>&laquo;&nbsp;{memory.key}&nbsp;&raquo;</strong> ? Cette
                    action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(memory.id)}
                    className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

/* ─── Main Component ─── */
export default function MemoryModule() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ─── Form state ─── */
  const [formKey, setFormKey] = useState('')
  const [formValue, setFormValue] = useState('')
  const [formType, setFormType] = useState<MemoryType>('user')
  const [formCategory, setFormCategory] = useState('')
  const [formImportance, setFormImportance] = useState(5)

  /* ─── Fetch memories ─── */
  const fetchMemories = useCallback(async (params?: { type?: string; search?: string }) => {
    try {
      const url = new URL('/api/memory', window.location.origin)
      if (params?.type && params.type !== 'all') {
        url.searchParams.set('type', params.type)
      }
      if (params?.search) {
        url.searchParams.set('action', 'search')
        url.searchParams.set('query', params.search)
      }

      const res = await fetch(url.toString())
      const data = await res.json()
      if (data.success) {
        setMemories(data.memories || [])
      }
    } catch {
      toast.error('Erreur lors du chargement des mémoires')
    } finally {
      setIsLoading(false)
      setIsSearching(false)
    }
  }, [])

  /* ─── Initial load ─── */
  useEffect(() => {
    fetchMemories()
  }, [fetchMemories])

  /* ─── Fetch when tab changes ─── */
  useEffect(() => {
    if (!isLoading) {
      setIsSearching(true)
      if (searchQuery.trim()) {
        fetchMemories({ type: activeTab, search: searchQuery.trim() })
      } else {
        fetchMemories({ type: activeTab })
      }
    }
    }, [activeTab, fetchMemories])

  /* ─── Search with debounce ─── */
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value)
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

      if (!value.trim()) {
        fetchMemories({ type: activeTab })
        return
      }

      searchTimeoutRef.current = setTimeout(() => {
        setIsSearching(true)
        fetchMemories({ type: activeTab, search: value.trim() })
      }, 350)
    },
    [activeTab, fetchMemories]
  )

  /* ─── Cleanup timeout ─── */
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  /* ─── Create memory ─── */
  const handleCreate = useCallback(async () => {
    if (!formKey.trim() || !formValue.trim()) return

    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: formKey.trim(),
          value: formValue.trim(),
          type: formType,
          category: formCategory.trim() || undefined,
          importance: formImportance,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Mémoire créée avec succès')
        setCreateOpen(false)
        resetForm()
        fetchMemories({ type: activeTab, search: searchQuery.trim() || undefined })
      } else {
        toast.error(data.error || 'Erreur lors de la création')
      }
    } catch {
      toast.error('Erreur de connexion au serveur')
    }
  }, [formKey, formValue, formType, formCategory, formImportance, activeTab, searchQuery, fetchMemories])

  /* ─── Delete memory ─── */
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const res = await fetch('/api/memory', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        })
        const data = await res.json()
        if (data.success) {
          setMemories((prev) => prev.filter((m) => m.id !== id))
          toast.success('Mémoire supprimée')
        } else {
          toast.error(data.error || 'Erreur lors de la suppression')
        }
      } catch {
        toast.error('Erreur de connexion au serveur')
      }
    },
    []
  )

  /* ─── Reset form ─── */
  const resetForm = () => {
    setFormKey('')
    setFormValue('')
    setFormType('user')
    setFormCategory('')
    setFormImportance(5)
  }

  /* ─── Filtered memories (tabs already filter server-side, but keep for UX) ─── */
  const displayMemories = memories
  const memoryCount = displayMemories.length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              Mémoire à Long Terme
            </h1>
            <p className="text-sm text-muted-foreground">
              Gérez le contexte persistant de l&apos;IA
            </p>
          </div>
        </div>

        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl">
              <Plus className="w-4 h-4" />
              Ajouter une mémoire
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-subtle max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Nouvelle mémoire
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Key */}
              <div className="space-y-2">
                <Label htmlFor="mem-key">
                  Clé <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="mem-key"
                  placeholder="ex: Langue préférée"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {/* Value */}
              <div className="space-y-2">
                <Label htmlFor="mem-value">
                  Valeur <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="mem-value"
                  placeholder="Description ou contenu de la mémoire..."
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  className="rounded-xl min-h-[100px] resize-none"
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formType}
                  onValueChange={(v) => setFormType(v as MemoryType)}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                      const Icon = cfg.icon
                      return (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${cfg.color}`} />
                            {cfg.label}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="mem-category">Catégorie</Label>
                <Input
                  id="mem-category"
                  placeholder="Optionnel — ex: travail, personnel"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {/* Importance Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Importance</Label>
                  <span className="text-sm font-semibold text-amber-500">
                    {formImportance}/10
                  </span>
                </div>
                <Slider
                  value={[formImportance]}
                  onValueChange={([v]) => setFormImportance(v)}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>1 — Faible</span>
                  <span>10 — Critique</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" className="rounded-xl">
                  Annuler
                </Button>
              </DialogClose>
              <Button
                onClick={handleCreate}
                disabled={!formKey.trim() || !formValue.trim()}
                className="rounded-xl gap-2"
              >
                <Brain className="w-4 h-4" />
                Créer la mémoire
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs + Search + Count */}
      <div className="px-4 md:px-6 space-y-3">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1 custom-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.value
            return (
              <motion.button
                key={tab.value}
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveTab(tab.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/70 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </motion.button>
            )
          })}
        </div>

        {/* Search + Count */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans les mémoires..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>
          <Badge
            variant="secondary"
            className="shrink-0 gap-1.5 text-xs px-3 py-1.5 rounded-lg"
          >
            <BookOpen className="w-3.5 h-3.5" />
            {memoryCount} mémoire{memoryCount !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-6 pb-4 md:pb-6 pt-3">
        <AnimatePresence mode="wait">
          {isLoading || isSearching ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <MemorySkeleton />
            </motion.div>
          ) : displayMemories.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Brain className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Aucune mémoire</h2>
              <p className="text-muted-foreground max-w-md mb-6 leading-relaxed">
                Les mémoires sont créées automatiquement lors de vos conversations
                ou manuellement.
              </p>
              <Button
                onClick={() => setCreateOpen(true)}
                className="gap-2 rounded-xl"
              >
                <Plus className="w-4 h-4" />
                Créer votre première mémoire
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <AnimatePresence>
                  {displayMemories.map((memory, i) => (
                    <MemoryCard
                      key={memory.id}
                      memory={memory}
                      index={i}
                      onDelete={handleDelete}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}