'use client'

import { useMemo } from 'react'
import type { Variants } from 'framer-motion'
import { motion } from 'framer-motion'
import {
  MessageSquare,
  Search,
  Palette,
  FileText,
  Sparkles,
  TrendingUp,
  Image as ImageIcon,
  Bot,
  ArrowRight,
  Clock,
  Inbox,
  Globe,
  Zap,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useWorkspaceStore, type ActivityItem } from '@/store/workspace-store'

/* ─── Animation variants ─── */
const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

/* ─── Quick actions data ─── */
const QUICK_ACTIONS = [
  {
    id: 'chat' as const,
    title: 'Chat IA',
    description: 'Discutez avec l\'IA',
    icon: MessageSquare,
    accent: 'bg-primary/15 text-primary',
    ring: 'group-hover:ring-primary/30',
    glow: 'hover:shadow-primary/20',
  },
  {
    id: 'search' as const,
    title: 'Recherche Web',
    description: 'Recherche intelligente',
    icon: Search,
    accent: 'bg-chart-2/15 text-chart-2',
    ring: 'group-hover:ring-chart-2/30',
    glow: 'hover:shadow-chart-2/20',
  },
  {
    id: 'design' as const,
    title: 'Design Studio',
    description: 'Créez des images',
    icon: Palette,
    accent: 'bg-chart-4/15 text-chart-4',
    ring: 'group-hover:ring-chart-4/30',
    glow: 'hover:shadow-chart-4/20',
  },
  {
    id: 'documents' as const,
    title: 'Documents',
    description: 'Générez des documents',
    icon: FileText,
    accent: 'bg-chart-3/15 text-chart-3',
    ring: 'group-hover:ring-chart-3/30',
    glow: 'hover:shadow-chart-3/20',
  },
]

