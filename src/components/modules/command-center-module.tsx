'use client'

import { useMemo } from 'react'
import type { Variants } from 'framer-motion'
import { motion } from 'framer-motion'
import {
  Monitor,
  Activity,
  DollarSign,
  Bot,
  Clock,
  TrendingUp,
  TrendingDown,
  Cpu,
  HardDrive,
  MemoryStick,
  Play,
  Square,
  MessageSquare,
  Search,
  Image as ImageIcon,
  Zap,
  FileText,
  CircleDot,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { useWorkspaceStore, type ActivityItem } from '@/store/workspace-store'

/* ─── Animation variants ─── */
const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
}

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

/* ─── Activity icon & color map ─── */
function getActivityMeta(type: ActivityItem['type']) {
  switch (type) {
    case 'chat':
      return { icon: MessageSquare, color: 'text-primary', bg: 'bg-primary/10' }
    case 'search':
      return { icon: Search, color: 'text-chart-2', bg: 'bg-chart-2/10' }
    case 'image':
      return { icon: ImageIcon, color: 'text-chart-4', bg: 'bg-chart-4/10' }
    case 'agent':
      return { icon: Bot, color: 'text-chart-3', bg: 'bg-chart-3/10' }
    case 'document':
      return { icon: FileText, color: 'text-chart-5', bg: 'bg-chart-5/10' }
    case 'automation':
      return { icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' }
    default:
      return { icon: CircleDot, color: 'text-muted-foreground', bg: 'bg-muted' }
  }
}

/* ─── Relative time ─── */
function formatTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'À l\'instant'
  if (minutes < 60) return `Il y a ${minutes} min`
  if (hours < 24) return `Il y a ${hours} h`
  if (days < 7) return `Il y a ${days} j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

/* ─── Mini sparkline ─── */
function MiniSparkline({ color, trend = 'up' }: { color: string; trend?: 'up' | 'down' }) {
  const points = useMemo(() => {
    const pts: number[] = []
    for (let i = 0; i < 10; i++) {
      const base = 20 + Math.random() * 50
      const trendBias = trend === 'up' ? i * 3 : -i * 3
      pts.push(base + trendBias + Math.random() * 15)
    }
    return pts
  }, [trend])

  const maxVal = Math.max(...points)
  const minVal = Math.min(...points)
  const range = maxVal - minVal || 1
  const w = 80
  const h = 28
  const step = w / (points.length - 1)

  const pathD = points
    .map((p, i) => {
      const x = i * step
      const y = h - ((p - minVal) / range) * (h - 4) - 2
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')

  const areaD = `${pathD} L ${w} ${h} L 0 ${h} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
      <path d={areaD} fill="currentColor" opacity="0.08" className={color} />
      <path d={pathD} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={color} />
    </svg>
  )
}

