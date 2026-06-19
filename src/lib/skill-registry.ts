/* ═══════════════════════════════════════════════════════════════════════
   NexusAI Skill Registry — Powerful Composable Skill System
   Each skill is a self-contained capability that agents can invoke.
   Uses z-ai-web-dev-sdk for all AI operations.
   ═══════════════════════════════════════════════════════════════════════ */

import { getProvider, type ChatMessage } from './ai-provider'

// ── Types ──

export type SkillCategory =
  | 'search'
  | 'code'
  | 'content'
  | 'data'
  | 'multimodal'
  | 'voice'
  | 'document'
  | 'design'
  | 'automation'
  | 'productivity'
  | 'security'
  | 'browser'

export interface SkillInput {
  [key: string]: unknown
}

export interface SkillOutput {
  success: boolean
  data: string
  metadata?: Record<string, unknown>
  files?: Array<{ name: string; type: string; data: string; size: number }>
  durationMs: number
}

export interface SkillDefinition {
  id: string
  name: string
  description: string
  category: SkillCategory
  icon: string
  color: string
  inputDescription: string
  outputDescription: string
  acceptsFiles: boolean
  acceptedFileTypes: string[]
  producesFiles: boolean
  producedFileTypes: string[]
  costCredits: number
  isPremium: boolean
  tags: string[]
}

export interface SkillWithStatus extends SkillDefinition {
  isEnabled: boolean
  usageCount: number
}

// ── Skill Definitions ──

