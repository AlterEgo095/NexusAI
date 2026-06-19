'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Loader2,
  MessageSquare,
  Bot,
  ImageIcon,
  FileText,
  Zap,
  Sparkles,
  Search,
  Mail,
  Coins,
  Globe,
  Clock,
  Eye,
  User,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

/* ═══════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════ */
interface UserDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string | null
}

interface UserDetail {
  id: string
  name: string
  email: string
  role: string
  credits: number
  language: string
  isOnline: boolean
  lastSeen: string | null
  createdAt: string
  stats: {
    conversations: number
    agents: number
    images: number
    documents: number
    automations: number
  }
  recentConversations: {
    id: string
    title: string
    model: string
    messageCount: number
    createdAt: string
  }[]
  recentActivity: {
    id: string
    type: string
    action: string
    details: string
    createdAt: string
  }[]
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

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'superadmin':
      return <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/25">Superadmin</Badge>
    case 'admin':
      return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/25">Admin</Badge>
    default:
      return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/25">Utilisateur</Badge>
  }
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

function getLanguageLabel(lang: string): string {
  const map: Record<string, string> = {
    fr: 'Français',
    en: 'English',
    es: 'Español',
    de: 'Deutsch',
    ar: 'العربية',
    zh: '中文',
  }
  return map[lang] || lang.toUpperCase()
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
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

/* ═══════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════ */
export default function UserDetailDialog({ open, onOpenChange, userId }: UserDetailDialogProps) {
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchUserDetail = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const data = await adminFetch<{ user: UserDetail }>({ action: 'user-detail', userId })
      if (data.success && data.user) {
        setUser(data.user)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (open && userId) {
      fetchUserDetail()
    }
    if (!open) {
      setUser(null)
    }
  }, [open, userId, fetchUserDetail])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-4 w-4 text-emerald-500" />
            Détails de l&apos;utilisateur
          </DialogTitle>
          <DialogDescription>
            Informations complètes sur le compte utilisateur
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-6 py-4">
            {/* Profile skeleton */}
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            {/* Stats skeleton */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
            {/* Conversations skeleton */}
            <Skeleton className="h-40 rounded-lg" />
            {/* Activity skeleton */}
            <Skeleton className="h-32 rounded-lg" />
          </div>
        ) : user ? (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-5 py-2">
            {/* ─── Profile Card ─── */}
            <motion.div variants={staggerItem}>
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xl font-bold">
                        {user.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background ${user.isOnline ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold truncate">{user.name}</h3>
                        {getRoleBadge(user.role)}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" />
                          {user.email}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Coins className="h-3.5 w-3.5 text-amber-500" />
                          {user.credits.toLocaleString('fr-FR')} crédits
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5" />
                          {getLanguageLabel(user.language)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1.5">
                          <Eye className="h-3 w-3" />
                          {user.isOnline ? (
                            <span className="text-green-500 font-medium">En ligne</span>
                          ) : (
                            <span>Dernière activité : {user.lastSeen ? relativeTime(user.lastSeen) : 'Jamais'}</span>
                          )}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          Inscrit le {formatDate(user.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ─── Stats Grid ─── */}
            <motion.div variants={staggerItem}>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {[
                  { label: 'Conversations', value: user.stats.conversations, icon: MessageSquare, color: 'text-primary', bg: 'bg-primary/10' },
                  { label: 'Agents', value: user.stats.agents, icon: Bot, color: 'text-chart-3', bg: 'bg-chart-3/10' },
                  { label: 'Images', value: user.stats.images, icon: ImageIcon, color: 'text-chart-4', bg: 'bg-chart-4/10' },
                  { label: 'Documents', value: user.stats.documents, icon: FileText, color: 'text-chart-5', bg: 'bg-chart-5/10' },
                  { label: 'Automatisations', value: user.stats.automations, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-muted/30">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                    <span className="text-lg font-bold">{stat.value.toLocaleString('fr-FR')}</span>
                    <span className="text-[10px] text-muted-foreground text-center leading-tight">{stat.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <Separator className="opacity-50" />

            {/* ─── Recent Conversations ─── */}
            <motion.div variants={staggerItem}>
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Conversations récentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {user.recentConversations.length > 0 ? (
                    <div className="rounded-md border border-border/50 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent bg-muted/30">
                            <TableHead className="text-[11px] font-semibold">Titre</TableHead>
                            <TableHead className="text-[11px] font-semibold">Modèle</TableHead>
                            <TableHead className="text-[11px] font-semibold text-center">Messages</TableHead>
                            <TableHead className="text-[11px] font-semibold text-right">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {user.recentConversations.map((conv) => (
                            <TableRow key={conv.id} className="hover:bg-muted/50">
                              <TableCell className="text-xs font-medium py-2.5 max-w-[200px] truncate">
                                {conv.title || 'Sans titre'}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground py-2.5">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-mono">
                                  {conv.model}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-center py-2.5 font-medium">
                                {conv.messageCount}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground py-2.5 text-right">
                                {relativeTime(conv.createdAt)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      Aucune conversation récente
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* ─── Recent Activity ─── */}
            <motion.div variants={staggerItem}>
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    Activité récente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {user.recentActivity.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                      {user.recentActivity.map((activity) => {
                        const Icon = getActivityIcon(activity.type)
                        const colorClass = getActivityColor(activity.type)
                        return (
                          <motion.div
                            key={activity.id}
                            variants={fadeIn}
                            className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{activity.action}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{activity.details}</p>
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0 pt-0.5">
                              {relativeTime(activity.createdAt)}
                            </span>
                          </motion.div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      Aucune activité récente
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        ) : (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            Aucune donnée disponible
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
