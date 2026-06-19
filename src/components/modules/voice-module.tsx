'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  StopCircle,
  Phone,
  PhoneOff,
  Brain,
  MessageSquare,
  Loader2,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

/* ─── Constants ─── */

const TTS_VOICES = [
  { id: 'tongtong', label: 'TongTong' },
  { id: 'zhitian', label: 'ZhiTian' },
  { id: 'zhiyan', label: 'ZhiYan' },
  { id: 'zhimi', label: 'ZhiMi' },
  { id: 'zhiyu', label: 'ZhiYu' },
] as const

/* ─── Helpers ─── */

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/* ─── Types ─── */

type VoiceMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type VoiceMode = 'conversation' | 'quick-note'

/* ─── Sub-components ─── */

function WaveformVisualizer({ active, barCount = 7 }: { active: boolean; barCount?: number }) {
  const bars = Array.from({ length: barCount }, (_, i) => i)

  return (
    <div className="flex items-center justify-center gap-[3px] h-10">
      {bars.map((i) => (
        <motion.div
          key={i}
          className="w-[4px] rounded-full bg-primary"
          animate={
            active
              ? {
                  height: [8, 20 + Math.random() * 20, 8, 28 + Math.random() * 12, 8],
                }
              : { height: 6 }
          }
          transition={
            active
              ? {
                  duration: 1.2 + i * 0.1,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.08,
                }
              : { duration: 0.3 }
          }
          style={{
            height: active ? undefined : 6,
          }}
        />
      ))}
    </div>
  )
}

function SpeakingIndicator() {
  const bars = Array.from({ length: 5 }, (_, i) => i)

  return (
    <div className="flex items-center gap-1">
      <Volume2 className="h-4 w-4 text-primary" />
      <div className="flex items-center gap-[2px]">
        {bars.map((i) => (
          <motion.div
            key={i}
            className="w-[3px] rounded-full bg-primary/60"
            animate={{ height: [4, 12, 4] }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.12,
            }}
            style={{ height: 4 }}
          />
        ))}
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: VoiceMessage }) {
  const isUser = message.role === 'user'
  const isStreaming = message.content.endsWith('▊')

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -5, scale: 0.97 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`
          max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
          ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'glass text-foreground rounded-bl-md'
          }
        `}
      >
        <p className="whitespace-pre-wrap break-words">{isStreaming ? message.content.slice(0, -1) : message.content}</p>
        {isStreaming && (
          <motion.span
            className="inline-block w-2 h-4 bg-current/70 ml-0.5 align-middle"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>
    </motion.div>
  )
}

/* ─── Main Component ─── */