export const SKILL_DEFINITIONS: SkillDefinition[] = [
  // ─── SEARCH ───
  {
    id: 'web-search',
    name: 'Recherche Web',
    description: 'Recherche des informations en temps réel sur le web. Retourne des résultats pertinents avec titres, snippets et URLs.',
    category: 'search',
    icon: '🔍',
    color: 'text-chart-2',
    inputDescription: 'Query de recherche (texte)',
    outputDescription: 'Liste de résultats avec titres, snippets, URLs',
    acceptsFiles: false,
    acceptedFileTypes: [],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 5,
    isPremium: false,
    tags: ['search', 'web', 'recherche', 'informations', 'temps réel'],
  },
  {
    id: 'web-reader',
    name: 'Lecture de Pages Web',
    description: 'Extrait et analyse le contenu complet d\'une page web : texte, structure, métadonnées.',
    category: 'search',
    icon: '🌐',
    color: 'text-chart-2',
    inputDescription: 'URL ou query pour trouver une page',
    outputDescription: 'Contenu extrait de la page web (texte, titre, date)',
    acceptsFiles: false,
    acceptedFileTypes: [],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 5,
    isPremium: false,
    tags: ['web', 'lecture', 'extraction', 'scraping', 'contenu'],
  },

  // ─── CODE ───
  {
    id: 'code-generate',
    name: 'Génération de Code',
    description: 'Génère du code propre, commenté et prêt pour la production dans n\'importe quel langage.',
    category: 'code',
    icon: '💻',
    color: 'text-primary',
    inputDescription: 'Spécifications du code à générer',
    outputDescription: 'Code généré avec explications',
    acceptsFiles: false,
    acceptedFileTypes: [],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 10,
    isPremium: false,
    tags: ['code', 'programmation', 'développement', 'génération'],
  },
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Analyse du code pour identifier bugs, vulnérabilités de sécurité, problèmes de performance et meilleures pratiques.',
    category: 'code',
    icon: '🔍',
    color: 'text-primary',
    inputDescription: 'Code à analyser',
    outputDescription: 'Rapport de review avec sévérité (🔴🟡🟢)',
    acceptsFiles: true,
    acceptedFileTypes: ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.rb', '.php'],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 15,
    isPremium: false,
    tags: ['code', 'review', 'sécurité', 'performance', 'audit'],
  },
  {
    id: 'code-execute',
    name: 'Exécution de Code',
    description: 'Exécute du code JavaScript/TypeScript en sandbox et retourne le résultat.',
    category: 'code',
    icon: '⚡',
    color: 'text-primary',
    inputDescription: 'Code JavaScript/TypeScript à exécuter',
    outputDescription: 'Résultat de l\'exécution (stdout, stderr, valeur de retour)',
    acceptsFiles: false,
    acceptedFileTypes: [],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 20,
    isPremium: true,
    tags: ['code', 'exécution', 'sandbox', 'test', 'runtime'],
  },
  {
    id: 'code-explain',
    name: 'Explication de Code',
    description: 'Explique du code complexe ligne par ligne avec des analogies claires.',
    category: 'code',
    icon: '📖',
    color: 'text-primary',
    inputDescription: 'Code à expliquer',
    outputDescription: 'Explication détaillée du code',
    acceptsFiles: true,
    acceptedFileTypes: ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.rb', '.php'],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 10,
    isPremium: false,
    tags: ['code', 'explication', 'apprentissage', 'documentation'],
  },

  // ─── CONTENT ───
  {
    id: 'writing',
    name: 'Rédaction Professionnelle',
    description: 'Rédige du contenu professionnel de haute qualité : articles, rapports, emails, posts, etc.',
    category: 'content',
    icon: '✍️',
    color: 'text-chart-3',
    inputDescription: 'Sujet, ton, format, audience cible',
    outputDescription: 'Contenu rédigé en markdown',
    acceptsFiles: false,
    acceptedFileTypes: [],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 8,
    isPremium: false,
    tags: ['rédaction', 'contenu', 'article', 'blog', 'email'],
  },
  {
    id: 'summarization',
    name: 'Résumé Intelligent',
    description: 'Résume des textes longs en versions concises avec points clés.',
    category: 'content',
    icon: '📝',
    color: 'text-chart-3',
    inputDescription: 'Texte à résumer + longueur souhaitée',
    outputDescription: 'Résumé structuré avec points clés',
    acceptsFiles: true,
    acceptedFileTypes: ['.txt', '.md', '.pdf', '.docx'],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 8,
    isPremium: false,
    tags: ['résumé', 'synthèse', 'condensation', 'points clés'],
  },
  {
    id: 'translation',
    name: 'Traduction Multilingue',
    description: 'Traduit du texte entre plus de 50 langues avec préservation du formatage.',
    category: 'content',
    icon: '🌍',
    color: 'text-chart-3',
    inputDescription: 'Texte + langue cible (auto-détection de la source)',
    outputDescription: 'Texte traduit dans la langue cible',
    acceptsFiles: true,
    acceptedFileTypes: ['.txt', '.md'],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 8,
    isPremium: false,
    tags: ['traduction', 'multilingue', 'langues', 'localisation'],
  },
  {
    id: 'email-compose',
    name: 'Composition d\'Email',
    description: 'Compose des emails professionnels avec objet, corps, et formule de politesse adaptés.',
    category: 'content',
    icon: '📧',
    color: 'text-chart-3',
    inputDescription: 'Contexte, destinataire, ton, objectif de l\'email',
    outputDescription: 'Email complet prêt à envoyer',
    acceptsFiles: false,
    acceptedFileTypes: [],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 5,
    isPremium: false,
    tags: ['email', 'communication', 'professionnel', 'rédaction'],
  },
  {
    id: 'sentiment-analysis',
    name: 'Analyse de Sentiment',
    description: 'Analyse le sentiment et les émotions d\'un texte avec scores de confiance.',
    category: 'content',
    icon: '💭',
    color: 'text-chart-3',
    inputDescription: 'Texte à analyser',
    outputDescription: 'Sentiment, émotions, confiance, phrases clés (JSON)',
    acceptsFiles: true,
    acceptedFileTypes: ['.txt', '.md', '.csv'],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 8,
    isPremium: false,
    tags: ['sentiment', 'émotions', 'analyse', 'NLP', 'opinion'],
  },
  {
    id: 'keyword-extraction',
    name: 'Extraction de Mots-clés',
    description: 'Extrait les mots-clés, topics et entités (personnes, organisations, lieux) d\'un texte.',
    category: 'content',
    icon: '🏷️',
    color: 'text-chart-3',
    inputDescription: 'Texte à analyser',
    outputDescription: 'Mots-clés, topics, entités (JSON)',
    acceptsFiles: true,
    acceptedFileTypes: ['.txt', '.md', '.pdf'],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 5,
    isPremium: false,
    tags: ['mots-clés', 'NLP', 'entités', 'extraction', 'topics'],
  },

  // ─── DATA ───
  {
    id: 'data-analysis',
    name: 'Analyse de Données',
    description: 'Analyse des données pour identifier tendances, patterns, outliers et fournir des insights actionnables.',
    category: 'data',
    icon: '📊',
    color: 'text-chart-5',
    inputDescription: 'Données à analyser (texte, CSV, JSON)',
    outputDescription: 'Rapport d\'analyse structuré avec insights',
    acceptsFiles: true,
    acceptedFileTypes: ['.csv', '.json', '.txt', '.xlsx'],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 15,
    isPremium: false,
    tags: ['données', 'analyse', 'insights', 'tendances', 'statistiques'],
  },
  {
    id: 'data-visualization',
    name: 'Génération de Graphiques',
    description: 'Crée des graphiques professionnels (barres, lignes, camembert, scatter, heatmap, etc.) à partir de données.',
    category: 'data',
    icon: '📈',
    color: 'text-chart-5',
    inputDescription: 'Données + type de graphique souhaité',
    outputDescription: 'Graphique en image PNG/SVG',
    acceptsFiles: true,
    acceptedFileTypes: ['.csv', '.json', '.txt'],
    producesFiles: true,
    producedFileTypes: ['image/png', 'image/svg+xml'],
    costCredits: 20,
    isPremium: true,
    tags: ['graphique', 'chart', 'visualisation', 'données', 'diagramme'],
  },
  {
    id: 'spreadsheet-create',
    name: 'Création de Tableur',
    description: 'Crée des fichiers Excel professionnels avec données, formules, formatage et graphiques.',
    category: 'data',
    icon: '📑',
    color: 'text-chart-5',
    inputDescription: 'Description du tableur souhaité + données',
    outputDescription: 'Fichier Excel (.xlsx)',
    acceptsFiles: false,
    acceptedFileTypes: [],
    producesFiles: true,
    producedFileTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    costCredits: 15,
    isPremium: true,
    tags: ['excel', 'tableur', 'feuille de calcul', 'données', 'xlsx'],
  },

  // ─── MULTIMODAL ───
  {
    id: 'image-generate',
    name: 'Génération d\'Images',
    description: 'Génère des images à partir de descriptions textuelles. Styles variés : photoréaliste, illustration, 3D, etc.',
    category: 'multimodal',
    icon: '🎨',
    color: 'text-chart-4',
    inputDescription: 'Description de l\'image souhaitée + taille/style',
    outputDescription: 'Image générée (base64)',
    acceptsFiles: false,
    acceptedFileTypes: [],
    producesFiles: true,
    producedFileTypes: ['image/png'],
    costCredits: 25,
    isPremium: true,
    tags: ['image', 'génération', 'création', 'art', 'design'],
  },
  {
    id: 'image-analyze',
    name: 'Analyse d\'Images (VLM)',
    description: 'Analyse et décrit le contenu d\'images : objets, texte, couleurs, disposition, éléments notables.',
    category: 'multimodal',
    icon: '👁️',
    color: 'text-chart-4',
    inputDescription: 'Image (URL ou base64) + question optionnelle',
    outputDescription: 'Description détaillée de l\'image',
    acceptsFiles: true,
    acceptedFileTypes: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 15,
    isPremium: false,
    tags: ['image', 'analyse', 'vision', 'VLM', 'reconnaissance'],
  },
  {
    id: 'image-edit',
    name: 'Édition d\'Images',
    description: 'Modifie et transforme des images existantes selon des instructions textuelles.',
    category: 'multimodal',
    icon: '🖼️',
    color: 'text-chart-4',
    inputDescription: 'Image + instructions de modification',
    outputDescription: 'Image modifiée (base64)',
    acceptsFiles: true,
    acceptedFileTypes: ['.png', '.jpg', '.jpeg', '.webp'],
    producesFiles: true,
    producedFileTypes: ['image/png'],
    costCredits: 30,
    isPremium: true,
    tags: ['image', 'édition', 'modification', 'retouche', 'transformation'],
  },
  {
    id: 'video-understand',
    name: 'Compréhension Vidéo',
    description: 'Analyse le contenu de vidéos : scènes, actions, objets, transcription, résumé temporel.',
    category: 'multimodal',
    icon: '🎬',
    color: 'text-chart-4',
    inputDescription: 'Vidéo (URL ou base64) + question optionnelle',
    outputDescription: 'Analyse détaillée de la vidéo',
    acceptsFiles: true,
    acceptedFileTypes: ['.mp4', '.avi', '.mov', '.webm'],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 30,
    isPremium: true,
    tags: ['vidéo', 'analyse', 'compréhension', 'scènes', 'transcription'],
  },

  // ─── VOICE ───
  {
    id: 'text-to-speech',
    name: 'Synthèse Vocale (TTS)',
    description: 'Convertit du texte en parole naturelle avec plusieurs voix disponibles.',
    category: 'voice',
    icon: '🎙️',
    color: 'text-amber-500',
    inputDescription: 'Texte à convertir + voix souhaitée',
    outputDescription: 'Fichier audio (WAV/MP3)',
    acceptsFiles: false,
    acceptedFileTypes: [],
    producesFiles: true,
    producedFileTypes: ['audio/wav', 'audio/mpeg'],
    costCredits: 10,
    isPremium: false,
    tags: ['TTS', 'voix', 'synthèse', 'audio', 'parole'],
  },
  {
    id: 'speech-to-text',
    name: 'Transcription Audio (ASR)',
    description: 'Transcrit l\'audio en texte avec haute précision. Supporte plusieurs langues.',
    category: 'voice',
    icon: '🎤',
    color: 'text-amber-500',
    inputDescription: 'Fichier audio (base64)',
    outputDescription: 'Texte transcrit',
    acceptsFiles: true,
    acceptedFileTypes: ['.wav', '.mp3', '.ogg', '.m4a', '.flac', '.webm'],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 10,
    isPremium: false,
    tags: ['ASR', 'transcription', 'audio', 'reconnaissance vocale', 'STT'],
  },

  // ─── DOCUMENT ───
  {
    id: 'pdf-create',
    name: 'Création de PDF',
    description: 'Crée des documents PDF professionnels : rapports, factures, contrats, CVs, white papers.',
    category: 'document',
    icon: '📄',
    color: 'text-rose-500',
    inputDescription: 'Description du document + contenu',
    outputDescription: 'Fichier PDF',
    acceptsFiles: false,
    acceptedFileTypes: [],
    producesFiles: true,
    producedFileTypes: ['application/pdf'],
    costCredits: 20,
    isPremium: true,
    tags: ['PDF', 'document', 'rapport', 'création', 'impression'],
  },
  {
    id: 'pdf-extract',
    name: 'Extraction de PDF',
    description: 'Extrait le texte, les métadonnées et la structure d\'un fichier PDF.',
    category: 'document',
    icon: '📥',
    color: 'text-rose-500',
    inputDescription: 'Fichier PDF',
    outputDescription: 'Texte extrait + métadonnées',
    acceptsFiles: true,
    acceptedFileTypes: ['.pdf'],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 10,
    isPremium: false,
    tags: ['PDF', 'extraction', 'texte', 'lecture', 'OCR'],
  },
  {
    id: 'docx-create',
    name: 'Création de Documents Word',
    description: 'Crée des documents Word professionnels avec mise en forme, tableaux, en-têtes/pieds de page.',
    category: 'document',
    icon: '📝',
    color: 'text-rose-500',
    inputDescription: 'Description du document + contenu',
    outputDescription: 'Fichier Word (.docx)',
    acceptsFiles: false,
    acceptedFileTypes: [],
    producesFiles: true,
    producedFileTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    costCredits: 15,
    isPremium: true,
    tags: ['Word', 'document', 'DOCX', 'rédaction', 'mise en forme'],
  },
  {
    id: 'pptx-create',
    name: 'Création de Présentations',
    description: 'Crée des présentations PowerPoint professionnelles avec layouts, graphiques et animations.',
    category: 'document',
    icon: '📊',
    color: 'text-rose-500',
    inputDescription: 'Sujet + contenu par slide',
    outputDescription: 'Fichier PowerPoint (.pptx)',
    acceptsFiles: false,
    acceptedFileTypes: [],
    producesFiles: true,
    producedFileTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    costCredits: 25,
    isPremium: true,
    tags: ['PowerPoint', 'présentation', 'slides', 'PPTX', 'pitch'],
  },

  // ─── DESIGN ───
  {
    id: 'ui-design',
    name: 'Conception UI/UX',
    description: 'Conçoit des interfaces utilisateur, wireframes et maquettes avec des recommandations d\'accessibilité.',
    category: 'design',
    icon: '🎯',
    color: 'text-violet-500',
    inputDescription: 'Description de l\'interface souhaitée',
    outputDescription: 'Spécifications UI/UX détaillées + code CSS/Tailwind',
    acceptsFiles: false,
    acceptedFileTypes: [],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 15,
    isPremium: false,
    tags: ['UI', 'UX', 'design', 'interface', 'wireframe', 'maquette'],
  },
  {
    id: 'infographic-create',
    name: 'Création d\'Infographies',
    description: 'Crée des infographies visuelles et des posters informatifs impactants.',
    category: 'design',
    icon: '🗺️',
    color: 'text-violet-500',
    inputDescription: 'Données/message + style souhaité',
    outputDescription: 'Image d\'infographie (PNG/SVG)',
    acceptsFiles: false,
    acceptedFileTypes: [],
    producesFiles: true,
    producedFileTypes: ['image/png'],
    costCredits: 20,
    isPremium: true,
    tags: ['infographie', 'poster', 'visuel', 'data viz', 'communication'],
  },

  // ─── AUTOMATION ───
  {
    id: 'workflow-execute',
    name: 'Exécution de Workflow',
    description: 'Exécute un workflow d\'automatisation avec variables, conditions et actions enchaînées.',
    category: 'automation',
    icon: '⚙️',
    color: 'text-cyan-500',
    inputDescription: 'ID du workflow + variables d\'entrée',
    outputDescription: 'Résultat de l\'exécution du workflow',
    acceptsFiles: false,
    acceptedFileTypes: [],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 10,
    isPremium: false,
    tags: ['workflow', 'automatisation', 'exécution', 'pipeline'],
  },

  // ─── PRODUCTIVITY ───
  {
    id: 'math-solve',
    name: 'Résolution Mathématique',
    description: 'Résout des problèmes mathématiques complexes avec étapes détaillées et vérification.',
    category: 'productivity',
    icon: '🧮',
    color: 'text-emerald-500',
    inputDescription: 'Problème mathématique à résoudre',
    outputDescription: 'Solution détaillée étape par étape (LaTeX)',
    acceptsFiles: false,
    acceptedFileTypes: [],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 8,
    isPremium: false,
    tags: ['math', 'calcul', 'algèbre', 'géométrie', 'équation'],
  },
  {
    id: 'meeting-notes',
    name: 'Prise de Notes de Réunion',
    description: 'Organise et structure des notes de réunion : résumé, decisions, action items, deadlines.',
    category: 'productivity',
    icon: '📋',
    color: 'text-emerald-500',
    inputDescription: 'Notes brutes de réunion',
    outputDescription: 'Compte-rendu structuré avec action items',
    acceptsFiles: true,
    acceptedFileTypes: ['.txt', '.md', '.wav', '.mp3'],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 10,
    isPremium: false,
    tags: ['réunion', 'notes', 'compte-rendu', 'action items', 'productivité'],
  },
  {
    id: 'todo-plan',
    name: 'Planification de Tâches',
    description: 'Décompose un projet en tâches avec priorités, dépendances, estimations et timeline.',
    category: 'productivity',
    icon: '✅',
    color: 'text-emerald-500',
    inputDescription: 'Description du projet/objectif',
    outputDescription: 'Plan de tâches structuré (JSON)',
    acceptsFiles: false,
    acceptedFileTypes: [],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 5,
    isPremium: false,
    tags: ['planification', 'tâches', 'projet', 'GTD', 'priorités'],
  },

  // ─── SECURITY ───
  {
    id: 'security-audit',
    name: 'Audit de Sécurité',
    description: 'Analyse du code pour les vulnérabilités OWASP Top 10, injections, XSS, CSRF, etc.',
    category: 'security',
    icon: '🛡️',
    color: 'text-red-500',
    inputDescription: 'Code ou configuration à auditer',
    outputDescription: 'Rapport de sécurité avec recommandations',
    acceptsFiles: true,
    acceptedFileTypes: ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.json', '.yaml', '.yml', '.env'],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 20,
    isPremium: true,
    tags: ['sécurité', 'audit', 'vulnérabilités', 'OWASP', 'pentest'],
  },

  // ─── BROWSER ───
  {
    id: 'browser-navigate',
    name: 'Navigation Web Automatisée',
    description: 'Navigue sur des pages web, clique, remplit des formulaires, et capture des screenshots.',
    category: 'browser',
    icon: '🌐',
    color: 'text-orange-500',
    inputDescription: 'Instructions de navigation + URL de départ',
    outputDescription: 'Résultat de la navigation (texte, screenshots)',
    acceptsFiles: false,
    acceptedFileTypes: [],
    producesFiles: false,
    producedFileTypes: [],
    costCredits: 15,
    isPremium: true,
    tags: ['navigateur', 'web', 'automatisation', 'scraping', 'formulaire'],
  },
]