/* ─── Stats Cards ─── */
function StatsCards() {
  const customAgents = useWorkspaceStore((s) => s.customAgents)
  const activeAgentCount = customAgents.filter((a) => a.isActive).length

  const stats = [
    {
      title: 'Requêtes IA',
      value: '1,247',
      subtitle: '+12% cette semaine',
      trend: 'up' as const,
      icon: Activity,
      color: 'text-primary',
      bg: 'bg-primary/10',
      sparkColor: 'text-primary',
    },
    {
      title: 'Coûts IA',
      value: '$23.50',
      subtitle: 'Budget: $100',
      trend: 'up' as const,
      icon: DollarSign,
      color: 'text-chart-2',
      bg: 'bg-chart-2/10',
      sparkColor: 'text-chart-2',
      progress: 23.5,
    },
    {
      title: 'Agents Actifs',
      value: String(activeAgentCount),
      subtitle: `sur ${customAgents.length} agents`,
      trend: 'up' as const,
      icon: Bot,
      color: 'text-chart-3',
      bg: 'bg-chart-3/10',
      sparkColor: 'text-chart-3',
    },
    {
      title: 'Uptime',
      value: '99.8%',
      subtitle: 'Dernière panne: 3j',
      trend: 'up' as const,
      icon: Clock,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      sparkColor: 'text-emerald-500',
    },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <motion.div key={stat.title} variants={item}>
          <Card className="glass-subtle module-card overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className={`flex size-10 items-center justify-center rounded-xl ${stat.bg}`}>
                  <stat.icon className={`size-5 ${stat.color}`} />
                </div>
                <div className="w-20 h-8 opacity-60">
                  <MiniSparkline color={stat.sparkColor} trend={stat.trend} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {stat.trend === 'up' ? (
                    <ArrowUpRight className="size-3 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="size-3 text-red-500" />
                  )}
                  <span className="text-xs text-muted-foreground">{stat.subtitle}</span>
                </div>
              </div>
              {'progress' in stat && stat.progress !== undefined && (
                <div className="space-y-1">
                  <Progress value={stat.progress} className="h-1.5" />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}

/* ─── Activity Log ─── */
function ActivityLog() {
  const activities = useWorkspaceStore((s) => s.activities)

  return (
    <motion.div variants={item} className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">Journal d&apos;activité</h3>
        {activities.length > 0 && (
          <Badge variant="secondary" className="text-xs font-normal">
            {activities.length} entrées
          </Badge>
        )}
      </div>

      <Card className="glass-subtle">
        {activities.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted/50 mb-3">
              <Activity className="size-7 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">Aucune activité enregistrée</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Les activités apparaîtront ici au fur et à mesure
            </p>
          </CardContent>
        ) : (
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            <div className="divide-y divide-border/50">
              {activities.map((activity, idx) => {
                const meta = getActivityMeta(activity.type)
                const Icon = meta.icon
                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className={`flex size-8 items-center justify-center rounded-lg flex-shrink-0 ${meta.bg}`}>
                      <Icon className={`size-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.action}</p>
                      <p className="text-xs text-muted-foreground truncate">{activity.details}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground/60 flex-shrink-0">
                      {formatTime(activity.createdAt)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  )
}

/* ─── Agent Status ─── */
function AgentStatusSection() {
  const customAgents = useWorkspaceStore((s) => s.customAgents)
  const updateAgent = useWorkspaceStore((s) => s.updateAgent)

  const toggleAgent = (agentId: string, currentActive: boolean) => {
    updateAgent(agentId, {
      isActive: !currentActive,
      status: currentActive ? 'idle' : 'idle',
    })
  }

  return (
    <motion.div variants={item} className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">Statut des Agents</h3>
        <Badge variant="secondary" className="text-xs font-normal">
          {customAgents.filter((a) => a.isActive).length} actifs
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {customAgents.map((agent) => (
          <Card key={agent.id} className="glass-subtle module-card">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-muted/50 text-xl flex-shrink-0">
                  {agent.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{agent.name}</p>
                    <span className={`status-dot ${agent.status}`} title={agent.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{agent.role}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {agent.tools.map((tool) => (
                  <Badge key={tool} variant="outline" className="text-[10px] font-normal px-1.5 py-0">
                    {tool}
                  </Badge>
                ))}
              </div>

              <Separator className="opacity-50" />

              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${agent.isActive ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                  {agent.isActive ? 'Actif' : 'Inactif'}
                </span>
                <Button
                  size="sm"
                  variant={agent.isActive ? 'outline' : 'default'}
                  className="h-7 text-xs gap-1.5 px-3"
                  onClick={() => toggleAgent(agent.id, agent.isActive)}
                >
                  {agent.isActive ? (
                    <>
                      <Square className="size-3" />
                      Arrêter
                    </>
                  ) : (
                    <>
                      <Play className="size-3" />
                      Démarrer
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  )
}

/* ─── System Resources ─── */
function SystemResources() {
  const resources = [
    { label: 'CPU', value: 45, color: 'bg-primary', icon: Cpu },
    { label: 'RAM', value: 62, color: 'bg-chart-2', icon: MemoryStick },
    { label: 'Stockage', value: 28, color: 'bg-chart-3', icon: HardDrive },
  ]

  return (
    <motion.div variants={item} className="space-y-3">
      <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
        <Cpu className="size-4 text-muted-foreground" />
        Ressources système
      </h3>

      <Card className="glass-subtle">
        <CardContent className="p-4 space-y-5">
          {resources.map((res) => (
            <div key={res.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <res.icon className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{res.label}</span>
                </div>
                <span className="text-sm font-semibold">{res.value}%</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${res.value}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                  className={`absolute inset-y-0 left-0 rounded-full ${res.color}`}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ─── API Usage Bar Chart ─── */
function ApiUsageChart() {
  const days = useMemo(() => {
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    const data: { label: string; value: number }[] = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      data.push({
        label: dayNames[d.getDay()],
        value: Math.floor(80 + Math.random() * 320),
      })
    }
    return data
  }, [])

  const maxVal = Math.max(...days.map((d) => d.value))

  return (
    <motion.div variants={item} className="space-y-3">
      <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
        <TrendingUp className="size-4 text-muted-foreground" />
        Utilisation API
      </h3>

      <Card className="glass-subtle">
        <CardContent className="p-4">
          <div className="flex items-end justify-between gap-2 h-40">
            {days.map((day, idx) => {
              const heightPct = (day.value / maxVal) * 100
              const isToday = idx === days.length - 1
              return (
                <div key={day.label} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {day.value}
                  </span>
                  <div className="w-full relative" style={{ height: '100px' }}>
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-center">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 + idx * 0.05 }}
                        className={`w-3/4 rounded-t-md ${isToday ? 'bg-primary' : 'bg-primary/40'} transition-colors duration-300 min-h-[4px]`}
                      />
                    </div>
                  </div>
                  <span className={`text-[11px] font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    {day.label}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ─── Main Command Center Module ─── */
export default function CommandCenterModule() {
  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-6xl mx-auto space-y-6"
      >
        {/* ── Header ── */}
        <motion.div variants={item}>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 glow-sm">
              <Monitor className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
              <p className="text-sm text-muted-foreground">Surveillance et contrôle</p>
            </div>
          </div>
        </motion.div>

        {/* ── Stats Grid ── */}
        <StatsCards />

        {/* ── Two-column: Activity Log + Agent Status ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActivityLog />
          <AgentStatusSection />
        </div>

        {/* ── Two-column: System Resources + API Usage ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SystemResources />
          <ApiUsageChart />
        </div>
      </motion.div>
    </div>
  )
}
