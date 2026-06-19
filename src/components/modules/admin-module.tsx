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
  EyeOff,
  BarChart3,
  MessageSquare,
  ImageIcon,
  Bot,
  Zap,
  RefreshCw,
  ArrowUpDown,
  Key,
  Settings,
  Store,
  Plus,
  Pencil,
  Star,
  Download,
  Check,
  X,
  Save,
  Globe,
  Sparkles,
  Filter,
  ScrollText,
  Megaphone,
  Lock,
  Unlock,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

// Sub-components (default exports)
import UserDetailDialog from './admin/user-detail-dialog'
import ActivityLogsTab from './admin/activity-logs-tab'
import AnnouncementsSection from './admin/announcements-section'
import SystemHealth from './admin/system-health'

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

interface SettingItem {
  id: string
  key: string
  value: string
  category: string
  label: string
  description: string
  type: string
  isSecret: boolean
  isDefault: boolean
}

interface MarketplaceAgent {
  id: string
  agentId: string
  name: string
  description: string
  longDescription: string | null
  category: string
  icon: string
  color: string
  systemPrompt: string
  tools: string
  capabilities: string
  tags: string
  author: string
  rating: number
  downloads: number
  isPublished: boolean
  isBuiltIn: boolean
  createdAt: string
  updatedAt: string
}

interface AgentFormData {
  agentId: string
  name: string
  description: string
  longDescription: string
  category: string
  icon: string
  color: string
  systemPrompt: string
  tools: string
  capabilities: string
  tags: string
}

/* ═══════════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════════ */
const AGENT_CATEGORIES = [
  { value: 'research', label: 'Recherche' },
  { value: 'code', label: 'Code' },
  { value: 'content', label: 'Contenu' },
  { value: 'data', label: 'Données' },
  { value: 'design', label: 'Design' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'productivity', label: 'Productivité' },
  { value: 'security', label: 'Sécurité' },
  { value: 'multimodal', label: 'Multimodal' },
  { value: 'business', label: 'Business' },
]

const SETTINGS_DEFINITIONS: Record<string, {
  label: string
  description: string
  type: 'text' | 'password' | 'select' | 'switch' | 'number'
  options?: string[]
  defaultValue?: string
}> = {
  // AI Provider
  ai_provider: { label: 'Fournisseur IA', description: 'Sélectionnez le fournisseur d\'intelligence artificielle principal', type: 'select', options: ['zai', 'openai', 'ollama'] },
  default_model: { label: 'Modèle par défaut', description: 'Nom du modèle utilisé pour les conversations', type: 'text' },
  ollama_base_url: { label: 'URL de base Ollama', description: 'URL du serveur Ollama local', type: 'text' },
  // API Keys
  openai_api_key: { label: 'Clé API OpenAI', description: 'Votre clé API OpenAI pour GPT et DALL-E', type: 'password' },
  tavily_api_key: { label: 'Clé API Tavily', description: 'Votre clé API Tavily pour la recherche web', type: 'password' },
  // Platform
  platform_name: { label: 'Nom de la plateforme', description: 'Nom affiché dans l\'interface', type: 'text' },
  default_language: { label: 'Langue par défaut', description: 'Langue de l\'interface par défaut', type: 'select', options: ['fr', 'en', 'es', 'de', 'ar', 'zh'] },
  default_credits: { label: 'Crédits par défaut', description: 'Nombre de crédits attribués aux nouveaux utilisateurs', type: 'number' },
  max_conversations: { label: 'Conversations maximum', description: 'Limite de conversations simultanées par utilisateur', type: 'number' },
  // Features
  feature_image_gen: { label: 'Génération d\'images', description: 'Activer la fonctionnalité de génération d\'images', type: 'switch' },
  feature_tts: { label: 'Synthèse vocale (TTS)', description: 'Activer la synthèse texte-parole', type: 'switch' },
  feature_asr: { label: 'Reconnaissance vocale (ASR)', description: 'Activer la reconnaissance parole-texte', type: 'switch' },
  feature_web_search: { label: 'Recherche web', description: 'Activer la recherche web intégrée', type: 'switch' },
  feature_marketplace: { label: 'Marketplace d\'agents', description: 'Activer le marketplace d\'agents IA', type: 'switch' },
}

const SETTINGS_CATEGORIES = [
  { key: 'ai_provider', label: 'Fournisseur IA', icon: Sparkles, color: 'text-purple-500' },
  { key: 'api_key', label: 'Clés API', icon: Key, color: 'text-amber-500' },
  { key: 'platform', label: 'Plateforme', icon: Globe, color: 'text-emerald-500' },
  { key: 'feature', label: 'Fonctionnalités', icon: Zap, color: 'text-blue-500' },
]

