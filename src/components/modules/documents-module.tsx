'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  FileText,
  Plus,
  ArrowLeft,
  Sparkles,
  Download,
  PenLine,
  BookOpen,
  Trash2,
  Eye,
  Code2,
  Type,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

/* ─── Types ─── */
type DocumentType = 'markdown' | 'html' | 'text'
type DocumentStatus = 'brouillon' | 'finalisé'

interface Document {
  id: string
  title: string
  content: string
  type: DocumentType
  status: DocumentStatus
  createdAt: Date
  updatedAt: Date
}

/* ─── Templates ─── */
const TEMPLATES: {
  name: string
  icon: typeof FileText
  description: string
  type: DocumentType
  content: string
}[] = [
  {
    name: 'Rapport Professionnel',
    icon: FileText,
    description: 'Structure complète avec table des matières',
    type: 'markdown',
    content: `# Rapport Professionnel

## Table des matières
1. Introduction
2. Contexte et objectifs
3. Méthodologie
4. Résultats
5. Analyse et discussion
6. Recommandations
7. Conclusion

---

## 1. Introduction

Ce rapport présente les résultats de notre analyse concernant le projet en cours. Il a pour objectif de fournir une vue d'ensemble complète des avancées réalisées.

## 2. Contexte et objectifs

### 2.1 Contexte général

Le projet a été initié dans le cadre de la stratégie de développement de l'entreprise.

### 2.2 Objectifs

- **Objectif principal** : Décrire les résultats obtenus
- **Objectif secondaire** : Proposer des pistes d'amélioration
- **Objectif tertiaire** : Planifier les prochaines étapes

## 3. Méthodologie

L'approche adoptée repose sur une analyse itérative combinant :

1. Collecte de données quantitatives
2. Entretiens qualitatifs
3. Benchmarking sectoriel

## 4. Résultats

> Les résultats démontrent une progression significative sur l'ensemble des indicateurs clés.

| Indicateur | Valeur initiale | Valeur actuelle | Variation |
|-----------|----------------|-----------------|-----------|
| Productivité | 65% | 82% | +17% |
| Satisfaction | 3.2/5 | 4.1/5 | +0.9 |
| Délai moyen | 12j | 8j | -33% |

## 5. Analyse et discussion

Les améliorations observées sont principalement attribuables à :
- L'optimisation des processus internes
- La formation des équipes
- L'intégration d'outils collaboratifs

## 6. Recommandations

1. Poursuivre la digitalisation des processus
2. Renforcer la formation continue
3. Étendre les bonnes pratiques à d'autres départements

## 7. Conclusion

Ce rapport met en évidence des résultats positifs et pose les bases d'une amélioration continue.

---
*Document généré avec NexusAI Document Studio*`,
  },
  {
    name: 'Article de Blog',
    icon: PenLine,
    description: 'Format optimisé pour le SEO',
    type: 'markdown',
    content: `# Titre de l'Article : Guide Complet pour Réussir

**Meta description** : Découvrez nos meilleures stratégies et conseils d'experts pour atteindre vos objectifs professionnels en 2024.

---

## Introduction

Dans un monde en constante évolution, il est essentiel de rester à la pointe des dernières tendances et meilleures pratiques. Cet article vous guidera à travers les stratégies les plus efficaces.

## Pourquoi c'est important en 2024 ?

Le paysage professionnel a profondément changé. Voici les **3 raisons principales** :

1. **Transformation digitale accélérée** — Les entreprises doivent s'adapter rapidement
2. **Nouvelles attentes des consommateurs** — L'expérience utilisateur est reine
3. **Concurrence accrue** — Se différencier est devenu crucial

## Stratégie #1 : Fondamentaux Solides

### Les piliers d'une approche réussie

Avant de courir, il faut savoir marcher. Les fondamentaux incluent :

- Définir des objectifs **SMART** (Spécifiques, Mesurables, Atteignables, Réalistes, Temporels)
- Comprendre votre audience cible
- Établir des indicateurs de performance clairs

> 💡 **Conseil d'expert** : Prenez le temps de bien définir vos objectifs avant de vous lancer dans l'exécution.

### Outils recommandés

| Outil | Usage | Prix |
|-------|-------|------|
| Outil A | Analyse | Gratuit |
| Outil B | Gestion | Freemium |
| Outil C | Reporting | Premium |

## Stratégie #2 : Optimisation Continue

L'amélioration continue est un processus itératif. Voici comment l'appliquer :

1. **Mesurer** — Collectez des données pertinentes
2. **Analyser** — Identifiez les opportunités d'amélioration
3. **Agir** — Mettez en place des changements ciblés
4. **Répéter** — Poursuivez le cycle

## Erreurs Courantes à Éviter

- ❌ Ignorer les données analytiques
- ❌ Vouloir tout changer en même temps
- ❌ Négliger l'aspect humain
- ✅ Prendre des décisions basées sur les données
- ✅ Procéder par étapes mesurables
- ✅ Impliquer les équipes dès le début

## Conclusion

En appliquant ces stratégies, vous serez en mesure d'atteindre vos objectifs plus efficacement. N'oubliez pas que la **constance** et l'**adaptabilité** sont les clés du succès à long terme.

---

*Tags : #Productivité #Stratégie #Croissance #2024*

*Article rédigé avec NexusAI Document Studio*`,
  },
  {
    name: 'Documentation Technique',
    icon: BookOpen,
    description: 'Guide technique détaillé',
    type: 'markdown',
    content: `# Guide Technique — Documentation de Référence

> **Version** : 1.0.0 | **Dernière mise à jour** : 2024

---

## Table des matières

- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Exemples d'utilisation](#exemples-dutilisation)
- [Dépannage](#dépannage)

## Prérequis

Avant de commencer, assurez-vous d'avoir les éléments suivants installés :

- **Node.js** >= 18.x
- **npm** ou **yarn** >= 1.22
- **Git** >= 2.30

\`\`\`bash
# Vérifier les versions
node --version    # v18.x ou supérieur
npm --version     # 9.x ou supérieur
git --version     # 2.30 ou supérieur
\`\`\`

## Installation

### Étape 1 : Cloner le dépôt

\`\`\`bash
git clone https://github.com/organisation/projet.git
cd projet
\`\`\`

### Étape 2 : Installer les dépendances

\`\`\`bash
npm install
\`\`\`

### Étape 3 : Configurer l'environnement

\`\`\`bash
cp .env.example .env.local
# Éditez .env.local avec vos valeurs
\`\`\`

## Configuration

Le fichier de configuration principal est \`config.json\` :

\`\`\`json
{
  "port": 3000,
  "database": {
    "host": "localhost",
    "port": 5432,
    "name": "myapp"
  },
  "cache": {
    "enabled": true,
    "ttl": 3600
  }
}
\`\`\`

### Variables d'environnement

| Variable | Description | Requise | Défaut |
|----------|-------------|---------|--------|
| \`PORT\` | Port du serveur | Non | \`3000\` |
| \`DATABASE_URL\` | Chaîne de connexion DB | Oui | — |
| \`API_KEY\` | Clé d'API externe | Oui | — |
| \`LOG_LEVEL\` | Niveau de log | Non | \`info\` |

## Architecture

Le projet suit une architecture en couches :

\`\`\`
src/
├── components/    # Composants réutilisables
├── hooks/         # Hooks React personnalisés
├── lib/           # Utilitaires et fonctions
├── services/      # Logique métier
├── types/         # Définitions TypeScript
└── app/           # Routes et pages
\`\`\`

## API Reference

### \`GET /api/items\`

Récupérer la liste des éléments.

**Paramètres de requête :**

- \`page\` (number) — Numéro de page (défaut: 1)
- \`limit\` (number) — Éléments par page (défaut: 20)

**Réponse :**

\`\`\`json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
\`\`\`

## Exemples d'utilisation

### Exemple basique

\`\`\`typescript
import { fetchItems } from '@/services/api'

async function loadData() {
  const result = await fetchItems({ page: 1, limit: 10 })
  console.log(result.data)
}
\`\`\`

## Dépannage

### Erreur courante : "Connection refused"

- Vérifiez que le serveur de base de données est démarré
- Vérifiez \`DATABASE_URL\` dans \`.env.local\`

### Erreur courante : "Module not found"

\`\`\`bash
# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install
\`\`\`

---

*Documentation générée avec NexusAI Document Studio*`,
  },
]