export default function VoiceModule() {
  /* ── State ── */
  const [mode, setMode] = useState<VoiceMode>('conversation')
  const [isRecording, setIsRecording] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [messages, setMessages] = useState<VoiceMessage[]>([])
  const [audioLevel, setAudioLevel] = useState(0)
  const [selectedVoice, setSelectedVoice] = useState(TTS_VOICES[0].id)
  const [isMuted, setIsMuted] = useState(false)
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const [quickNoteText, setQuickNoteText] = useState('')
  const [quickNoteCopied, setQuickNoteCopied] = useState(false)
  const [isConversationActive, setIsConversationActive] = useState(false)

  /* ── Refs ── */
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  /* ── Auto-scroll to bottom ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause()
        audioElementRef.current.src = ''
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  /* ── Request microphone permission ── */
  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
      setMicPermission('granted')
      return true
    } catch {
      setMicPermission('denied')
      toast.error('Accès au microphone refusé. Veuillez autoriser le microphone dans les paramètres de votre navigateur.')
      return false
    }
  }, [])

  /* ── Start recording ── */
  const startRecording = useCallback(async () => {
    const hasPermission = micPermission === 'granted' ? true : await requestMicPermission()
    if (!hasPermission) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      streamRef.current = stream

      const recorder = new MediaRecorder(stream, { mimeType: getSupportedMimeType() })
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      recorder.start(250)
      setIsRecording(true)
      setIsListening(true)

      // Simulate audio level for visual feedback
      const levelInterval = setInterval(() => {
        if (recorder.state === 'recording') {
          setAudioLevel(0.3 + Math.random() * 0.7)
        } else {
          clearInterval(levelInterval)
        }
      }, 100)
    } catch {
      toast.error('Impossible d\'accéder au microphone.')
      setMicPermission('denied')
    }
  }, [micPermission, requestMicPermission])

  /* ── Stop recording & process ── */
  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return

    const recorder = mediaRecorderRef.current
    const stream = streamRef.current

    setIsRecording(false)
    setIsListening(false)
    setAudioLevel(0)

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        // Clean up stream
        stream?.getTracks().forEach((t) => t.stop())
        streamRef.current = null

        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (blob.size === 0) {
          resolve()
          return
        }

        try {
          const base64 = await blobToBase64(blob)
          const audioData = base64.includes(',') ? base64.split(',')[1] : base64

          // ASR
          const asrRes = await fetch('/api/asr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio: audioData }),
          })

          if (!asrRes.ok) throw new Error('Erreur de transcription')
          const { text: transcribed } = await asrRes.json()

          if (!transcribed?.trim()) {
            toast.info('Aucune parole détectée. Réessayez.')
            resolve()
            return
          }

          if (mode === 'quick-note') {
            setQuickNoteText(transcribed)
            resolve()
            return
          }

          // Add user message
          const userMsg: VoiceMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: transcribed,
          }
          setMessages((prev) => [...prev, userMsg])

          // LLM Chat (streaming)
          const chatMessages = [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user' as const, content: transcribed },
          ]

          setIsProcessing(true)
          const assistantId = crypto.randomUUID()
          setMessages((prev) => [
            ...prev,
            { id: assistantId, role: 'assistant', content: '▊' },
          ])

          const abort = new AbortController()
          abortControllerRef.current = abort

          try {
            const chatRes = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: chatMessages, stream: true }),
              signal: abort.signal,
            })

            if (!chatRes.ok) throw new Error('Erreur de réponse IA')

            const reader = chatRes.body!.getReader()
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
                const trimmed = line.trim()
                if (trimmed.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(trimmed.slice(6))
                    if (data.type === 'chunk' && data.content) {
                      fullContent += data.content
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === assistantId
                            ? { ...m, content: fullContent + '▊' }
                            : m
                        )
                      )
                    }
                    if (data.type === 'done') {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === assistantId
                            ? { ...m, content: fullContent }
                            : m
                        )
                      )
                    }
                  } catch {
                    // skip malformed JSON
                  }
                }
              }
            }

            // Finalize content (in case done event was missed)
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: fullContent || 'Aucune réponse.' } : m
              )
            )

            setIsProcessing(false)

            // TTS
            if (fullContent && !isMuted) {
              setIsSpeaking(true)
              try {
                const ttsRes = await fetch('/api/tts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ text: fullContent, voice: selectedVoice }),
                })

                if (ttsRes.ok) {
                  const { audio } = await ttsRes.json()
                  const audioSrc = `data:audio/wav;base64,${audio}`

                  if (audioElementRef.current) {
                    audioElementRef.current.pause()
                  }

                  const audioEl = new Audio(audioSrc)
                  audioElementRef.current = audioEl

                  audioEl.onended = () => {
                    setIsSpeaking(false)
                    audioElementRef.current = null
                  }
                  audioEl.onerror = () => {
                    setIsSpeaking(false)
                    audioElementRef.current = null
                  }

                  await audioEl.play()
                } else {
                  setIsSpeaking(false)
                }
              } catch {
                setIsSpeaking(false)
              }
            }
          } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
              // User cancelled, fine
            } else {
              toast.error('Erreur lors de la communication avec l\'IA.')
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: 'Erreur de réponse. Veuillez réessayer.' }
                    : m
                )
              )
            }
            setIsProcessing(false)
          } finally {
            abortControllerRef.current = null
          }
        } catch {
          if (mode !== 'quick-note') {
            toast.error('Erreur lors du traitement audio.')
          }
        }

        resolve()
      }

      recorder.stop()
    })
  }, [messages, mode, selectedVoice, isMuted])

  /* ── Toggle recording (click-based for conversation, tap-based for quick note) ── */
  const handleMicToggle = useCallback(async () => {
    if (isProcessing || isSpeaking) return

    if (isRecording) {
      await stopRecording()
    } else {
      await startRecording()
    }
  }, [isRecording, isProcessing, isSpeaking, startRecording, stopRecording])

  /* ── Stop speaking ── */
  const stopSpeaking = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current.currentTime = 0
      audioElementRef.current = null
    }
    setIsSpeaking(false)
  }, [])

  /* ── End conversation ── */
  const endConversation = useCallback(() => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setIsRecording(false)
      setIsListening(false)
      setAudioLevel(0)
    }
    stopSpeaking()
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setMessages([])
    setIsConversationActive(false)
    setIsProcessing(false)
    toast.success('Conversation vocale terminée.')
  }, [stopSpeaking])

  /* ── Copy quick note ── */
  const copyQuickNote = useCallback(() => {
    if (!quickNoteText) return
    navigator.clipboard.writeText(quickNoteText).then(() => {
      setQuickNoteCopied(true)
      toast.success('Texte copié !')
      setTimeout(() => setQuickNoteCopied(false), 2000)
    })
  }, [quickNoteText])

  /* ── Status text ── */
  const getStatusText = () => {
    if (micPermission === 'denied') return 'Micro bloqué'
    if (isRecording) return 'Enregistrement…'
    if (isProcessing) return 'Réflexion IA…'
    if (isSpeaking) return 'Lecture vocale…'
    if (messages.length > 0) return 'En conversation'
    return mode === 'conversation' ? 'Prêt' : 'Note rapide'
  }

  const getStatusColor = () => {
    if (micPermission === 'denied') return 'error'
    if (isRecording) return 'active'
    if (isProcessing || isSpeaking) return 'idle'
    if (messages.length > 0) return 'active'
    return 'idle'
  }

  /* ── Helper: supported mime type ── */
  function getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ]
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t
    }
    return ''
  }

  /* ── Render ── */
  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden rounded-xl">
      {/* ── Header ── */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 glass-strong border-b border-border/50 shrink-0"
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Brain className="h-5 w-5 text-primary" />
          </motion.div>
          <div>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight">Mode Vocal</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`status-dot ${getStatusColor()}`} />
              <span className="text-xs text-muted-foreground">{getStatusText()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex items-center glass-subtle rounded-lg p-0.5">
            <button
              onClick={() => {
                if (isConversationActive) {
                  toast.info('Terminez la conversation avant de changer de mode.')
                  return
                }
                setMode('conversation')
              }}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                ${mode === 'conversation' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}
              `}
            >
              <Phone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Conversation</span>
            </button>
            <button
              onClick={() => {
                if (isConversationActive) {
                  toast.info('Terminez la conversation avant de changer de mode.')
                  return
                }
                setMode('quick-note')
              }}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                ${mode === 'quick-note' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}
              `}
            >
              <Mic className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Note</span>
            </button>
          </div>
        </div>
      </motion.header>

      {/* ── Settings Bar ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between px-4 py-2 sm:px-6 border-b border-border/30 shrink-0"
      >
        <div className="flex items-center gap-2">
          <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="text-xs bg-transparent border-none outline-none text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            disabled={isSpeaking}
          >
            {TTS_VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <Badge variant="outline" className="text-[10px] font-normal px-2 py-0.5">
          🇫🇷 Français
        </Badge>
      </motion.div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {mode === 'conversation' ? (
          /* ─── Conversation Mode ─── */
          <>
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-4 space-y-3">
              {messages.length === 0 && !isRecording && !isProcessing ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col items-center justify-center h-full text-center px-4"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full glass flex items-center justify-center mb-4">
                    <MessageSquare className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground/60" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground/80 mb-1">
                    Conversation vocale
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                    Appuyez sur le microphone pour commencer. Parlez naturellement, puis relâchez pour envoyer.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                    {['Bonjour', 'Explique-moi', 'Aide-moi'].map((hint) => (
                      <Badge
                        key={hint}
                        variant="secondary"
                        className="text-[10px] font-normal cursor-default"
                      >
                        {hint}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                </AnimatePresence>
              )}

              {/* Speaking indicator */}
              <AnimatePresence>
                {isSpeaking && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 px-4 py-2 glass rounded-xl w-fit"
                  >
                    <SpeakingIndicator />
                    <span className="text-xs text-muted-foreground ml-1">IA parle…</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Processing indicator */}
              <AnimatePresence>
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 px-4 py-2 glass rounded-xl w-fit"
                  >
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground">IA réfléchit…</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Controls */}
            <div className="shrink-0 border-t border-border/30 px-4 sm:px-6 py-4 glass-subtle">
              {/* Waveform */}
              <AnimatePresence>
                {isRecording && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex justify-center mb-4 overflow-hidden"
                  >
                    <WaveformVisualizer active={isRecording} barCount={7} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Controls row */}
              <div className="flex items-center justify-center gap-4">
                {/* Volume toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (isSpeaking) stopSpeaking()
                    setIsMuted((m) => !m)
                  }}
                  className="h-10 w-10 rounded-full"
                  aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>

                {/* Main mic button */}
                <motion.div
                  className="relative"
                  whileTap={{ scale: 0.92 }}
                >
                  {/* Pulse ring when recording */}
                  <AnimatePresence>
                    {isRecording && (
                      <motion.div
                        initial={{ scale: 1, opacity: 0.6 }}
                        animate={{ scale: 1.6, opacity: 0 }}
                        exit={{ scale: 1, opacity: 0 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                        className="absolute inset-0 rounded-full bg-red-500/30"
                      />
                    )}
                    <AnimatePresence>
                      {isRecording && (
                        <motion.div
                          initial={{ scale: 1, opacity: 0.4 }}
                          animate={{ scale: 1.35, opacity: 0 }}
                          exit={{ scale: 1, opacity: 0 }}
                          transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            ease: 'easeOut',
                            delay: 0.4,
                          }}
                          className="absolute inset-0 rounded-full bg-red-500/20"
                        />
                      )}
                    </AnimatePresence>
                  </AnimatePresence>

                  <Button
                    onClick={handleMicToggle}
                    disabled={isProcessing || isSpeaking || micPermission === 'denied'}
                    className={`
                      relative z-10 h-16 w-16 sm:h-20 sm:w-20 rounded-full shadow-lg
                      transition-all duration-200
                      ${
                        isRecording
                          ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/25'
                          : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/25'
                      }
                      disabled:opacity-40 disabled:cursor-not-allowed
                    `}
                    aria-label={isRecording ? 'Arrêter l\'enregistrement' : 'Commencer à parler'}
                  >
                    <AnimatePresence mode="wait">
                      {isRecording ? (
                        <motion.div
                          key="stop"
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 90 }}
                          transition={{ duration: 0.15 }}
                        >
                          <StopCircle className="h-7 w-7 sm:h-8 sm:w-8" />
                        </motion.div>
                      ) : micPermission === 'denied' ? (
                        <motion.div
                          key="denied"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <MicOff className="h-7 w-7 sm:h-8 sm:w-8" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="mic"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Mic className="h-7 w-7 sm:h-8 sm:w-8" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>

                {/* End conversation button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={endConversation}
                  disabled={!isConversationActive && messages.length === 0 && !isRecording}
                  className="h-10 w-10 rounded-full text-muted-foreground hover:text-destructive"
                  aria-label="Terminer la conversation"
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </div>

              {/* Helper text */}
              <p className="text-center text-[10px] text-muted-foreground/70 mt-3">
                {isRecording
                  ? 'Appuyez pour arrêter l\'enregistrement'
                  : 'Appuyez pour parler'}
              </p>
            </div>
          </>
        ) : (
          /* ─── Quick Note Mode ─── */
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
            {/* Waveform */}
            <AnimatePresence>
              {isRecording && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6"
                >
                  <WaveformVisualizer active={isRecording} barCount={5} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mic button */}
            <motion.div className="relative mb-6" whileTap={{ scale: 0.92 }}>
              <AnimatePresence>
                {isRecording && (
                  <motion.div
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    exit={{ scale: 1, opacity: 0 }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-red-500/20"
                  />
                )}
              </AnimatePresence>
              <Button
                onClick={handleMicToggle}
                disabled={isProcessing || micPermission === 'denied'}
                className={`
                  relative z-10 h-20 w-20 rounded-full shadow-lg transition-all duration-200
                  ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/25'
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/25'
                  }
                `}
                aria-label={isRecording ? 'Arrêter' : 'Enregistrer une note'}
              >
                <AnimatePresence mode="wait">
                  {isRecording ? (
                    <motion.div
                      key="stop"
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 90 }}
                    >
                      <StopCircle className="h-9 w-9" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="mic"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Mic className="h-9 w-9" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>

            <p className="text-xs text-muted-foreground mb-6">
              {isRecording ? 'Enregistrement en cours…' : 'Appuyez pour enregistrer une note vocale'}
            </p>

            {/* Quick note result */}
            <AnimatePresence>
              {quickNoteText && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="w-full max-w-md"
                >
                  <Card className="glass-strong">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Note vocale
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copyQuickNote}
                          className="h-7 px-2 text-xs gap-1"
                        >
                          {quickNoteCopied ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-500" />
                              <span className="text-emerald-500">Copié</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copier</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                        {quickNoteText}
                      </p>
                      <div className="flex justify-end mt-3 pt-2 border-t border-border/30">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setQuickNoteText('')}
                          className="h-7 px-3 text-xs text-muted-foreground"
                        >
                          Nouvelle note
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Permission denied message */}
            <AnimatePresence>
              {micPermission === 'denied' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 mt-4 max-w-sm text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-destructive">
                      Accès au microphone refusé
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Autorisez l&apos;accès au microphone dans les paramètres de votre navigateur, puis rechargez la page.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMicPermission('prompt')}
                    className="mt-1 text-xs"
                  >
                    Réessayer
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}