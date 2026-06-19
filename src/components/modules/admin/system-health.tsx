'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Loader2,
  Database,
  Cpu,
  Clock,
  Server,
  RefreshCw,
  HardDrive,
  ChevronDown,
  ChevronRight,
  BarChart3,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

/* ═══════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════ */
interface SystemInfo {
  databaseSize: string
  memoryUsage: {
    used: number
    total: number
    percentage: number
  }
  uptime: number // seconds
  nodeVersion: string
  tables: {
    name: string
    rows: number
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

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (days > 0) parts.push(`${days}j`)
  if (hours > 0) parts.push(`${hours}h`)
  parts.push(`${minutes}min`)
  return parts.join(' ')
}

function formatMemory(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} Go`
  return `${Math.round(mb)} Mo`
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
export default function SystemHealth() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [tablesExpanded, setTablesExpanded] = useState(true)

  const fetchSystemInfo = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminFetch<{ systemInfo: SystemInfo }>({ action: 'system-info' })
      if (data.success && data.systemInfo) {
        setSystemInfo(data.systemInfo)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSystemInfo()
  }, [fetchSystemInfo])

  const maxRows = systemInfo?.tables?.length
    ? Math.max(...systemInfo.tables.map((t) => t.rows), 1)
    : 1

  const totalRecords = systemInfo?.tables?.reduce((sum, t) => sum + t.rows, 0) ?? 0

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
      {/* ─── Header ─── */}
      <motion.div variants={fadeIn}>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-emerald-500" />
                Santé du système
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSystemInfo}
                disabled={loading}
                className="h-8 gap-1.5 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {loading && !systemInfo ? (
        <motion.div variants={fadeIn}>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : systemInfo ? (
        <>
          {/* ─── System Cards Grid ─── */}
          <motion.div variants={staggerItem}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Base de données',
                  value: systemInfo.databaseSize,
                  icon: Database,
                  accent: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
                  ring: 'ring-blue-500/20',
                },
                {
                  label: 'Mémoire utilisée',
                  value: `${formatMemory(systemInfo.memoryUsage.used)} / ${formatMemory(systemInfo.memoryUsage.total)}`,
                  subValue: `${systemInfo.memoryUsage.percentage.toFixed(1)}%`,
                  icon: Cpu,
                  accent: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
                  ring: 'ring-violet-500/20',
                },
                {
                  label: 'Temps de fonctionnement',
                  value: formatUptime(systemInfo.uptime),
                  icon: Clock,
                  accent: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                  ring: 'ring-emerald-500/20',
                },
                {
                  label: 'Version Node.js',
                  value: systemInfo.nodeVersion,
                  icon: Server,
                  accent: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                  ring: 'ring-amber-500/20',
                },
              ].map((card) => (
                <motion.div key={card.label} variants={fadeIn}>
                  <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg transition-shadow duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                          <p className="text-lg font-bold tracking-tight">{card.value}</p>
                          {card.subValue && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-mono">
                              {card.subValue}
                            </Badge>
                          )}
                        </div>
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.accent} ring-1 ${card.ring}`}>
                          <card.icon className="h-5 w-5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ─── Memory usage bar ─── */}
          <motion.div variants={fadeIn}>
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Utilisation mémoire</span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {systemInfo.memoryUsage.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      systemInfo.memoryUsage.percentage > 80
                        ? 'bg-red-500'
                        : systemInfo.memoryUsage.percentage > 60
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(systemInfo.memoryUsage.percentage, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <Separator className="opacity-30" />

          {/* ─── Tables Section ─── */}
          <motion.div variants={staggerItem}>
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <button
                  onClick={() => setTablesExpanded(!tablesExpanded)}
                  className="flex items-center justify-between w-full group"
                >
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Database className="h-4 w-4 text-emerald-500" />
                    Tables de la base de données
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-mono">
                      {systemInfo.tables.length} tables
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">
                      {totalRecords.toLocaleString('fr-FR')} enregistrements au total
                    </span>
                    {tablesExpanded ? (
                      <ChevronDown className="h-4 w-4 transition-transform" />
                    ) : (
                      <ChevronRight className="h-4 w-4 transition-transform" />
                    )}
                  </div>
                </button>
              </CardHeader>

              {tablesExpanded && (
                <CardContent>
                  {/* Total records summary */}
                  <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs font-medium">Total des enregistrements</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {totalRecords.toLocaleString('fr-FR')}
                    </span>
                  </div>

                  {/* Table list */}
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                    {systemInfo.tables.map((table) => {
                      const percentage = (table.rows / maxRows) * 100
                      return (
                        <div
                          key={table.name}
                          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-mono font-medium truncate">{table.name}</span>
                              <span className="text-xs text-muted-foreground font-mono ml-2">
                                {table.rows.toLocaleString('fr-FR')}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500/60 dark:bg-emerald-400/50 transition-all duration-500 ease-out"
                                style={{ width: `${Math.max(percentage, table.rows > 0 ? 2 : 0)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          </motion.div>
        </>
      ) : (
        <motion.div variants={fadeIn}>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <HardDrive className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">Informations système indisponibles</p>
                <p className="text-xs mt-1">Impossible de charger les données système</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