/* ─── Relative time helper ─── */
function relativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return "À l'instant"
  if (minutes < 60) return `Il y a ${minutes} min`
  if (hours < 24) return `Il y a ${hours}h`
  if (days < 7) return `Il y a ${days}j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

/* ─── Document type icon mapping ─── */
function getDocTypeIcon(type: DocumentType) {
  switch (type) {
    case 'markdown':
      return FileText
    case 'html':
      return Code2
    case 'text':
      return Type
  }
}

function getDocTypeLabel(type: DocumentType): string {
  switch (type) {
    case 'markdown':
      return 'Markdown'
    case 'html':
      return 'HTML'
    case 'text':
      return 'Texte brut'
  }
}

function getStatusVariant(status: DocumentStatus): 'default' | 'secondary' | 'outline' {
  return status === 'finalisé' ? 'default' : 'secondary'
}

/* ─── Preview renderer ─── */
function DocumentPreview({ content, type }: { content: string; type: DocumentType }) {
  if (!content.trim()) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground/50 text-sm">
        Aperçu du document
      </div>
    )
  }

  switch (type) {
    case 'markdown':
      return (
        <div className="prose-ai custom-scrollbar h-full overflow-y-auto p-6">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      )
    case 'html':
      return (
        <div
          className="custom-scrollbar h-full w-full overflow-y-auto p-6"
          style={{ all: 'initial', display: 'block', fontFamily: 'inherit', color: 'inherit' }}
        >
          <div
            className="prose-ai"
            style={{ all: 'revert' }}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      )
    case 'text':
      return (
        <pre className="custom-scrollbar h-full overflow-y-auto whitespace-pre-wrap break-words p-6 text-sm leading-7">
          {content}
        </pre>
      )
  }
}

/* ─── Animation variants ─── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
}

/* ─── AI Generation Dialog ─── */
function AIGenerationDialog({
  open,
  onOpenChange,
  onGenerate,
  isGenerating,
  initialType,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate: (prompt: string, type: DocumentType, tone: string, length: string) => void
  isGenerating: boolean
  initialType: DocumentType
}) {
  const [prompt, setPrompt] = useState('')
  const [docType, setDocType] = useState<DocumentType>(initialType)
  const [tone, setTone] = useState('professionnel')
  const [length, setLength] = useState('moyen')

  const handleGenerate = () => {
    if (!prompt.trim()) return
    onGenerate(prompt, docType, tone, length)
    setPrompt('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            Générer avec l'IA
          </DialogTitle>
          <DialogDescription>
            Décrivez le document que vous souhaitez générer et configurez les options.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ai-prompt">Description du document</Label>
            <Textarea
              id="ai-prompt"
              placeholder="Décrivez le document que vous souhaitez générer..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={docType} onValueChange={(v) => setDocType(v as DocumentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="markdown">Markdown</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="text">Texte brut</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ton</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professionnel">Professionnel</SelectItem>
                  <SelectItem value="académique">Académique</SelectItem>
                  <SelectItem value="créatif">Créatif</SelectItem>
                  <SelectItem value="technique">Technique</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Longueur</Label>
              <Select value={length} onValueChange={setLength}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="court">Court</SelectItem>
                  <SelectItem value="moyen">Moyen</SelectItem>
                  <SelectItem value="long">Long</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Annuler
          </Button>
          <Button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-4" />
                Générer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Main Component ─── */
export default function DocumentsModule() {
  /* Document state */
  const [documents, setDocuments] = useState<Document[]>([])
  const [activeDocId, setActiveDocId] = useState<string | null>(null)
  const [editorContent, setEditorContent] = useState('')
  const [editorTitle, setEditorTitle] = useState('')
  const [editorType, setEditorType] = useState<DocumentType>('markdown')
  const [editorStatus, setEditorStatus] = useState<DocumentStatus>('brouillon')

  /* Editor UI state */
  const [editorTab, setEditorTab] = useState<'editor' | 'preview' | 'split'>('split')
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  /* Refs */
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /* Auto-resize textarea */
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.max(el.scrollHeight, el.parentElement?.clientHeight ?? 400)}px`
    }
  }, [editorContent, activeDocId])

  /* Get active document */
  const activeDoc = documents.find((d) => d.id === activeDocId) ?? null

  /* ─── Document CRUD ─── */
  const createDocument = useCallback(
    (title: string, type: DocumentType, content: string) => {
      const now = new Date()
      const doc: Document = {
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title,
        content,
        type,
        status: 'brouillon',
        createdAt: now,
        updatedAt: now,
      }
      setDocuments((prev) => [doc, ...prev])
      setActiveDocId(doc.id)
      setEditorTitle(doc.title)
      setEditorContent(doc.content)
      setEditorType(doc.type)
      setEditorStatus(doc.status)
      return doc.id
    },
    []
  )

  const openDocument = useCallback(
    (id: string) => {
      const doc = documents.find((d) => d.id === id)
      if (!doc) return
      setActiveDocId(id)
      setEditorTitle(doc.title)
      setEditorContent(doc.content)
      setEditorType(doc.type)
      setEditorStatus(doc.status)
    },
    [documents]
  )

  const saveCurrentDocument = useCallback(() => {
    if (!activeDocId) return
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === activeDocId
          ? { ...d, title: editorTitle, content: editorContent, type: editorType, status: editorStatus, updatedAt: new Date() }
          : d
      )
    )
  }, [activeDocId, editorTitle, editorContent, editorType, editorStatus])

  const deleteDocument = useCallback(
    (id: string) => {
      setDocuments((prev) => prev.filter((d) => d.id !== id))
      if (activeDocId === id) {
        setActiveDocId(null)
        setEditorTitle('')
        setEditorContent('')
      }
      toast.success('Document supprimé')
    },
    [activeDocId]
  )

  /* Auto-save on changes */
  useEffect(() => {
    if (activeDocId) {
      const timer = setTimeout(saveCurrentDocument, 800)
      return () => clearTimeout(timer)
    }
  }, [editorTitle, editorContent, editorType, editorStatus, activeDocId, saveCurrentDocument])

  /* ─── AI Generation ─── */
  const handleAIGenerate = useCallback(
    async (prompt: string, type: DocumentType, tone: string, length: string) => {
      setIsGenerating(true)

      const lengthMap: Record<string, string> = {
        court: 'environ 200-300 mots',
        moyen: 'environ 500-800 mots',
        long: 'environ 1000-1500 mots',
      }

      const typeInstruction: Record<DocumentType, string> = {
        markdown: 'Utilise le format Markdown avec titres, listes, tableaux si pertinent.',
        html: 'Utilise du HTML sémantique avec des balises appropriées (h1, h2, p, ul, etc.).',
        text: 'Rédige en texte brut bien structuré.',
      }

      const systemPrompt = `Tu es un expert en rédaction professionnelle. Tu génères des documents de haute qualité.
Ton : ${tone}.
Longueur souhaitée : ${lengthMap[length]}.
${typeInstruction[type]}

Génère UNIQUEMENT le contenu du document, sans commentaires ou explications supplémentaires.
Commence directement par le contenu.`

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            systemPrompt,
          }),
        })

        const data = await response.json()

        if (data.success && data.content) {
          setEditorContent((prev) => {
            const separator = prev.trim() ? '\n\n---\n\n' : ''
            return prev + separator + data.content
          })
          toast.success('Document généré avec succès')
          setAiDialogOpen(false)
        } else {
          toast.error(data.error || 'Erreur lors de la génération')
        }
      } catch {
        toast.error('Erreur de connexion au serveur')
      } finally {
        setIsGenerating(false)
      }
    },
    []
  )

  /* ─── Download ─── */
  const handleDownload = useCallback(() => {
    if (!editorContent.trim()) {
      toast.error('Le document est vide')
      return
    }

    const extensions: Record<DocumentType, string> = {
      markdown: 'md',
      html: 'html',
      text: 'txt',
    }

    const mimeTypes: Record<DocumentType, string> = {
      markdown: 'text/markdown',
      html: 'text/html',
      text: 'text/plain',
    }

    const ext = extensions[editorType]
    const mime = mimeTypes[editorType]
    const filename = `${editorTitle || 'document'}.${ext}`

    let fileContent = editorContent
    if (editorType === 'html' && !editorContent.trim().startsWith('<!DOCTYPE') && !editorContent.trim().startsWith('<html')) {
      fileContent = `<!DOCTYPE html>\n<html lang="fr">\n<head>\n  <meta charset="UTF-8">\n  <title>${editorTitle}</title>\n</head>\n<body>\n${editorContent}\n</body>\n</html>`
    }

    const blob = new Blob([fileContent], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Téléchargé : ${filename}`)
  }, [editorContent, editorType, editorTitle])

  /* ─── Back to list ─── */
  const handleBack = useCallback(() => {
    saveCurrentDocument()
    setActiveDocId(null)
  }, [saveCurrentDocument])

  /* ─── Render: Editor View ─── */
  if (activeDocId) {
    return (
      <>
        <div className="flex h-full flex-col">
          {/* Editor header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Back button + title row */}
            <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={handleBack}
                aria-label="Retour à la liste"
              >
                <ArrowLeft className="size-4" />
              </Button>

              <Input
                value={editorTitle}
                onChange={(e) => setEditorTitle(e.target.value)}
                className="h-8 max-w-xs border-0 bg-transparent text-base font-semibold focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="Titre du document..."
              />

              <div className="ml-auto flex items-center gap-2">
                <Select
                  value={editorType}
                  onValueChange={(v) => setEditorType(v as DocumentType)}
                >
                  <SelectTrigger className="h-8 w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="markdown">Markdown</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="text">Texte brut</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={editorStatus}
                  onValueChange={(v) => setEditorStatus(v as DocumentStatus)}
                >
                  <SelectTrigger className="h-8 w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brouillon">Brouillon</SelectItem>
                    <SelectItem value="finalisé">Finalisé</SelectItem>
                  </SelectContent>
                </Select>

                <Separator orientation="vertical" className="mx-1 h-6" />

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => setAiDialogOpen(true)}
                >
                  <Sparkles className="size-3.5" />
                  <span className="hidden sm:inline">Générer avec l'IA</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={handleDownload}
                >
                  <Download className="size-3.5" />
                  <span className="hidden sm:inline">Télécharger</span>
                </Button>
              </div>
            </div>

            {/* Editor / Preview tabs (mobile) or split indicator (desktop) */}
            <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2 md:hidden">
              <Tabs value={editorTab} onValueChange={(v) => setEditorTab(v as typeof editorTab)}>
                <TabsList className="h-8">
                  <TabsTrigger value="editor" className="text-xs px-3">
                    Éditeur
                  </TabsTrigger>
                  <TabsTrigger value="split" className="text-xs px-3">
                    Split
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="text-xs px-3">
                    Aperçu
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </motion.div>

          {/* Editor + Preview area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Editor panel */}
            {(editorTab === 'editor' || editorTab === 'split') && (
              <motion.div
                className={editorTab === 'split' ? 'w-[60%] border-r border-border/50' : 'w-full'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div className="flex h-full flex-col">
                  <div className="flex items-center gap-2 border-b border-border/30 px-4 py-1.5">
                    <span className="text-xs text-muted-foreground font-medium">
                      {getDocTypeLabel(editorType)}
                    </span>
                    <span className="text-xs text-muted-foreground/50">
                      {editorContent.length} caractères
                    </span>
                  </div>
                  <div className="relative flex-1">
                    <textarea
                      ref={textareaRef}
                      value={editorContent}
                      onChange={(e) => setEditorContent(e.target.value)}
                      className="custom-scrollbar input-glow h-full w-full resize-none bg-transparent p-4 font-mono text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground/40"
                      placeholder="Commencez à écrire votre document..."
                      spellCheck={false}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Preview panel */}
            {(editorTab === 'preview' || editorTab === 'split') && (
              <motion.div
                className={editorTab === 'split' ? 'w-[40%]' : 'w-full'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <div className="flex h-full flex-col">
                  <div className="flex items-center gap-2 border-b border-border/30 px-4 py-1.5">
                    <Eye className="size-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">Aperçu</span>
                  </div>
                  <div className="glass-subtle flex-1 overflow-hidden">
                    <DocumentPreview content={editorContent} type={editorType} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* AI Generation Dialog */}
        <AIGenerationDialog
          open={aiDialogOpen}
          onOpenChange={setAiDialogOpen}
          onGenerate={handleAIGenerate}
          isGenerating={isGenerating}
          initialType={editorType}
        />
      </>
    )
  }

  /* ─── Render: List View ─── */
  return (
    <div className="flex h-full flex-col p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <FileText className="size-6 text-primary" />
            Documents
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Studio de création documentaire
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() =>
            createDocument('Sans titre', 'markdown', '')
          }
        >
          <Plus className="size-4" />
          Nouveau Document
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {documents.length === 0 ? (
          /* ─── Welcome State ─── */
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-1 flex-col items-center justify-center"
          >
            <div className="flex size-20 items-center justify-center rounded-2xl bg-primary/10 glow-sm mb-6">
              <FileText className="size-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Aucun document</h2>
            <p className="mt-2 mb-8 text-sm text-muted-foreground max-w-sm text-center">
              Créez votre premier document avec l&apos;aide de l&apos;IA
            </p>

            <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
              {TEMPLATES.map((template, idx) => {
                const Icon = template.icon
                return (
                  <motion.button
                    key={template.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.1 + idx * 0.08 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => createDocument(template.name, template.type, template.content)}
                    className="module-card glass group flex flex-col items-center gap-3 rounded-xl p-6 text-center cursor-pointer"
                  >
                    <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                      <Icon className="size-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{template.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {template.description}
                      </p>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        ) : (
          /* ─── Document Grid ─── */
          <motion.div
            key="grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="custom-scrollbar flex-1 overflow-y-auto"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {documents.map((doc) => {
                  const TypeIcon = getDocTypeIcon(doc.type)
                  const preview = doc.content.slice(0, 100).replace(/[#*_`~>\[\]()!|-]/g, '').trim()
                  return (
                    <motion.div
                      key={doc.id}
                      variants={cardVariants}
                      layout
                      exit="exit"
                      className="module-card glass group flex flex-col rounded-xl p-4 gap-3"
                    >
                      {/* Card header */}
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <TypeIcon className="size-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-semibold leading-tight">
                            {doc.title}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                            {preview || 'Document vide'}
                          </p>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-2 py-0">
                          {getDocTypeLabel(doc.type)}
                        </Badge>
                        <Badge variant={getStatusVariant(doc.status)} className="text-[10px] px-2 py-0">
                          {doc.status === 'brouillon' ? 'Brouillon' : 'Finalisé'}
                        </Badge>
                        <span className="ml-auto text-[10px] text-muted-foreground/60">
                          {relativeTime(doc.updatedAt)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={() => openDocument(doc.id)}
                        >
                          Ouvrir
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteDocument(doc.id)}
                          aria-label="Supprimer le document"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Generation Dialog (list view — for new doc) */}
      <AIGenerationDialog
        open={aiDialogOpen}
        onOpenChange={(open) => {
          setAiDialogOpen(open)
          if (open) {
            createDocument('Document IA', 'markdown', '')
          }
        }}
        onGenerate={handleAIGenerate}
        isGenerating={isGenerating}
        initialType="markdown"
      />
    </div>
  )
}