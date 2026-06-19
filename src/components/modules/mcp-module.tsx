'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Trash2,
  Plug,
  Unplug,
  Play,
  X,
  Loader2,
  ChevronRight,
  FolderOpen,
  Search,
  Code,
  Info,
  RotateCcw,
  Server,
  Clock,
  Zap,
  Terminal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useIsMobile } from '@/hooks/use-mobile'
import { toast } from 'sonner'

/* ─── Types ─── */

interface McpConnection {
  id: string
  name: string
  serverType: string
  status: string
  toolCount: number
  createdAt: string
  updatedAt: string
}

interface ToolDef {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, { type: string; description: string }>
    required?: string[]
  }
}

interface AvailableServer {
  type: string
  name: string
  icon: string
  description: string
  toolCount: number
}

interface LogEntry {
  id: string
  type: 'request' | 'response' | 'error'
  toolName: string
  serverIcon: string
  serverName: string
  params?: Record<string, unknown>
  result?: unknown
  durationMs?: number
  timestamp: Date
}

/* ─── Icons map ─── */

const SERVER_ICON_MAP: Record<string, React.ElementType> = {
  filesystem: FolderOpen,
  web_search: Search,
  code_analysis: Code,
  system_info: Info,
}

const SERVER_EMOJI_MAP: Record<string, string> = {
  filesystem: '📁',
  web_search: '🔍',
  code_analysis: '💻',
  system_info: 'ℹ️',
}

/* ─── Animation variants ─── */

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: 'easeOut' },
}

const slideIn = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.25, ease: 'easeOut' },
}