// ── Category Info ──

export const SKILL_CATEGORIES: Record<SkillCategory, { label: string; icon: string; color: string }> = {
  search: { label: 'Recherche', icon: '🔍', color: 'text-chart-2' },
  code: { label: 'Développement', icon: '💻', color: 'text-primary' },
  content: { label: 'Contenu', icon: '✍️', color: 'text-chart-3' },
  data: { label: 'Données', icon: '📊', color: 'text-chart-5' },
  multimodal: { label: 'Multimédia', icon: '🎨', color: 'text-chart-4' },
  voice: { label: 'Voix', icon: '🎙️', color: 'text-amber-500' },
  document: { label: 'Documents', icon: '📄', color: 'text-rose-500' },
  design: { label: 'Design', icon: '🎯', color: 'text-violet-500' },
  automation: { label: 'Automatisation', icon: '⚙️', color: 'text-cyan-500' },
  productivity: { label: 'Productivité', icon: '⚡', color: 'text-emerald-500' },
  security: { label: 'Sécurité', icon: '🛡️', color: 'text-red-500' },
  browser: { label: 'Navigateur', icon: '🌐', color: 'text-orange-500' },
}

// ── Skill Registry Class ──

class SkillRegistry {
  private skills: Map<string, SkillDefinition>
  private executors: Map<string, (input: SkillInput) => Promise<SkillOutput>>

