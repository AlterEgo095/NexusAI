'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Store,
  Search,
  Star,
  Download,
  Wrench,
  Tag,
  Loader2,
  Sparkles,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

/* ─── Types ─── */
interface MarketplaceAgent {
  id: string
  name: string
  description: string
  longDescription: string
  icon: string
  category: string
  rating: number
  reviews: number
  capabilities: string[]
  tools: string[]
  systemPrompt: string
  tags: string[]
}

/* ─── Categories ─── */
const CATEGORIES = [
  'Tous',
  'Recherche',
  'Code',
  'Contenu',
  'Données',
  'Design',
  'Marketing',
  'Productivité',
  'Sécurité',
  'Multimodal',
  'Business',
] as const

type Category = (typeof CATEGORIES)[number]

const CATEGORY_MAP: Record<string, string> = {
  Tous: 'all',
  Recherche: 'research',
  Code: 'code',
  Contenu: 'content',
  Données: 'data',
  Design: 'design',
  Marketing: 'marketing',
  Productivité: 'productivity',
  Sécurité: 'security',
  Multimodal: 'multimodal',
  Business: 'business',
}

/* ─── Animation variants ─── */
const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: 'easeOut' },
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.04 } },
}

/* ─── Star Rating ─── */
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${iconSize} ${
            i <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-muted text-muted'
          }`}
        />
      ))}
    </div>
  )
}

/* ─── Agent Card ─── */
function AgentCard({
  agent,
  onClick,
}: {
  agent: MarketplaceAgent
  onClick: () => void
}) {
  return (
    <motion.div {...fadeIn} layout>
      <Card
        className="glass-panel cursor-pointer hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 hover:border-primary/30 h-full flex flex-col group"
        onClick={onClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="text-3xl shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10">
              {agent.icon}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold truncate group-hover:text-primary transition-colors">
                {agent.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {agent.category}
                </Badge>
                <div className="flex items-center gap-1">
                  <StarRating rating={agent.rating} />
                  <span className="text-[11px] text-muted-foreground ml-0.5">
                    ({agent.reviews})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-3 pt-0">
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {agent.description}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-auto">
            {agent.capabilities.slice(0, 3).map((cap) => (
              <Badge key={cap} variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                {cap}
              </Badge>
            ))}
            {agent.capabilities.length > 3 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                +{agent.capabilities.length - 3}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ─── Skeleton Loader ─── */
function MarketplaceSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <Card key={i} className="glass-panel h-full flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3 pt-0">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-1.5 mt-auto">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Main Marketplace Module
   ═══════════════════════════════════════════════════════════════ */

export default function MarketplaceModule() {
  /* ─── State ─── */
  const [agents, setAgents] = useState<MarketplaceAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category>('Tous')
  const [selectedAgent, setSelectedAgent] = useState<MarketplaceAgent | null>(null)
  const [installing, setInstalling] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  /* ─── Fetch agents ─── */
  useEffect(() => {
    async function fetchAgents() {
      try {
        setLoading(true)
        const res = await fetch('/api/marketplace')
        if (!res.ok) throw new Error('Erreur de chargement')
        const data = await res.json()
        setAgents(data.agents || data || [])
      } catch {
        toast.error('Impossible de charger les agents du marketplace')
      } finally {
        setLoading(false)
      }
    }
    fetchAgents()
  }, [])

  /* ─── Filtered agents ─── */
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesSearch =
        !search ||
        agent.name.toLowerCase().includes(search.toLowerCase()) ||
        agent.description.toLowerCase().includes(search.toLowerCase()) ||
        agent.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      const matchesCategory =
        category === 'Tous' ||
        agent.category.toLowerCase() === CATEGORY_MAP[category]
      return matchesSearch && matchesCategory
    })
  }, [agents, search, category])

  /* ─── Category counts ─── */
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Tous: agents.length }
    agents.forEach((a) => {
      const catName =
        Object.entries(CATEGORY_MAP).find(([, v]) => v === a.category.toLowerCase())?.[0] || a.category
      counts[catName] = (counts[catName] || 0) + 1
    })
    return counts
  }, [agents])

  /* ─── Install handler ─── */
  async function handleInstall(agentId: string) {
    try {
      setInstalling(agentId)
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      })
      if (!res.ok) throw new Error('Erreur lors de l\'installation')
      const data = await res.json()
      toast.success(data.message || 'Agent installé avec succès !')
      setDialogOpen(false)
      setSelectedAgent(null)
    } catch {
      toast.error('Impossible d\'installer l\'agent')
    } finally {
      setInstalling(null)
    }
  }

  /* ─── Open detail dialog ─── */
  function openDetail(agent: MarketplaceAgent) {
    setSelectedAgent(agent)
    setDialogOpen(true)
  }

  return (
    <motion.div
      className="flex flex-col h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* ─── Header ─── */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Marketplace</h2>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{agents.length} agents disponibles</span>{' '}
                · Explorez et installez des agents prêts à l'emploi
              </p>
            </div>
          </div>
        </div>

        {/* ─── Search ─── */}
        <div className="relative mt-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un agent par nom, description ou tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 glass-subtle"
          />
        </div>
      </div>

      {/* ─── Category Tabs ─── */}
      <div className="px-6 pb-2">
        <Tabs value={category} onValueChange={(v) => setCategory(v as Category)}>
          <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0 justify-start">
            {CATEGORIES.map((cat) => (
              <TabsTrigger
                key={cat}
                value={cat}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1.5 text-xs font-medium transition-all"
              >
                {cat}
                {categoryCounts[cat] !== undefined && (
                  <span className="ml-1.5 text-[10px] opacity-70">({categoryCounts[cat]})</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <Separator className="my-2" />

      {/* ─── Agent Grid ─── */}
      <ScrollArea className="flex-1 max-h-[calc(100vh-14rem)] overflow-y-auto">
        <div className="px-6 pb-6">
          {loading ? (
            <MarketplaceSkeleton />
          ) : filteredAgents.length === 0 ? (
            <motion.div
              className="flex flex-col items-center justify-center py-16 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Filter className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold mb-1">Aucun agent trouvé</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Essayez de modifier vos critères de recherche ou de sélectionner une autre catégorie.
              </p>
              {search && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setSearch('')}
                >
                  Effacer la recherche
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              <AnimatePresence mode="popLayout">
                {filteredAgents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onClick={() => openDetail(agent)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* ─── Detail Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {selectedAgent && (
          <DialogContent className="glass-panel max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="text-4xl w-12 h-12 flex items-center justify-center rounded-xl bg-primary/10">
                  {selectedAgent.icon}
                </div>
                <div>
                  <DialogTitle className="text-xl">{selectedAgent.name}</DialogTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{selectedAgent.category}</Badge>
                    <div className="flex items-center gap-1">
                      <StarRating rating={selectedAgent.rating} size="md" />
                      <span className="text-xs text-muted-foreground ml-1">
                        {selectedAgent.rating.toFixed(1)} ({selectedAgent.reviews} avis)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <DialogDescription className="sr-only">
              Détails de l&apos;agent {selectedAgent.name}
            </DialogDescription>

            <div className="space-y-4 mt-2">
              {/* Description */}
              <div>
                <h4 className="text-sm font-semibold mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Description
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedAgent.longDescription || selectedAgent.description}
                </p>
              </div>

              <Separator />

              {/* System Prompt Preview */}
              <div>
                <h4 className="text-sm font-semibold mb-1.5 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" /> Prompt système
                </h4>
                <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono text-muted-foreground max-h-32 overflow-y-auto whitespace-pre-wrap break-words">
                  {selectedAgent.systemPrompt.length > 300
                    ? selectedAgent.systemPrompt.slice(0, 300) + '...'
                    : selectedAgent.systemPrompt}
                </div>
              </div>

              <Separator />

              {/* Tools */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" /> Outils ({selectedAgent.tools.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAgent.tools.map((tool) => (
                    <Badge key={tool} variant="outline" className="text-xs font-normal">
                      {tool}
                    </Badge>
                  ))}
                  {selectedAgent.tools.length === 0 && (
                    <span className="text-xs text-muted-foreground">Aucun outil configuré</span>
                  )}
                </div>
              </div>

              {/* Capabilities */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Capacités ({selectedAgent.capabilities.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAgent.capabilities.map((cap) => (
                    <Badge key={cap} variant="secondary" className="text-xs font-normal">
                      {cap}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Tags */}
              {selectedAgent.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Tags
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAgent.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[11px] font-normal border-dashed">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={installing !== null}
              >
                Annuler
              </Button>
              <Button
                onClick={() => handleInstall(selectedAgent.id)}
                disabled={installing !== null}
              >
                {installing === selectedAgent.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Installation...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Installer
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </motion.div>
  )
}