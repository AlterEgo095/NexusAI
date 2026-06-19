'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useSession } from 'next-auth/react'
import {
  User,
  Palette,
  Shield,
  Globe,
  BarChart3,
  Eye,
  EyeOff,
  Trash2,
  Save,
  AlertTriangle,
  Check,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
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
interface UserProfile {
  id: string
  name: string
  email: string
  avatar: string | null
  role: string
  credits: number
  language: string
  createdAt: string
  lastSeen: string | null
}

interface StatsData {
  creditsRemaining: number
  today: {
    chatRequests: number
    searchRequests: number
    imageRequests: number
    agentRequests: number
    automationRuns: number
    voiceRequests: number
    visionRequests: number
    translationRequests: number
    tokensUsed: number
  }
  weeklyTrend: {
    date: string
    chatRequests: number
    searchRequests: number
    imageRequests: number
    tokensUsed: number
  }[]
}

type SettingsTab = 'profile' | 'appearance' | 'security' | 'language' | 'usage'
type FontSize = 'small' | 'medium' | 'large'

/* ─── Config ─── */
const TABS: { id: SettingsTab; label: string; icon: React.ElementType; emoji: string }[] = [
  { id: 'profile', label: 'Profil', icon: User, emoji: '👤' },
  { id: 'appearance', label: 'Apparence', icon: Palette, emoji: '🎨' },
  { id: 'security', label: 'Sécurité', icon: Shield, emoji: '🔒' },
  { id: 'language', label: 'Langue', icon: Globe, emoji: '🌐' },
  { id: 'usage', label: 'Usage', icon: BarChart3, emoji: '📊' },
]

const LANGUAGES = [
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'ar', flag: '🇸🇦', name: 'العربية' },
  { code: 'zh', flag: '🇨🇳', name: '中文' },
]

const AVATAR_COLORS = [
  'bg-rose-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-cyan-500',
  'bg-violet-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-teal-500',
]

const FONT_SIZE_MAP: Record<FontSize, { label: string; desc: string; scale: string }> = {
  small: { label: 'Petit', desc: '14px', scale: 'text-sm' },
  medium: { label: 'Moyen', desc: '16px', scale: 'text-base' },
  large: { label: 'Grand', desc: '18px', scale: 'text-lg' },
}

/* ─── Animation ─── */
const contentVariants = {
  hidden: { opacity: 0, x: 12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, x: -12, transition: { duration: 0.15, ease: 'easeIn' } },
}

/* ─── Helpers ─── */
function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getPasswordStrength(password: string): {
  label: string
  color: string
  width: string
  level: 'weak' | 'medium' | 'strong'
} {
  if (!password) return { label: '', color: 'bg-muted', width: 'w-0', level: 'weak' }

  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)
  const hasLength = password.length >= 8

  if (hasLength && hasUpper && hasLower && hasNumber && hasSpecial) {
    return { label: 'Fort', color: 'bg-emerald-500', width: 'w-full', level: 'strong' }
  }
  if (hasLength && hasUpper && hasLower) {
    return { label: 'Moyen', color: 'bg-amber-500', width: 'w-2/3', level: 'medium' }
  }
  return { label: 'Faible', color: 'bg-rose-500', width: 'w-1/3', level: 'weak' }
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  return days[d.getDay()]
}

