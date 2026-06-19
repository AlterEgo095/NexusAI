'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import {
  MessageSquare,
  Search,
  Palette,
  Bot,
  FileText,
  Workflow,
  GitBranch,
  Clock,
  Inbox,
  Filter,
  ChevronDown,
  Loader2,
  RefreshCw,
  Calendar,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/* ═══════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════ */

export interface TimelineEntry {
  id: string
  type: string
  action: string
  details: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

interface TimelineResponse {
  success: boolean
  timeline: TimelineEntry[]
  total: number
  hasMore: boolean
}

type TimelineType = 'chat' | 'search' | 'image' | 'agent' | 'document' | 'automation' | 'document_version'

type DateFilter = 'all' | 'today' | 'week' | 'month'

/* ═══════════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════════ */

const TYPE_CONFIG: Record<
  string,
  { icon: typeof MessageSquare; color: string; label: string; bgAccent: string }
> = {
  chat: {
    icon: MessageSquare,
    color: 'text-blue-500',
    label: 'Chat',
    bgAccent: 'bg-blue-500',
  },
  search: {
    icon: Search,
    color: 'text-green-500',
    label: 'Recherche',
    bgAccent: 'bg-green-500',
  },
  image: {
    icon: Palette,
    color: 'text-purple-500',
    label: 'Image',
    bgAccent: 'bg-purple-500',
  },
  agent: {
    icon: Bot,
    color: 'text-amber-500',
    label: 'Agent',
    bgAccent: 'bg-amber-500',
  },
  document: {
    icon: FileText,
    color: 'text-emerald-500',
    label: 'Document',
    bgAccent: 'bg-emerald-500',
  },
  automation: {
    icon: Workflow,
    color: 'text-orange-500',
    label: 'Automatisation',
    bgAccent: 'bg-orange-500',
  },
  document_version: {
    icon: GitBranch,
    color: 'text-cyan-500',
    label: 'Version',
    bgAccent: 'bg-cyan-500',
  },
}

const TYPE_CHIP_ORDER: TimelineType[] = [
  'chat',
  'search',
  'image',
  'agent',
  'document',
  'automation',
  'document_version',
]

const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
]

const PAGE_SIZE = 50

/* ═══════════════════════════════════════════════════════════════════════
   Animation variants
   ═══════════════════════════════════════════════════════════════════════ */

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.15 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -12 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: 'easeOut' as const },
  },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
}

