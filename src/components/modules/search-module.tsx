'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Globe,
  Sparkles,
  Clock,
  ExternalLink,
  TrendingUp,
  Newspaper,
  Github,
  BookOpen,
  Youtube,
  GraduationCap,
  RotateCcw,
  ChevronRight,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useWorkspaceStore, type SearchResult } from '@/store/workspace-store'

const FILTER_CHIPS = [
  { label: 'Tous', icon: Globe, value: 'all' },
  { label: 'Actualités', icon: Newspaper, value: 'news' },
  { label: 'GitHub', icon: Github, value: 'github' },
  { label: 'Wikipedia', icon: BookOpen, value: 'wikipedia' },
  { label: 'YouTube', icon: Youtube, value: 'youtube' },
  { label: 'Académique', icon: GraduationCap, value: 'academic' },
]

const SUGGESTION_QUERIES = [
  'Intelligence artificielle en 2025',
  'Meilleurs frameworks JavaScript',
  'Fusion nucléaire avancées récentes',
  'Tendances design UI/UX',
]

export default function SearchModule() {
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const inputRef = useRef<HTMLInputElement>(null)

  const searchSessions = useWorkspaceStore((s) => s.searchSessions)
  const activeSearchId = useWorkspaceStore((s) => s.activeSearchId)
  const isSearching = useWorkspaceStore((s) => s.isSearching)
  const setActiveSearch = useWorkspaceStore((s) => s.setActiveSearch)
  const setIsSearching = useWorkspaceStore((s) => s.setIsSearching)
  const addSearchSession = useWorkspaceStore((s) => s.addSearchSession)

  const activeSession = searchSessions.find((s) => s.id === activeSearchId)
  const hasSearched = searchSessions.length > 0

  const performSearch = useCallback(
    async (searchQuery: string) => {
      const trimmed = searchQuery.trim()
      if (!trimmed) return

      setIsSearching(true)
      try {
        const filterParam =
          activeFilter !== 'all' ? `site:${activeFilter === 'news' ? 'news.google.com' : activeFilter === 'github' ? 'github.com' : activeFilter === 'wikipedia' ? 'wikipedia.org' : activeFilter === 'youtube' ? 'youtube.com' : 'scholar.google.com'} ` : ''
        const fullQuery = filterParam + trimmed

        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: fullQuery, num: 8 }),
        })
        const data = await res.json()
        if (data.success) {
          addSearchSession({
            id: `search-${Date.now()}`,
            query: trimmed,
            results: data.results,
            summary: data.summary,
            createdAt: new Date(),
          })
        }
      } catch {
        toast.error('Erreur lors de la recherche')
      } finally {
        setIsSearching(false)
      }
    },
    [activeFilter, setIsSearching, addSearchSession]
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      performSearch(query)
    },
    [query, performSearch]
  )

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setQuery(suggestion)
      performSearch(suggestion)
    },
    [performSearch]
  )

  const handleHistoryClick = useCallback(
    (historyQuery: string) => {
      setQuery(historyQuery)
      performSearch(historyQuery)
    },
    [performSearch]
  )

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Search Header */}
      <div className="p-4 md:p-6 space-y-4">
        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="glass-strong rounded-2xl p-1.5 flex items-center gap-2 transition-all focus-within:ring-2 focus-within:ring-primary/50 focus-within:glow-sm">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary ml-1">
              <Search className="w-5 h-5" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Recherchez n'importe quoi sur le web..."
              className="flex-1 bg-transparent text-base md:text-lg placeholder:text-muted-foreground/60 outline-none py-2.5 px-2"
              disabled={isSearching}
            />
            <Button
              type="submit"
              disabled={!query.trim() || isSearching}
              size="lg"
              className="rounded-xl gap-2 shrink-0"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Rechercher</span>
            </Button>
          </div>
        </form>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2">
          {FILTER_CHIPS.map((chip) => (
            <motion.button
              key={chip.value}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveFilter(chip.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeFilter === chip.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'glass-subtle text-muted-foreground hover:text-foreground'
              }`}
            >
              <chip.icon className="w-3.5 h-3.5" />
              {chip.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 px-4 md:px-6 pb-4 md:pb-6 overflow-hidden">
        {/* Left: Results */}
        <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {!hasSearched && !isSearching ? (
              /* Welcome State */
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center py-16 md:py-24 text-center"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6"
                >
                  <Search className="w-10 h-10 text-primary" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl md:text-3xl font-bold tracking-tight mb-3"
                >
                  Recherche IA Intelligente
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-muted-foreground text-base md:text-lg mb-10 max-w-md"
                >
                  Recherchez le web avec la puissance de l&apos;IA
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-wrap justify-center gap-3"
                >
                  {SUGGESTION_QUERIES.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="glass-subtle rounded-xl px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-all hover:shadow-md flex items-center gap-2 group"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-primary/60 group-hover:text-primary transition-colors" />
                      {suggestion}
                    </button>
                  ))}
                </motion.div>
              </motion.div>
            ) : isSearching ? (
              /* Loading State */
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="glass-subtle rounded-xl p-5 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-4 h-4 rounded" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))}
              </motion.div>
            ) : activeSession ? (
              /* Results State */
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Results header */}
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">
                    {activeSession.results.length} résultats pour{' '}
                    <span className="font-medium text-foreground">
                      &ldquo;{activeSession.query}&rdquo;
                    </span>
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleHistoryClick(activeSession.query)}
                    className="gap-1.5 text-xs"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Relancer
                  </Button>
                </div>

                {/* Result Cards */}
                <AnimatePresence>
                  {activeSession.results.map((result, index) => (
                    <ResultCard
                      key={result.url}
                      result={result}
                      index={index}
                    />
                  ))}
                </AnimatePresence>

                {/* AI Summary */}
                {activeSession.summary && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-6"
                  >
                    <div className="glass-strong rounded-xl p-5 md:p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold">
                          Résumé IA
                        </h3>
                      </div>
                      <div
                        className="prose-ai text-sm md:text-base leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: activeSession.summary.replace(
                            /\[(\d+)\]/g,
                            '<sup class="text-primary font-semibold cursor-pointer">[$1]</sup>'
                          ),
                        }}
                      />
                      {/* Source references */}
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <p className="text-xs text-muted-foreground mb-2">
                          Sources :
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {activeSession.results.slice(0, 5).map((r, i) => (
                            <Badge
                              key={r.url}
                              variant="secondary"
                              className="text-xs gap-1 cursor-pointer hover:bg-primary/10 transition-colors"
                              onClick={() =>
                                window.open(r.url, '_blank')
                              }
                            >
                              [{i + 1}] {r.host_name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Right: Search History Sidebar */}
        {hasSearched && (
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:block w-72 shrink-0"
          >
            <div className="glass-subtle rounded-xl p-4 sticky top-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">
                  Historique de recherche
                </h3>
              </div>
              <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
                {searchSessions.map((session, i) => (
                  <motion.button
                    key={session.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setActiveSearch(session.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all group ${
                      session.id === activeSearchId
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Zap className="w-3 h-3 mt-1 shrink-0 opacity-50" />
                      <div className="min-w-0">
                        <p className="truncate">{session.query}</p>
                        <p className="text-xs opacity-50 mt-0.5">
                          {session.results.length} résultats
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.aside>
        )}
      </div>
    </div>
  )
}

/* Individual result card component */
function ResultCard({
  result,
  index,
}: {
  result: SearchResult
  index: number
}) {
  return (
    <motion.a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="block glass-subtle rounded-xl p-4 md:p-5 module-card group cursor-pointer"
    >
      {/* Favicon + Domain */}
      <div className="flex items-center gap-2 mb-2">
        {result.favicon ? (
          <img
            src={result.favicon}
            alt=""
            width={16}
            height={16}
            className="rounded-sm"
          />
        ) : (
          <Globe className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-xs text-muted-foreground">
          {result.host_name}
        </span>
        {result.date && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-auto">
            {result.date}
          </Badge>
        )}
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-primary group-hover:underline underline-offset-2 flex items-center gap-2 mb-1.5">
        <ChevronRight className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-primary/60" />
        <span className="line-clamp-2">{result.name}</span>
      </h3>

      {/* Snippet */}
      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed ml-6">
        {result.snippet}
      </p>

      {/* URL footer */}
      <div className="flex items-center gap-1.5 mt-3 ml-6">
        <ExternalLink className="w-3 h-3 text-muted-foreground/50" />
        <span className="text-xs text-muted-foreground/60 truncate max-w-[300px]">
          {result.url}
        </span>
      </div>
    </motion.a>
  )
}