const EMPTY_AGENT_FORM: AgentFormData = {
  agentId: '',
  name: '',
  description: '',
  longDescription: '',
  category: 'research',
  icon: '🤖',
  color: '#6366f1',
  systemPrompt: '',
  tools: '',
  capabilities: '',
  tags: '',
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function getSettingValue(settings: SettingItem[], key: string): string {
  const s = settings.find((s) => s.key === key)
  return s?.value ?? ''
}

function getCategoryLabel(catValue: string): string {
  return AGENT_CATEGORIES.find((c) => c.value === catValue)?.label ?? catValue
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

const tabVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

/* ═══════════════════════════════════════════════════════════════════════
   API Helper
   ═══════════════════════════════════════════════════════════════════════ */
async function adminFetch<T = unknown>(body: Record<string, unknown>): Promise<{ success: boolean; error?: string } & T> {
  const res = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

/* ═══════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════ */
export default function AdminModule() {
  const [activeTab, setActiveTab] = useState('dashboard')

  // ─── Dashboard state ───
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [dashLoading, setDashLoading] = useState(true)

  // ─── Users tab state ───
  const [users, setUsers] = useState<UserRow[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // ─── Dialogs ───
  const [creditsDialog, setCreditsDialog] = useState<{ open: boolean; userId: string; userName: string }>({ open: false, userId: '', userName: '' })
  const [creditsAmount, setCreditsAmount] = useState('')
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId: string; userName: string }>({ open: false, userId: '', userName: '' })
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [creditsLoading, setCreditsLoading] = useState(false)

  // ─── Settings tab state ───
  const [settings, setSettings] = useState<SettingItem[]>([])
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [secretVisible, setSecretVisible] = useState<Record<string, boolean>>({})
  const [editingSettings, setEditingSettings] = useState<Record<string, string>>({})

  // ─── Marketplace tab state ───
  const [agents, setAgents] = useState<MarketplaceAgent[]>([])
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [agentSearch, setAgentSearch] = useState('')
  const [agentCategoryFilter, setAgentCategoryFilter] = useState<string>('all')
  const [agentDialog, setAgentDialog] = useState<{ open: boolean; mode: 'create' | 'edit'; agent?: MarketplaceAgent }>({ open: false, mode: 'create' })
  const [agentForm, setAgentForm] = useState<AgentFormData>(EMPTY_AGENT_FORM)
  const [agentDialogLoading, setAgentDialogLoading] = useState(false)
  const [agentDeleteDialog, setAgentDeleteDialog] = useState<{ open: boolean; agent?: MarketplaceAgent }>({ open: false })
  const [agentDeleteLoading, setAgentDeleteLoading] = useState(false)

  // ─── System Settings tab state ───
  const [customSettings, setCustomSettings] = useState<SettingItem[]>([])
  const [customSettingsLoading, setCustomSettingsLoading] = useState(false)
  const [customDialog, setCustomDialog] = useState(false)
  const [customForm, setCustomForm] = useState({ key: '', value: '', category: 'custom', label: '', description: '', isSecret: false })
  const [customDialogLoading, setCustomDialogLoading] = useState(false)
  const [customDeleteDialog, setCustomDeleteDialog] = useState<{ open: boolean; setting?: SettingItem }>({ open: false })
  const [customDeleteLoading, setCustomDeleteLoading] = useState(false)

  // ─── User detail dialog ───
  const [userDetailOpen, setUserDetailOpen] = useState(false)
  const [userDetailId, setUserDetailId] = useState<string | null>(null)

  /* ═══════════════════════════════════════════════════════════════════
     Fetch functions
     ═══════════════════════════════════════════════════════════════════ */
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

  const fetchUsers = useCallback(async (p: number, q: string) => {
    setUsersLoading(true)
    try {
      const res = await fetch(`/api/admin?action=users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'users', page: p, limit: 10, search: q }),
      })
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

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true)
    try {
      const data = await adminFetch<{ settings: SettingItem[] }>({ action: 'get-settings' })
      if (data.success) {
        setSettings(data.settings || [])
        const edits: Record<string, string> = {}
        ;(data.settings || []).forEach((s: SettingItem) => {
          edits[s.key] = s.value
        })
        setEditingSettings(edits)
      } else {
        toast.error(data.error || 'Erreur de chargement des paramètres')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setSettingsLoading(false)
    }
  }, [])

  const fetchAgents = useCallback(async () => {
    setAgentsLoading(true)
    try {
      const data = await adminFetch<{ agents: MarketplaceAgent[] }>({ action: 'list-marketplace-agents' })
      if (data.success) {
        setAgents(data.agents || [])
      } else {
        toast.error(data.error || 'Erreur de chargement des agents')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setAgentsLoading(false)
    }
  }, [])

  const fetchCustomSettings = useCallback(async () => {
    setCustomSettingsLoading(true)
    try {
      const data = await adminFetch<{ settings: SettingItem[] }>({ action: 'get-settings' })
      if (data.success) {
        const knownCategories = ['ai_provider', 'api_key', 'platform', 'feature']
        const custom = (data.settings || []).filter((s: SettingItem) => !knownCategories.includes(s.category))
        setCustomSettings(custom)
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setCustomSettingsLoading(false)
    }
  }, [])

  /* ═══════════════════════════════════════════════════════════════════
     Effects
     ═══════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  useEffect(() => {
    if (activeTab === 'users') fetchUsers(page, searchQuery)
  }, [activeTab, page, fetchUsers, searchQuery])

  useEffect(() => {
    if (activeTab === 'settings') fetchSettings()
  }, [activeTab, fetchSettings])

  useEffect(() => {
    if (activeTab === 'marketplace') fetchAgents()
  }, [activeTab, fetchAgents])

  useEffect(() => {
    if (activeTab === 'system') fetchCustomSettings()
  }, [activeTab, fetchCustomSettings])

  /* ═══════════════════════════════════════════════════════════════════
     User Actions
     ═══════════════════════════════════════════════════════════════════ */
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const data = await adminFetch({ action: 'update-user', userId, role: newRole })
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
      const data = await adminFetch({ action: 'delete-user', userId: deleteDialog.userId })
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
      const data = await adminFetch({ action: 'reset-credits', userId: creditsDialog.userId, credits: amount })
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
      const data = await adminFetch({ action: 'toggle-online', userId, isOnline: !currentStatus })
      if (data.success) {
        toast.success('Statut en ligne mis à jour')
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

  /* ═══════════════════════════════════════════════════════════════════
     Settings Actions
     ═══════════════════════════════════════════════════════════════════ */
  const handleSettingChange = (key: string, value: string) => {
    setEditingSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSaveCategory = async (category: string) => {
    const categoryKeys = Object.entries(SETTINGS_DEFINITIONS)
      .filter(([, def]) => {
        const catMap: Record<string, string> = {
          text: 'platform', password: 'api_key', select: 'ai_provider', switch: 'feature', number: 'platform',
        }
        return catMap[def.type] === category
      })
      .map(([key]) => key)

    const updates = categoryKeys
      .filter((key) => editingSettings[key] !== undefined)
      .map((key) => ({ key, value: editingSettings[key] }))

    if (updates.length === 0) {
      toast.info('Aucune modification à sauvegarder')
      return
    }

    setSettingsSaving(true)
    try {
      const data = await adminFetch({ action: 'bulk-update-settings', updates })
      if (data.success) {
        toast.success('Paramètres sauvegardés avec succès')
        fetchSettings()
      } else {
        toast.error(data.error || 'Erreur de sauvegarde')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setSettingsSaving(false)
    }
  }

  const handleSaveAllSettings = async () => {
    const knownKeys = Object.keys(SETTINGS_DEFINITIONS)
    const updates = knownKeys
      .filter((key) => editingSettings[key] !== undefined)
      .map((key) => ({ key, value: editingSettings[key] }))

    if (updates.length === 0) {
      toast.info('Aucune modification à sauvegarder')
      return
    }

    setSettingsSaving(true)
    try {
      const data = await adminFetch({ action: 'bulk-update-settings', updates })
      if (data.success) {
        toast.success('Tous les paramètres sauvegardés')
        fetchSettings()
      } else {
        toast.error(data.error || 'Erreur de sauvegarde')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setSettingsSaving(false)
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     Agent Actions
     ═══════════════════════════════════════════════════════════════════ */
  const openCreateAgentDialog = () => {
    setAgentForm(EMPTY_AGENT_FORM)
    setAgentDialog({ open: true, mode: 'create' })
  }

  const openEditAgentDialog = (agent: MarketplaceAgent) => {
    setAgentForm({
      agentId: agent.agentId,
      name: agent.name,
      description: agent.description,
      longDescription: agent.longDescription || '',
      category: agent.category,
      icon: agent.icon,
      color: agent.color,
      systemPrompt: agent.systemPrompt,
      tools: agent.tools,
      capabilities: agent.capabilities,
      tags: agent.tags,
    })
    setAgentDialog({ open: true, mode: 'edit', agent })
  }

  const handleSaveAgent = async () => {
    if (!agentForm.name.trim() || !agentForm.description.trim() || !agentForm.systemPrompt.trim()) {
      toast.error('Le nom, la description et le prompt système sont requis')
      return
    }

    const finalAgentId = agentDialog.mode === 'create'
      ? slugify(agentForm.name)
      : agentForm.agentId

    setAgentDialogLoading(true)
    try {
      if (agentDialog.mode === 'create') {
        const data = await adminFetch({ action: 'create-marketplace-agent', ...agentForm, agentId: finalAgentId })
        if (data.success) {
          toast.success('Agent créé avec succès')
          setAgentDialog({ open: false, mode: 'create' })
          fetchAgents()
        } else {
          toast.error(data.error || 'Erreur de création')
        }
      } else {
        const data = await adminFetch({
          action: 'update-marketplace-agent',
          id: agentDialog.agent!.id,
          ...agentForm,
          agentId: finalAgentId,
        })
        if (data.success) {
          toast.success('Agent mis à jour avec succès')
          setAgentDialog({ open: false, mode: 'create' })
          fetchAgents()
        } else {
          toast.error(data.error || 'Erreur de mise à jour')
        }
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setAgentDialogLoading(false)
    }
  }

  const handleDeleteAgent = async () => {
    if (!agentDeleteDialog.agent) return
    setAgentDeleteLoading(true)
    try {
      const data = await adminFetch({ action: 'delete-marketplace-agent', id: agentDeleteDialog.agent.id })
      if (data.success) {
        toast.success('Agent supprimé')
        setAgentDeleteDialog({ open: false })
        fetchAgents()
      } else {
        toast.error(data.error || 'Erreur de suppression')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setAgentDeleteLoading(false)
    }
  }

  const handleToggleAgentPublish = async (agent: MarketplaceAgent) => {
    try {
      const data = await adminFetch({ action: 'toggle-marketplace-agent', id: agent.id, isPublished: !agent.isPublished })
      if (data.success) {
        toast.success(agent.isPublished ? 'Agent dépublié' : 'Agent publié')
        fetchAgents()
      } else {
        toast.error(data.error || 'Erreur')
      }
    } catch {
      toast.error('Erreur de connexion')
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     Custom Settings Actions
     ═══════════════════════════════════════════════════════════════════ */
  const handleCreateCustomSetting = async () => {
    if (!customForm.key.trim() || !customForm.label.trim()) {
      toast.error('La clé et le libellé sont requis')
      return
    }
    setCustomDialogLoading(true)
    try {
      const data = await adminFetch({
        action: 'bulk-update-settings',
        updates: [{
          key: customForm.key,
          value: customForm.value,
        }],
      })
      if (data.success) {
        toast.success('Paramètre créé')
        setCustomDialog(false)
        setCustomForm({ key: '', value: '', category: 'custom', label: '', description: '', isSecret: false })
        fetchCustomSettings()
      } else {
        toast.error(data.error || 'Erreur')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setCustomDialogLoading(false)
    }
  }

  const handleDeleteCustomSetting = async () => {
    if (!customDeleteDialog.setting) return
    setCustomDeleteLoading(true)
    try {
      const data = await adminFetch({ action: 'delete-setting', key: customDeleteDialog.setting.key })
      if (data.success) {
        toast.success('Paramètre supprimé')
        setCustomDeleteDialog({ open: false })
        fetchCustomSettings()
      } else {
        toast.error(data.error || 'Erreur')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setCustomDeleteLoading(false)
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     Render helpers
     ═══════════════════════════════════════════════════════════════════ */
  const renderSettingField = (key: string, def: typeof SETTINGS_DEFINITIONS[string], currentValue: string) => {
    switch (def.type) {
      case 'select':
        return (
          <Select
            value={editingSettings[key] ?? currentValue}
            onValueChange={(val) => handleSettingChange(key, val)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              {def.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case 'switch':
        return (
          <Switch
            checked={editingSettings[key] === 'true' || editingSettings[key] === true}
            onCheckedChange={(checked) => handleSettingChange(key, String(checked))}
          />
        )
      case 'number':
        return (
          <Input
            type="number"
            min={0}
            value={editingSettings[key] ?? currentValue}
            onChange={(e) => handleSettingChange(key, e.target.value)}
            className="h-9 font-mono"
          />
        )
      case 'password':
        return (
          <div className="relative">
            <Input
              type={secretVisible[key] ? 'text' : 'password'}
              value={editingSettings[key] ?? currentValue}
              onChange={(e) => handleSettingChange(key, e.target.value)}
              className="h-9 pr-9 font-mono"
              placeholder="••••••••"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-9 w-9"
              onClick={() => setSecretVisible((prev) => ({ ...prev, [key]: !prev[key] }))}
            >
              {secretVisible[key] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </div>
        )
      default:
        return (
          <Input
            type="text"
            value={editingSettings[key] ?? currentValue}
            onChange={(e) => handleSettingChange(key, e.target.value)}
            className="h-9"
          />
        )
    }
  }

  const filteredAgents = agents.filter((a) => {
    const matchSearch = !agentSearch ||
      a.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
      a.description.toLowerCase().includes(agentSearch.toLowerCase()) ||
      a.author.toLowerCase().includes(agentSearch.toLowerCase())
    const matchCategory = agentCategoryFilter === 'all' || a.category === agentCategoryFilter
    return matchSearch && matchCategory
  })

  /* ═══════════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <div className="h-full flex flex-col gap-4 p-4 md:p-6 overflow-y-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Administration</h1>
              <p className="text-xs text-muted-foreground">Gérer la plateforme NexusAI</p>
            </div>
          </div>

          <TabsList className="h-9 flex-wrap">
            <TabsTrigger value="dashboard" className="gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Utilisateurs</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 text-xs">
              <Key className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Configuration</span>
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="gap-1.5 text-xs">
              <Store className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Marketplace</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-1.5 text-xs">
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Système</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5 text-xs">
              <ScrollText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Activité</span>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="gap-1.5 text-xs">
              <Megaphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Annonces</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
           Tab 1: Dashboard
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
           Tab 2: Users
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
                                  <DropdownMenuItem className="gap-2 text-xs cursor-pointer" onClick={() => { setUserDetailId(u.id); setUserDetailOpen(true) }}>
                                    <Eye className="h-3.5 w-3.5" />
                                    Voir le détail
                                  </DropdownMenuItem>
                                  {u.lockedUntil && new Date(u.lockedUntil) > new Date() ? (
                                    <DropdownMenuItem className="gap-2 text-xs cursor-pointer text-emerald-600" onClick={() => { adminFetch({ action: 'unlock-user', userId: u.id }).then(d => { if (d.success) { toast.success('Compte déverrouillé'); fetchUsers(page, searchQuery) } }) }}>
                                      <Unlock className="h-3.5 w-3.5" />
                                      Déverrouiller
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem className="gap-2 text-xs cursor-pointer text-amber-600" onClick={() => { adminFetch({ action: 'lock-user', userId: u.id }).then(d => { if (d.success) { toast.success('Compte verrouillé 24h'); fetchUsers(page, searchQuery) } }) }}>
                                      <Lock className="h-3.5 w-3.5" />
                                      Verrouiller 24h
                                    </DropdownMenuItem>
                                  )}
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

        {/* ═══════════════════════════════════════════════════════════════
           Tab 3: Clés API & Configuration
           ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="settings" className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key="settings-tab"
              variants={tabVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {settingsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* ─── Global Save Button ─── */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <Settings className="h-4 w-4 text-emerald-500" />
                      Configuration de la plateforme
                    </h2>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={settingsSaving}
                      onClick={handleSaveAllSettings}
                    >
                      {settingsSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Sauvegarder tout
                    </Button>
                  </div>

                  {/* ─── Settings Sections by Category ─── */}
                  {SETTINGS_CATEGORIES.map((cat) => {
                    const catKeys = Object.entries(SETTINGS_DEFINITIONS).filter(([key]) => {
                      const setting = settings.find((s) => s.key === key)
                      return setting?.category === cat.key
                    })
                    // Also include keys that belong to this category based on type mapping
                    const typeToCategory: Record<string, string> = {
                      select: 'ai_provider', password: 'api_key', switch: 'feature', number: 'platform', text: 'platform',
                    }
                    const keysInCategory = Object.entries(SETTINGS_DEFINITIONS).filter(([key, def]) => {
                      if (typeToCategory[def.type] === cat.key) {
                        // Check if it's not already claimed by another category mapping
                        if (key === 'default_model' || key === 'ollama_base_url') return cat.key === 'ai_provider'
                        if (key === 'platform_name' || key === 'default_credits' || key === 'max_conversations') return cat.key === 'platform'
                        if (key === 'ai_provider' || key === 'default_model' || key === 'ollama_base_url') return cat.key === 'ai_provider'
                        if (key === 'openai_api_key' || key === 'tavily_api_key') return cat.key === 'api_key'
                        if (key.startsWith('feature_')) return cat.key === 'feature'
                        return typeToCategory[def.type] === cat.key
                      }
                      return false
                    })

                    const Icon = cat.icon
                    return (
                      <motion.div key={cat.key} variants={fadeIn}>
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${cat.color}`} />
                                {cat.label}
                              </CardTitle>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                                disabled={settingsSaving}
                                onClick={() => handleSaveCategory(cat.key)}
                              >
                                {settingsSaving ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                                Sauvegarder
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {keysInCategory.map(([key, def]) => {
                                const currentValue = getSettingValue(settings, key)
                                return (
                                  <div key={key} className="space-y-1.5">
                                    <Label className="text-xs font-semibold">{def.label}</Label>
                                    <p className="text-[11px] text-muted-foreground leading-snug">{def.description}</p>
                                    <div className="pt-0.5">
                                      {renderSettingField(key, def, currentValue)}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
           Tab 4: Marketplace Agents
           ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="marketplace" className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key="marketplace-tab"
              variants={tabVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* ─── Header & Actions ─── */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Store className="h-4 w-4 text-emerald-500" />
                  Agents Marketplace
                </h2>
                <Button
                  size="sm"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={openCreateAgentDialog}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Créer un agent
                </Button>
              </div>

              {/* ─── Search & Filter Bar ─── */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un agent..."
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    className="pl-9 h-9 bg-card/80 backdrop-blur-sm border-border/50"
                  />
                </div>
                <Select value={agentCategoryFilter} onValueChange={setAgentCategoryFilter}>
                  <SelectTrigger className="h-9 w-full sm:w-[180px]">
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les catégories</SelectItem>
                    {AGENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ─── Agents Table ─── */}
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
                {agentsLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/50">
                        <TableHead className="text-xs font-medium w-12"></TableHead>
                        <TableHead className="text-xs font-medium">Nom</TableHead>
                        <TableHead className="text-xs font-medium hidden md:table-cell">Catégorie</TableHead>
                        <TableHead className="text-xs font-medium hidden lg:table-cell">Auteur</TableHead>
                        <TableHead className="text-xs font-medium text-center hidden sm:table-cell">Note</TableHead>
                        <TableHead className="text-xs font-medium text-right hidden sm:table-cell">Téléchargements</TableHead>
                        <TableHead className="text-xs font-medium text-center">Statut</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAgents.length > 0 ? (
                        filteredAgents.map((agent) => (
                          <TableRow key={agent.id} className="hover:bg-emerald-500/5 transition-colors">
                            <TableCell>
                              <div
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg"
                                style={{ backgroundColor: agent.color + '20' }}
                              >
                                {agent.icon}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{agent.name}</p>
                                <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{agent.description}</p>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant="secondary" className="text-[10px]">
                                {getCategoryLabel(agent.category)}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <span className="text-xs text-muted-foreground">{agent.author}</span>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                <span className="text-xs font-medium">{agent.rating.toFixed(1)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Download className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{agent.downloads.toLocaleString('fr-FR')}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                className={`text-[10px] ${
                                  agent.isPublished
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/20'
                                }`}
                              >
                                {agent.isPublished ? 'Publié' : 'Brouillon'}
                              </Badge>
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
                                  <DropdownMenuItem className="gap-2 text-xs cursor-pointer" onClick={() => openEditAgentDialog(agent)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="gap-2 text-xs cursor-pointer" onClick={() => handleToggleAgentPublish(agent)}>
                                    {agent.isPublished ? (
                                      <>
                                        <EyeOff className="h-3.5 w-3.5" />
                                        Dépublier
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="h-3.5 w-3.5" />
                                        Publier
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="gap-2 text-xs text-red-600 dark:text-red-400 cursor-pointer focus:text-red-600 focus:bg-red-500/10"
                                    onClick={() => setAgentDeleteDialog({ open: true, agent })}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    {agent.isBuiltIn ? 'Supprimer (attention)' : 'Supprimer'}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="h-32 text-center text-muted-foreground text-sm">
                            {agentSearch || agentCategoryFilter !== 'all' ? 'Aucun agent trouvé' : 'Aucun agent dans le marketplace'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </Card>

              {/* ─── Results count ─── */}
              <p className="text-xs text-muted-foreground">
                {filteredAgents.length} agent{filteredAgents.length !== 1 ? 's' : ''} affiché{filteredAgents.length !== 1 ? 's' : ''}
              </p>
            </motion.div>
          </AnimatePresence>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
           Tab 5: Paramètres Système
           ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="system" className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key="system-tab"
              variants={tabVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* ─── System Health ─── */}
              <SystemHealth />

              {/* ─── Custom Settings ─── */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Settings className="h-4 w-4 text-emerald-500" />
                  Paramètres système personnalisés
                </h2>
                <Button
                  size="sm"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setCustomDialog(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter un paramètre
                </Button>
              </div>

              {/* ─── Custom Settings Table ─── */}
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
                {customSettingsLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/50">
                        <TableHead className="text-xs font-medium">Clé</TableHead>
                        <TableHead className="text-xs font-medium">Libellé</TableHead>
                        <TableHead className="text-xs font-medium hidden md:table-cell">Valeur</TableHead>
                        <TableHead className="text-xs font-medium hidden lg:table-cell">Catégorie</TableHead>
                        <TableHead className="text-xs font-medium hidden sm:table-cell">Secret</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customSettings.length > 0 ? (
                        customSettings.map((s) => (
                          <TableRow key={s.id} className="hover:bg-emerald-500/5 transition-colors">
                            <TableCell>
                              <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono">{s.key}</code>
                            </TableCell>
                            <TableCell>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{s.label}</p>
                                {s.description && (
                                  <p className="text-[10px] text-muted-foreground truncate">{s.description}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className="text-xs font-mono text-muted-foreground truncate block max-w-[200px]">
                                {s.isSecret ? '••••••••' : s.value}
                              </span>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <Badge variant="secondary" className="text-[10px]">{s.category}</Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {s.isSecret ? (
                                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">Oui</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">Non</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                                onClick={() => setCustomDeleteDialog({ open: true, setting: s })}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-sm">
                            Aucun paramètre personnalisé
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </motion.div>
          </AnimatePresence>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
           Tab 6: Activité Plateforme
           ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="activity" className="mt-4">
          <ActivityLogsTab />
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
           Tab 7: Annonces
           ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="announcements" className="mt-4">
          <AnnouncementsSection />
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════
         User Detail Dialog
         ═══════════════════════════════════════════════════════════════ */}
      <UserDetailDialog
        open={userDetailOpen}
        onOpenChange={(open) => { setUserDetailOpen(open); if (!open) setUserDetailId(null) }}
        userId={userDetailId}
      />

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
         Delete User Dialog
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

      {/* ═══════════════════════════════════════════════════════════════
         Agent Create/Edit Dialog
         ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={agentDialog.open} onOpenChange={(open) => setAgentDialog({ ...agentDialog, open })}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-emerald-500" />
              {agentDialog.mode === 'create' ? 'Créer un agent' : 'Modifier l\'agent'}
            </DialogTitle>
            <DialogDescription>
              {agentDialog.mode === 'create'
                ? 'Configurez les informations de base du nouvel agent IA'
                : 'Modifiez les paramètres de l\'agent'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* ─── Basic Info Row ─── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nom <span className="text-red-500">*</span></Label>
                <Input
                  value={agentForm.name}
                  onChange={(e) => {
                    setAgentForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                      agentId: agentDialog.mode === 'create' ? slugify(e.target.value) : prev.agentId,
                    }))
                  }}
                  placeholder="Mon Agent"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">ID (slug)</Label>
                <Input
                  value={agentForm.agentId}
                  onChange={(e) => setAgentForm((prev) => ({ ...prev, agentId: e.target.value }))}
                  placeholder="mon-agent"
                  className="h-9 font-mono"
                  disabled={agentDialog.mode === 'edit'}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Catégorie</Label>
                <Select value={agentForm.category} onValueChange={(val) => setAgentForm((prev) => ({ ...prev, category: val }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ─── Icon & Color ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Icône</Label>
                <Input
                  value={agentForm.icon}
                  onChange={(e) => setAgentForm((prev) => ({ ...prev, icon: e.target.value }))}
                  placeholder="🤖"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Couleur</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={agentForm.color}
                    onChange={(e) => setAgentForm((prev) => ({ ...prev, color: e.target.value }))}
                    placeholder="#6366f1"
                    className="h-9 font-mono"
                  />
                  <div
                    className="h-9 w-9 rounded-md border border-border shrink-0"
                    style={{ backgroundColor: agentForm.color }}
                  />
                </div>
              </div>
            </div>

            {/* ─── Description ─── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description courte <span className="text-red-500">*</span></Label>
              <Input
                value={agentForm.description}
                onChange={(e) => setAgentForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Description brève de l'agent (une ligne)"
                className="h-9"
              />
            </div>

            {/* ─── Long Description ─── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description longue</Label>
              <Textarea
                value={agentForm.longDescription}
                onChange={(e) => setAgentForm((prev) => ({ ...prev, longDescription: e.target.value }))}
                placeholder="Description détaillée de l'agent, ses capacités et cas d'utilisation..."
                className="min-h-[80px] resize-y"
              />
            </div>

            {/* ─── System Prompt ─── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Prompt système <span className="text-red-500">*</span></Label>
              <Textarea
                value={agentForm.systemPrompt}
                onChange={(e) => setAgentForm((prev) => ({ ...prev, systemPrompt: e.target.value }))}
                placeholder="Vous êtes un agent IA spécialisé dans..."
                className="min-h-[120px] resize-y font-mono text-xs"
              />
            </div>

            {/* ─── Tools, Capabilities, Tags ─── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Outils</Label>
                <Input
                  value={agentForm.tools}
                  onChange={(e) => setAgentForm((prev) => ({ ...prev, tools: e.target.value }))}
                  placeholder="web_search, summarization"
                  className="h-9 font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Séparés par des virgules</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Capacités</Label>
                <Input
                  value={agentForm.capabilities}
                  onChange={(e) => setAgentForm((prev) => ({ ...prev, capabilities: e.target.value }))}
                  placeholder="analysis, coding, writing"
                  className="h-9 font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Séparées par des virgules</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tags</Label>
                <Input
                  value={agentForm.tags}
                  onChange={(e) => setAgentForm((prev) => ({ ...prev, tags: e.target.value }))}
                  placeholder="productivité, IA, assistant"
                  className="h-9 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Séparés par des virgules</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAgentDialog({ ...agentDialog, open: false })}>
              Annuler
            </Button>
            <Button
              size="sm"
              disabled={agentDialogLoading}
              onClick={handleSaveAgent}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {agentDialogLoading ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : agentDialog.mode === 'create' ? (
                <Plus className="h-3.5 w-3.5 mr-1.5" />
              ) : (
                <Check className="h-3.5 w-3.5 mr-1.5" />
              )}
              {agentDialog.mode === 'create' ? 'Créer' : 'Sauvegarder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
         Delete Agent Dialog
         ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={agentDeleteDialog.open} onOpenChange={(open) => setAgentDeleteDialog({ ...agentDeleteDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Trash2 className="h-4 w-4" />
              Supprimer l&apos;agent
            </DialogTitle>
            <DialogDescription>
              {agentDeleteDialog.agent?.isBuiltIn ? (
                <>
                  Cet agent est un <span className="font-semibold text-amber-600 dark:text-amber-400">agent intégré</span>. Sa suppression est irréversible.
                </>
              ) : (
                <>
                  Cette action est <span className="font-semibold text-red-600 dark:text-red-400">irréversible</span>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm">
              Êtes-vous sûr de vouloir supprimer <span className="font-medium text-foreground">{agentDeleteDialog.agent?.name}</span> ?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAgentDeleteDialog({ ...agentDeleteDialog, open: false })}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={agentDeleteLoading}
              onClick={handleDeleteAgent}
            >
              {agentDeleteLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
         Create Custom Setting Dialog
         ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={customDialog} onOpenChange={setCustomDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-500" />
              Ajouter un paramètre
            </DialogTitle>
            <DialogDescription>
              Créer un nouveau paramètre système personnalisé
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Clé <span className="text-red-500">*</span></Label>
                <Input
                  value={customForm.key}
                  onChange={(e) => setCustomForm((prev) => ({ ...prev, key: e.target.value }))}
                  placeholder="mon_parametre"
                  className="h-9 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Libellé <span className="text-red-500">*</span></Label>
                <Input
                  value={customForm.label}
                  onChange={(e) => setCustomForm((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="Mon paramètre"
                  className="h-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Catégorie</Label>
                <Input
                  value={customForm.category}
                  onChange={(e) => setCustomForm((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="custom"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Valeur</Label>
                <Input
                  value={customForm.value}
                  onChange={(e) => setCustomForm((prev) => ({ ...prev, value: e.target.value }))}
                  placeholder="valeur_du_parametre"
                  className="h-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Input
                value={customForm.description}
                onChange={(e) => setCustomForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Description de ce paramètre"
                className="h-9"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={customForm.isSecret}
                onCheckedChange={(checked) => setCustomForm((prev) => ({ ...prev, isSecret: checked }))}
              />
              <Label className="text-xs">Valeur secrète (masquée)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCustomDialog(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              disabled={customDialogLoading}
              onClick={handleCreateCustomSetting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {customDialogLoading ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5 mr-1.5" />
              )}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
         Delete Custom Setting Dialog
         ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={customDeleteDialog.open} onOpenChange={(open) => setCustomDeleteDialog({ ...customDeleteDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Trash2 className="h-4 w-4" />
              Supprimer le paramètre
            </DialogTitle>
            <DialogDescription>
              Cette action est <span className="font-semibold text-red-600 dark:text-red-400">irréversible</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm">
              Supprimer le paramètre <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{customDeleteDialog.setting?.key}</code> ?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCustomDeleteDialog({ ...customDeleteDialog, open: false })}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={customDeleteLoading}
              onClick={handleDeleteCustomSetting}
            >
              {customDeleteLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