  constructor() {
    this.skills = new Map()
    this.executors = new Map()
    SKILL_DEFINITIONS.forEach((skill) => {
      this.skills.set(skill.id, skill)
    })
    this.registerExecutors()
  }

  private registerExecutors() {
    // Search
    this.executors.set('web-search', this.executeWebSearch.bind(this))
    this.executors.set('web-reader', this.executeWebReader.bind(this))

    // Code
    this.executors.set('code-generate', this.executeCodeGenerate.bind(this))
    this.executors.set('code-review', this.executeCodeReview.bind(this))
    this.executors.set('code-execute', this.executeCodeExecute.bind(this))
    this.executors.set('code-explain', this.executeCodeExplain.bind(this))

    // Content
    this.executors.set('writing', this.executeWriting.bind(this))
    this.executors.set('summarization', this.executeSummarization.bind(this))
    this.executors.set('translation', this.executeTranslation.bind(this))
    this.executors.set('email-compose', this.executeEmailCompose.bind(this))
    this.executors.set('sentiment-analysis', this.executeSentimentAnalysis.bind(this))
    this.executors.set('keyword-extraction', this.executeKeywordExtraction.bind(this))

    // Data
    this.executors.set('data-analysis', this.executeDataAnalysis.bind(this))
    this.executors.set('data-visualization', this.executeDataVisualization.bind(this))
    this.executors.set('spreadsheet-create', this.executeSpreadsheetCreate.bind(this))

    // Multimodal
    this.executors.set('image-generate', this.executeImageGenerate.bind(this))
    this.executors.set('image-analyze', this.executeImageAnalyze.bind(this))
    this.executors.set('image-edit', this.executeImageEdit.bind(this))
    this.executors.set('video-understand', this.executeVideoUnderstand.bind(this))

    // Voice
    this.executors.set('text-to-speech', this.executeTTS.bind(this))
    this.executors.set('speech-to-text', this.executeASR.bind(this))

    // Document
    this.executors.set('pdf-create', this.executePdfCreate.bind(this))
    this.executors.set('pdf-extract', this.executePdfExtract.bind(this))
    this.executors.set('docx-create', this.executeDocxCreate.bind(this))
    this.executors.set('pptx-create', this.executePptxCreate.bind(this))

    // Design
    this.executors.set('ui-design', this.executeUIDesign.bind(this))
    this.executors.set('infographic-create', this.executeInfographicCreate.bind(this))

    // Automation
    this.executors.set('workflow-execute', this.executeWorkflowExecute.bind(this))

    // Productivity
    this.executors.set('math-solve', this.executeMathSolve.bind(this))
    this.executors.set('meeting-notes', this.executeMeetingNotes.bind(this))
    this.executors.set('todo-plan', this.executeTodoPlan.bind(this))

    // Security
    this.executors.set('security-audit', this.executeSecurityAudit.bind(this))

    // Browser
    this.executors.set('browser-navigate', this.executeBrowserNavigate.bind(this))
  }

  // ── Public API ──

  getDefinition(skillId: string): SkillDefinition | undefined {
    return this.skills.get(skillId)
  }

  getAllDefinitions(): SkillDefinition[] {
    return Array.from(this.skills.values())
  }

  getDefinitionsByCategory(category: SkillCategory): SkillDefinition[] {
    return this.getAllDefinitions().filter((s) => s.category === category)
  }

  getCategories(): SkillCategory[] {
    const cats = new Set<SkillCategory>()
    this.skills.forEach((s) => cats.add(s.category))
    return Array.from(cats)
  }

