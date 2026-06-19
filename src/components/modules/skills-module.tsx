'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Search, Loader2, Play, Upload, X, FileText, Clock, CreditCard,
  Crown, Sparkles, Filter, ChevronDown, ChevronUp, CheckCircle2,
  AlertCircle, Download, Coins, Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

/* ── Types ── */

interface SkillDefinition {
  id: string; name: string; description: string; category: string
  icon: string; color: string; inputDescription: string
  outputDescription: string; acceptsFiles: boolean
  acceptedFileTypes: string[]; producesFiles: boolean
  producedFileTypes: string[]; costCredits: number
  isPremium: boolean; tags: string[]
}

interface SkillCategoryInfo { label: string; icon: string; color: string }

interface SkillOutput {
  success: boolean; data: string; metadata?: Record<string, unknown>
  files?: Array<{ name: string; type: string; data: string; size: number }>
  durationMs: number
}

/* ── Category styles (bg + badge + text) ── */

const CAT_STYLES: Record<string, { bg: string; badge: string; text: string }> = {
  search:       { bg: 'bg-chart-2/10 border-chart-2/20',     badge: 'bg-chart-2/15 text-chart-2',     text: 'text-chart-2' },
  code:         { bg: 'bg-primary/10 border-primary/20',       badge: 'bg-primary/15 text-primary',     text: 'text-primary' },
  content:      { bg: 'bg-chart-3/10 border-chart-3/20',     badge: 'bg-chart-3/15 text-chart-3',     text: 'text-chart-3' },
  data:         { bg: 'bg-chart-5/10 border-chart-5/20',     badge: 'bg-chart-5/15 text-chart-5',     text: 'text-chart-5' },
  multimodal:   { bg: 'bg-chart-4/10 border-chart-4/20',     badge: 'bg-chart-4/15 text-chart-4',     text: 'text-chart-4' },
  voice:        { bg: 'bg-amber-500/10 border-amber-500/20', badge: 'bg-amber-500/15 text-amber-500', text: 'text-amber-500' },
  document:     { bg: 'bg-rose-500/10 border-rose-500/20',   badge: 'bg-rose-500/15 text-rose-500',   text: 'text-rose-500' },
  design:       { bg: 'bg-violet-500/10 border-violet-500/20', badge: 'bg-violet-500/15 text-violet-500', text: 'text-violet-500' },
  automation:   { bg: 'bg-cyan-500/10 border-cyan-500/20',   badge: 'bg-cyan-500/15 text-cyan-500',   text: 'text-cyan-500' },
  productivity: { bg: 'bg-emerald-500/10 border-emerald-500/20', badge: 'bg-emerald-500/15 text-emerald-500', text: 'text-emerald-500' },
  security:     { bg: 'bg-red-500/10 border-red-500/20',     badge: 'bg-red-500/15 text-red-500',     text: 'text-red-500' },
  browser:      { bg: 'bg-orange-500/10 border-orange-500/20', badge: 'bg-orange-500/15 text-orange-500', text: 'text-orange-500' },
}

function catStyle(key: string) {
  return CAT_STYLES[key] || { bg: 'bg-muted/50 border-border', badge: 'bg-muted text-muted-foreground', text: 'text-foreground' }
}

/* ── Animations ── */

const staggerContainer = { animate: { transition: { staggerChildren: 0.05 } } }

/* ── Skill Card ── */

