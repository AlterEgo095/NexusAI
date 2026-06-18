'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Wifi,
  UserPlus,
  Activity,
  Shield,
  MoreHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Coins,
  UserCog,
  Loader2,
  Eye,
  BarChart3,
  MessageSquare,
  ImageIcon,
  Bot,
  Zap,
  RefreshCw,
  ArrowUpDown,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

/* ═══════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════ */
interface DashboardData {
  totalUsers: number
  onlineUsers: number
  newUsersToday: number
  todayRequests: number
  platformStats: {
    totalConversations: number
    totalMessages: number
    totalSearches: number
    totalImages: number
    totalAgents: number
    totalAutomations: number
  }
  recentUsers: {
    id: string
    email: string
    name: string
    role: string
    isOnline: boolean
    lastSeen: string | null
    createdAt: string
  }[]
  dailyUsageTrend: {
    date: string
    chatRequests: number | null
    searchRequests: number | null
    imageRequests: number | null
    agentRequests: number | null
    automationRuns: number | null
  }[]
}

interface UserRow {
  id: string
  email: string
  name: string
  role: string
  credits: number
  language: string
  isOnline: boolean
  lastSeen: string | null
  createdAt: string
  _count: {
    conversations: number
    agents: number
    images: number
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════ */
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

function getInitial(name: string): string {
  return name?.charAt(0)?.toUpperCase() || '?'
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
export default function AdminModule() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [dashLoading, setDashLoading] = useState(true)

  // Users tab state
  const [users, setUsers] = useState<UserRow[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Dialogs
  const [creditsDialog, setCreditsDialog] = useState<{ open: boolean; userId: string; userName: string }>({ open: false, userId: '', userName: '' })
  const [creditsAmount, setCreditsAmount] = useState('')
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId: string; userName: string }>({ open: false, userId: '', userName: '' })
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [creditsLoading, setCreditsLoading] = useState(false)

  /* ─── Fetch dashboard ─── */
  const fetchDashboard = useCallback(async () => {
    setDashLoading(true)
    try {
      const res = await fetch('/api/admin')
      const data = await res.json()
      if (data.success) setDashboard(data.dashboard)
      else toast.error(data.error || 'Erreur de chargement')
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setDashLoading(false)
    }
  }, [])

  /* ─── Fetch users ─── */
  const fetchUsers = useCallback(async (p: number, q: string) => {
    setUsersLoading(true)
    try {
      const params = new URLSearchParams({ action: 'users', page: String(p), limit: '10' })
      if (q) params.set('search', q)
      const res = await fetch(`/api/admin?${params}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'users', page: p, limit: 10, search: q }) })
      const data = await res.json()
      if (data.success) {
        setUsers(data.users)
        setTotalPages(data.pagination.totalPages)
      } else toast.error(data.error || 'Erreur')
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setUsersLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  useEffect(() => {
    if (activeTab === 'users') fetchUsers(page, searchQuery)
  }, [activeTab, page, fetchUsers, searchQuery])

  /* ─── Actions ─── */
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-user', userId, role: newRole }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Rôle mis à jour vers ${newRole}`)
        fetchUsers(page, searchQuery)
        fetchDashboard()
      } else toast.error(data.error || 'Erreur')
    } catch {
      toast.error('Erreur de connexion')
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteDialog.userId) return
    setDeleteLoading(true)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-user', userId: deleteDialog.userId }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Utilisateur supprimé')
        setDeleteDialog({ open: false, userId: '', userName: '' })
        fetchUsers(page, searchQuery)
        fetchDashboard()
      } else toast.error(data.error || 'Erreur')
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleResetCredits = async () => {
    const amount = Number(creditsAmount)
    if (isNaN(amount) || amount < 0) {
      toast.error('Montant invalide')
      return
    }
    setCreditsLoading(true)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-credits', userId: creditsDialog.userId, credits: amount }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Crédits réinitialisés à ${amount}`)
        setCreditsDialog({ open: false, userId: '', userName: '' })
        setCreditsAmount('')
        fetchUsers(page, searchQuery)
      } else toast.error(data.error || 'Erreur')
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setCreditsLoading(false)
    }
  }

  const handleToggleOnline = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-online', userId, isOnline: !currentStatus }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Statut en ligne mis à jour`)
        fetchUsers(page, searchQuery)
        fetchDashboard()
      } else toast.error(data.error || 'Erreur')
    } catch {
      toast.error('Erreur de connexion')
    }
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setPage(1)
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="h-full flex flex-col gap-4 p-4 md:p-6 overflow-y-auto">
      {/* ─── Tabs Header ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Administration</h1>
              <p className="text-xs text-muted-foreground">Gérer la plateforme NexusAI</p>
            </div>
          </div>

          <TabsList className="h-9">
            <TabsTrigger value="dashboard" className="gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" />
              Utilisateurs
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
           Dashboard Tab
           ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="dashboard" className="mt-4">
          {dashLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : dashboard ? (
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
              {/* ─── Stat Cards ─── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Total Utilisateurs',
                    value: dashboard.totalUsers,
                    icon: Users,
                    accent: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                    ring: 'ring-emerald-500/20',
                  },
                  {
                    label: 'En Ligne',
                    value: dashboard.onlineUsers,
                    icon: Wifi,
                    accent: 'bg-green-500/15 text-green-600 dark:text-green-400',
                    ring: 'ring-green-500/20',
                  },
                  {
                    label: 'Inscrits Aujourd\'hui',
                    value: dashboard.newUsersToday,
                    icon: UserPlus,
                    accent: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                    ring: 'ring-amber-500/20',
                  },
                  {
                    label: 'Requêtes Aujourd\'hui',
                    value: dashboard.todayRequests,
                    icon: Activity,
                    accent: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
                    ring: 'ring-violet-500/20',
                  },
                ].map((stat) => (
                  <motion.div key={stat.label} variants={fadeIn}>
                    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg transition-shadow duration-300">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                            <p className="text-2xl font-bold tracking-tight">{stat.value.toLocaleString('fr-FR')}</p>
                          </div>
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.accent} ring-1 ${stat.ring}`}>
                            <stat.icon className="h-5 w-5" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* ─── Platform Stats ─── */}
              <motion.div variants={fadeIn}>
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-emerald-500" />
                      Statistiques Plateforme
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                      {[
                        { label: 'Conversations', value: dashboard.platformStats.totalConversations, icon: MessageSquare, color: 'text-blue-500' },
                        { label: 'Messages', value: dashboard.platformStats.totalMessages, icon: MessageSquare, color: 'text-primary' },
                        { label: 'Recherches', value: dashboard.platformStats.totalSearches, icon: Search, color: 'text-chart-2' },
                        { label: 'Images', value: dashboard.platformStats.totalImages, icon: ImageIcon, color: 'text-chart-4' },
                        { label: 'Agents', value: dashboard.platformStats.totalAgents, icon: Bot, color: 'text-chart-3' },
                        { label: 'Automatisations', value: dashboard.platformStats.totalAutomations, icon: Zap, color: 'text-amber-500' },
                      ].map((s) => (
                        <div key={s.label} className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-muted/30">
                          <s.icon className={`h-5 w-5 ${s.color}`} />
                          <span className="text-lg font-bold">{s.value.toLocaleString('fr-FR')}</span>
                          <span className="text-[10px] text-muted-foreground text-center">{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ─── Usage Chart ─── */}
                <motion.div variants={fadeIn}>
                  <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4 text-emerald-500" />
                        Tendance d&apos;utilisation (30 jours)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-end gap-[3px] h-32">
                        {dashboard.dailyUsageTrend.length > 0 ? (
                          dashboard.dailyUsageTrend.map((day) => {
                            const total =
                              (day.chatRequests ?? 0) +
                              (day.searchRequests ?? 0) +
                              (day.imageRequests ?? 0) +
                              (day.agentRequests ?? 0) +
                              (day.automationRuns ?? 0)
                            const maxTotal = Math.max(
                              ...dashboard.dailyUsageTrend.map(
                                (d) =>
                                  (d.chatRequests ?? 0) +
                                  (d.searchRequests ?? 0) +
                                  (d.imageRequests ?? 0) +
                                  (d.agentRequests ?? 0) +
                                  (d.automationRuns ?? 0)
                              ),
                              1
                            )
                            const height = Math.max(4, (total / maxTotal) * 100)
                            return (
                              <div
                                key={day.date}
                                className="flex-1 flex flex-col items-center gap-1 group"
                                title={`${day.date}: ${total} requêtes`}
                              >
                                <div className="w-full relative">
                                  <div
                                    className="w-full bg-emerald-500/70 dark:bg-emerald-400/60 rounded-t-sm transition-all duration-300 group-hover:bg-emerald-500 dark:group-hover:bg-emerald-400 min-w-[2px]"
                                    style={{ height: `${height}%` }}
                                  />
                                </div>
                                <span className="text-[7px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                  {day.date.slice(5)}
                                </span>
                              </div>
                            )
                          })
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
                            Aucune donnée
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* ─── Recent Users ─── */}
                <motion.div variants={fadeIn}>
                  <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-emerald-500" />
                        Activité récente
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                        {dashboard.recentUsers.length > 0 ? (
                          dashboard.recentUsers.map((u) => (
                            <div
                              key={u.id}
                              className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                                  {getInitial(u.name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium truncate">{u.email}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {relativeTime(u.createdAt)}
                                  </p>
                                </div>
                              </div>
                              {getRoleBadge(u.role)}
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            Aucune inscription récente
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              Impossible de charger les données
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
           Users Tab
           ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="users" className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key="users-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* ─── Search & Actions Bar ─── */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom ou email..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-9 h-9 bg-card/80 backdrop-blur-sm border-border/50"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                  onClick={() => {
                    fetchUsers(page, searchQuery)
                    fetchDashboard()
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Actualiser
                </Button>
              </div>

              {/* ─── Users Table ─── */}
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
                {usersLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/50">
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="text-xs font-medium">Nom</TableHead>
                        <TableHead className="text-xs font-medium hidden md:table-cell">Email</TableHead>
                        <TableHead className="text-xs font-medium">Rôle</TableHead>
                        <TableHead className="text-xs font-medium text-right">Crédits</TableHead>
                        <TableHead className="text-xs font-medium hidden sm:table-cell">Statut</TableHead>
                        <TableHead className="text-xs font-medium hidden lg:table-cell">Dernière connexion</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length > 0 ? (
                        users.map((u) => (
                          <TableRow key={u.id} className="hover:bg-emerald-500/5 transition-colors">
                            <TableCell>
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold ring-1 ring-emerald-500/20">
                                {getInitial(u.name)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium">{u.name}</p>
                                <p className="text-xs text-muted-foreground md:hidden">{u.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className="text-xs text-muted-foreground">{u.email}</span>
                            </TableCell>
                            <TableCell>{getRoleBadge(u.role)}</TableCell>
                            <TableCell className="text-right">
                              <span className="text-sm font-mono font-medium">{u.credits.toLocaleString('fr-FR')}</span>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <div className="flex items-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full ${u.isOnline ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-gray-400 dark:bg-gray-600'}`} />
                                <span className="text-xs text-muted-foreground">{u.isOnline ? 'En ligne' : 'Hors ligne'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <span className="text-xs text-muted-foreground">
                                {u.lastSeen ? relativeTime(u.lastSeen) : 'Jamais'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel className="text-xs text-muted-foreground">Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="gap-2 text-xs cursor-pointer" onClick={() => handleToggleOnline(u.id, u.isOnline)}>
                                    <Wifi className="h-3.5 w-3.5" />
                                    {u.isOnline ? 'Mettre hors ligne' : 'Mettre en ligne'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenu className="w-full">
                                    <DropdownMenuTrigger asChild>
                                      <DropdownMenuItem className="gap-2 text-xs cursor-pointer" onSelect={(e) => e.preventDefault()}>
                                        <UserCog className="h-3.5 w-3.5" />
                                        Modifier le rôle
                                        <ChevronRight className="h-3 w-3 ml-auto" />
                                      </DropdownMenuItem>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent side="left" align="start">
                                      <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => handleRoleChange(u.id, 'user')}>
                                        Utilisateur
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => handleRoleChange(u.id, 'admin')}>
                                        Admin
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => handleRoleChange(u.id, 'superadmin')}>
                                        Superadmin
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  <DropdownMenuItem className="gap-2 text-xs cursor-pointer" onClick={() => { setCreditsDialog({ open: true, userId: u.id, userName: u.name }); setCreditsAmount(String(u.credits)) }}>
                                    <Coins className="h-3.5 w-3.5" />
                                    Réinitialiser crédits
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="gap-2 text-xs text-red-600 dark:text-red-400 cursor-pointer focus:text-red-600 focus:bg-red-500/10"
                                    onClick={() => setDeleteDialog({ open: true, userId: u.id, userName: u.name })}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="h-32 text-center text-muted-foreground text-sm">
                            {searchQuery ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </Card>

              {/* ─── Pagination ─── */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Page {page} sur {totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════
         Credits Dialog
         ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={creditsDialog.open} onOpenChange={(open) => setCreditsDialog({ ...creditsDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-emerald-500" />
              Réinitialiser les crédits
            </DialogTitle>
            <DialogDescription>
              Définir le nouveau montant de crédits pour <span className="font-medium text-foreground">{creditsDialog.userName}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              type="number"
              min={0}
              value={creditsAmount}
              onChange={(e) => setCreditsAmount(e.target.value)}
              placeholder="Montant de crédits"
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreditsDialog({ ...creditsDialog, open: false })}>
              Annuler
            </Button>
            <Button
              size="sm"
              disabled={creditsLoading || !creditsAmount}
              onClick={handleResetCredits}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {creditsLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Appliquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
         Delete Dialog
         ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Trash2 className="h-4 w-4" />
              Supprimer l&apos;utilisateur
            </DialogTitle>
            <DialogDescription>
              Cette action est <span className="font-semibold text-red-600 dark:text-red-400">irréversible</span>. Toutes les données associées seront définitivement supprimées.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm">
              Êtes-vous sûr de vouloir supprimer <span className="font-medium text-foreground">{deleteDialog.userName}</span> ?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteDialog({ ...deleteDialog, open: false })}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteLoading}
              onClick={handleDeleteUser}
            >
              {deleteLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}