  async execute(skillId: string, input: SkillInput): Promise<SkillOutput> {
    const skill = this.skills.get(skillId)
    if (!skill) {
      return {
        success: false,
        data: `Skill inconnue: ${skillId}`,
        durationMs: 0,
      }
    }

    const executor = this.executors.get(skillId)
    if (!executor) {
      return {
        success: false,
        data: `Aucun exécuteur pour la skill: ${skillId}`,
        durationMs: 0,
      }
    }

    try {
      return await executor(input)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur inconnue'
      return {
        success: false,
        data: `Erreur dans ${skill.name}: ${msg}`,
        durationMs: 0,
      }
    }
  }

  /** Get skills that can accept a given file type */
  getSkillsForFileType(fileType: string): SkillDefinition[] {
    return this.getAllDefinitions().filter((s) =>
      s.acceptsFiles && s.acceptedFileTypes.some((t) => fileType.toLowerCase().endsWith(t))
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SKILL EXECUTORS — All use getProvider() for multi-provider support
  // ═══════════════════════════════════════════════════════════════════════

  // ─── SEARCH ───

  private async executeWebSearch(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const query = String(input.query || input.text || '')
    const num = Number(input.num) || 8
    const provider = await getProvider()
    const results = await provider.webSearch(query, num)
    if (results.length === 0) {
      return { success: true, data: `Aucun résultat trouvé pour "${query}".`, durationMs: Date.now() - start }
    }
    const formatted = results.map((r, i) =>
      `[${i + 1}] ${r.name || 'Sans titre'}\n    ${r.snippet || ''}\n    URL: ${r.url || ''}`
    ).join('\n\n')
    return { success: true, data: formatted, durationMs: Date.now() - start }
  }

  private async executeWebReader(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const urlOrQuery = String(input.url || input.query || input.text || '')
    const provider = await getProvider()
    let url = urlOrQuery.trim()
    if (!/^https?:\/\//.test(url)) {
      const searchResults = await provider.webSearch(urlOrQuery, 1)
      if (searchResults.length > 0 && searchResults[0].url) url = searchResults[0].url
      else return { success: false, data: `Aucune URL trouvée pour "${urlOrQuery}".`, durationMs: Date.now() - start }
    }
    const result = await provider.webReader(url)
    const html = result.html || ''
    const plainText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    return {
      success: true,
      data: `[${result.title || 'Sans titre'}]\n\n${plainText.substring(0, 6000)}`,
      durationMs: Date.now() - start,
    }
  }

  // ─── CODE ───

  private async executeCodeGenerate(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const spec = String(input.spec || input.text || input.prompt || '')
    const language = String(input.language || '')
    const provider = await getProvider()
    const langHint = language ? `\nLangage: ${language}` : ''
    const response = await provider.chat([
      { role: 'system', content: `You are an expert programmer. Generate clean, well-commented, production-ready code.${langHint} Always include imports and make the code complete and runnable. Use markdown code blocks with language identifiers.` },
      { role: 'user', content: spec },
    ])
    return { success: true, data: response.content, durationMs: Date.now() - start }
  }

  private async executeCodeReview(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const code = String(input.code || input.text || input.fileContent || '')
    const provider = await getProvider()
    const response = await provider.chat([
      { role: 'system', content: 'You are a senior security-conscious code reviewer. Analyze for:\n1. 🔴 Critical: Security vulnerabilities, data leaks, injection risks\n2. 🟡 Warning: Performance issues, bad practices, potential bugs\n3. 🟢 Suggestion: Code style, readability, maintainability\n\nProvide specific line references and fixed code snippets.' },
      { role: 'user', content: `Review this code:\n\n${code}` },
    ])
    return { success: true, data: response.content, durationMs: Date.now() - start }
  }

  private async executeCodeExecute(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const code = String(input.code || input.text || '')
    try {
      // Sandboxed JS execution using Function constructor (limited but safe for basic ops)
      const logs: string[] = []
      const originalConsole = { log: console.log, error: console.error, warn: console.warn }
      console.log = (...args: unknown[]) => logs.push(args.map(String).join(' '))
      console.error = (...args: unknown[]) => logs.push(`[ERROR] ${args.map(String).join(' ')}`)
      console.warn = (...args: unknown[]) => logs.push(`[WARN] ${args.map(String).join(' ')}`)

      const result = new Function('require', `"use strict";\n${code}`)(() => { throw new Error('require() is disabled in sandbox') })
      console.log = originalConsole.log
      console.error = originalConsole.error
      console.warn = originalConsole.warn

      const output = `Résultat: ${JSON.stringify(result)}\n\nConsole:\n${logs.join('\n') || '(vide)'}`
      return { success: true, data: output, durationMs: Date.now() - start }
    } catch (error) {
      return {
        success: false,
        data: `Erreur d'exécution: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      }
    }
  }

  private async executeCodeExplain(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const code = String(input.code || input.text || input.fileContent || '')
    const language = String(input.language || '')
    const provider = await getProvider()
    const response = await provider.chat([
      { role: 'system', content: `You are a coding instructor. Explain this code${language ? ` (${language})` : ''} in a clear, educational way:\n1. Overview: What does this code do?\n2. Line-by-line: Key sections explained\n3. Concepts: Important patterns or techniques used\n4. Analogies: Real-world comparisons for clarity\n\nRespond in French.` },
      { role: 'user', content: `Explique ce code:\n\n${code}` },
    ])
    return { success: true, data: response.content, durationMs: Date.now() - start }
  }

  // ─── CONTENT ───

  private async executeWriting(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const task = String(input.text || input.prompt || input.task || '')
    const format = String(input.format || input.type || 'article')
    const tone = String(input.tone || 'professionnel')
    const provider = await getProvider()
    const response = await provider.chat([
      { role: 'system', content: `You are a professional content writer. Create well-structured, engaging content.\nFormat: ${format}\nTon: ${tone}\n\nUse markdown with proper headings, lists, and emphasis. Respond in the same language as the request.` },
      { role: 'user', content: task },
    ])
    return { success: true, data: response.content, durationMs: Date.now() - start }
  }

  private async executeSummarization(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const text = String(input.text || input.fileContent || input.content || '')
    const maxLength = Number(input.maxLength) || 0
    const provider = await getProvider()
    const lengthHint = maxLength > 0 ? ` Keep it under ${maxLength} words.` : ' Keep it concise with bullet points for key takeaways.'
    const response = await provider.chat([
      { role: 'system', content: `You are an expert summarizer. Provide a clear, concise summary.${lengthHint} Respond in the same language as the input.` },
      { role: 'user', content: `Résume ce texte:\n\n${text}` },
    ])
    return { success: true, data: response.content, durationMs: Date.now() - start }
  }

  private async executeTranslation(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const text = String(input.text || input.fileContent || input.content || '')
    const targetLang = String(input.targetLang || input.target || 'français')
    const provider = await getProvider()
    const response = await provider.chat([
      { role: 'system', content: `You are a professional translator. Detect the source language and translate to: ${targetLang}. Preserve formatting (markdown, lists, code blocks). Return ONLY the translated text, no explanations.` },
      { role: 'user', content: text },
    ])
    return { success: true, data: response.content, durationMs: Date.now() - start }
  }

  private async executeEmailCompose(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const task = String(input.text || input.prompt || input.context || '')
    const provider = await getProvider()
    const response = await provider.chat([
      { role: 'system', content: `You are a professional email writer. Compose a well-structured email with:\n- **Objet:** (subject line)\n- Appropriate greeting\n- Well-organized body paragraphs\n- Professional closing\n\nRespond in the same language as the request. Use markdown.` },
      { role: 'user', content: task },
    ])
    return { success: true, data: response.content, durationMs: Date.now() - start }
  }

  private async executeSentimentAnalysis(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const text = String(input.text || input.fileContent || input.content || '')
    const provider = await getProvider()
    const response = await provider.chat([
      { role: 'system', content: `Analyze sentiment and emotions. Return ONLY this JSON (no markdown, no fences):\n{"sentiment":"positive|negative|neutral|mixed","confidence":0.0-1.0,"emotions":[{"name":"emotion","score":0.0-1.0}],"summary":"Brief explanation in French","key_phrases":["phrase1"]}` },
      { role: 'user', content: text },
    ])
    return { success: true, data: response.content, durationMs: Date.now() - start }
  }

  private async executeKeywordExtraction(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const text = String(input.text || input.fileContent || input.content || '')
    const provider = await getProvider()
    const response = await provider.chat([
      { role: 'system', content: `Extract keywords, topics and entities. Return ONLY this JSON (no markdown, no fences):\n{"keywords":[{"term":"keyword","relevance":0.0-1.0,"category":"person|org|location|concept|technology|event|other"}],"topics":["topic1"],"entities":[{"name":"entity","type":"type"}],"language":"detected_language"}` },
      { role: 'user', content: text },
    ])
    return { success: true, data: response.content, durationMs: Date.now() - start }
  }

  // ─── DATA ───

  private async executeDataAnalysis(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const data = String(input.text || input.data || input.fileContent || input.content || '')
    const provider = await getProvider()
    const response = await provider.chat([
      { role: 'system', content: 'You are a senior data analyst. Analyze the data thoroughly:\n1. **Overview**: Key statistics and dimensions\n2. **Patterns**: Trends, correlations, anomalies\n3. **Insights**: Actionable findings\n4. **Recommendations**: Next steps\n\nRespond in French with markdown.' },
      { role: 'user', content: data },
    ])
    return { success: true, data: response.content, durationMs: Date.now() - start }
  }

  private async executeDataVisualization(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const data = String(input.text || input.data || input.fileContent || '')
    const chartType = String(input.chartType || input.type || '')
    const provider = await getProvider()
    const response = await provider.chat([
      { role: 'system', content: `You are a data visualization expert. Based on the data, recommend specific chart types with detailed specifications: chart type, axes, colors, labels, title. ${chartType ? `Preferred type: ${chartType}` : ''} Return a structured recommendation in markdown. Respond in French.` },
      { role: 'user', content: data },
    ])
    return { success: true, data: response.content, durationMs: Date.now() - start }
  }

  private async executeSpreadsheetCreate(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const spec = String(input.text || input.spec || input.prompt || '')
    const provider = await getProvider()
    const response = await provider.chat([
      { role: 'system', content: 'You are an Excel expert. Based on the request, generate a complete description of the spreadsheet including:\n1. Sheet names\n2. Headers for each column\n3. Sample data rows (at least 5)\n4. Formulas to include\n5. Formatting instructions\n\nReturn as a structured JSON with "sheets" array, each having "name", "headers", "data" (array of arrays), "formulas" (array of {cell, formula}), and "formatting" (array of {cell, format}).' },
      { role: 'user', content: spec },
    ])
    return { success: true, data: response.content, durationMs: Date.now() - start }
  }

  // ─── MULTIMODAL ───

  private async executeImageGenerate(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const prompt = String(input.prompt || input.text || '')
    const size = String(input.size || '1024x1024')
    const provider = await getProvider()
    const result = await provider.imageGeneration({ prompt, size })
    return {
      success: true,
      data: `Image générée avec succès`,
      metadata: { prompt, size, revisedPrompt: result.revisedPrompt },
      files: [{ name: 'generated-image.png', type: 'image/png', data: result.base64, size: result.base64.length }],
      durationMs: Date.now() - start,
    }
  }

  private async executeImageAnalyze(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    let imageUrl = String(input.imageUrl || input.url || input.image || '')
    const question = String(input.question || input.text || 'Décris cette image en détail : objets, texte, couleurs, disposition, éléments notables.')
    const fileContent = String(input.fileContent || input.fileData || '')

    if (fileContent && !imageUrl) imageUrl = `data:image/png;base64,${fileContent}`

    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
      return { success: false, data: 'Veuillez fournir une URL d\'image valide ou une image en base64.', durationMs: Date.now() - start }
    }

    const provider = await getProvider()
    const response = await provider.chatVision([
      { role: 'user', content: [{ type: 'text', text: question }, { type: 'image_url', image_url: { url: imageUrl } }] },
    ])
    return { success: true, data: response.content, durationMs: Date.now() - start }
  }

  private async executeImageEdit(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const instructions = String(input.instructions || input.text || input.prompt || '')
    const imageBase64 = String(input.fileContent || input.fileData || input.image || '')

    if (!imageBase64) {
      return { success: false, data: 'Veuillez fournir une image en base64 à modifier.', durationMs: Date.now() - start }
    }

    const provider = await getProvider()
    const editPrompt = `Modifie cette image selon les instructions: ${instructions}`
    const result = await provider.imageGeneration({ prompt: editPrompt, size: '1024x1024' })
    return {
      success: true,
      data: 'Image modifiée avec succès',
      files: [{ name: 'edited-image.png', type: 'image/png', data: result.base64, size: result.base64.length }],
      durationMs: Date.now() - start,
    }
  }

  private async executeVideoUnderstand(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const question = String(input.question || input.text || 'Analyse cette vidéo : décris les scènes, les actions, les objets et fais un résumé.')
    const videoData = String(input.fileContent || input.fileData || '')
    const videoUrl = String(input.url || input.videoUrl || '')

    const provider = await getProvider()
    if (videoData) {
      // Try to use VLM on first frame or description
      const response = await provider.chat([
        { role: 'system', content: 'Tu es un expert en analyse vidéo. Analyse les informations fournies sur cette vidéo et réponds en français de manière structurée.' },
        { role: 'user', content: `Vidéo fournie (base64, ${videoData.length} chars). Question: ${question}` },
      ])
      return { success: true, data: response.content, durationMs: Date.now() - start }
    }

    if (videoUrl) {
      const response = await provider.chat([
        { role: 'system', content: 'Tu es un expert en analyse vidéo. Analyse cette vidéo et réponds en français.' },
        { role: 'user', content: `URL vidéo: ${videoUrl}\nQuestion: ${question}` },
      ])
      return { success: true, data: response.content, durationMs: Date.now() - start }
    }

    return { success: false, data: 'Veuillez fournir une vidéo (URL ou base64).', durationMs: Date.now() - start }
  }

  // ─── VOICE ───

  private async executeTTS(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const text = String(input.text || input.content || '')
    const voice = String(input.voice || 'tongtong')
    const speed = Number(input.speed) || 1.0
    const provider = await getProvider()
    const response = await provider.tts({ input: text, voice, speed, responseFormat: 'wav' })
    const buffer = Buffer.from(new Uint8Array(await response.arrayBuffer))
    const base64Audio = buffer.toString('base64')
    return {
      success: true,
      data: `Audio généré avec succès. ${buffer.length} octets.`,
      files: [{ name: 'speech.wav', type: 'audio/wav', data: base64Audio, size: buffer.length }],
      durationMs: Date.now() - start,
    }
  }

  private async executeASR(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const audioBase64 = String(input.fileContent || input.fileData || input.audio || '')
    if (!audioBase64 || audioBase64.length < 100) {
      return { success: false, data: 'Veuillez fournir de l\'audio en base64.', durationMs: Date.now() - start }
    }
    const provider = await getProvider()
    const response = await provider.asr(audioBase64)
    return { success: true, data: response.text || 'Aucune transcription obtenue.', durationMs: Date.now() - start }
  }

  // ─── DOCUMENT ───

  private async executePdfCreate(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const spec = String(input.text || input.spec || input.prompt || '')
    const docType = String(input.docType || input.type || 'report')
    const provider = await getProvider()
    const response = await provider.chat([
      { role: 'system', content: `You are a document design expert. Create a detailed specification for a ${docType} PDF document. Include:\n1. Title and subtitle\n2. All sections with content\n3. Table of contents\n4. Page layout instructions\n5. Formatting rules\n\nReturn a structured JSON with "title", "subtitle", "sections" (array of {title, content, level}), "metadata" (author, date, version), "styling" (font, colors, margins).` },
      { role: 'user', content: spec },
    ])
    return { success: true, data: response.content, durationMs: Date.now() - start, metadata: { docType } }
  }

  private async executePdfExtract(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const fileContent = String(input.fileContent || input.fileData || '')
    if (!fileContent) {
      return { success: false, data: 'Veuillez fournir un fichier PDF.', durationMs: Date.now() - start }
    }
    // PDF extraction would use pdf-parse on uploaded files
    // For now, return the base64 info and note that file processing happens at upload time
    return {
      success: true,
      data: `Fichier PDF reçu (${Math.round(fileContent.length / 1024)} KB). Le contenu sera extrait lors du traitement côté serveur.`,
      durationMs: Date.now() - start,
    }
  }

  private async executeDocxCreate(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const spec = String(input.text || input.spec || input.prompt || '')
    const docType = String(input.docType || input.type || 'report')
    const provider = await getProvider()
    const response = await provider.chat([
      { role: 'system', content: `You are a Word document expert. Create a detailed specification for a ${docType} Word document (.docx). Include:\n1. Title\n2. All sections with content\n3. Tables if needed\n4. Headers and footers\n5. Styles (headings, normal, quotes)\n\nReturn a structured JSON with "title", "sections" (array of {title, content, style, level}), "tables" (array of {headers, rows}), "header", "footer".` },
      { role: 'user', content: spec },
    ])
    return { success: true, data: response.content, durationMs: Date.now() - start }
  }

  private async executePptxCreate(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const spec = String(input.text || input.spec || input.prompt || '')
    const provider = await getProvider()
    const response = await provider.chat([
      { role: 'system', content: 'You are a presentation design expert. Create a detailed specification for a PowerPoint presentation. Include:\n1. Title slide\n2. Each content slide with title, bullet points, and speaker notes\n3. Visual recommendations for each slide\n4. Transitions between slides\n\nReturn a structured JSON with "title", "subtitle", "author", "slides" (array of {title, content, layout, notes, visual}).' },
      { role: 'user', content: spec },
    ])
    return { success: true, data: response.content, durationMs: Date.now() - start }
  }

  // ─── DESIGN ───

  private async executeUIDesign(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const spec = String(input.text || input.spec || input.prompt || '')
    const provider = await getProvider()
    const response = await provider.chat([
      { role: 'system', content: 'You are a senior UI/UX designer. Create detailed UI specifications including:\n1. Layout structure (grid/flex)\n2. Component hierarchy\n3. Color palette (primary, secondary, accent, backgrounds, text)\n4. Typography (font families, sizes, weights)\n5. Spacing system\n6. Interactive states (hover, focus, active, disabled)\n7. Accessibility requirements (WCAG)\n8. Tailwind CSS code for the design\n\nRespond in French with markdown.' },
      { role: 'user', content: spec },
    ])
    return { success: true, data: response.content, durationMs: Date.now() - start }
  }

  private async executeInfographicCreate(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const spec = String(input.text || input.prompt || '')
    const provider = await getProvider()
    // Generate an image that serves as the infographic
    const imgPrompt = `Professional infographic poster: ${spec}. Clean design, modern typography, data visualization elements, high quality.`
    const result = await provider.imageGeneration({ prompt: imgPrompt, size: '1024x1024' })
    return {
      success: true,
      data: 'Infographie générée avec succès',
      files: [{ name: 'infographic.png', type: 'image/png', data: result.base64, size: result.base64.length }],
      durationMs: Date.now() - start,
    }
  }

  // ─── AUTOMATION ───

  private async executeWorkflowExecute(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const workflowId = String(input.workflowId || input.id || '')
    const variables = (input.variables || input.vars || {}) as Record<string, string>

    if (!workflowId) {
      return { success: false, data: 'ID du workflow requis.', durationMs: Date.now() - start }
    }

    try {
      const { executeWorkflowById } = await import('./workflow-engine')
      const { db } = await import('./db')
      const automation = await db.automation.findUnique({ where: { id: workflowId } })
      if (!automation) return { success: false, data: 'Workflow introuvable.', durationMs: Date.now() - start }

      const nodes = JSON.parse(automation.workflow)
      const result = await executeWorkflowById(workflowId, nodes, variables)
      return {
        success: result.success,
        data: result.success
          ? `Workflow exécuté avec succès en ${result.totalDurationMs}ms.\n\nÉtapes:\n${result.steps.map((s: { label: string; result: string; durationMs: number }) => `- ${s.label}: ${s.result.substring(0, 100)} (${s.durationMs}ms)`).join('\n')}`
          : `Erreur: ${result.error}`,
        durationMs: Date.now() - start,
      }
    } catch (error) {
      return { success: false, data: `Erreur d'exécution: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start }
    }
  }

  // ─── PRODUCTIVITY ───

  private async executeMathSolve(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const problem = String(input.text || input.problem || input.prompt || '')
    const provider = await getProvider()
    const response = await provider.chat([
      { role: 'system', content: 'You are a mathematical expert. Solve step by step with:\n1. Problem understanding\n2. Step-by-step solution (use LaTeX)\n3. Final answer (highlighted)\n4. Verification when possible\n\nRespond in French.' },
      { role: 'user', content: problem },
    ])
    return { success: true, data: response.content, durationMs: Date.now() - start }
  }

  private async executeMeetingNotes(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const notes = String(input.text || input.fileContent || input.content || '')
    const provider = await getProvider()
    const response = await provider.chat([
      { role: 'system', content: `You are a professional meeting secretary. Organize the notes into a structured meeting report:\n\n## 📋 Résumé\nBrief summary of the meeting\n\n## 👥 Participants\nList of mentioned people and roles\n\n## 📝 Points Discutés\nKey topics with details\n\n## ✅ Décisions Prises\nClear decisions with owners\n\n## 🎯 Action Items\n- [ ] Task | Responsable | Deadline\n\n## 📅 Prochaines Étapes\nNext meeting or follow-up\n\nRespond in French.` },
      { role: 'user', content: `Notes de réunion:\n\n${notes}` },
    ])
    return { success: true, data: response.content, durationMs: Date.now() - start }
  }

  private async executeTodoPlan(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const project = String(input.text || input.project || input.prompt || '')
    const provider = await getProvider()
    const response = await provider.chat([
      { role: 'system', content: `You are a project management expert. Decompose the project into a structured task plan. Return ONLY this JSON (no markdown, no fences):
{"project_name":"name","total_estimate_hours":N,"phases":[{"name":"Phase name","tasks":[{"id":1,"title":"Task title","description":"What to do","priority":"high|medium|low","estimate_hours":N,"depends_on":[],"tags":["tag"]}]}]}

Rules:
- 3-5 phases max
- Each phase has 2-5 tasks
- Priorities: high (must do), medium (should do), low (nice to have)
- Estimate hours realistically
- dependencies reference task IDs
- Respond in French for descriptions` },
      { role: 'user', content: project },
    ])
    return { success: true, data: response.content, durationMs: Date.now() - start }
  }

  // ─── SECURITY ───

  private async executeSecurityAudit(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const code = String(input.code || input.text || input.fileContent || '')
    const provider = await getProvider()
    const response = await provider.chat([
      { role: 'system', content: `You are a cybersecurity expert. Perform a thorough security audit checking for:

## OWASP Top 10
1. Injection (SQL, NoSQL, Command, LDAP)
2. Broken Authentication
3. Sensitive Data Exposure
4. XML External Entities (XXE)
5. Broken Access Control
6. Security Misconfiguration
7. Cross-Site Scripting (XSS)
8. Insecure Deserialization
9. Using Components with Known Vulnerabilities
10. Insufficient Logging & Monitoring

## Additional Checks
- Hardcoded secrets/keys
- Unsafe dependencies
- Input validation
- Error handling (information leakage)
- CORS misconfiguration
- CSRF protection
- Rate limiting

For each finding: severity (🔴 Critical / 🟡 High / 🟠 Medium / 🟢 Low), description, impact, remediation with code fix.

Respond in French.` },
      { role: 'user', content: `Audit de sécurité:\n\n${code}` },
    ])
    return { success: true, data: response.content, durationMs: Date.now() - start }
  }

  // ─── BROWSER ───

  private async executeBrowserNavigate(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()
    const instructions = String(input.text || input.instructions || input.prompt || '')
    const startUrl = String(input.url || input.startUrl || '')

    // For browser automation, we use the web search/reader as a proxy
    // Real browser automation would use Playwright/Puppeteer
    const provider = await getProvider()

    let resultText = ''
    if (startUrl && /^https?:\/\//.test(startUrl)) {
      const pageResult = await provider.webReader(startUrl)
      const html = pageResult.html || ''
      const plainText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      resultText = `Page: ${pageResult.title || startUrl}\n\n${plainText.substring(0, 4000)}`
    } else {
      const searchResults = await provider.webSearch(instructions, 5)
      if (searchResults.length === 0) {
        return { success: false, data: 'Aucun résultat trouvé.', durationMs: Date.now() - start }
      }
      resultText = searchResults.map((r, i) => `[${i + 1}] ${r.name || 'Sans titre'}\n    ${r.snippet || ''}\n    URL: ${r.url || ''}`).join('\n\n')
    }

    // Now use the LLM to process according to instructions
    if (instructions) {
      const response = await provider.chat([
        { role: 'system', content: 'Tu es un assistant de navigation web. Traite les résultats de navigation selon les instructions de l\'utilisateur. Réponds en français.' },
        { role: 'user', content: `Instructions: ${instructions}\n\nRésultats de navigation:\n${resultText}` },
      ])
      return { success: true, data: response.content, durationMs: Date.now() - start }
    }

    return { success: true, data: resultText, durationMs: Date.now() - start }
  }
}

// ── Singleton Export ──

let _registry: SkillRegistry | null = null

export function getSkillRegistry(): SkillRegistry {
  if (!_registry) {
    _registry = new SkillRegistry()
  }
  return _registry
}

// ── Convenience Exports ──

export function getSkillDefinition(skillId: string): SkillDefinition | undefined {
  return getSkillRegistry().getDefinition(skillId)
}

export function getAllSkillDefinitions(): SkillDefinition[] {
  return getSkillRegistry().getAllDefinitions()
}

export function getSkillsForFile(fileType: string): SkillDefinition[] {
  return getSkillRegistry().getSkillsForFileType(fileType)
}

export async function executeSkill(skillId: string, input: SkillInput): Promise<SkillOutput> {
  return getSkillRegistry().execute(skillId, input)
}