function SkillCard({ skill, categoryLabel, onClick, index }: {
  skill: SkillDefinition; categoryLabel: string; onClick: () => void; index: number
}) {
  const s = catStyle(skill.category)
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: index * 0.04 }}>
      <Card
        className="relative cursor-pointer group h-full flex flex-col backdrop-blur-sm bg-card/80
          border border-border/50 hover:shadow-lg hover:shadow-black/5 hover:border-border/80
          hover:scale-[1.02] transition-all duration-300 ease-out"
        onClick={onClick}
      >
        {skill.isPremium && (
          <div className="absolute top-3 right-3 z-10">
            <Badge className="gap-1 bg-amber-500/90 text-white border-amber-400/50 text-[10px] px-1.5 py-0.5 font-semibold shadow-sm">
              <Crown className="w-2.5 h-2.5" /> Premium
            </Badge>
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3">
            <div className={`text-2xl shrink-0 w-11 h-11 flex items-center justify-center rounded-xl ${s.bg} border`}>
              {skill.icon}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-semibold leading-snug group-hover:text-foreground transition-colors">
                {skill.name}
              </CardTitle>
              <Badge className={`mt-1.5 text-[10px] px-1.5 py-0 border-0 font-medium ${s.badge}`}>
                {categoryLabel}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-3 pt-0">
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{skill.description}</p>
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/30">
            <div className="flex gap-1 flex-1 min-w-0 overflow-hidden">
              {skill.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0 font-normal border-dashed shrink-0">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className={`flex items-center gap-1 text-[11px] font-semibold ${s.text} shrink-0 ml-2`}>
              <Coins className="w-3 h-3" />{skill.costCredits}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ── Category Section (collapsible) ── */

function CategorySection({ categoryKey, categoryInfo, skills, onSkillClick }: {
  categoryKey: string; categoryInfo: SkillCategoryInfo; skills: SkillDefinition[]; onSkillClick: (s: SkillDefinition) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const s = catStyle(categoryKey)
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <button className="flex items-center gap-2.5 w-full text-left group/cat" onClick={() => setCollapsed(!collapsed)}>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg border ${s.bg} transition-transform duration-200 group-hover/cat:scale-105`}>
          {categoryInfo.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${s.text} group-hover/cat:underline decoration-dashed underline-offset-4`}>
            {categoryInfo.label}
          </h3>
          <p className="text-[11px] text-muted-foreground">{skills.length} skill{skills.length > 1 ? 's' : ''}</p>
        </div>
        {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {!collapsed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" variants={staggerContainer} initial="initial" animate="animate">
              {skills.map((skill, i) => (
                <SkillCard key={skill.id} skill={skill} categoryLabel={categoryInfo.label} onClick={() => onSkillClick(skill)} index={i} />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ── Skeleton Loader ── */

function SkillsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, ci) => (
        <div key={ci} className="space-y-3">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-9 h-9 rounded-lg" />
            <div className="space-y-1.5"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-16" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, si) => (
              <Card key={si} className="bg-card/80 border-border/50 h-40">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-11 h-11 rounded-xl" />
                    <div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-16" /></div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <div className="flex gap-1"><Skeleton className="h-5 w-14 rounded-full" /><Skeleton className="h-5 w-16 rounded-full" /></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── File Upload Area ── */

function FileUploadArea({ acceptedTypes, onFileSelect, file, onClear }: {
  acceptedTypes: string[]; onFileSelect: (f: File) => void; file: File | null; onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="space-y-2">
      {file ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm truncate flex-1">{file.name}</span>
          <span className="text-[11px] text-muted-foreground shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClear}><X className="w-3.5 h-3.5" /></Button>
        </div>
      ) : (
        <button
          type="button" onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 w-full p-6 rounded-xl
            border-2 border-dashed border-border/50 hover:border-border bg-muted/30 hover:bg-muted/50 transition-colors duration-200 cursor-pointer"
        >
          <Upload className="w-5 h-5 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">Cliquez pour téléverser un fichier</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">Formats : {acceptedTypes.join(', ')}</p>
          </div>
        </button>
      )}
      <input ref={inputRef} type="file" className="hidden" accept={acceptedTypes.join(',')}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(f); e.target.value = '' }} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Main Skills Module
   ═══════════════════════════════════════════════════════════════ */

export default function SkillsModule() {
  const [categories, setCategories] = useState<Record<string, SkillCategoryInfo>>({})
  const [skillsByCategory, setSkillsByCategory] = useState<Record<string, SkillDefinition[]>>({})
  const [allSkills, setAllSkills] = useState<SkillDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [selectedSkill, setSelectedSkill] = useState<SkillDefinition | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [fileBase64, setFileBase64] = useState<string | null>(null)
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<SkillOutput | null>(null)
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null)

  /* ── Fetch skills from API ── */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/skills')
        if (!res.ok) throw new Error()
        const data = await res.json()
        setCategories(data.categories || {})
        setSkillsByCategory(data.skillsByCategory || {})
        const flat: SkillDefinition[] = []
        for (const skills of Object.values(data.skillsByCategory || {})) flat.push(...(skills as SkillDefinition[]))
        setAllSkills(flat)
      } catch {
        toast.error('Impossible de charger les compétences')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const categoryKeys = useMemo(() => Object.keys(skillsByCategory), [skillsByCategory])

  const filtered = useMemo(() => {
    const out: Record<string, SkillDefinition[]> = {}
    for (const [cat, skills] of Object.entries(skillsByCategory)) {
      const match = (skills as SkillDefinition[]).filter((s) => {
        const q = search.toLowerCase()
        const okSearch = !search || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q))
        const okCat = activeFilter === 'all' || s.category === activeFilter
        return okSearch && okCat
      })
      if (match.length > 0) out[cat] = match
    }
    return out
  }, [skillsByCategory, search, activeFilter])

  const premiumCount = allSkills.filter((s) => s.isPremium).length

  /* ── File handling ── */
  const handleFileSelect = useCallback((file: File) => {
    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = () => setFileBase64(reader.result as string)
    reader.readAsDataURL(file)
  }, [])
  const handleFileClear = useCallback(() => { setUploadedFile(null); setFileBase64(null) }, [])

  /* ── Dialog ── */
  function openDialog(skill: SkillDefinition) {
    setSelectedSkill(skill)
    setPrompt(''); setUploadedFile(null); setFileBase64(null)
    setExecuting(false); setResult(null); setCreditsRemaining(null)
    setDialogOpen(true)
  }

  /* ── Execute ── */
  async function handleExecute() {
    if (!selectedSkill || executing) return
    if (!prompt.trim() && !uploadedFile) { toast.error('Veuillez entrer un prompt ou téléverser un fichier.'); return }
    try {
      setExecuting(true); setResult(null)
      const input: Record<string, unknown> = { text: prompt.trim() }
      if (uploadedFile && fileBase64) { input.fileContent = fileBase64; input.fileName = uploadedFile.name; input.fileType = uploadedFile.type }
      const res = await fetch('/api/skills', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skillId: selectedSkill.id, input }) })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || `Erreur ${res.status}`) }
      const data = await res.json()
      setResult(data.output); setCreditsRemaining(data.creditsRemaining)
      toast.success(`Skill "${selectedSkill.name}" exécutée avec succès !`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur inconnue')
      setResult({ success: false, data: err instanceof Error ? err.message : 'Erreur inconnue', durationMs: 0 })
    } finally { setExecuting(false) }
  }

  /* ── Download produced file ── */
  function downloadFile(file: { name: string; type: string; data: string }) {
    const a = document.createElement('a')
    a.href = `data:${file.type};base64,${file.data}`
    a.download = file.name; a.click()
  }

  /* ═══════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════ */

  return (
    <motion.div className="flex flex-col h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      {/* ── Gradient accent bar ── */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-chart-4 via-chart-2 to-chart-5 opacity-60" />

      {/* ── Header ── */}
      <motion.div className="px-6 pt-6 pb-4" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-chart-4/20 to-chart-2/20 border border-chart-4/20 flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-chart-4" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Skills IA</h2>
              <p className="text-sm text-muted-foreground">Compétences spécialisées &middot; Exécutez des tâches IA avancées</p>
            </div>
          </div>
        </div>
        <div className="relative mt-4 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher une skill..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/40 border-border/50 backdrop-blur-sm" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Stats Bar ── */}
      {!loading && (
        <motion.div className="px-6 pb-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex flex-wrap gap-3">
            {[
              { icon: <Layers className="w-3.5 h-3.5" />, value: allSkills.length, label: 'skills' },
              { icon: <Crown className="w-3.5 h-3.5 text-amber-500" />, value: premiumCount, label: 'premium' },
              { icon: <Sparkles className="w-3.5 h-3.5 text-chart-4" />, value: categoryKeys.length, label: 'catégories' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border border-border/30">
                {stat.icon}
                <span className="font-semibold text-foreground">{stat.value}</span> {stat.label}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Category Filter Chips ── */}
      {!loading && categoryKeys.length > 0 && (
        <motion.div className="px-6 pb-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all duration-200 ${activeFilter === 'all' ? 'bg-foreground text-background border-foreground shadow-sm' : 'bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted/70 hover:text-foreground'}`}>
              Toutes
            </button>
            {categoryKeys.map((key) => {
              const cat = categories[key]
              return (
                <button key={key} onClick={() => setActiveFilter(key)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all duration-200 flex items-center gap-1 ${activeFilter === key ? `${catStyle(key).badge} border-current shadow-sm` : 'bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted/70'}`}>
                  <span>{cat?.icon}</span><span>{cat?.label}</span>
                </button>
              )
            })}
          </div>
        </motion.div>
      )}

      <Separator className="my-1" />

      {/* ── Skills Content ── */}
      <ScrollArea className="flex-1 max-h-[calc(100vh-16rem)] overflow-y-auto">
        <div className="px-6 pb-8">
          {loading ? (
            <SkillsSkeleton />
          ) : Object.keys(filtered).length === 0 ? (
            <motion.div className="flex flex-col items-center justify-center py-20 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Filter className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-1">Aucune skill trouvée</h3>
              <p className="text-sm text-muted-foreground max-w-sm">Essayez de modifier vos critères de recherche.</p>
              {search && (
                <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSearch(''); setActiveFilter('all') }}>
                  <X className="w-3.5 h-3.5 mr-1.5" />Effacer les filtres
                </Button>
              )}
            </motion.div>
          ) : (
            <div className="space-y-8 mt-4">
              {Object.entries(filtered).map(([catKey, skills]) => (
                <CategorySection key={catKey} categoryKey={catKey}
                  categoryInfo={categories[catKey] || { label: catKey, icon: '📦', color: 'text-foreground' }}
                  skills={skills as SkillDefinition[]} onSkillClick={openDialog} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ═════════════════════════════════════════════════════════
          Execution Dialog
          ═════════════════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {selectedSkill && (
          <DialogContent className="glass-panel max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className={`text-3xl w-12 h-12 flex items-center justify-center rounded-xl border ${catStyle(selectedSkill.category).bg}`}>
                  {selectedSkill.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-lg leading-tight">{selectedSkill.name}</DialogTitle>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge className={`text-[10px] px-1.5 py-0 border-0 font-medium ${catStyle(selectedSkill.category).badge}`}>
                      {categories[selectedSkill.category]?.label || selectedSkill.category}
                    </Badge>
                    {selectedSkill.isPremium && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/90 text-white border-amber-400/50 gap-1">
                        <Crown className="w-2.5 h-2.5" /> Premium
                      </Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Coins className="w-3 h-3" />{selectedSkill.costCredits} crédits
                    </span>
                  </div>
                </div>
              </div>
            </DialogHeader>
            <DialogDescription className="sr-only">Exécuter la skill {selectedSkill.name}</DialogDescription>

            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground leading-relaxed">{selectedSkill.description}</p>

              {/* Input / Output info */}
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 border border-border/30">
                <CreditCard className="w-3.5 h-3.5 mt-0.5 shrink-0 text-chart-2" />
                <span><span className="font-medium text-foreground">Entrée :</span> {selectedSkill.inputDescription}</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 border border-border/30">
                <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-chart-4" />
                <span><span className="font-medium text-foreground">Sortie :</span> {selectedSkill.outputDescription}</span>
              </div>

              <Separator />

              {/* Prompt */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Prompt / Instructions
                </label>
                <Textarea placeholder={selectedSkill.inputDescription} value={prompt}
                  onChange={(e) => setPrompt(e.target.value)} className="min-h-[100px] resize-none bg-muted/40 border-border/50"
                  disabled={executing} />
              </div>

              {/* File upload */}
              {selectedSkill.acceptsFiles && (
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" /> Fichier (optionnel)
                  </label>
                  <FileUploadArea acceptedTypes={selectedSkill.acceptedFileTypes}
                    onFileSelect={handleFileSelect} file={uploadedFile} onClear={handleFileClear} />
                </div>
              )}

              {/* Loading state */}
              {executing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center gap-3 p-4 rounded-lg bg-chart-4/5 border border-chart-4/20">
                  <Loader2 className="w-5 h-5 text-chart-4 animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-chart-4">Exécution en cours...</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      La skill &quot;{selectedSkill.name}&quot; est en cours d&apos;exécution
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Result */}
              <AnimatePresence>
                {result && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                    <Separator className="mb-4" />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-sm font-medium text-emerald-500">Exécution réussie</span></>
                        ) : (
                          <><AlertCircle className="w-4 h-4 text-red-500" /><span className="text-sm font-medium text-red-500">Erreur</span></>
                        )}
                        <span className="text-[11px] text-muted-foreground ml-auto flex items-center gap-1">
                          <Clock className="w-3 h-3" />{(result.durationMs / 1000).toFixed(2)}s
                        </span>
                      </div>
                      {creditsRemaining !== null && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Coins className="w-3 h-3" />Crédits restants : <span className="font-semibold text-foreground">{creditsRemaining}</span>
                        </div>
                      )}
                      <div className="bg-muted/50 rounded-lg p-4 border border-border/30 max-h-64 overflow-y-auto">
                        <pre className="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed">{result.data}</pre>
                      </div>
                      {result.files && result.files.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-xs font-medium">Fichiers générés :</span>
                          {result.files.map((file, i) => (
                            <div key={i} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/50 border border-border/30">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-chart-2 shrink-0" />
                                <span className="text-xs truncate">{file.name}</span>
                                <span className="text-[10px] text-muted-foreground shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                              </div>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] shrink-0" onClick={() => downloadFile(file)}>
                                <Download className="w-3.5 h-3.5 mr-1" />Télécharger
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <DialogFooter className="mt-4 flex-shrink-0">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={executing}>Fermer</Button>
              <Button onClick={handleExecute} disabled={executing || (!prompt.trim() && !uploadedFile)} className="gap-1.5">
                {executing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Exécution...</>
                ) : (
                  <><Play className="w-4 h-4" />Exécuter
                    <span className="text-[11px] opacity-70 ml-0.5">({selectedSkill.costCredits} crédits)</span></>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </motion.div>
  )
}