/* ═══════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════ */

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  // Today
  if (diffSeconds < 60) return "À l'instant"
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`
  if (diffHours < 24 && now.getDate() === date.getDate()) return `il y a ${diffHours}h`

  // Yesterday
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'hier'

  // This week
  if (diffDays < 7) return `il y a ${diffDays}j`

  // This month
  if (diffDays < 30) {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  // Older
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getDateRange(filter: DateFilter): { from?: string; to?: string } {
  const now = new Date()

  switch (filter) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return { from: start.toISOString(), to: now.toISOString() }
    }
    case 'week': {
      const start = new Date(now)
      const dayOfWeek = start.getDay() || 7
      start.setDate(start.getDate() - dayOfWeek + 1)
      start.setHours(0, 0, 0, 0)
      return { from: start.toISOString(), to: now.toISOString() }
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: start.toISOString(), to: now.toISOString() }
    }
    default:
      return {}
  }
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()

  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return "Aujourd'hui"
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Hier'
  }

  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/* ═══════════════════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════════════════ */

/** Loading skeleton for the timeline */
function TimelineSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="relative flex gap-4 pb-6">
          {/* Left: dot + line */}
          <div className="flex flex-col items-center flex-shrink-0 w-8">
            <Skeleton className="size-3 rounded-full mt-1" />
            <Skeleton className="w-0.5 flex-1 mt-1" />
          </div>
          {/* Right: card */}
          <div className="flex-1 min-w-0">
            <Skeleton className="h-[88px] w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Empty state */
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <div className="flex size-20 items-center justify-center rounded-full bg-muted/50 mb-5">
        <Inbox className="size-10 text-muted-foreground/40" />
      </div>
      <h3 className="text-lg font-semibold text-muted-foreground">
        {hasFilters ? 'Aucun résultat' : 'Aucune activité'}
      </h3>
      <p className="text-sm text-muted-foreground/60 mt-1.5 max-w-sm text-center leading-relaxed">
        {hasFilters
          ? "Aucune activité ne correspond à vos filtres. Essayez d'élargir vos critères."
          : "Votre chronologie est vide. Commencez à utiliser les modules pour voir votre activité apparaître ici."}
      </p>
    </motion.div>
  )
}

/** Date header separating groups of entries */
function DateHeader({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 pl-12 pb-3 pt-2">
      <Calendar className="size-3.5 text-muted-foreground/50 flex-shrink-0" />
      <span className="text-xs font-medium text-muted-foreground/70 capitalize">{formatDateHeader(date)}</span>
      <div className="flex-1 h-px bg-border/40" />
    </div>
  )
}

/** Single timeline entry row */
function TimelineEntryCard({ entry, index }: { entry: TimelineEntry; index: number }) {
  const config = TYPE_CONFIG[entry.type] || {
    icon: Clock,
    color: 'text-gray-500',
    label: 'Activité',
    bgAccent: 'bg-gray-500',
  }
  const Icon = config.icon

  const metadataEntries = useMemo(() => {
    if (!entry.metadata) return []
    return Object.entries(entry.metadata).filter(
      ([, value]) => typeof value === 'string' || typeof value === 'number'
    )
  }, [entry.metadata])

  return (
    <motion.div
      variants={itemVariants}
      className="relative flex gap-4 pb-6 group"
    >
      {/* ── Left: line + dot ── */}
      <div className="flex flex-col items-center flex-shrink-0 w-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.03, type: 'spring', stiffness: 400, damping: 15 }}
          className={`relative mt-1.5 size-3 rounded-full ${config.bgAccent} ring-4 ring-background z-[1]`}
        >
          <motion.div
            className={`absolute inset-0 rounded-full ${config.bgAccent} animate-ping opacity-30`}
            style={{ animationDuration: '3s', animationIterationCount: 1 }}
          />
        </motion.div>
        <div
          className={`w-0.5 flex-1 mt-1 rounded-full transition-colors duration-300 ${
            entry.type ? `${config.bgAccent}/30` : 'bg-border/40'
          }`}
        />
      </div>

      {/* ── Right: card content ── */}
      <Card className="flex-1 min-w-0 glass-subtle module-card group-hover:shadow-lg transition-all duration-300">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Type icon */}
            <div
              className={`flex size-9 items-center justify-center rounded-lg flex-shrink-0 ${
                entry.type ? config.bgAccent + '/10' : 'bg-muted'
              }`}
            >
              <Icon className={`size-4 ${config.color}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1.5">
              {/* Top row: action + type badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium leading-snug truncate">{entry.action}</p>
                <Badge
                  variant="secondary"
                  className={`text-[10px] font-normal px-1.5 py-0 h-4 flex-shrink-0 ${
                    entry.type ? config.bgAccent + '/10 ' + config.color : ''
                  }`}
                >
                  {config.label}
                </Badge>
              </div>

              {/* Details */}
              {entry.details && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {entry.details}
                </p>
              )}

              {/* Metadata badges */}
              {metadataEntries.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {metadataEntries.map(([key, value]) => (
                    <Badge
                      key={key}
                      variant="outline"
                      className="text-[10px] font-mono font-normal px-1.5 py-0 h-4 border-border/50"
                    >
                      {String(key)}: {String(value)}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Relative time */}
              <div className="flex items-center gap-1 pt-0.5">
                <Clock className="size-3 text-muted-foreground/50" />
                <span className="text-[11px] text-muted-foreground/60">{getRelativeTime(entry.createdAt)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Main TimelineModule
   ═══════════════════════════════════════════════════════════════════════ */

export default function TimelineModule() {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [activeType, setActiveType] = useState<TimelineType | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Track offset for pagination
  const [offset, setOffset] = useState(0)

  /** Fetch timeline data */
  const fetchTimeline = useCallback(
    async (append = false, fetchOffset = 0) => {
      try {
        if (append) {
          setLoadingMore(true)
        } else {
          setLoading(true)
        }
        setError(null)

        const params = new URLSearchParams()
        params.set('limit', String(PAGE_SIZE))
        params.set('offset', String(fetchOffset))
        if (activeType) params.set('type', activeType)

        const dateRange = getDateRange(dateFilter)
        if (dateRange.from) params.set('from', dateRange.from)
        if (dateRange.to) params.set('to', dateRange.to)

        const res = await fetch(`/api/timeline?${params.toString()}`)
        if (!res.ok) throw new Error('Erreur lors du chargement')

        const data: TimelineResponse = await res.json()

        if (!data.success) throw new Error(data.error || 'Erreur inconnue')

        if (append) {
          setEntries((prev) => [...prev, ...data.timeline])
        } else {
          setEntries(data.timeline)
        }
        setHasMore(data.hasMore)
        setTotal(data.total)
        setOffset(fetchOffset)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [activeType, dateFilter]
  )

  // Initial fetch
  useEffect(() => {
    fetchTimeline(false, 0)
  }, [fetchTimeline])

  /** Load more */
  const handleLoadMore = useCallback(() => {
    fetchTimeline(true, offset + PAGE_SIZE)
  }, [fetchTimeline, offset])

  /** Refresh */
  const handleRefresh = useCallback(() => {
    setOffset(0)
    fetchTimeline(false, 0)
  }, [fetchTimeline])

  /** Toggle type filter */
  const toggleType = useCallback(
    (type: TimelineType) => {
      setActiveType((prev) => (prev === type ? null : type))
      setOffset(0)
    },
    []
  )

  /** Change date filter */
  const handleDateChange = useCallback(
    (filter: DateFilter) => {
      setDateFilter(filter)
      setOffset(0)
    },
    []
  )

  // Group entries by date header
  const groupedEntries = useMemo(() => {
    const groups: { date: string; entry: TimelineEntry }[] = []
    let lastDateHeader = ''

    for (const entry of entries) {
      const entryDate = new Date(entry.createdAt).toDateString()
      const header = formatDateHeader(entry.createdAt)

      if (header !== lastDateHeader) {
        groups.push({ date: entry.createdAt, entry })
        lastDateHeader = header
      }
      groups.push({ date: null, entry })
    }

    return groups
  }, [entries])

  const hasFilters = activeType !== null || dateFilter !== 'all'

  return (
    <div className="flex flex-col h-full min-h-screen">
      <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="max-w-4xl mx-auto space-y-6"
        >
          {/* ── Header ── */}
          <motion.div variants={fadeUp} className="relative">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-primary/8 via-chart-2/5 to-chart-4/6 blur-3xl" />
            <div className="relative pt-6 pb-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 glow-sm">
                  <Clock className="size-5 text-primary" />
                </div>
                <Badge variant="secondary" className="text-[10px] font-normal">
                  Chronologie
                </Badge>
              </div>
              <h1 className="font-bold text-2xl md:text-3xl tracking-tight">
                Fil d&apos;activité
              </h1>
              <p className="text-muted-foreground mt-1.5 text-sm max-w-lg">
                Toutes vos activités à travers les modules, en un seul endroit.
              </p>
            </div>
          </motion.div>

          {/* ── Controls bar ── */}
          <motion.div variants={fadeUp}>
            <Card className="glass-subtle">
              <CardContent className="p-4 space-y-4">
                {/* Date filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-muted-foreground mr-1 flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    Période
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {DATE_FILTERS.map((filter) => (
                      <Button
                        key={filter.value}
                        variant={dateFilter === filter.value ? 'default' : 'ghost'}
                        size="sm"
                        className="h-7 text-xs px-3"
                        onClick={() => handleDateChange(filter.value)}
                      >
                        {filter.label}
                      </Button>
                    ))}
                  </div>

                  <div className="flex-1" />

                  {/* Refresh & filter toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={handleRefresh}
                    disabled={loading}
                  >
                    <RefreshCw className={`size-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                    Actualiser
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => setShowFilters((prev) => !prev)}
                  >
                    <Filter className="size-3.5 mr-1" />
                    Filtres
                    <ChevronDown
                      className={`size-3.5 ml-0.5 transition-transform duration-200 ${
                        showFilters ? 'rotate-180' : ''
                      }`}
                    />
                  </Button>
                </div>

                {/* Type filter chips (expandable) */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-xs font-medium text-muted-foreground mr-1">Type :</span>
                        {TYPE_CHIP_ORDER.map((type) => {
                          const config = TYPE_CONFIG[type]
                          if (!config) return null
                          const Icon = config.icon
                          const isActive = activeType === type
                          return (
                            <button
                              key={type}
                              onClick={() => toggleType(type)}
                              className={`
                                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                                transition-all duration-200 border
                                ${
                                  isActive
                                    ? `${config.bgAccent}/15 border-current ${config.color}`
                                    : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground'
                                }
                              `}
                            >
                              <Icon className="size-3" />
                              {config.label}
                            </button>
                          )
                        })}
                        {activeType && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2 ml-1"
                            onClick={() => setActiveType(null)}
                          >
                            Réinitialiser
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Active filter summary ── */}
          <AnimatePresence>
            {hasFilters && !loading && (
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2"
              >
                <span className="text-xs text-muted-foreground">
                  {total} résultat{total > 1 ? 's' : ''}
                </span>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2 text-muted-foreground"
                  onClick={() => {
                    setActiveType(null)
                    setDateFilter('all')
                  }}
                >
                  Effacer les filtres
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Timeline content ── */}
          <motion.div variants={fadeUp}>
            {loading ? (
              <TimelineSkeleton />
            ) : error ? (
              <Card className="glass-subtle">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
                    <Workflow className="size-7 text-destructive/60" />
                  </div>
                  <p className="text-sm font-medium text-destructive">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={handleRefresh}
                  >
                    <RefreshCw className="size-3.5 mr-2" />
                    Réessayer
                  </Button>
                </CardContent>
              </Card>
            ) : entries.length === 0 ? (
              <EmptyState hasFilters={hasFilters} />
            ) : (
              <>
                {/* Timeline list */}
                <div className="space-y-0">
                  {groupedEntries.map((group, idx) =>
                    group.date ? (
                      <DateHeader key={`date-${group.entry.id}`} date={group.date} />
                    ) : (
                      <TimelineEntryCard
                        key={group.entry.id}
                        entry={group.entry}
                        index={idx}
                      />
                    )
                  )}
                </div>

                {/* Load more */}
                {hasMore && (
                  <div className="flex justify-center pt-4 pb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="glass-subtle"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="size-3.5 mr-2 animate-spin" />
                          Chargement…
                        </>
                      ) : (
                        <>
                          <ChevronDown className="size-3.5 mr-2" />
                          Charger plus
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* End of timeline */}
                {!hasMore && entries.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-3 pt-4 pb-2 pl-12"
                  >
                    <div className="flex-1 h-px bg-border/40" />
                    <span className="text-[11px] text-muted-foreground/50">Fin de la chronologie</span>
                    <div className="flex-1 h-px bg-border/40" />
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* ── Sticky footer ── */}
      <footer className="glass-strong border-t border-border/50 px-4 py-3 mt-auto">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground/60">
            {loading
              ? 'Chargement…'
              : `${total} entrée${total > 1 ? 's' : ''}${activeType ? ` — ${TYPE_CONFIG[activeType]?.label}` : ''}`}
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] font-normal h-5">
              <Clock className="size-2.5 mr-1" />
              Chronologie
            </Badge>
          </div>
        </div>
      </footer>
    </div>
  )
}
