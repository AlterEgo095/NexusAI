'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Loader2,
  Megaphone,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

/* ═══════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════ */
interface Announcement {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  isActive: boolean
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

function getTypeBadge(type: string) {
  switch (type) {
    case 'info':
      return (
        <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/25 gap-1">
          <Info className="h-3 w-3" />
          Info
        </Badge>
      )
    case 'warning':
      return (
        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/25 gap-1">
          <AlertTriangle className="h-3 w-3" />
          Avertissement
        </Badge>
      )
    case 'success':
      return (
        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25 gap-1">
          <CheckCircle className="h-3 w-3" />
          Succès
        </Badge>
      )
    case 'error':
      return (
        <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/25 gap-1">
          <XCircle className="h-3 w-3" />
          Erreur
        </Badge>
      )
    default:
      return <Badge variant="outline">{type}</Badge>
  }
}

function getTypeBorderColor(type: string): string {
  switch (type) {
    case 'info': return 'border-l-blue-500'
    case 'warning': return 'border-l-amber-500'
    case 'success': return 'border-l-emerald-500'
    case 'error': return 'border-l-red-500'
    default: return 'border-l-border'
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
export default function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogLoading, setDialogLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'info' as Announcement['type'],
  })
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [toggleLoading, setToggleLoading] = useState<string | null>(null)

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminFetch<{ announcements: Announcement[] }>({ action: 'list-announcements' })
      if (data.success) {
        setAnnouncements(data.announcements || [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  const handleCreate = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Le titre et le message sont requis')
      return
    }
    setDialogLoading(true)
    try {
      const data = await adminFetch({
        action: 'create-announcement',
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
      })
      if (data.success) {
        toast.success('Annonce créée avec succès')
        setDialogOpen(false)
        setForm({ title: '', message: '', type: 'info' })
        fetchAnnouncements()
      } else {
        toast.error(data.error || 'Erreur lors de la création')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setDialogLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleteLoading(id)
    try {
      const data = await adminFetch({ action: 'delete-announcement', id })
      if (data.success) {
        toast.success('Annonce supprimée')
        fetchAnnouncements()
      } else {
        toast.error(data.error || 'Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setDeleteLoading(null)
    }
  }

  const handleToggle = async (id: string, currentStatus: boolean) => {
    setToggleLoading(id)
    try {
      const data = await adminFetch({ action: 'toggle-announcement', id, isActive: !currentStatus })
      if (data.success) {
        toast.success(currentStatus ? 'Annonce désactivée' : 'Annonce activée')
        fetchAnnouncements()
      } else {
        toast.error(data.error || 'Erreur lors de la modification')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setToggleLoading(null)
    }
  }

  return (
    <>
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
        {/* ─── Header ─── */}
        <motion.div variants={fadeIn}>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-emerald-500" />
                  Annonces de la plateforme
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => setDialogOpen(true)}
                  className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nouvelle annonce
                </Button>
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        {/* ─── Announcements List ─── */}
        {loading ? (
          <motion.div variants={fadeIn}>
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : announcements.length > 0 ? (
          <motion.div variants={staggerItem} className="space-y-3">
            {announcements.map((ann) => (
              <motion.div key={ann.id} variants={fadeIn}>
                <Card className={`border-border/50 bg-card/80 backdrop-blur-sm border-l-4 ${getTypeBorderColor(ann.type)}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <h4 className="text-sm font-semibold truncate">{ann.title}</h4>
                          {getTypeBadge(ann.type)}
                          {ann.isActive ? (
                            <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/25 gap-1 text-[10px]">
                              <Eye className="h-2.5 w-2.5" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-[10px]">
                              <EyeOff className="h-2.5 w-2.5" />
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {ann.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          {relativeTime(ann.createdAt)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={toggleLoading === ann.id}
                          onClick={() => handleToggle(ann.id, ann.isActive)}
                          title={ann.isActive ? 'Désactiver' : 'Activer'}
                        >
                          {toggleLoading === ann.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : ann.isActive ? (
                            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          disabled={deleteLoading === ann.id}
                          onClick={() => handleDelete(ann.id)}
                          title="Supprimer"
                        >
                          {deleteLoading === ann.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div variants={fadeIn}>
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <Megaphone className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">Aucune annonce</p>
                  <p className="text-xs mt-1">
                    Créez une annonce pour informer les utilisateurs
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════
         Create Announcement Dialog
         ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-emerald-500" />
              Nouvelle annonce
            </DialogTitle>
            <DialogDescription>
              Créer une annonce qui sera affichée à tous les utilisateurs.
              Seule une annonce peut être active à la fois.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">
                Titre <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Titre de l'annonce"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">
                Message <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                placeholder="Contenu de l'annonce..."
                className="min-h-[100px] resize-y"
                rows={4}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Type</label>
              <Select
                value={form.type}
                onValueChange={(val) => setForm((prev) => ({ ...prev, type: val as Announcement['type'] }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">
                    <span className="flex items-center gap-2">
                      <Info className="h-3.5 w-3.5 text-blue-500" />
                      Information
                    </span>
                  </SelectItem>
                  <SelectItem value="warning">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      Avertissement
                    </span>
                  </SelectItem>
                  <SelectItem value="success">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      Succès
                    </span>
                  </SelectItem>
                  <SelectItem value="error">
                    <span className="flex items-center gap-2">
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                      Erreur
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              disabled={dialogLoading || !form.title.trim() || !form.message.trim()}
              onClick={handleCreate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {dialogLoading ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5 mr-1.5" />
              )}
              Créer l&apos;annonce
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
