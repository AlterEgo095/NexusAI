'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plug,
  Search,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  Loader2,
  Settings,
  Unplug,
  Zap,
  Key,
  Link2,
  Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

/* ─── Types ─── */
interface ConfigField {
  key: string
  label: string
  type: 'text' | 'password' | 'url'
  placeholder: string
  required: boolean
}

interface ConnectorTemplate {
  id: string
  name: string
  description: string
  icon: string
  category: string
  authType: string
  configFields: ConfigField[]
  status?: 'connected' | 'disconnected' | 'error'
  connectedAt?: string
}

type ConnectionStatus = 'connected' | 'disconnected' | 'error'

/* ─── Status helpers ─── */
function StatusIcon({ status }: { status: ConnectionStatus }) {
  switch (status) {
    case 'connected':
      return <Wifi className="w-4 h-4 text-green-500" />
    case 'error':
      return <XCircle className="w-4 h-4 text-red-500" />
    default:
      return <WifiOff className="w-4 h-4 text-muted-foreground" />
  }
}

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const map: Record<ConnectionStatus, { label: string; className: string }> = {
    connected: { label: 'Connecté', className: 'bg-green-500/15 text-green-600 border-green-500/30' },
    disconnected: { label: 'Déconnecté', className: 'bg-muted text-muted-foreground' },
    error: { label: 'Erreur', className: 'bg-red-500/15 text-red-600 border-red-500/30' },
  }
  const { label, className } = map[status]
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${className}`}>
      <StatusIcon status={status} />
      <span className="ml-1">{label}</span>
    </Badge>
  )
}

/* ─── Animation variants ─── */
const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: 'easeOut' },
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.04 } },
}

/* ─── Connector Card ─── */
function ConnectorCard({
  connector,
  onClick,
}: {
  connector: ConnectorTemplate
  onClick: () => void
}) {
  return (
    <motion.div {...fadeIn} layout>
      <Card
        className="glass-panel cursor-pointer hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 hover:border-primary/30 h-full flex flex-col group"
        onClick={onClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="text-2xl w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 shrink-0">
              {connector.icon}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold truncate group-hover:text-primary transition-colors">
                {connector.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {connector.authType}
                </Badge>
                {connector.status && <StatusBadge status={connector.status} />}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 pt-0">
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {connector.description}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-muted-foreground/70">
            <Key className="w-3 h-3" />
            {connector.configFields.length} champ{connector.configFields.length > 1 ? 's' : ''} de configuration
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ─── Skeleton Loader ─── */
function ConnectorsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="glass-panel h-full flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3 mt-1" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Main Connectors Module
   ═══════════════════════════════════════════════════════════════ */

export default function ConnectorsModule() {
  /* ─── State ─── */
  const [connectors, setConnectors] = useState<ConnectorTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedConnector, setSelectedConnector] = useState<ConnectorTemplate | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [configValues, setConfigValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  /* ─── Fetch connectors ─── */
  useEffect(() => {
    async function fetchConnectors() {
      try {
        setLoading(true)
        const res = await fetch('/api/connectors')
        if (!res.ok) throw new Error('Erreur de chargement')
        const data = await res.json()
        setConnectors(data.connectors || data || [])
      } catch {
        toast.error('Impossible de charger les connecteurs')
      } finally {
        setLoading(false)
      }
    }
    fetchConnectors()
  }, [])

  /* ─── Active connections ─── */
  const activeConnections = useMemo(
    () => connectors.filter((c) => c.status === 'connected'),
    [connectors]
  )

  /* ─── Filtered connectors ─── */
  const filteredConnectors = useMemo(() => {
    return connectors.filter((c) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.authType.toLowerCase().includes(q)
      )
    })
  }, [connectors, search])

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const total = connectors.length
    const connected = connectors.filter((c) => c.status === 'connected').length
    const errored = connectors.filter((c) => c.status === 'error').length
    return { total, connected, errored }
  }, [connectors])

  /* ─── Open config dialog ─── */
  function openConfig(connector: ConnectorTemplate) {
    setSelectedConnector(connector)
    setConfigValues(
      Object.fromEntries(connector.configFields.map((f) => [f.key, '']))
    )
    setDialogOpen(true)
  }

  /* ─── Connect handler ─── */
  async function handleConnect() {
    if (!selectedConnector) return
    try {
      setSaving(true)
      const res = await fetch('/api/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectorId: selectedConnector.id,
          config: configValues,
        }),
      })
      if (!res.ok) throw new Error('Erreur de connexion')
      const data = await res.json()

      // Update local state
      setConnectors((prev) =>
        prev.map((c) =>
          c.id === selectedConnector.id
            ? { ...c, status: 'connected', connectedAt: new Date().toISOString() }
            : c
        )
      )
      toast.success(data.message || 'Connecteur configuré avec succès !')
      setDialogOpen(false)
      setSelectedConnector(null)
    } catch {
      toast.error('Impossible de configurer le connecteur')
    } finally {
      setSaving(false)
    }
  }

  /* ─── Disconnect handler ─── */
  async function handleDisconnect(connectorId: string) {
    try {
      setDisconnecting(connectorId)
      const res = await fetch('/api/connectors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectorId }),
      })
      if (!res.ok) throw new Error('Erreur de déconnexion')

      setConnectors((prev) =>
        prev.map((c) =>
          c.id === connectorId
            ? { ...c, status: 'disconnected', connectedAt: undefined }
            : c
        )
      )
      toast.success('Connecteur déconnecté')
    } catch {
      toast.error('Impossible de déconnecter le connecteur')
    } finally {
      setDisconnecting(null)
    }
  }

  /* ─── Test connection handler ─── */
  async function handleTest(connectorId: string) {
    try {
      setTesting(connectorId)
      const res = await fetch('/api/connectors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectorId, action: 'test' }),
      })
      if (!res.ok) throw new Error('Erreur de test')

      const data = await res.json()
      if (data.success) {
        toast.success('Connexion testée avec succès !')
      } else {
        toast.error('Test échoué : ' + (data.error || 'erreur inconnue'))
        setConnectors((prev) =>
          prev.map((c) => (c.id === connectorId ? { ...c, status: 'error' } : c))
        )
      }
    } catch {
      toast.error('Impossible de tester la connexion')
      setConnectors((prev) =>
        prev.map((c) => (c.id === connectorId ? { ...c, status: 'error' } : c))
      )
    } finally {
      setTesting(null)
    }
  }

  return (
    <motion.div
      className="flex flex-col h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* ─── Header ─── */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Plug className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Connecteurs</h2>
              <p className="text-sm text-muted-foreground">
                Gérez vos intégrations et services externes
              </p>
            </div>
          </div>

          {/* Stats */}
          {!loading && (
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs px-3 py-1">
                <Link2 className="w-3 h-3 mr-1.5" />
                {stats.total} disponibles
              </Badge>
              {stats.connected > 0 && (
                <Badge variant="outline" className="text-xs px-3 py-1 bg-green-500/10 text-green-600 border-green-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1.5" />
                  {stats.connected} connecté{stats.connected > 1 ? 's' : ''}
                </Badge>
              )}
              {stats.errored > 0 && (
                <Badge variant="outline" className="text-xs px-3 py-1 bg-red-500/10 text-red-600 border-red-500/30">
                  <XCircle className="w-3 h-3 mr-1.5" />
                  {stats.errored} erreur{stats.errored > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* ─── Search ─── */}
        <div className="relative mt-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un connecteur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 glass-subtle"
          />
        </div>
      </div>

      {/* ─── Active Connections Bar ─── */}
      {activeConnections.length > 0 && (
        <div className="px-6 pb-3">
          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Connexions actives
            </h3>
            <div className="flex flex-wrap gap-2">
              {activeConnections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2"
                >
                  <span className="text-sm">{conn.icon}</span>
                  <span className="text-sm font-medium">{conn.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-blue-500"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTest(conn.id)
                    }}
                    disabled={testing === conn.id}
                  >
                    {testing === conn.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Zap className="w-3 h-3" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDisconnect(conn.id)
                    }}
                    disabled={disconnecting === conn.id}
                  >
                    {disconnecting === conn.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Unplug className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Separator className="mx-6" />

      {/* ─── Connector Grid ─── */}
      <ScrollArea className="flex-1 max-h-[calc(100vh-14rem)] overflow-y-auto">
        <div className="px-6 py-4">
          {loading ? (
            <ConnectorsSkeleton />
          ) : filteredConnectors.length === 0 ? (
            <motion.div
              className="flex flex-col items-center justify-center py-16 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Plug className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold mb-1">Aucun connecteur trouvé</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Essayez de modifier vos critères de recherche.
              </p>
              {search && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setSearch('')}
                >
                  Effacer la recherche
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              <AnimatePresence mode="popLayout">
                {filteredConnectors.map((conn) => (
                  <ConnectorCard
                    key={conn.id}
                    connector={conn}
                    onClick={() => openConfig(conn)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* ─── Config Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {selectedConnector && (
          <DialogContent className="glass-panel max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="text-3xl w-12 h-12 flex items-center justify-center rounded-xl bg-primary/10">
                  {selectedConnector.icon}
                </div>
                <div>
                  <DialogTitle className="text-xl">{selectedConnector.name}</DialogTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{selectedConnector.authType}</Badge>
                    <Badge variant="outline" className="text-[10px]">
                      <Shield className="w-2.5 h-2.5 mr-0.5" />
                      Sécurisé
                    </Badge>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <DialogDescription className="sr-only">
              Configuration du connecteur {selectedConnector.name}
            </DialogDescription>

            <div className="space-y-4 mt-2">
              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {selectedConnector.description}
              </p>

              <Separator />

              {/* Config Fields */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5" /> Configuration
                </h4>
                {selectedConnector.configFields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={field.key} className="text-xs">
                      {field.label}
                      {field.required && (
                        <span className="text-red-500 ml-0.5">*</span>
                      )}
                    </Label>
                    <div className="relative">
                      {field.type === 'password' ? (
                        <Input
                          id={field.key}
                          type="password"
                          placeholder={field.placeholder}
                          value={configValues[field.key] || ''}
                          onChange={(e) =>
                            setConfigValues((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          className="font-mono text-sm pr-10"
                        />
                      ) : (
                        <Input
                          id={field.key}
                          type="text"
                          placeholder={field.placeholder}
                          value={configValues[field.key] || ''}
                          onChange={(e) =>
                            setConfigValues((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          className="font-mono text-sm pr-10"
                        />
                      )}
                      <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="mt-4 flex-col gap-2 sm:flex-row">
              {/* Disconnect if already connected */}
              {selectedConnector.status === 'connected' && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDisconnect(selectedConnector.id)
                    setDialogOpen(false)
                  }}
                  disabled={disconnecting === selectedConnector.id || saving}
                  className="gap-1.5 w-full sm:w-auto"
                >
                  {disconnecting === selectedConnector.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Unplug className="w-4 h-4" />
                  )}
                  Déconnecter
                </Button>
              )}

              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={saving}
                  className="flex-1 sm:flex-initial"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleConnect}
                  disabled={saving || disconnecting !== null}
                  className="flex-1 sm:flex-initial gap-1.5"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Configuration...
                    </>
                  ) : selectedConnector.status === 'connected' ? (
                    <>
                      <Settings className="w-4 h-4" />
                      Mettre à jour
                    </>
                  ) : (
                    <>
                      <Plug className="w-4 h-4" />
                      Connecter
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </motion.div>
  )
}