/* ─── Helpers ─── */

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatJson(value: unknown, indent = 2): string {
  try {
    return JSON.stringify(value, null, indent)
  } catch {
    return String(value)
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════════ */

export default function McpModule() {
  const isMobile = useIsMobile()

  /* ── State ── */
  const [connections, setConnections] = useState<McpConnection[]>([])
  const [availableServers, setAvailableServers] = useState<AvailableServer[]>([])
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null)
  const [selectedTools, setSelectedTools] = useState<ToolDef[]>([])
  const [executionLog, setExecutionLog] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [executing, setExecuting] = useState<string | null>(null)
  const [toolParams, setToolParams] = useState<Record<string, Record<string, string>>>({})
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState('servers')

  const logEndRef = useRef<HTMLDivElement>(null)

  const selectedConnection = connections.find((c) => c.id === selectedConnectionId)

  /* ── Fetch connections ── */
  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/mcp')
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      setConnections(data.connections || [])
      setAvailableServers(data.availableServers || [])
    } catch {
      toast.error('Erreur de chargement des connexions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  /* ── Load tools for selected connection ── */
  useEffect(() => {
    if (!selectedConnectionId) {
      setSelectedTools([])
      return
    }
    const conn = connections.find((c) => c.id === selectedConnectionId)
    if (!conn || conn.status !== 'connected') {
      setSelectedTools([])
      return
    }
    // Re-fetch to get latest tools
    const loadTools = async () => {
      try {
        const res = await fetch('/api/mcp')
        const data = await res.json()
        const target = data.connections?.find((c: McpConnection) => c.id === selectedConnectionId)
        if (target && target.status === 'connected') {
          // Get tools from the connection — we stored them on connect
          // For simplicity, request re-connect info
          // Actually, we'll get tools from the connect response stored in the DB
          // Let's re-connect to get tools (idempotent)
          const postRes = await fetch('/api/mcp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'connect', serverType: target.serverType, name: target.name }),
          })
          const postData = await postRes.json()
          if (postData.tools) {
            setSelectedTools(postData.tools)
          }
          // Refresh connections
          if (postData.connection) {
            setConnections((prev) =>
              prev.map((c) => (c.id === postData.connection.id ? { ...c, ...postData.connection } : c))
            )
          }
        }
      } catch {
        setSelectedTools([])
      }
    }
    loadTools()
  }, [selectedConnectionId, connections])

  /* ── Auto-scroll log ── */
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [executionLog])

  /* ── Connect to server ── */
  const handleConnect = useCallback(
    async (serverType: string, serverName?: string) => {
      try {
        setConnecting(serverType)
        const res = await fetch('/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'connect', serverType, name: serverName }),
        })
        const data = await res.json()
        if (data.error) {
          toast.error(data.error)
          return
        }
        toast.success(`${SERVER_EMOJI_MAP[serverType] || '🔌'} ${serverName || data.connection?.name || serverType} connecté`)
        setAddDialogOpen(false)
        await fetchConnections()
        // Auto-select the new connection
        if (data.connection?.id) {
          setSelectedConnectionId(data.connection.id)
          if (data.tools) {
            setSelectedTools(data.tools)
          }
        }
      } catch {
        toast.error('Erreur de connexion')
      } finally {
        setConnecting(null)
      }
    },
    [fetchConnections]
  )

  /* ── Disconnect ── */
  const handleDisconnect = useCallback(
    async (connectionId: string, name: string) => {
      try {
        const res = await fetch('/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'disconnect', connectionId }),
        })
        const data = await res.json()
        if (data.error) {
          toast.error(data.error)
          return
        }
        toast.success(`🔌 ${name} déconnecté`)
        await fetchConnections()
        if (selectedConnectionId === connectionId) {
          setSelectedConnectionId(null)
          setSelectedTools([])
        }
      } catch {
        toast.error('Erreur de déconnexion')
      }
    },
    [fetchConnections, selectedConnectionId]
  )

  /* ── Delete connection ── */
  const handleDelete = useCallback(
    async (connectionId: string, name: string) => {
      try {
        const res = await fetch(`/api/mcp?id=${connectionId}`, { method: 'DELETE' })
        const data = await res.json()
        if (data.error) {
          toast.error(data.error)
          return
        }
        toast.success(`🗑️ ${name} supprimé`)
        await fetchConnections()
        if (selectedConnectionId === connectionId) {
          setSelectedConnectionId(null)
          setSelectedTools([])
        }
      } catch {
        toast.error('Erreur de suppression')
      }
    },
    [fetchConnections, selectedConnectionId]
  )

  /* ── Execute tool ── */
  const handleExecute = useCallback(
    async (connectionId: string, toolName: string, serverType: string) => {
      const params = toolParams[`${connectionId}:${toolName}`] || {}
      // Convert numeric strings
      const processedParams: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(params)) {
        if (val === '') continue
        processedParams[key] = val
      }

      const serverIcon = SERVER_EMOJI_MAP[serverType] || '🔧'
      const serverName = availableServers.find((s) => s.type === serverType)?.name || serverType

      // Add request log
      const requestEntry: LogEntry = {
        id: `req-${Date.now()}`,
        type: 'request',
        toolName,
        serverIcon,
        serverName,
        params: Object.keys(processedParams).length > 0 ? processedParams : undefined,
        timestamp: new Date(),
      }
      setExecutionLog((prev) => [...prev, requestEntry])

      try {
        setExecuting(`${connectionId}:${toolName}`)
        const res = await fetch('/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'execute',
            connectionId,
            toolName,
            params: processedParams,
          }),
        })
        const data = await res.json()

        const responseEntry: LogEntry = {
          id: `res-${Date.now()}`,
          type: data.success ? 'response' : 'error',
          toolName,
          serverIcon: data.serverIcon || serverIcon,
          serverName: data.serverName || serverName,
          result: data.result,
          durationMs: data.durationMs,
          timestamp: new Date(),
        }
        setExecutionLog((prev) => [...prev, responseEntry])

        if (data.error && !data.success) {
          toast.error(data.error)
        }
      } catch {
        const errorEntry: LogEntry = {
          id: `err-${Date.now()}`,
          type: 'error',
          toolName,
          serverIcon,
          serverName,
          result: 'Erreur réseau lors de l\'exécution',
          timestamp: new Date(),
        }
        setExecutionLog((prev) => [...prev, errorEntry])
        toast.error('Erreur réseau')
      } finally {
        setExecuting(null)
      }
    },
    [toolParams, availableServers]
  )

  /* ── Update tool param ── */
  const updateParam = useCallback((key: string, param: string, value: string) => {
    setToolParams((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [param]: value },
    }))
  }, [])

  /* ── Clear log ── */
  const clearLog = useCallback(() => {
    setExecutionLog([])
    toast.success('Journal effacé')
  }, [])

  /* ═══════════════════════════════════════════════════════════════════
     Render Helpers
     ═══════════════════════════════════════════════════════════════════ */

  /* ── Status Dot ── */
  function StatusDot({ status }: { status: string }) {
    const dotClass =
      status === 'connected'
        ? 'status-dot active'
        : status === 'error'
          ? 'status-dot error'
          : 'status-dot idle'
    return <span className={dotClass} />
  }

  /* ── Server Card (left panel) ── */
  function ServerCard({ connection }: { connection: McpConnection }) {
    const isSelected = selectedConnectionId === connection.id
    const isConn = connection.status === 'connected'
    const Icon = SERVER_ICON_MAP[connection.serverType] || Server
    const emoji = SERVER_EMOJI_MAP[connection.serverType] || '🔌'
    const isConnecting = connecting === connection.serverType

    return (
      <motion.div
        {...slideIn}
        layout
        className={`group relative rounded-lg border p-3 cursor-pointer transition-all duration-200 ${
          isSelected
            ? 'border-primary/50 bg-primary/5 shadow-sm'
            : 'border-transparent hover:border-border hover:bg-muted/30'
        }`}
        onClick={() => setSelectedConnectionId(connection.id)}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-base ${
              isConn ? 'bg-primary/10' : 'bg-muted'
            }`}
          >
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{connection.name}</span>
              <StatusDot status={connection.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{connection.serverType}</p>
            {isConn && (
              <Badge variant="secondary" className="mt-1.5 text-[10px] px-1.5 py-0">
                {connection.toolCount} outil{connection.toolCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isConn ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDisconnect(connection.id, connection.name)
                  }}
                  disabled={isConnecting}
                >
                  <Unplug className="size-3.5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Déconnecter</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleConnect(connection.serverType, connection.name)
                  }}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                  ) : (
                    <Plug className="size-3.5 text-muted-foreground" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Connecter</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(connection.id, connection.name)
                }}
              >
                <X className="size-3.5 text-muted-foreground hover:text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Supprimer</TooltipContent>
          </Tooltip>
        </div>
      </motion.div>
    )
  }

  /* ── Tool Card (center panel) ── */
  function ToolCard({
    tool,
    connectionId,
    serverType,
  }: {
    tool: ToolDef
    connectionId: string
    serverType: string
  }) {
    const paramKey = `${connectionId}:${tool.name}`
    const currentParams = toolParams[paramKey] || {}
    const isExecuting = executing === paramKey
    const properties = tool.inputSchema?.properties || {}
    const required = tool.inputSchema?.required || []

    return (
      <motion.div {...fadeIn} layout className="module-card">
        <Card className="overflow-hidden border-border/50">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Terminal className="size-4 text-primary shrink-0" />
                <CardTitle className="text-sm font-semibold truncate">{tool.name}</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {Object.keys(properties).length} param{Object.keys(properties).length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {/* Parameter inputs */}
            {Object.entries(properties).length > 0 && (
              <div className="space-y-2">
                {Object.entries(properties).map(([paramName, paramDef]) => {
                  const isRequired = required.includes(paramName)
                  const isLong = paramDef.type === 'string' && paramName === 'code'
                  const isNumber = paramDef.type === 'number'

                  return (
                    <div key={paramName} className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        {paramName}
                        {isRequired && <span className="text-destructive">*</span>}
                        <span className="text-muted-foreground font-normal">
                          ({paramDef.type})
                        </span>
                      </Label>
                      {isLong ? (
                        <Textarea
                          placeholder={paramDef.description}
                          value={currentParams[paramName] || ''}
                          onChange={(e) => updateParam(paramKey, paramName, e.target.value)}
                          className="text-xs font-mono min-h-[100px] resize-y"
                          rows={4}
                        />
                      ) : (
                        <Input
                          type={isNumber ? 'number' : 'text'}
                          placeholder={paramDef.description}
                          value={currentParams[paramName] || ''}
                          onChange={(e) => updateParam(paramKey, paramName, e.target.value)}
                          className="text-xs"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Execute button */}
            <Button
              size="sm"
              className="w-full gap-2"
              onClick={() => handleExecute(connectionId, tool.name, serverType)}
              disabled={isExecuting}
            >
              {isExecuting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Exécution...
                </>
              ) : (
                <>
                  <Play className="size-3.5" />
                  Exécuter
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  /* ── Log Entry ── */
  function LogEntryView({ entry }: { entry: LogEntry }) {
    if (entry.type === 'request') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3 py-3"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs mt-0.5">
            {entry.serverIcon}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary">{entry.toolName}</span>
              <ChevronRight className="size-3 text-muted-foreground" />
            </div>
            {entry.params && Object.keys(entry.params).length > 0 && (
              <div className="rounded-md bg-muted/50 px-2.5 py-1.5 text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-20 overflow-y-auto">
                {formatJson(entry.params, 2)}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground/60">{formatTime(entry.timestamp)}</p>
          </div>
        </motion.div>
      )
    }

    if (entry.type === 'response') {
      const isError = (entry.result as Record<string, unknown>)?.error
      return (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3 py-3"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs mt-0.5">
            <Zap className={`size-3.5 ${isError ? 'text-destructive' : 'text-green-500'}`} />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground">Résultat</span>
              {entry.durationMs != null && (
                <span className="text-[10px] text-muted-foreground">
                  {formatDuration(entry.durationMs)}
                </span>
              )}
            </div>
            <div className="rounded-md bg-muted/30 px-2.5 py-2 text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-48 overflow-y-auto custom-scrollbar">
              <pre className="whitespace-pre-wrap break-words">{formatJson(entry.result, 2)}</pre>
            </div>
            <p className="text-[10px] text-muted-foreground/60">{formatTime(entry.timestamp)}</p>
          </div>
        </motion.div>
      )
    }

    // Error entry
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-3 py-3"
      >
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-xs mt-0.5">
          <X className="size-3.5 text-destructive" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <span className="text-xs font-medium text-destructive">Erreur</span>
          <p className="text-[11px] text-destructive/80 font-mono">
            {formatJson(entry.result, 2)}
          </p>
          <p className="text-[10px] text-muted-foreground/60">{formatTime(entry.timestamp)}</p>
        </div>
      </motion.div>
    )
  }

  /* ── Welcome State ── */
  function WelcomeState() {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center h-full p-8 text-center"
      >
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
          <Plug className="size-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">Module MCP</h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
          Le <strong>Model Context Protocol (MCP)</strong> est un standard ouvert qui permet de connecter
          des serveurs d&apos;outils à des modèles IA. Gérez vos connexions, explorez les outils disponibles
          et exécutez-les directement depuis cette interface.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {availableServers.map((server) => {
            const Icon = SERVER_ICON_MAP[server.type] || Server
            return (
              <div
                key={server.type}
                className="flex flex-col items-center gap-2 rounded-xl border border-border/50 p-3 bg-card/50"
              >
                <span className="text-2xl">{server.icon}</span>
                <span className="text-xs font-medium">{server.name}</span>
                <span className="text-[10px] text-muted-foreground">{server.toolCount} outils</span>
              </div>
            )
          })}
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Ajouter un serveur
        </Button>
      </motion.div>
    )
  }

  /* ── Add Server Dialog ── */
  function AddServerDialog() {
    const [selectedType, setSelectedType] = useState<string | null>(null)

    return (
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5" />
              Ajouter un serveur MCP
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Sélectionnez un type de serveur intégré à connecter.
            </p>
            <div className="space-y-2">
              {availableServers.map((server) => {
                const isAlreadyConnected = connections.some(
                  (c) => c.serverType === server.type && c.status === 'connected'
                )
                const isSelected = selectedType === server.type

                return (
                  <button
                    key={server.type}
                    disabled={isAlreadyConnected}
                    onClick={() => setSelectedType(server.type)}
                    className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-all duration-200 ${
                      isSelected
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border/50 hover:border-border hover:bg-muted/30'
                    } ${isAlreadyConnected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className="text-xl">{server.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{server.name}</span>
                        {isAlreadyConnected && (
                          <Badge variant="secondary" className="text-[10px]">
                            Connecté
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{server.description}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {server.toolCount} outil{server.toolCount > 1 ? 's' : ''} disponible
                        {server.toolCount > 1 ? 's' : ''}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button
              onClick={() => {
                if (selectedType) {
                  const server = availableServers.find((s) => s.type === selectedType)
                  handleConnect(selectedType, server?.name)
                }
              }}
              disabled={!selectedType || connecting !== null}
            >
              {connecting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  <Plug className="size-4" />
                  Connecter
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  /* ═══════════════════════════════════════════════════════════════════
     Toolbar
     ═══════════════════════════════════════════════════════════════════ */

  function Toolbar() {
    return (
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
        <Button size="sm" className="gap-2" onClick={() => setAddDialogOpen(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Ajouter un serveur</span>
          <span className="sm:hidden">Ajouter</span>
        </Button>
        <div className="flex-1" />
        {executionLog.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={clearLog}>
                <RotateCcw className="size-3.5" />
                <span className="hidden sm:inline text-xs">Effacer</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Effacer le journal</TooltipContent>
          </Tooltip>
        )}
        <Badge variant="secondary" className="text-[10px] gap-1">
          <Clock className="size-3" />
          {executionLog.length} entrée{executionLog.length > 1 ? 's' : ''}
        </Badge>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════════════════════
     Left Panel — Servers
     ═══════════════════════════════════════════════════════════════════ */

  function ServersPanel() {
    if (loading) {
      return (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (connections.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <Server className="size-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Aucun serveur</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Ajoutez un serveur pour commencer</p>
        </div>
      )
    }

    return (
      <ScrollArea className="h-full custom-scrollbar">
        <div className="space-y-2 p-3">
          <AnimatePresence>
            {connections.map((conn) => (
              <ServerCard key={conn.id} connection={conn} />
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    )
  }

  /* ═══════════════════════════════════════════════════════════════════
     Center Panel — Tools
     ═══════════════════════════════════════════════════════════════════ */

  function ToolsPanel() {
    if (!selectedConnection) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <Terminal className="size-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Aucun serveur sélectionné</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Sélectionnez un serveur connecté pour voir ses outils
          </p>
        </div>
      )
    }

    if (selectedConnection.status !== 'connected') {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <Unplug className="size-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">{selectedConnection.name} est déconnecté</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 gap-2"
            onClick={() => handleConnect(selectedConnection.serverType, selectedConnection.name)}
            disabled={connecting !== null}
          >
            {connecting === selectedConnection.serverType ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plug className="size-3.5" />
            )}
            Reconnecter
          </Button>
        </div>
      )
    }

    if (selectedTools.length === 0) {
      return (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )
    }

    return (
      <ScrollArea className="h-full custom-scrollbar">
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{SERVER_EMOJI_MAP[selectedConnection.serverType] || '🔌'}</span>
            <h3 className="text-sm font-semibold">{selectedConnection.name}</h3>
            <Badge variant="secondary" className="text-[10px]">
              {selectedTools.length} outil{selectedTools.length > 1 ? 's' : ''}
            </Badge>
          </div>
          <AnimatePresence>
            {selectedTools.map((tool) => (
              <ToolCard
                key={tool.name}
                tool={tool}
                connectionId={selectedConnection.id}
                serverType={selectedConnection.serverType}
              />
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    )
  }

  /* ═══════════════════════════════════════════════════════════════════
     Right Panel — Execution Log
     ═══════════════════════════════════════════════════════════════════ */

  function LogPanel() {
    if (executionLog.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <Clock className="size-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Journal vide</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Les résultats d&apos;exécution apparaîtront ici
          </p>
        </div>
      )
    }

    return (
      <ScrollArea className="h-full custom-scrollbar">
        <div className="p-3 space-y-1">
          <AnimatePresence initial={false}>
            {executionLog.map((entry) => (
              <LogEntryView key={entry.id} entry={entry} />
            ))}
          </AnimatePresence>
          <div ref={logEndRef} />
        </div>
      </ScrollArea>
    )
  }

  /* ═══════════════════════════════════════════════════════════════════
     Layout
     ═══════════════════════════════════════════════════════════════════ */

  // No connections at all — show welcome
  if (!loading && connections.length === 0 && availableServers.length > 0) {
    return (
      <div className="h-full flex flex-col">
        <Toolbar />
        <div className="flex-1">
          <WelcomeState />
        </div>
        <AddServerDialog />
      </div>
    )
  }

  // Mobile: tabs
  if (isMobile) {
    return (
      <div className="h-full flex flex-col">
        <Toolbar />
        <Tabs value={mobileTab} onValueChange={setMobileTab} className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-2 w-auto">
            <TabsTrigger value="servers" className="gap-1.5 text-xs">
              Serveurs
              <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-1">
                {connections.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-1.5 text-xs">
              Outils
              {selectedConnection?.status === 'connected' && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-1">
                  {selectedTools.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="log" className="gap-1.5 text-xs">
              Journal
              {executionLog.length > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-1">
                  {executionLog.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="servers" className="flex-1 mt-0 overflow-hidden">
            <ServersPanel />
          </TabsContent>
          <TabsContent value="tools" className="flex-1 mt-0 overflow-hidden">
            <ToolsPanel />
          </TabsContent>
          <TabsContent value="log" className="flex-1 mt-0 overflow-hidden">
            <LogPanel />
          </TabsContent>
        </Tabs>
        <AddServerDialog />
      </div>
    )
  }

  // Desktop: three-column layout
  return (
    <div className="h-full flex flex-col">
      <Toolbar />
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Servers */}
        <div className="w-64 border-r border-border/30 flex flex-col shrink-0">
          <div className="px-3 py-2 flex items-center gap-2">
            <Server className="size-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Serveurs
            </span>
            <span className="ml-auto text-[10px] text-muted-foreground/60">
              {connections.filter((c) => c.status === 'connected').length}/{connections.length}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <ServersPanel />
          </div>
        </div>

        {/* Center: Tools */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-2 flex items-center gap-2 border-b border-border/20">
            <Terminal className="size-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Outils
            </span>
            {selectedConnection && (
              <Badge variant="outline" className="text-[10px] ml-2 gap-1">
                {SERVER_EMOJI_MAP[selectedConnection.serverType]} {selectedConnection.name}
              </Badge>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <ToolsPanel />
          </div>
        </div>

        {/* Right: Execution Log */}
        <div className="w-80 border-l border-border/30 flex flex-col shrink-0">
          <div className="px-3 py-2 flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Journal
            </span>
            {executionLog.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto size-6"
                onClick={clearLog}
              >
                <RotateCcw className="size-3 text-muted-foreground" />
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <LogPanel />
          </div>
        </div>
      </div>
      <AddServerDialog />
    </div>
  )
}