function formatNumber(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */
export default function SettingsModule() {
  /* ─── State ─── */
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)

  // Profile form
  const [name, setName] = useState('')
  const [avatarLetter, setAvatarLetter] = useState('')

  // Appearance
  const { theme, setTheme } = useTheme()
  const [fontSize, setFontSize] = useState<FontSize>('medium')
  const [compactMode, setCompactMode] = useState(false)

  // Security
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Language
  const [selectedLang, setSelectedLang] = useState('fr')
  const [langSaving, setLangSaving] = useState(false)

  // Usage / Stats
  const [stats, setStats] = useState<StatsData | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const session = useSession()

  /* ─── Load Profile ─── */
  const loadProfile = useCallback(async () => {
    setProfileLoading(true)
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      if (data.success && data.profile) {
        setProfile(data.profile)
        setName(data.profile.name)
        setAvatarLetter(data.profile.name?.charAt(0)?.toUpperCase() || 'U')
        setSelectedLang(data.profile.language || 'fr')
      }
    } catch {
      toast.error('Impossible de charger le profil')
    } finally {
      setProfileLoading(false)
    }
  }, [])

  /* ─── Load Stats ─── */
  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await fetch('/api/stats')
      const data = await res.json()
      if (data.success && data.stats) {
        setStats(data.stats)
      }
    } catch {
      // silent
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
    loadStats()
  }, [loadProfile, loadStats])

  /* ─── Load appearance prefs from localStorage ─── */
  useEffect(() => {
    try {
      const savedFontSize = localStorage.getItem('nexusai-font-size') as FontSize | null
      if (savedFontSize && ['small', 'medium', 'large'].includes(savedFontSize)) {
        setFontSize(savedFontSize)
      }
      const savedCompact = localStorage.getItem('nexusai-compact-mode')
      if (savedCompact === 'true') {
        setCompactMode(true)
      }
      const savedLang = localStorage.getItem('nexusai-language')
      if (savedLang) {
        setSelectedLang(savedLang)
      }
    } catch {
      // ignore
    }
  }, [])

  /* ─── Derived ─── */
  const displayName = session?.data?.user?.name || profile?.name || 'Utilisateur'
  const displayEmail = session?.data?.user?.email || profile?.email || ''
  const displayRole = profile?.role || 'user'
  const displayCredits = profile?.credits ?? 0
  const avatarColor = getAvatarColor(displayName)
  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword])

  const maxCredits = 10000
  const creditsPercent = Math.min((displayCredits / maxCredits) * 100, 100)

  /* ─── Actions ─── */
  async function handleSaveProfile() {
    if (!name.trim()) {
      toast.error('Le nom ne peut pas être vide')
      return
    }
    setSavingProfile(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-profile', name, avatar: avatarLetter }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Profil mis à jour avec succès')
        setProfile((p) => p ? { ...p, name, avatar: avatarLetter } : p)
      } else {
        toast.error(data.error || 'Erreur lors de la mise à jour')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Veuillez remplir tous les champs')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    if (passwordStrength.level === 'weak') {
      toast.error('Le mot de passe est trop faible')
      return
    }
    setChangingPw(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change-password', currentPassword, newPassword }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Mot de passe mis à jour avec succès')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.error(data.error || 'Erreur lors du changement de mot de passe')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setChangingPw(false)
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'SUPPRIMER') return
    setDeleting(true)
    try {
      // Simulated — would call a real delete endpoint
      await new Promise((r) => setTimeout(r, 1500))
      toast.error('La suppression de compte nécessite une confirmation par email (non implémenté en démo)')
      setDeleteDialogOpen(false)
      setDeleteConfirmText('')
    } catch {
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeleting(false)
    }
  }

  async function handleLanguageChange(code: string) {
    setSelectedLang(code)
    setLangSaving(true)
    localStorage.setItem('nexusai-language', code)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-language', language: code }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Langue mise à jour')
      } else {
        toast.error(data.error || 'Erreur lors du changement de langue')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLangSaving(false)
    }
  }

  function handleFontSizeChange(size: FontSize) {
    setFontSize(size)
    localStorage.setItem('nexusai-font-size', size)
    toast.success(`Taille de police : ${FONT_SIZE_MAP[size].label}`)
  }

  function handleCompactToggle(checked: boolean) {
    setCompactMode(checked)
    localStorage.setItem('nexusai-compact-mode', String(checked))
    toast.success(checked ? 'Mode compact activé' : 'Mode compact désactivé')
  }

  /* ═══════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="flex h-full gap-6 p-6">
      {/* ─── Left Navigation ─── */}
      <nav
        className="hidden md:flex flex-col w-56 shrink-0 gap-1"
        aria-label="Paramètres"
      >
        <h2 className="mb-4 text-lg font-semibold text-foreground">Paramètres</h2>
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                group relative flex items-center gap-3 rounded-lg px-3 py-2.5
                text-sm font-medium transition-all duration-200 outline-none
                focus-visible:ring-2 focus-visible:ring-ring/50
                ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="settings-active-tab"
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-[60%] w-[3px] rounded-r-full bg-primary"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <Icon className="size-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* ─── Mobile Tab Bar ─── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex border-t border-border/50 bg-background/80 backdrop-blur-xl">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors
                ${isActive ? 'text-primary' : 'text-muted-foreground'}
              `}
            >
              <Icon className="size-4" />
              <span className="truncate text-[10px]">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ─── Content Area ─── */}
      <div className="flex-1 min-w-0 pb-20 md:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="max-w-2xl mx-auto"
          >
            {/* ═══ PROFIL ═══ */}
            {activeTab === 'profile' && (
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="size-5 text-primary" />
                    Profil
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {profileLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-20 w-20 rounded-full mx-auto" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <>
                      {/* Avatar */}
                      <div className="flex flex-col items-center gap-4">
                        <div
                          className={`relative flex size-20 items-center justify-center rounded-full ${avatarColor} text-white text-2xl font-bold cursor-pointer select-none transition-transform hover:scale-105`}
                          onClick={() => {
                            const input = window.prompt('Première lettre de l\'avatar :', avatarLetter)
                            if (input && input.trim()) {
                              const letter = input.trim().charAt(0).toUpperCase()
                              setAvatarLetter(letter)
                            }
                          }}
                          title="Cliquer pour changer la lettre"
                        >
                          {avatarLetter || displayName.charAt(0).toUpperCase()}
                        </div>
                      </div>

                      {/* Name */}
                      <div className="space-y-2">
                        <Label htmlFor="settings-name">Nom</Label>
                        <Input
                          id="settings-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Votre nom"
                        />
                      </div>

                      {/* Email (read-only) */}
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          value={displayEmail}
                          readOnly
                          className="bg-muted/50 cursor-not-allowed"
                        />
                      </div>

                      {/* Role & Credits */}
                      <div className="flex flex-wrap gap-3">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">Rôle</Label>
                          <Badge variant="secondary" className="capitalize">
                            {displayRole}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">Crédits</Label>
                          <Badge variant="outline" className="font-mono">
                            {formatNumber(displayCredits)}
                          </Badge>
                        </div>
                      </div>

                      <Separator />

                      <Button
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="w-full sm:w-auto"
                      >
                        {savingProfile ? (
                          <span className="flex items-center gap-2">
                            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Enregistrement...
                          </span>
                        ) : (
                          <>
                            <Save className="size-4 mr-2" />
                            Sauvegarder
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ═══ APPARENCE ═══ */}
            {activeTab === 'appearance' && (
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="size-5 text-primary" />
                    Apparence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Theme Toggle */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Thème</Label>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                          <span className="text-lg">☀️</span>
                        </div>
                        <span className="text-sm font-medium">Mode sombre</span>
                      </div>
                      <Switch
                        checked={theme === 'dark'}
                        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Font Size */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Taille de la police</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {(Object.keys(FONT_SIZE_MAP) as FontSize[]).map((size) => {
                        const config = FONT_SIZE_MAP[size]
                        const isSelected = fontSize === size
                        return (
                          <button
                            key={size}
                            onClick={() => handleFontSizeChange(size)}
                            className={`
                              relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all
                              ${
                                isSelected
                                  ? 'border-primary bg-primary/5 text-primary'
                                  : 'border-border hover:border-primary/30'
                              }
                            `}
                          >
                            {isSelected && (
                              <div className="absolute top-2 right-2">
                                <Check className="size-3.5 text-primary" />
                              </div>
                            )}
                            <span className={`font-medium ${config.scale}`}>
                              Aa
                            </span>
                            <div className="text-center">
                              <p className="text-xs font-medium">{config.label}</p>
                              <p className="text-[10px] text-muted-foreground">{config.desc}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Compact Mode */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Mode compact</Label>
                      <p className="text-xs text-muted-foreground">
                        Réduire les espaces et les marges dans l'interface
                      </p>
                    </div>
                    <Switch
                      checked={compactMode}
                      onCheckedChange={handleCompactToggle}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ═══ SÉCURITÉ ═══ */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="size-5 text-primary" />
                      Changer le mot de passe
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Current Password */}
                    <div className="space-y-2">
                      <Label htmlFor="current-pw">Mot de passe actuel</Label>
                      <div className="relative">
                        <Input
                          id="current-pw"
                          type={showCurrentPw ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPw(!showCurrentPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showCurrentPw ? 'Masquer' : 'Afficher'}
                        >
                          {showCurrentPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div className="space-y-2">
                      <Label htmlFor="new-pw">Nouveau mot de passe</Label>
                      <div className="relative">
                        <Input
                          id="new-pw"
                          type={showNewPw ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPw(!showNewPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showNewPw ? 'Masquer' : 'Afficher'}
                        >
                          {showNewPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      {/* Strength indicator */}
                      {newPassword && (
                        <div className="space-y-1.5">
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${passwordStrength.color}`}
                              initial={{ width: 0 }}
                              animate={{ width: passwordStrength.width === 'w-full' ? '100%' : passwordStrength.width === 'w-2/3' ? '66.6%' : '33.3%' }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                          <p className={`text-xs font-medium ${
                            passwordStrength.level === 'strong'
                              ? 'text-emerald-500'
                              : passwordStrength.level === 'medium'
                                ? 'text-amber-500'
                                : 'text-rose-500'
                          }`}>
                            Force : {passwordStrength.label}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                      <Label htmlFor="confirm-pw">Confirmer le mot de passe</Label>
                      <div className="relative">
                        <Input
                          id="confirm-pw"
                          type={showConfirmPw ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPw(!showConfirmPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showConfirmPw ? 'Masquer' : 'Afficher'}
                        >
                          {showConfirmPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-xs text-rose-500 flex items-center gap-1">
                          <AlertTriangle className="size-3" />
                          Les mots de passe ne correspondent pas
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={handleChangePassword}
                      disabled={changingPw || !currentPassword || !newPassword || !confirmPassword}
                      className="w-full sm:w-auto"
                    >
                      {changingPw ? (
                        <span className="flex items-center gap-2">
                          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Mise à jour...
                        </span>
                      ) : (
                        'Mettre à jour'
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* ─── Danger Zone ─── */}
                <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-rose-200 dark:border-rose-900/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="size-5" />
                      Zone de danger
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      La suppression de votre compte est irréversible. Toutes vos données, conversations et fichiers seront définitivement supprimés.
                    </p>
                    <Button
                      variant="destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                      className="gap-2"
                    >
                      <Trash2 className="size-4" />
                      Supprimer mon compte
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ═══ LANGUE ═══ */}
            {activeTab === 'language' && (
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="size-5 text-primary" />
                    Langue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {LANGUAGES.map((lang) => {
                      const isSelected = selectedLang === lang.code
                      return (
                        <motion.button
                          key={lang.code}
                          onClick={() => handleLanguageChange(lang.code)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`
                            relative flex flex-col items-center gap-2 rounded-lg border-2 p-5 transition-all
                            ${
                              isSelected
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : 'border-border hover:border-primary/30'
                            }
                          `}
                          disabled={langSaving}
                        >
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2 right-2"
                            >
                              <Check className="size-4 text-primary" />
                            </motion.div>
                          )}
                          <span className="text-3xl">{lang.flag}</span>
                          <span className="text-sm font-medium">{lang.name}</span>
                        </motion.button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ═══ USAGE ═══ */}
            {activeTab === 'usage' && (
              <div className="space-y-6">
                {/* Credits Card */}
                <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <BarChart3 className="size-5 text-primary" />
                        Crédits restants
                      </span>
                      <span className="text-2xl font-bold font-mono tabular-nums">
                        {formatNumber(stats?.creditsRemaining ?? displayCredits)}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Progress
                      value={stats ? (stats.creditsRemaining / maxCredits) * 100 : creditsPercent}
                      className="h-3"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      sur {formatNumber(maxCredits)} crédits
                    </p>
                  </CardContent>
                </Card>

                {/* Today's Usage */}
                <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="size-5 text-primary" />
                      Utilisation d&apos;aujourd&apos;hui
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {statsLoading ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <Skeleton key={i} className="h-16 rounded-lg" />
                        ))}
                      </div>
                    ) : stats ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {[
                          { label: 'Chat', value: stats.today.chatRequests },
                          { label: 'Recherche', value: stats.today.searchRequests },
                          { label: 'Images', value: stats.today.imageRequests },
                          { label: 'Agents', value: stats.today.agentRequests },
                          { label: 'Voix', value: stats.today.voiceRequests },
                          { label: 'Traductions', value: stats.today.translationRequests },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 p-3 text-center"
                          >
                            <span className="text-lg font-bold tabular-nums">{item.value}</span>
                            <span className="text-[11px] text-muted-foreground">{item.label}</span>
                          </div>
                        ))}
                        <div className="col-span-2 sm:col-span-3 flex items-center justify-center gap-2 rounded-lg bg-primary/5 p-3">
                          <span className="text-sm text-muted-foreground">Tokens utilisés :</span>
                          <span className="font-bold font-mono tabular-nums">
                            {formatNumber(stats.today.tokensUsed)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Données indisponibles
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Weekly Trend */}
                <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="size-5 text-primary" />
                      Tendance hebdomadaire
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {statsLoading ? (
                      <Skeleton className="h-48 w-full rounded-lg" />
                    ) : stats && stats.weeklyTrend.length > 0 ? (
                      <div className="space-y-4">
                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block size-2.5 rounded-full bg-primary" />
                            Chat
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block size-2.5 rounded-full bg-amber-500" />
                            Recherche
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block size-2.5 rounded-full bg-emerald-500" />
                            Images
                          </span>
                        </div>

                        {/* Bar Chart */}
                        <div className="flex items-end gap-2 h-40">
                          {stats.weeklyTrend.map((day) => {
                            const maxVal = Math.max(
                              ...stats.weeklyTrend.map(
                                (d) => d.chatRequests + d.searchRequests + d.imageRequests
                              ),
                              1
                            )
                            const total = day.chatRequests + day.searchRequests + day.imageRequests
                            const chatH = (day.chatRequests / maxVal) * 100
                            const searchH = (day.searchRequests / maxVal) * 100
                            const imageH = (day.imageRequests / maxVal) * 100

                            return (
                              <div
                                key={day.date}
                                className="flex flex-1 flex-col items-center gap-1"
                              >
                                {/* Stacked bars */}
                                <div className="relative flex w-full flex-col-reverse gap-0.5 rounded-t" style={{ height: '80%' }}>
                                  <motion.div
                                    className="w-full rounded-t bg-primary/80 min-h-0"
                                    initial={{ height: 0 }}
                                    animate={{ height: `${chatH}%` }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                    title={`Chat: ${day.chatRequests}`}
                                  />
                                  <motion.div
                                    className="w-full bg-amber-500/80 min-h-0"
                                    initial={{ height: 0 }}
                                    animate={{ height: `${searchH}%` }}
                                    transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                                    title={`Recherche: ${day.searchRequests}`}
                                  />
                                  <motion.div
                                    className="w-full rounded-t bg-emerald-500/80 min-h-0"
                                    initial={{ height: 0 }}
                                    animate={{ height: `${imageH}%` }}
                                    transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
                                    title={`Images: ${day.imageRequests}`}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  {getDayLabel(day.date)}
                                </span>
                                {total > 0 && (
                                  <span className="text-[10px] font-mono tabular-nums">
                                    {total}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucune donnée cette semaine
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── Delete Account Dialog ─── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="size-5" />
              Supprimer mon compte
            </DialogTitle>
            <DialogDescription asChild>
              <p className="text-sm text-muted-foreground">
                Êtes-vous sûr ? Cette action est irréversible. Toutes vos données seront définitivement supprimées.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Label className="text-sm font-medium">
              Tapez <span className="font-mono font-bold text-rose-500">SUPPRIMER</span> pour confirmer
            </Label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="SUPPRIMER"
              className="font-mono"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setDeleteConfirmText('')
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'SUPPRIMER' || deleting}
              className="gap-2"
            >
              {deleting ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Suppression...
                </span>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Supprimer définitivement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}