/* ─── Activity icon map ─── */
function getActivityIcon(type: ActivityItem['type']) {
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

function getActivityColor(type: ActivityItem['type']) {
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

/* ─── Relative time ─── */
function relativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'À l\'instant'
  if (minutes < 60) return `Il y a ${minutes}min`
  if (hours < 24) return `Il y a ${hours}h`
  if (days < 7) return `Il y a ${days}j`
  return date.toLocaleDateString('fr-FR')
}

/* ─── Sparkline mini chart ─── */
function MiniSparkline({ color }: { color: string }) {
  const points = useMemo(() => {
    const pts: number[] = []
    for (let i = 0; i < 12; i++) {
      pts.push(20 + Math.random() * 60 + (i > 6 ? Math.random() * 20 : 0))
    }
    return pts
  }, [])

  const maxVal = Math.max(...points)
  const minVal = Math.min(...points)
  const range = maxVal - minVal || 1
  const w = 80
  const h = 28
  const step = w / (points.length - 1)

  const pathD = points
    .map((p, i) => {
      const x = i * step
      const y = h - ((p - minVal) / range) * h
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')

  const areaD = `${pathD} L ${w} ${h} L 0 ${h} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
      <path d={areaD} fill="currentColor" opacity="0.1" className={color} />
      <path d={pathD} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={color} />
    </svg>
  )
}

/* ─── Stats section ─── */
function StatsSection() {
  const conversations = useWorkspaceStore((s) => s.conversations)
  const generatedImages = useWorkspaceStore((s) => s.generatedImages)
  const customAgents = useWorkspaceStore((s) => s.customAgents)

  const stats = [
    {
      label: 'Conversations',
      value: conversations.length,
      icon: MessageSquare,
      color: 'text-primary',
      sparkColor: 'text-primary',
    },
    {
      label: 'Images générées',
      value: generatedImages.length,
      icon: ImageIcon,
      color: 'text-chart-4',
      sparkColor: 'text-chart-4',
    },
    {
      label: 'Agents actifs',
      value: customAgents.filter((a) => a.isActive).length,
      icon: Bot,
      color: 'text-chart-3',
      sparkColor: 'text-chart-3',
    },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <motion.div key={stat.label} variants={item}>
          <Card className="glass-subtle module-card overflow-hidden">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`flex size-10 items-center justify-center rounded-xl bg-current/10 ${stat.color}`}>
                <stat.icon className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
              <div className="w-20 h-8 flex-shrink-0 opacity-60">
                <MiniSparkline color={stat.sparkColor} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}

/* ─── Recent Activity section ─── */
function RecentActivitySection() {
  const activities = useWorkspaceStore((s) => s.activities)
  const recent = activities.slice(0, 6)

  return (
    <motion.div variants={item} className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">Activité récente</h3>
        {activities.length > 0 && (
          <Badge variant="secondary" className="text-xs font-normal">
            {activities.length} activités
          </Badge>
        )}
      </div>

      {recent.length === 0 ? (
        <Card className="glass-subtle">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted/50 mb-4">
              <Inbox className="size-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium">Aucune activité récente</p>
            <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
              Commencez à utiliser les modules pour voir votre activité ici
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {recent.map((activity) => {
            const Icon = getActivityIcon(activity.type)
            const colorClass = getActivityColor(activity.type)
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="glass-subtle module-card">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`flex size-9 items-center justify-center rounded-lg flex-shrink-0 ${colorClass}`}>
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.action}</p>
                      <p className="text-xs text-muted-foreground truncate">{activity.details}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground/70 flex-shrink-0 flex items-center gap-1">
                      <Clock className="size-3" />
                      {relativeTime(activity.createdAt)}
                    </span>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

/* ─── Active Agents section ─── */
function ActiveAgentsSection() {
  const customAgents = useWorkspaceStore((s) => s.customAgents)
  const activeAgents = customAgents.filter((a) => a.isActive)
  const setActiveModule = useWorkspaceStore((s) => s.setActiveModule)

  return (
    <motion.div variants={item} className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">Agents actifs</h3>
        <button
          onClick={() => setActiveModule('agents')}
          className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
        >
          Voir tous
          <ArrowRight className="size-3" />
        </button>
      </div>

      {activeAgents.length === 0 ? (
        <Card className="glass-subtle">
          <CardContent className="flex items-center justify-center py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted/50 mb-3">
              <Bot className="size-6 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm">Aucun agent actif</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {activeAgents.map((agent) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="glass-subtle module-card">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-muted/50 text-xl flex-shrink-0">
                    {agent.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{agent.name}</p>
                      <span className={`status-dot ${agent.status}`} title={agent.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {agent.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

/* ─── Main Home Module ─── */
export default function HomeModule() {
  const setActiveModule = useWorkspaceStore((s) => s.setActiveModule)

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-6xl mx-auto space-y-8"
      >
        {/* ── Welcome Section ── */}
        <motion.div variants={item} className="relative">
          {/* Subtle gradient glow behind */}
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-primary/10 via-chart-2/5 to-chart-4/8 blur-3xl" />
          
          <div className="relative pt-6 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 glow-sm">
                <Sparkles className="size-5 text-primary" />
              </div>
              <Badge variant="secondary" className="text-[10px] font-normal">
                <Globe className="size-3 mr-1" />
                NexusAI Workspace
              </Badge>
            </div>
            <h1 className="font-bold text-3xl md:text-4xl tracking-tight">
              Bienvenue sur{' '}
              <span className="bg-gradient-to-r from-primary via-chart-2 to-chart-4 bg-clip-text text-transparent">
                NexusAI
              </span>
            </h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-lg">
              Votre espace de travail IA tout-en-un
            </p>
          </div>
        </motion.div>

        {/* ── Quick Actions Grid ── */}
        <motion.div variants={container} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action) => (
            <motion.div key={action.id} variants={item}>
              <Card
                className={`glass module-card cursor-pointer group ring-0 group-hover:ring-1 ${action.ring} ${action.glow} group-hover:shadow-lg transition-all duration-300`}
                onClick={() => setActiveModule(action.id)}
              >
                <CardContent className="p-5 flex flex-col items-start gap-3 text-left">
                  <div className={`flex size-12 items-center justify-center rounded-2xl ${action.accent} transition-transform duration-300 group-hover:scale-110`}>
                    <action.icon className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm tracking-tight">{action.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                  </div>
                  <div className="mt-auto self-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Stats Section ── */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <TrendingUp className="size-4 text-muted-foreground" />
            Statistiques
          </h3>
          <StatsSection />
        </div>

        {/* ── Bottom Grid: Activity + Agents ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentActivitySection />
          <ActiveAgentsSection />
        </div>
      </motion.div>
    </div>
  )
}
