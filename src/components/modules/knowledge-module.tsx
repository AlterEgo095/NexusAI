'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database,
  Upload,
  FileText,
  Search,
  Plus,
  Trash2,
  MessageSquare,
  CheckCircle,
  XCircle,
  Loader2,
  File,
  FileSpreadsheet,
  FileType,
  Send,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'

/* ─── Types ─── */
interface KnowledgeBase {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  _count: { chunks: number }
}

interface UploadResult {
  filename: string
  size: number
  chunksCreated: number
  totalChars: number
  error?: string
}

interface SourceChunk {
  id: string
  content: string
  sourceFile: string
  chunkIndex: number
  score: number
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: SourceChunk[]
}

/* ─── Helpers ─── */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  switch (ext) {
    case 'pdf':
      return { icon: FileText, color: 'text-red-500' }
    case 'docx':
    case 'doc':
      return { icon: FileType, color: 'text-blue-500' }
    case 'xlsx':
    case 'xls':
    case 'csv':
      return { icon: FileSpreadsheet, color: 'text-green-500' }
    case 'txt':
    case 'md':
    default:
      return { icon: File, color: 'text-gray-400' }
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const ACCEPTED_FORMATS = [
  { label: 'PDF', ext: '.pdf' },
  { label: 'DOCX', ext: '.docx' },
  { label: 'XLSX', ext: '.xlsx' },
  { label: 'CSV', ext: '.csv' },
  { label: 'TXT', ext: '.txt' },
  { label: 'MD', ext: '.md' },
]

const ACCEPT_STRING = '.pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md'

/* ─── Animation Variants ─── */
const fadeSlideIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   KnowledgeModule Component
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function KnowledgeModule() {
  /* ─── State ─── */
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [activeKbId, setActiveKbId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [queryInput, setQueryInput] = useState('')
  const [isQuerying, setIsQuerying] = useState(false)
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({})

  // New KB dialog
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeBase | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Drag & drop
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Chat scroll
  const chatEndRef = useRef<HTMLDivElement>(null)

  const activeKb = knowledgeBases.find((kb) => kb.id === activeKbId) || null

  /* ─── Fetch Knowledge Bases ─── */
  const fetchKnowledgeBases = useCallback(async () => {
    try {
      const res = await fetch('/api/knowledge')
      const data = await res.json()
      if (data.success) {
        setKnowledgeBases(data.knowledgeBases)
      }
    } catch {
      toast.error('Erreur lors du chargement des bases de connaissances')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKnowledgeBases()
  }, [fetchKnowledgeBases])

  /* ─── Auto-scroll chat ─── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* ─── Create Knowledge Base ─── */
  const handleCreate = async () => {
    if (!newName.trim()) return
    setIsCreating(true)
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDescription.trim() || undefined }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Base "${data.knowledgeBase.name}" créée avec succès`)
        setNewName('')
        setNewDescription('')
        setCreateDialogOpen(false)
        await fetchKnowledgeBases()
        // Auto-select the new KB
        setActiveKbId(data.knowledgeBase.id)
        setMessages([])
        setUploadResults([])
      } else {
        toast.error(data.error || 'Erreur de création')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setIsCreating(false)
    }
  }

  /* ─── Delete Knowledge Base ─── */
  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch('/api/knowledge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Base "${deleteTarget.name}" supprimée`)
        if (activeKbId === deleteTarget.id) {
          setActiveKbId(null)
          setMessages([])
          setUploadResults([])
        }
        await fetchKnowledgeBases()
      } else {
        toast.error(data.error || 'Erreur de suppression')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  /* ─── Upload Files ─── */
  const uploadFiles = async (files: FileList | File[]) => {
    if (!activeKbId) return
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    setIsUploading(true)
    setUploadResults([])

    const formData = new FormData()
    formData.append('knowledgeBaseId', activeKbId)
    fileArray.forEach((f) => formData.append('files', f))

    try {
      const res = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setUploadResults(data.results)
        const summary = data.summary
        toast.success(
          `${summary.successCount}/${summary.totalFiles} fichier(s) importé(s) — ${summary.totalChunks} chunks créés`
        )
        await fetchKnowledgeBases()
      } else {
        toast.error(data.error || "Erreur lors de l'import")
      }
    } catch {
      toast.error('Erreur réseau lors de l\'import')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  /* ─── Drag & Drop ─── */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files)
      }
    },
    []
  )

  /* ─── Query Knowledge Base ─── */
  const handleQuery = async () => {
    if (!queryInput.trim() || !activeKbId || isQuerying) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: queryInput.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    const currentQuery = queryInput.trim()
    setQueryInput('')
    setIsQuerying(true)

    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'query', kbId: activeKbId, query: currentQuery }),
      })
      const data = await res.json()
      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
        }
        setMessages((prev) => [...prev, assistantMessage])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: `Erreur: ${data.error || 'Impossible de générer une réponse'}`,
          },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Erreur réseau. Veuillez réessayer.',
        },
      ])
    } finally {
      setIsQuerying(false)
    }
  }

  /* ─── Toggle source expansion ─── */
  const toggleSources = (messageId: string) => {
    setExpandedSources((prev) => ({ ...prev, [messageId]: !prev[messageId] }))
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     Render
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-0">
      {/* ─── Left Panel: Knowledge Base List ─── */}
      <motion.div
        className="w-full lg:w-[300px] xl:w-[320px] shrink-0 flex flex-col"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg glass glow-sm">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">
              Bases de connaissances
            </h2>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nouvelle base</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-strong sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Nouvelle base de connaissances
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label htmlFor="kb-name" className="text-sm font-medium">
                    Nom <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="kb-name"
                    placeholder="Ex: Documentation produit"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    className="input-glow"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="kb-desc" className="text-sm font-medium">
                    Description
                  </label>
                  <Textarea
                    id="kb-desc"
                    placeholder="Description optionnelle..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button variant="ghost">Annuler</Button>
                </DialogClose>
                <Button onClick={handleCreate} disabled={!newName.trim() || isCreating}>
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* KB List */}
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : knowledgeBases.length === 0 ? (
            <motion.div
              {...fadeSlideIn}
              className="glass-subtle rounded-xl p-6 text-center"
            >
              <Database className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Aucune base de connaissances
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Créez-en une pour commencer
              </p>
            </motion.div>
          ) : (
            <ScrollArea className="h-full max-h-[calc(100vh-220px)] lg:max-h-[calc(100vh-220px)]">
              <motion.div
                className="space-y-2 pr-2 pb-2"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                <AnimatePresence>
                  {knowledgeBases.map((kb) => {
                    const isActive = kb.id === activeKbId
                    return (
                      <motion.div
                        key={kb.id}
                        variants={fadeSlideIn}
                        layout
                      >
                        <Card
                          className={`
                            module-card cursor-pointer group relative overflow-hidden
                            ${isActive
                              ? 'glass-strong border-primary/40 glow-sm'
                              : 'glass-subtle hover:border-primary/20'
                            }
                          `}
                          onClick={() => {
                            setActiveKbId(kb.id)
                            setMessages([])
                            setUploadResults([])
                          }}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-medium text-sm truncate">
                                  {kb.name}
                                </h3>
                                {kb.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                    {kb.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0 h-5 font-medium"
                                  >
                                    {kb._count.chunks} chunk{kb._count.chunks !== 1 ? 's' : ''}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground/70">
                                    {formatDate(kb.createdAt)}
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeleteTarget(kb)
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </CardContent>
                          {/* Active indicator bar */}
                          {isActive && (
                            <motion.div
                              className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-r-full"
                              layoutId="activeKbIndicator"
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                          )}
                        </Card>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </motion.div>
            </ScrollArea>
          )}
        </div>
      </motion.div>

      {/* ─── Right Panel: Active KB Detail ─── */}
      <motion.div
        className="flex-1 min-w-0 flex flex-col min-h-0"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
      >
        <AnimatePresence mode="wait">
          {!activeKb ? (
            /* ─── Empty State ─── */
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex items-center justify-center"
            >
              <div className="glass-subtle rounded-2xl p-10 text-center max-w-md mx-auto">
                <motion.div
                  className="mx-auto mb-5 p-4 rounded-2xl glass glow-sm w-fit"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                >
                  <Database className="h-10 w-10 text-primary/60" />
                </motion.div>
                <h3 className="text-lg font-semibold mb-2">
                  Sélectionnez ou créez une base de connaissances
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Importez vos documents et posez des questions. L&apos;IA répondra
                  en se basant sur le contenu de vos fichiers.
                </p>
              </div>
            </motion.div>
          ) : (
            /* ─── Active KB Content ─── */
            <motion.div
              key={activeKb.id}
              className="flex-1 flex flex-col min-h-0 gap-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header */}
              <div className="glass rounded-xl p-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg glass glow-sm">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-lg truncate">{activeKb.name}</h2>
                    {activeKb.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {activeKb.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0 gap-1">
                    <Search className="h-3 w-3" />
                    {activeKb._count.chunks} chunk{activeKb._count.chunks !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>

              {/* Upload Area */}
              <div className="shrink-0">
                <Card className="glass-subtle overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Upload className="h-4 w-4 text-primary" />
                      <h3 className="font-medium text-sm">Importer des fichiers</h3>
                    </div>

                    {/* Drag & Drop Zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`
                        relative rounded-xl border-2 border-dashed p-6 text-center cursor-pointer
                        transition-all duration-200
                        ${isDragOver
                          ? 'border-primary bg-primary/5 scale-[1.01]'
                          : 'border-border/60 hover:border-primary/40 hover:bg-muted/30'
                        }
                        ${isUploading ? 'pointer-events-none opacity-70' : ''}
                      `}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={ACCEPT_STRING}
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) uploadFiles(e.target.files)
                        }}
                      />

                      {isUploading ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="relative">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Upload className="h-4 w-4 text-primary/60" />
                            </div>
                          </div>
                          <p className="text-sm font-medium text-primary">
                            Import en cours...
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <motion.div
                            className="p-3 rounded-full glass"
                            animate={isDragOver ? { scale: 1.1 } : { scale: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Upload className="h-5 w-5 text-muted-foreground" />
                          </motion.div>
                          <div>
                            <p className="text-sm font-medium">
                              {isDragOver ? 'Déposez vos fichiers ici' : 'Glissez-déposez ou cliquez pour sélectionner'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Plusieurs fichiers possibles
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Accepted Formats */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {ACCEPTED_FORMATS.map((fmt) => (
                        <Badge
                          key={fmt.ext}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-5 font-normal"
                        >
                          {fmt.label}
                        </Badge>
                      ))}
                    </div>

                    {/* Upload Results */}
                    <AnimatePresence>
                      {uploadResults.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 space-y-1.5"
                        >
                          <div className="text-xs font-medium text-muted-foreground mb-2">
                            Résultats de l&apos;import
                          </div>
                          {uploadResults.map((result, i) => {
                            const { icon: FileIcon, color } = getFileIcon(result.filename)
                            return (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30"
                              >
                                <FileIcon className={`h-4 w-4 shrink-0 ${color}`} />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium truncate">
                                    {result.filename}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {formatFileSize(result.size)}
                                    {result.error
                                      ? ` — ${result.error}`
                                      : ` — ${result.chunksCreated} chunk${result.chunksCreated !== 1 ? 's' : ''} créés`
                                    }
                                  </p>
                                </div>
                                {result.error ? (
                                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                )}
                              </motion.div>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </div>

              {/* Chat Area */}
              <Card className="glass flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Messages */}
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-4 space-y-4">
                    {messages.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-10 text-center"
                      >
                        <motion.div
                          className="p-3 rounded-2xl glass mb-4"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                        >
                          <MessageSquare className="h-8 w-8 text-primary/50" />
                        </motion.div>
                        <p className="text-sm text-muted-foreground font-medium">
                          Posez une question sur vos documents
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
                          L&apos;IA recherchera les passages pertinents dans vos fichiers
                          et générera une réponse sourcée.
                        </p>
                      </motion.div>
                    ) : (
                      <AnimatePresence initial={false}>
                        {messages.map((msg) => (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`
                                max-w-[85%] sm:max-w-[75%]
                                ${msg.role === 'user'
                                  ? 'glass-strong rounded-2xl rounded-br-md px-4 py-2.5'
                                  : 'glass-subtle rounded-2xl rounded-bl-md px-4 py-3'
                                }
                              `}
                            >
                              {msg.role === 'user' ? (
                                <p className="text-sm leading-relaxed">{msg.content}</p>
                              ) : (
                                <div>
                                  <div className="prose-ai text-sm leading-relaxed">
                                    {msg.content}
                                  </div>

                                  {/* Sources */}
                                  {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-3 pt-2 border-t border-border/40">
                                      <button
                                        onClick={() => toggleSources(msg.id)}
                                        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                                      >
                                        {expandedSources[msg.id] ? (
                                          <ChevronUp className="h-3 w-3" />
                                        ) : (
                                          <ChevronDown className="h-3 w-3" />
                                        )}
                                        Sources ({msg.sources.length})
                                      </button>
                                      <AnimatePresence>
                                        {expandedSources[msg.id] && (
                                          <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mt-2 space-y-2 overflow-hidden"
                                          >
                                            {msg.sources.map((source, idx) => {
                                              const { icon: SourceIcon, color: sourceColor } = getFileIcon(source.sourceFile)
                                              return (
                                                <motion.div
                                                  key={source.id}
                                                  initial={{ opacity: 0, y: 4 }}
                                                  animate={{ opacity: 1, y: 0 }}
                                                  transition={{ delay: idx * 0.04 }}
                                                  className="p-2.5 rounded-lg bg-muted/30 text-xs space-y-1"
                                                >
                                                  <div className="flex items-center gap-1.5 font-medium">
                                                    <SourceIcon className={`h-3 w-3 ${sourceColor}`} />
                                                    <span className="text-[10px] px-1 py-0 rounded bg-primary/10 text-primary font-mono">
                                                      Source {idx + 1}
                                                    </span>
                                                    <span className="text-muted-foreground truncate">
                                                      {source.sourceFile}
                                                    </span>
                                                  </div>
                                                  <p className="text-muted-foreground leading-relaxed line-clamp-4">
                                                    {source.content}
                                                  </p>
                                                </motion.div>
                                              )
                                            })}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  )}

                                  {/* No sources info */}
                                  {msg.sources && msg.sources.length === 0 && (
                                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
                                      <AlertCircle className="h-3 w-3" />
                                      Aucun document pertinent trouvé pour cette question.
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}

                    {/* Querying indicator */}
                    {isQuerying && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex justify-start"
                      >
                        <div className="glass-subtle rounded-2xl rounded-bl-md px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">
                              Recherche et analyse en cours...
                            </span>
                          </div>
                          <div className="flex gap-1 mt-2">
                            <div className="typing-dot h-1.5 w-1.5 rounded-full bg-primary/60" />
                            <div className="typing-dot h-1.5 w-1.5 rounded-full bg-primary/60" />
                            <div className="typing-dot h-1.5 w-1.5 rounded-full bg-primary/60" />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>

                {/* Query Input */}
                <div className="p-4 border-t border-border/40 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <Input
                        value={queryInput}
                        onChange={(e) => setQueryInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleQuery()
                          }
                        }}
                        placeholder="Posez une question sur vos documents..."
                        disabled={isQuerying}
                        className="pr-4 input-glow"
                      />
                    </div>
                    <Button
                      onClick={handleQuery}
                      disabled={!queryInput.trim() || isQuerying}
                      size="icon"
                      className="shrink-0 h-10 w-10"
                    >
                      {isQuerying ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-2 text-center">
                    Les réponses sont générées à partir du contenu de vos documents importés.
                  </p>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── Delete Confirmation Dialog ─── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent className="glass-strong sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Supprimer la base ?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer{' '}
            <span className="font-semibold text-foreground">
              {deleteTarget?.name}
            </span>{' '}
            et tous ses {deleteTarget?._count.chunks} chunk(s) ? Cette action est irréversible.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="ghost" disabled={isDeleting}>
                Annuler
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}