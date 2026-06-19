'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Plus,
  SendHorizontal,
  Square,
  Trash2,
  MessageSquare,
  Sparkles,
  Atom,
  Rocket,
  Code2,
  ClipboardList,
  Copy,
  Check,
  User,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
  Volume2,
  Mic,
  MicOff,
  ImageIcon as ImageIconLucide,
  X,
  Loader2,
  Paperclip,
  Zap,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useWorkspaceStore, type Message, type Conversation, fetchConversationsFromDB } from '@/store/workspace-store'

/* ─── Suggestion data ─── */
const SUGGESTIONS = [
  {
    text: 'Expliquez-moi la quantique',
    icon: Atom,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
  {
    text: 'Écrivez un poème sur l\'espace',
    icon: Rocket,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    text: 'Aidez-moi avec du code Python',
    icon: Code2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    text: 'Créez un plan de projet',
    icon: ClipboardList,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
  },
]

/* ─── Relative time helper ─── */
function relativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'À l\'instant'
  if (minutes < 60) return `Il y a ${minutes} min`
  if (hours < 24) return `Il y a ${hours}h`
  if (days < 7) return `Il y a ${days}j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

/* ─── Copy Button for code blocks ─── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }, [text])

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2.5 right-2.5 p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors text-muted-foreground hover:text-foreground"
      aria-label="Copier le code"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  )
}

/* ─── Code block renderer ─── */
function CodeBlock({
  language,
  children,
}: {
  language: string
  children: string
}) {
  const codeStr = String(children).replace(/\n$/, '')

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden">
      {/* Language label */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e2e] text-xs text-muted-foreground border-b border-white/5">
        <span className="font-mono">{language || 'code'}</span>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: '#1e1e2e',
          fontSize: '0.85rem',
          lineHeight: '1.6',
        }}
        showLineNumbers={codeStr.split('\n').length > 3}
        lineNumberStyle={{ color: '#4a4a6a', minWidth: '2.5em' }}
      >
        {codeStr}
      </SyntaxHighlighter>
      <CopyButton text={codeStr} />
    </div>
  )
}

/* ─── TTS Play Button ─── */
function TTSButton({ text }: { text: string }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handlePlay = useCallback(async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setIsPlaying(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.substring(0, 1000), voice: 'tongtong', speed: 1.0 }),
      })
      const data = await res.json()
      if (data.success && data.audio) {
        const byteChars = atob(data.audio)
        const byteArray = new Uint8Array(byteChars.length)
        for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i)
        const blob = new Blob([byteArray], { type: 'audio/wav' })
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => { setIsPlaying(false); URL.revokeObjectURL(url) }
        audio.play()
        setIsPlaying(true)
      } else {
        toast.error('Erreur de synthèse vocale')
      }
    } catch {
      toast.error('Erreur de synthèse vocale')
    } finally {
      setIsLoading(false)
    }
  }, [text, isPlaying])

  return (
    <button
      onClick={handlePlay}
      disabled={isLoading}
      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-40"
      aria-label={isPlaying ? 'Arrêter' : 'Écouter'}
      title="Synthèse vocale"
    >
      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isPlaying ? <Square className="w-3.5 h-3.5" fill="currentColor" /> : <Volume2 className="w-3.5 h-3.5" />}
    </button>
  )
}

/* ─── Message Bubble ─── */
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const timeStr = message.createdAt.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5 ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-card border border-border text-foreground'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      {/* Content */}
      <div
        className={`max-w-[80%] ${
          isUser ? 'items-end' : 'items-start'
        } flex flex-col gap-1`}
      >
        {/* Role label + time + TTS */}
        <div
          className={`flex items-center gap-2 text-xs text-muted-foreground ${
            isUser ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          <span className="font-medium">
            {isUser ? 'Vous' : 'NexusAI'}
          </span>
          <span>{timeStr}</span>
          {!isUser && message.content.length > 10 && <TTSButton text={message.content} />}
        </div>

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-md'
              : 'bg-card border border-border glass-subtle rounded-tl-md'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose-ai">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const isInline = !match && !String(children).includes('\n')
                    if (isInline) {
                      return (
                        <code
                          className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
                          {...props}
                        >
                          {children}
                        </code>
                      )
                    }
                    return (
                      <CodeBlock language={match?.[1] || 'text'}>
                        {String(children).replace(/\n$/, '')}
                      </CodeBlock>
                    )
                  },
                  p({ children }) {
                    return <p className="mb-3 last:mb-0 leading-7">{children}</p>
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Typing Indicator ─── */
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex gap-3"
    >
      <div className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-card border border-border text-foreground">
        <Bot className="w-4 h-4" />
      </div>
      <div className="bg-card border border-border glass-subtle rounded-2xl rounded-tl-md px-5 py-4 flex items-center gap-1.5">
        <span className="typing-dot w-2 h-2 rounded-full bg-primary/70 inline-block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-primary/70 inline-block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-primary/70 inline-block" />
      </div>
    </motion.div>
  )
}

