'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Loader2,
  MessageSquare,
  Search,
  ImageIcon,
  Bot,
  FileText,
  Zap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Activity,
  Filter,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

/* ═══════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════ */
interface ActivityLog {
  id: string
  userId: string
  userName: string
  action: string
  details: string
  type: string
  createdAt: string
}

/* ═══════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════ */
async function adminFetch<T = unknown>(body: Record<string, unknown>): Promise<{ success: boolean; error?: string } & T> {
  const res = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

function relativeTime(date: string): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return "À l'instant"
  if (minutes < 60) return `Il y a ${minutes}min`
  if (hours < 24) return `Il y a ${hours}h`
  if (days < 7) return `Il y a ${days}j`
  return new Date(date).toLocaleDateString('fr-FR')
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'chat': return MessageSquare
    case 'search': return Search
    case 'image': return ImageIcon
    case 'agent': return Bot
    case 'document': return FileText
    case 'automation': return Zap
    default: return Sparkles
  }
}

function getActivityColor(type: string) {
  switch (type) {
    case 'chat': return 'text-primary bg-primary/10'
    case 'search': return 'text-chart-2 bg-chart-2/10'
    case 'image': return 'text-chart-4 bg-chart-4/10'
    case 'agent': return 'text-chart-3 bg-chart-3/10'
    case 'document': return 'text-chart-5 bg-chart-5/10'
    case 'automation': return 'text-amber-500 bg-amber-500/10'
    default: return 'text-muted-foreground bg-muted'
  }
}

function getActivityLabel(type: string): string {
  const map: Record<string, string> = {
    chat: 'Chat',
    search: 'Recherche',
    image: 'Image',
    agent: 'Agent',
    document: 'Document',
    automation: 'Automatisation',
  }
  return map[type] || type
}

/* Avatar color based on user name */
function getAvatarColor(name: string): string {
  const colors = [
    'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
    'bg-orange-500/15 text-orange-600 dark:text-orange-400',
    'bg-teal-500/15 text-teal-600 dark:text-teal-400',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

/* ═══════════════════════════════════════════════════════════════════════
   Animation
   ═══════════════════════════════════════════════════════════════════════ */
const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.05 },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
}

/* ═══════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════ */
export default function ActivityLogsTab() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [typeFilter, setTypeFilter] = useState('all')

  const fetchLogs = useCallback(async (p: number, type: string) => {
    setLoading(true)
    try {
      const body: Record<string, unknown> = { action: 'activity-logs', page: p, limit: 30 }
      if (type !== 'all') body.type = type
      const data = await adminFetch<{ logs: ActivityLog[]; pagination: { totalPages: number } }>(body)
      if (data.success) {
        setLogs(data.logs || [])
        setTotalPages(data.pagination?.totalPages || 1)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs(page, typeFilter)
  }, [page, typeFilter, fetchLogs])

  const handleFilterChange = (value: string) => {
    setTypeFilter(value)
    setPage(1)
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
      {/* ─── Header with filter ─── */}
      <motion.div variants={fadeIn}>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" />
                Journal d&apos;activité de la plateforme
              </CardTitle>
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <Select value={typeFilter} onValueChange={handleFilterChange}>
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                    <SelectItem value="search">Recherche</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="automation">Automatisation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* ─── Logs List ─── */}
      <motion.div variants={staggerItem}>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length > 0 ? (
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/30 sticky top-0 z-10">
                      <TableHead className="text-[11px] font-semibold w-10"></TableHead>
                      <TableHead className="text-[11px] font-semibold">Utilisateur</TableHead>
                      <TableHead className="text-[11px] font-semibold">Action</TableHead>
                      <TableHead className="text-[11px] font-semibold hidden md:table-cell">Détails</TableHead>
                      <TableHead className="text-[11px] font-semibold w-24">Type</TableHead>
                      <TableHead className="text-[11px] font-semibold text-right w-28">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const Icon = getActivityIcon(log.type)
                      const colorClass = getActivityColor(log.type)
                      const avatarColor = getAvatarColor(log.userName)
                      return (
                        <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                          {/* Activity type icon */}
                          <TableCell className="py-2.5">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${colorClass}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                          </TableCell>

                          {/* User */}
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2">
                              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${avatarColor}`}>
                                {log.userName?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <span className="text-xs font-medium truncate max-w-[140px]">
                                {log.userName}
                              </span>
                            </div>
                          </TableCell>

                          {/* Action */}
                          <TableCell className="text-xs py-2.5 max-w-[200px]">
                            <span className="truncate">{log.action}</span>
                          </TableCell>

                          {/* Details */}
                          <TableCell className="text-xs text-muted-foreground py-2.5 hidden md:table-cell max-w-[280px]">
                            <span className="truncate block">{log.details}</span>
                          </TableCell>

                          {/* Type */}
                          <TableCell className="py-2.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                              {getActivityLabel(log.type)}
                            </Badge>
                          </TableCell>

                          {/* Date */}
                          <TableCell className="text-xs text-muted-foreground py-2.5 text-right whitespace-nowrap">
                            {relativeTime(log.createdAt)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Activity className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">Aucune activité trouvée</p>
                <p className="text-xs mt-1">
                  {typeFilter !== 'all'
                    ? `Aucune activité de type "${getActivityLabel(typeFilter)}" enregistrée`
                    : "Le journal d'activité est vide"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Pagination ─── */}
      {totalPages > 1 && (
        <motion.div variants={fadeIn} className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="h-8 gap-1 text-xs"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Précédent
          </Button>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground px-2">
              Page {page} sur {totalPages}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="h-8 gap-1 text-xs"
          >
            Suivant
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </motion.div>
      )}
    </motion.div>
  )
}
