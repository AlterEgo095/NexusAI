'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  Plus,
  SendHorizontal,
  Trash2,
  Settings,
  MessageSquare,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import { useWorkspaceStore, type CustomAgent } from '@/store/workspace-store'

/* ─── Constants ─── */
const AVATAR_OPTIONS = ['🤖', '💻', '🔬', '📊', '✍️', '🎨', '📈', '🛡️', '🔍', '📝']

const TOOL_OPTIONS = [
  { value: 'web_search', label: 'Recherche Web' },
  { value: 'code_generation', label: 'Génération de Code' },
  { value: 'writing', label: 'Rédaction' },
  { value: 'data_analysis', label: 'Analyse de Données' },
  { value: 'image_generation', label: 'Génération d\'Images' },
  { value: 'editing', label: 'Édition' },
]

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  idle: { label: 'Inactif', className: 'idle' },
  running: { label: 'Actif', className: 'active' },
  error: { label: 'Erreur', className: 'error' },
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

/* ─── Chat Message type ─── */
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

/* ─── Main Component ─── */
export default function AgentsModule() {
  const customAgents = useWorkspaceStore((s) => s.customAgents)
  const addAgent = useWorkspaceStore((s) => s.addAgent)
  const deleteAgent = useWorkspaceStore((s) => s.deleteAgent)

  const [createOpen, setCreateOpen] = useState(false)
  const [chatAgentId, setChatAgentId] = useState<string | null>(null)

  /* ─── Create form state ─── */
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formRole, setFormRole] = useState('')
  const [formPrompt, setFormPrompt] = useState('')
  const [formTools, setFormTools] = useState<string[]>([])
  const [formAvatar, setFormAvatar] = useState('🤖')

  const resetForm = useCallback(() => {
    setFormName('')
    setFormDesc('')
    setFormRole('')
    setFormPrompt('')
    setFormTools([])
    setFormAvatar('🤖')
  }, [])

  const handleCreate = useCallback(() => {
    if (!formName.trim() || !formPrompt.trim()) return
    addAgent({
      id: `agent-${Date.now()}`,
      name: formName.trim(),
      description: formDesc.trim() || 'Agent personnalisé',
      role: formRole.trim() || 'Assistant',
      systemPrompt: formPrompt.trim(),
      tools: formTools,
      avatar: formAvatar,
      isActive: true,
      status: 'idle',
      createdAt: new Date(),
    })
    resetForm()
    setCreateOpen(false)
  }, [formName, formDesc, formRole, formPrompt, formTools, formAvatar, addAgent, resetForm])

  const toggleTool = useCallback((tool: string) => {
    setFormTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    )
  }, [])

  const chatAgent = chatAgentId ? customAgents.find((a) => a.id === chatAgentId) : null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Agents IA</h1>
            <p className="text-sm text-muted-foreground">Créez et gérez vos agents intelligents</p>
          </div>
        </div>

        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl">
              <Plus className="w-4 h-4" />
              Nouvel Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-subtle max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                Créer un nouvel agent
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Avatar Picker */}
              <div className="space-y-2">
                <Label>Avatar</Label>
                <div className="grid grid-cols-5 gap-2">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <motion.button
                      key={emoji}
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setFormAvatar(emoji)}
                      className={`text-2xl p-2 rounded-xl text-center transition-all ${
                        formAvatar === emoji
                          ? 'bg-primary/15 ring-2 ring-primary/50'
                          : 'bg-muted/50 hover:bg-muted'
                      }`}
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="agent-name">Nom</Label>
                <Input
                  id="agent-name"
                  placeholder="Mon Agent"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="input-glow"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="agent-desc">Description</Label>
                <Textarea
                  id="agent-desc"
                  placeholder="Description courte de l'agent..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="agent-role">Rôle</Label>
                <Input
                  id="agent-role"
                  placeholder="ex: Senior Developer"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="input-glow"
                />
              </div>

              {/* System Prompt */}
              <div className="space-y-2">
                <Label htmlFor="agent-prompt">System Prompt</Label>
                <Textarea
                  id="agent-prompt"
                  placeholder="Instructions détaillées pour l'agent..."
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
              </div>

              {/* Tools Multi-Select */}
              <div className="space-y-2">
                <Label>Outils</Label>
                <div className="flex flex-wrap gap-2">
                  {TOOL_OPTIONS.map((tool) => (
                    <motion.button
                      key={tool.value}
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => toggleTool(tool.value)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        formTools.includes(tool.value)
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted/70 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {formTools.includes(tool.value) && <Check className="w-3 h-3" />}
                      {tool.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" className="rounded-xl">Annuler</Button>
              </DialogClose>
              <Button
                onClick={handleCreate}
                disabled={!formName.trim() || !formPrompt.trim()}
                className="rounded-xl gap-2"
              >
                <Bot className="w-4 h-4" />
                Créer l&apos;agent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-6 pb-4 md:pb-6">
        <AnimatePresence mode="wait">
          {chatAgent ? (
            <AgentChatView
              key={`chat-${chatAgent.id}`}
              agent={chatAgent}
              onClose={() => setChatAgentId(null)}
            />
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {customAgents.length === 0 ? (
                /* Empty State */
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                    <Bot className="w-10 h-10 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Aucun agent</h2>
                  <p className="text-muted-foreground max-w-sm mb-6">
                    Créez votre premier agent IA pour automatiser vos tâches et booster votre productivité.
                  </p>
                  <Button onClick={() => setCreateOpen(true)} className="gap-2 rounded-xl">
                    <Plus className="w-4 h-4" />
                    Créer votre premier agent
                  </Button>
                </motion.div>
              ) : (
                /* Agent Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {customAgents.map((agent, i) => (
                      <AgentCard
                        key={agent.id}
                        agent={agent}
                        index={i}
                        onChat={() => setChatAgentId(agent.id)}
                        onDelete={() => deleteAgent(agent.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ─── Agent Card ─── */
function AgentCard({
  agent,
  index,
  onChat,
  onDelete,
}: {
  agent: CustomAgent
  index: number
  onChat: () => void
  onDelete: () => void
}) {
  const statusInfo = STATUS_MAP[agent.status] || STATUS_MAP.idle

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
    >
      <Card className="glass module-card p-5 h-full flex flex-col gap-4">
        {/* Avatar + Status */}
        <div className="flex items-start justify-between">
          <div className="text-4xl">{agent.avatar}</div>
          <div className="flex items-center gap-1.5">
            <span className={`status-dot ${statusInfo.className}`} />
            <span className="text-xs text-muted-foreground">{statusInfo.label}</span>
          </div>
        </div>

        {/* Name + Role */}
        <div>
          <h3 className="font-semibold text-lg leading-tight">{agent.name}</h3>
          <Badge variant="secondary" className="mt-1.5 text-xs">
            {agent.role}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {agent.description}
        </p>

        {/* Tools */}
        {agent.tools.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {agent.tools.slice(0, 3).map((tool) => (
              <Badge key={tool} variant="outline" className="text-[10px] px-1.5 py-0">
                {tool.replace(/_/g, ' ')}
              </Badge>
            ))}
            {agent.tools.length > 3 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                +{agent.tools.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto flex items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 rounded-lg text-xs"
            onClick={onChat}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Discuter
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 rounded-lg text-xs"
          >
            <Settings className="w-3.5 h-3.5" />
            Configurer
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-lg">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-subtle">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Supprimer l&apos;agent
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir supprimer <strong>{agent.name}</strong> ? Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
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

/* ─── Agent Chat View ─── */
function AgentChatView({
  agent,
  onClose,
}: {
  agent: CustomAgent
  onClose: () => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isSending) return

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: trimmed,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsSending(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          systemPrompt: agent.systemPrompt,
        }),
      })
      const data = await res.json()
      if (data.success) {
        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now()}-resp`,
          role: 'assistant',
          content: data.message || data.content || 'Réponse reçue.',
        }
        setMessages((prev) => [...prev, assistantMsg])
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsSending(false)
    }
  }, [input, isSending, messages, agent.systemPrompt])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-[calc(100vh-200px)]"
    >
      {/* Chat Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border/50 mb-4">
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
        <div className="text-2xl">{agent.avatar}</div>
        <div>
          <h2 className="font-semibold">{agent.name}</h2>
          <p className="text-xs text-muted-foreground">{agent.role}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mb-4">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="text-5xl mb-4">{agent.avatar}</div>
            <p className="text-muted-foreground text-sm max-w-sm">
              Commencez une conversation avec <strong>{agent.name}</strong>. Utilisez son expertise en {agent.role.toLowerCase()} pour vous aider.
            </p>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <span className="text-sm">{agent.avatar}</span>
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'glass-subtle rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isSending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm">{agent.avatar}</span>
            </div>
            <div className="glass-subtle rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
              <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground/50" />
              <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground/50" />
              <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground/50" />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="glass-strong rounded-2xl p-1.5 flex items-end gap-2">
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Écrivez à ${agent.name}...`}
          rows={1}
          className="flex-1 bg-transparent resize-none border-0 focus-visible:ring-0 text-sm min-h-[40px] max-h-32 py-2.5 px-3"
          disabled={isSending}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isSending}
          size="icon"
          className="h-10 w-10 rounded-xl shrink-0"
        >
          <SendHorizontal className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  )
}