/* ─── Welcome Screen ─── */
function WelcomeScreen({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="relative mb-8"
      >
        <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center glow-sm">
          <Sparkles className="w-12 h-12 text-primary" />
        </div>
        <motion.div
          className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-[10px] text-white font-bold">AI</span>
        </motion.div>
      </motion.div>

      {/* Heading */}
      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-center"
      >
        Comment puis-je vous aider ?
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-muted-foreground text-base md:text-lg mb-12 text-center max-w-md"
      >
        NexusAI est prêt à répondre à toutes vos questions
      </motion.p>

      {/* Suggestion Grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg"
      >
        {SUGGESTIONS.map((suggestion, i) => (
          <motion.button
            key={suggestion.text}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.08 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSuggestionClick(suggestion.text)}
            className="glass module-card rounded-2xl p-4 text-left group transition-gpu cursor-pointer"
          >
            <div
              className={`w-10 h-10 rounded-xl ${suggestion.bg} flex items-center justify-center mb-3`}
            >
              <suggestion.icon className={`w-5 h-5 ${suggestion.color}`} />
            </div>
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {suggestion.text}
            </p>
          </motion.button>
        ))}
      </motion.div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   ─── MAIN CHAT MODULE ───
   ═══════════════════════════════════════════════════════ */
export default function ChatModule() {
  const [input, setInput] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [attachedImage, setAttachedImage] = useState<string | null>(null)
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const dbLoadedRef = useRef(false)
  const [chatMode, setChatMode] = useState<'chat' | 'agent' | 'orchestrator' | 'skill'>('chat')
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [fileAttachments, setFileAttachments] = useState<Array<{name: string; type: string; content: string}>>([])
  const [agentSteps, setAgentSteps] = useState<Array<{thought: string; tool: string | null; result: string}>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Store selectors
  const conversations = useWorkspaceStore((s) => s.conversations)
  const activeConversationId = useWorkspaceStore((s) => s.activeConversationId)
  const isGenerating = useWorkspaceStore((s) => s.isGenerating)
  const createConversation = useWorkspaceStore((s) => s.createConversation)
  const setActiveConversation = useWorkspaceStore((s) => s.setActiveConversation)
  const addMessage = useWorkspaceStore((s) => s.addMessage)
  const updateConversationTitle = useWorkspaceStore((s) => s.updateConversationTitle)
  const deleteConversation = useWorkspaceStore((s) => s.deleteConversation)
  const setIsGenerating = useWorkspaceStore((s) => s.setIsGenerating)

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  )
  const messages = activeConversation?.messages || []

  // Load conversations from DB on mount
  useEffect(() => {
    if (dbLoadedRef.current) return
    dbLoadedRef.current = true
    fetchConversationsFromDB().then((dbConvs) => {
      if (dbConvs.length > 0) {
        useWorkspaceStore.setState({ conversations: dbConvs })
      }
    })
  }, [])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isGenerating, isStreaming])

  // ─── Mic recording (ASR) ───
  const toggleRecording = useCallback(async () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1]
          try {
            const res = await fetch('/api/asr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64 }),
            })
            const data = await res.json()
            if (data.success && data.text) {
              setInput((prev) => (prev ? prev + ' ' + data.text : data.text))
              toast.success('Audio transcrit')
            } else {
              toast.error('Transcription échouée')
            }
          } catch {
            toast.error('Erreur de transcription')
          }
        }
        reader.readAsDataURL(blob)
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
      toast.info('Enregistrement en cours...')
    } catch {
      toast.error('Micro non disponible')
    }
  }, [isRecording])

  // ─── Image upload for VLM ───
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setAttachedImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleRemoveImage = useCallback(() => {
    setAttachedImage(null)
  }, [])

  const handleAnalyzeImage = useCallback(async () => {
    if (!attachedImage) return
    const store = useWorkspaceStore.getState()
    let convId = store.activeConversationId
    if (!convId) convId = store.createConversation()

    const question = input.trim() || 'Décrivez cette image en détail'
    store.addMessage(convId, {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: `[Image jointe] ${question}`,
      createdAt: new Date(),
    })
    setInput('')
    setAttachedImage(null)
    store.setIsGenerating(true)
    setIsAnalyzingImage(true)

    try {
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: attachedImage, question }),
      })
      const data = await res.json()
      if (data.success) {
        store.addMessage(convId, {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content: data.analysis,
          createdAt: new Date(),
        })
      } else {
        toast.error(data.error || "Erreur d'analyse d'image")
      }
    } catch {
      toast.error("Erreur d'analyse d'image")
    } finally {
      store.setIsGenerating(false)
      setIsAnalyzingImage(false)
    }
  }, [attachedImage, input])

  const updateLastMessage = useCallback((content: string) => {
    if (!activeConversationId) return
    useWorkspaceStore.setState((s) => ({
      conversations: s.conversations.map(c =>
        c.id === activeConversationId
          ? {
              ...c,
              messages: c.messages.map((m, i) =>
                i === c.messages.length - 1 && m.role === 'assistant'
                  ? { ...m, content }
                  : m
              ),
            }
          : c
      ),
    }))
  }, [activeConversationId])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} dépasse 10 MB`)
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1] || ''
        setFileAttachments(prev => [...prev, {
          name: file.name,
          type: file.type,
          content: base64,
        }])
      }
      reader.readAsDataURL(file)
    })

    // Reset input
    e.target.value = ''
  }, [])

  // ─── Send message logic ───
  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim()
      if (!trimmed || isGenerating || isStreaming) return

      const store = useWorkspaceStore.getState()
      let convId = store.activeConversationId
      if (!convId) {
        convId = store.createConversation()
      }

      // Add user message locally
      const userMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: trimmed,
        createdAt: new Date(),
      }
      store.addMessage(convId, userMsg)

      // Update title from first message
      const conv = store.conversations.find((c) => c.id === convId)
      if (conv && conv.messages.length === 0) {
        store.updateConversationTitle(
          convId,
          trimmed.slice(0, 50) + (trimmed.length > 50 ? '...' : '')
        )
      }

      setInput('')
      setFileAttachments([])
      setAgentSteps([])
      store.setIsGenerating(true)
      setIsStreaming(true)

      // Add placeholder assistant message for streaming
      store.addMessage(convId, {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: '',
        createdAt: new Date(),
      })

      try {
        const currentConv = store.conversations.find((c) => c.id === convId)
        const messagesToSend = (currentConv?.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messagesToSend,
            mode: chatMode,
            skillId: selectedSkillId,
            conversationId: convId,
            fileAttachments: fileAttachments.length > 0 ? fileAttachments : undefined,
          }),
        })

        if (!response.ok) {
          throw new Error(`Erreur ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('Pas de réponse stream')

        const decoder = new TextDecoder()
        let fullContent = ''
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.trim()) continue
            if (line.startsWith('event: ')) {
              const eventType = line.slice(7).trim()
              continue
            }
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6)
              try {
                const data = JSON.parse(dataStr)

                if (data.content) {
                  fullContent += data.content
                  updateLastMessage(fullContent)
                }
                if (data.thought !== undefined) {
                  setAgentSteps(prev => [...prev, { thought: data.thought, tool: data.tool, result: data.result || 'Executing...' }])
                }
                if (data.tool_result !== undefined) {
                  setAgentSteps(prev => {
                    const updated = [...prev]
                    if (updated.length > 0) {
                      updated[updated.length - 1] = { ...updated[updated.length - 1], result: data.tool_result.data || data.tool_result }
                    }
                    return updated
                  })
                }
                if (data.conversationId) {
                  // Update conversation ID if new
                }
                if (data.error) {
                  toast.error(data.error)
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }

        // If no content was streamed, show error
        if (!fullContent) {
          updateLastMessage('Désolé, aucune réponse n\'a été reçue. Veuillez réessayer.')
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Impossible de se connecter au serveur')
        updateLastMessage('Désolé, une erreur est survenue. Veuillez réessayer.')
      } finally {
        store.setIsGenerating(false)
        setIsStreaming(false)
        textareaRef.current?.focus()
      }
    },
    [isGenerating, isStreaming, chatMode, selectedSkillId, fileAttachments, updateLastMessage]
  )

  // ─── Keyboard handler ───
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage(input)
      }
    },
    [input, sendMessage]
  )

  // ─── New conversation ───
  const handleNewConversation = useCallback(async () => {
    try {
      const res = await fetch('/api/chat', { method: 'PUT' })
      const data = await res.json()
      if (data.success && data.conversation) {
        const dbConv = data.conversation
        const conv: Conversation = {
          id: dbConv.id,
          title: dbConv.title || 'Nouvelle conversation',
          model: dbConv.model || 'default',
          messages: [],
          createdAt: new Date(dbConv.createdAt),
        }
        const store = useWorkspaceStore.getState()
        useWorkspaceStore.setState({
          conversations: [conv, ...store.conversations],
          activeConversationId: conv.id,
          activeModule: 'chat',
        })
      } else {
        // Fallback to local-only creation
        createConversation()
      }
    } catch {
      // Fallback to local-only creation
      createConversation()
    }
    setInput('')
    textareaRef.current?.focus()
  }, [createConversation])

  // ─── Delete conversation ───
  const handleDeleteConversation = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation()
      // Optimistic delete from store
      deleteConversation(id)
      try {
        await fetch('/api/chat', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        })
      } catch {
        toast.error('Impossible de supprimer la conversation')
      }
    },
    [deleteConversation]
  )

  // ─── Suggestion click ───
  const handleSuggestionClick = useCallback(
    (text: string) => {
      sendMessage(text)
    },
    [sendMessage]
  )

  return (
    <div className="flex h-full">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* ─── Left Panel: Conversation History ─── */}
        <AnimatePresence mode="wait">
          {!sidebarCollapsed && (
            <ResizablePanel
              key="left-panel"
              defaultSize={22}
              minSize={18}
              maxSize={30}
              className="transition-gpu"
            >
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col border-r border-border/50 bg-card/30"
              >
                {/* New conversation button */}
                <div className="p-3">
                  <Button
                    onClick={handleNewConversation}
                    className="w-full justify-start gap-2 rounded-xl h-10"
                  >
                    <Plus className="w-4 h-4" />
                    Nouvelle conversation
                  </Button>
                </div>

                {/* Conversation list */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
                  {conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                      <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground/60">
                        Aucune conversation
                      </p>
                      <p className="text-xs text-muted-foreground/40 mt-1">
                        Commencez par envoyer un message
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {conversations.map((conv, i) => (
                        <motion.div
                          key={conv.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                        >
                          <div
                            className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                              conv.id === activeConversationId
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                            }`}
                            onClick={() => setActiveConversation(conv.id)}
                          >
                            {/* Active indicator */}
                            {conv.id === activeConversationId && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-primary rounded-r-full" />
                            )}

                            <MessageSquare className="w-4 h-4 shrink-0 opacity-60" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {conv.title}
                              </p>
                              <p className="text-[11px] opacity-50 truncate">
                                {relativeTime(conv.createdAt)}
                              </p>
                            </div>

                            {/* Delete button on hover */}
                            <button
                              onClick={(e) => handleDeleteConversation(conv.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/10 hover:text-destructive transition-all"
                              aria-label="Supprimer la conversation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </ResizablePanel>
          )}
        </AnimatePresence>

        {/* Resize handle */}
        {!sidebarCollapsed && (
          <ResizableHandle withHandle className="bg-border/30 hover:bg-border/60 transition-colors" />
        )}

        {/* ─── Right Panel: Chat Area ─── */}
        <ResizablePanel defaultSize={78} minSize={50}>
          <div className="h-full flex flex-col relative">
            {/* Collapse/expand toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="absolute top-3 left-3 z-10 p-2 rounded-lg bg-card/50 border border-border/50 hover:bg-accent transition-colors backdrop-blur-sm"
              aria-label={sidebarCollapsed ? 'Ouvrir le panneau' : 'Fermer le panneau'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>

            {!activeConversationId ? (
              /* ─── Welcome Screen ─── */
              <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
            ) : (
              <>
                {/* ─── Mode Selector ─── */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-muted/30">
                  <div className="flex items-center gap-1">
                    {[
                      { mode: 'chat' as const, label: 'Chat', icon: MessageSquare },
                      { mode: 'agent' as const, label: 'Agent', icon: Bot },
                      { mode: 'orchestrator' as const, label: 'Orchestrateur', icon: Users },
                      { mode: 'skill' as const, label: 'Skill', icon: Sparkles },
                    ].map(({ mode, label, icon: Icon }) => (
                      <button
                        key={mode}
                        onClick={() => setChatMode(mode)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          chatMode === mode
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ─── Messages Area ─── */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 py-6 space-y-6">
                  <AnimatePresence mode="popLayout">
                    {messages.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} />
                    ))}
                  </AnimatePresence>

                  {/* Agent Steps */}
                  {chatMode === 'agent' && agentSteps.length > 0 && (
                    <div className="px-4 pb-2 space-y-2">
                      {agentSteps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs animate-in fade-in slide-in-from-bottom-1">
                          <Zap className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
                          <div className="min-w-0">
                            {step.thought && (
                              <p className="text-muted-foreground italic">{step.thought}</p>
                            )}
                            {step.tool && (
                              <p className="font-medium text-foreground">
                                Outil: <span className="text-primary">{step.tool}</span>
                              </p>
                            )}
                            {step.result && step.result !== 'Executing...' && (
                              <p className="text-muted-foreground mt-0.5 line-clamp-2">{step.result.substring(0, 200)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Typing indicator */}
                  <AnimatePresence>
                    {isGenerating && <TypingIndicator />}
                  </AnimatePresence>

                  <div ref={messagesEndRef} />
                </div>

                {/* ─── Input Area ─── */}
                <div className="p-4 md:px-8 md:pb-6">
                  <div className="glass-subtle rounded-2xl p-2 transition-all focus-within:ring-2 focus-within:ring-primary/30 focus-within:glow-sm max-w-3xl mx-auto">
                    {fileAttachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 px-4 pb-2">
                        {fileAttachments.map((file, i) => (
                          <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-md text-xs">
                            <Paperclip className="h-3 w-3" />
                            <span className="max-w-[150px] truncate">{file.name}</span>
                            <button
                              onClick={() => setFileAttachments(prev => prev.filter((_, j) => j !== i))}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Envoyez un message..."
                      rows={1}
                      disabled={isGenerating || isStreaming}
                      className="w-full bg-transparent resize-none text-sm md:text-base placeholder:text-muted-foreground/50 outline-none px-3 py-2.5 max-h-40 min-h-[40px] custom-scrollbar"
                      style={{
                        height: 'auto',
                        overflow: input.split('\n').length > 4 ? 'auto' : 'hidden',
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement
                        target.style.height = 'auto'
                        target.style.height = `${Math.min(target.scrollHeight, 160)}px`
                        target.style.overflow =
                          target.scrollHeight > 160 ? 'auto' : 'hidden'
                      }}
                    />
                    <div className="flex items-center justify-between px-2 pb-1">
                      <div className="flex items-center gap-1">
                        {/* Attached image preview */}
                        {attachedImage && (
                          <div className="relative group">
                            <img src={attachedImage} alt="Image jointe" className="w-8 h-8 rounded-lg object-cover border border-border" />
                            <button onClick={handleRemoveImage} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                        <input type="file" accept="image/*" className="hidden" id="chat-image-upload" onChange={handleImageUpload} />
                        <button
                          onClick={() => document.getElementById('chat-image-upload')?.click()}
                          className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                          title="Joindre une image"
                          aria-label="Joindre une image"
                        >
                          <ImageIconLucide className="w-4 h-4" />
                        </button>
                        <button
                          onClick={toggleRecording}
                          className={`p-1.5 rounded-lg transition-colors ${isRecording ? 'text-red-500 hover:bg-red-500/10' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                          title={isRecording ? 'Arrêter l\'enregistrement' : 'Enregistrer l\'audio'}
                          aria-label={isRecording ? 'Arrêter' : 'Micro'}
                        >
                          {isRecording ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Joindre un fichier"
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          onChange={handleFileSelect}
                          multiple
                          accept=".pdf,.docx,.xlsx,.pptx,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.gif,.webp,.mp3,.wav,.mp4,.ts,.tsx,.js,.jsx,.py,.java,.go,.rs"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground/40 hidden sm:inline">
                          <kbd className="px-1.5 py-0.5 rounded bg-muted/50 text-[10px] font-mono">Enter</kbd> envoyer
                        </span>
                        {attachedImage ? (
                          <Button
                            size="sm"
                            disabled={isAnalyzingImage}
                            className="rounded-xl h-9 gap-1.5"
                            onClick={handleAnalyzeImage}
                          >
                            {isAnalyzingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIconLucide className="w-4 h-4" />}
                            Analyser
                          </Button>
                        ) : (isGenerating || isStreaming) ? (
                          <Button size="icon" variant="destructive" className="rounded-xl h-9 w-9" onClick={() => { setIsGenerating(false); setIsStreaming(false) }} aria-label="Arrêter">
                            <Square className="w-4 h-4" fill="currentColor" />
                          </Button>
                        ) : (
                          <Button size="icon" disabled={!input.trim()} className="rounded-xl h-9 w-9" onClick={() => sendMessage(input)} aria-label="Envoyer">
                            <SendHorizontal className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-[11px] text-muted-foreground/30 mt-3">
                    NexusAI peut faire des erreurs. Vérifiez les informations importantes.
                  </p>
                </div>
              </>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}