import { db } from '@/lib/db'

/* ═══════════════════════════════════════════════════════════════════════
   NexusAI Agent Marketplace — 30 pre-built agents across 10 categories
   ═══════════════════════════════════════════════════════════════════════ */

type AgentCategory = 'research' | 'code' | 'content' | 'data' | 'design' | 'marketing' | 'productivity' | 'security' | 'multimodal' | 'business'

export const MARKETPLACE_CATEGORIES: Array<{ id: AgentCategory; label: string; icon: string; color: string; description: string }> = [
  { id: 'research', label: 'Recherche', icon: '🔬', color: '#059669', description: 'Agents spécialisés en recherche et veille' },
  { id: 'code', label: 'Code', icon: '💻', color: '#2563eb', description: 'Agents pour le développement logiciel' },
  { id: 'content', label: 'Contenu', icon: '📝', color: '#7c3aed', description: 'Création et édition de contenu' },
  { id: 'data', label: 'Données', icon: '📊', color: '#dc2626', description: 'Analyse et visualisation de données' },
  { id: 'design', label: 'Design', icon: '🎨', color: '#ea580c', description: 'Création visuelle et design' },
  { id: 'marketing', label: 'Marketing', icon: '📣', color: '#db2777', description: 'Stratégie et campagnes marketing' },
  { id: 'productivity', label: 'Productivité', icon: '⚡', color: '#ca8a04', description: 'Gestion et optimisation du travail' },
  { id: 'security', label: 'Sécurité', icon: '🛡️', color: '#16a34a', description: 'Audit et sécurisation' },
  { id: 'multimodal', label: 'Multimodal', icon: '🖼️', color: '#0891b2', description: 'Génération et analyse multimédia' },
  { id: 'business', label: 'Business', icon: '💼', color: '#4f46e5', description: 'Intelligence business et support' },
]

interface AgentDef {
  agentId: string; name: string; description: string; longDescription: string
  category: AgentCategory; icon: string; color: string; systemPrompt: string
  tools: string[]; capabilities: string[]; tags: string[]; rating: number
}

// Compact agent definitions — system prompts loaded via function to reduce bundle size
const AGENTS: AgentDef[] = [
  // ── RESEARCH ──
  { agentId: 'research-agent', name: 'Research Agent', description: 'Recherche web approfondie avec vérification multi-sources et rapports structurés.', longDescription: 'Conduct thorough web research across multiple sources, verify findings, and compile comprehensive reports with proper citations.', category: 'research', icon: '🔬', color: '#059669', tools: ['web_search', 'web_reader', 'summarization', 'keyword_extraction'], capabilities: ['Recherche Web', 'Vérification', 'Rapports', 'Citations'], tags: ['research', 'web', 'search', 'verify', 'report'], rating: 4.8 },
  { agentId: 'academic-agent', name: 'Academic Agent', description: 'Recherche académique sur Wikipedia, articles scientifiques et publications.', longDescription: 'Specializes in academic and scientific research using Wikipedia, academic databases, and scholarly publications.', category: 'research', icon: '🎓', color: '#059669', tools: ['web_search', 'web_reader', 'summarization'], capabilities: ['Recherche Académique', 'Citations', 'Articles'], tags: ['academic', 'wikipedia', 'science', 'papers'], rating: 4.7 },
  { agentId: 'news-agent', name: 'News Agent', description: 'Veille de l\'actualité et monitoring des tendances en temps réel.', longDescription: 'Monitors current events, trending topics, and news across multiple sources for real-time awareness.', category: 'research', icon: '📰', color: '#059669', tools: ['web_search', 'web_reader', 'summarization'], capabilities: ['Veille', 'Actualités', 'Tendances'], tags: ['news', 'monitoring', 'trends', 'current events'], rating: 4.6 },
  // ── CODE ──
  { agentId: 'fullstack-agent', name: 'Full Stack Developer', description: 'Développement complet d\'applications frontend, backend et déploiement.', longDescription: 'An all-in-one development agent capable of building complete web applications from frontend to backend and deployment.', category: 'code', icon: '💻', color: '#2563eb', tools: ['code_generation', 'code_review'], capabilities: ['Frontend', 'Backend', 'API', 'DevOps'], tags: ['fullstack', 'web', 'development', 'react', 'node'], rating: 4.9 },
  { agentId: 'code-reviewer', name: 'Code Reviewer', description: 'Analyse de qualité du code, détection de bugs et recommandations.', longDescription: 'Analyzes code for bugs, performance issues, security vulnerabilities, and provides actionable improvement suggestions.', category: 'code', icon: '🔍', color: '#2563eb', tools: ['code_review'], capabilities: ['Code Review', 'Sécurité', 'Performance', 'Best Practices'], tags: ['review', 'quality', 'bugs', 'security'], rating: 4.7 },
  { agentId: 'devops-agent', name: 'DevOps Agent', description: 'Infrastructure, déploiement, CI/CD et monitoring de services.', longDescription: 'Handles deployment strategies, CI/CD pipelines, infrastructure management, and service monitoring.', category: 'code', icon: '🚀', color: '#2563eb', tools: ['code_generation', 'code_review'], capabilities: ['CI/CD', 'Docker', 'Déploiement', 'Monitoring'], tags: ['devops', 'docker', 'ci', 'cd', 'deploy'], rating: 4.5 },
  // ── CONTENT ──
  { agentId: 'blog-writer', name: 'Blog Writer', description: 'Rédaction d\'articles de blog longs, structurés et optimisés SEO.', longDescription: 'Creates engaging, well-structured blog posts with SEO optimization and proper formatting.', category: 'content', icon: '✍️', color: '#7c3aed', tools: ['writing', 'editing', 'keyword_extraction'], capabilities: ['Articles', 'SEO', 'Structuration', 'Édition'], tags: ['blog', 'writing', 'articles', 'seo'], rating: 4.8 },
  { agentId: 'copywriter', name: 'Copywriter', description: 'Rédaction de textes publicitaires et marketing percutants.', longDescription: 'Crafts compelling marketing copy, ad headlines, product descriptions, and persuasive content.', category: 'content', icon: '🎯', color: '#7c3aed', tools: ['writing', 'editing'], capabilities: ['Publicité', 'Headlines', 'Conversion', 'Persuasion'], tags: ['copywriting', 'ads', 'marketing', 'persuasion'], rating: 4.6 },
  { agentId: 'technical-writer', name: 'Technical Writer', description: 'Documentation technique claire, précise et bien structurée.', longDescription: 'Produces clear, accurate technical documentation including API docs, guides, and specifications.', category: 'content', icon: '📖', color: '#7c3aed', tools: ['writing', 'editing', 'summarization'], capabilities: ['Documentation', 'API Docs', 'Guides', 'Spécifications'], tags: ['documentation', 'technical', 'api', 'guides'], rating: 4.7 },
  // ── DATA ──
  { agentId: 'data-analyst', name: 'Data Analyst', description: 'Analyse de données avec insights actionnables et visualisations.', longDescription: 'Analyzes datasets to identify patterns, trends, and provide actionable business insights.', category: 'data', icon: '📊', color: '#dc2626', tools: ['data_analysis', 'visualization', 'sentiment_analysis'], capabilities: ['Analyse', 'Insights', 'Tendances', 'Recommandations'], tags: ['data', 'analysis', 'insights', 'statistics'], rating: 4.8 },
  { agentId: 'seo-analyst', name: 'SEO Analyst', description: 'Optimisation pour les moteurs de recherche et analyse de positionnement.', longDescription: 'Analyzes website SEO performance, keyword opportunities, and provides optimization strategies.', category: 'data', icon: '🔎', color: '#dc2626', tools: ['web_search', 'data_analysis', 'keyword_extraction'], capabilities: ['SEO', 'Mots-clés', 'Positionnement', 'Audit'], tags: ['seo', 'keywords', 'ranking', 'optimization'], rating: 4.5 },
  { agentId: 'financial-analyst', name: 'Financial Analyst', description: 'Analyse financière, évaluation d\'investissements et rapports de marché.', longDescription: 'Provides financial analysis, investment evaluation, and market intelligence reports.', category: 'data', icon: '💹', color: '#dc2626', tools: ['data_analysis', 'math_evaluation', 'summarization'], capabilities: ['Finance', 'Investissements', 'Marchés', 'Rapports'], tags: ['finance', 'investment', 'market', 'analysis'], rating: 4.6 },
  // ── DESIGN ──
  { agentId: 'creative-director', name: 'Creative Director', description: 'Direction artistique et concepts visuels créatifs.', longDescription: 'Provides creative direction, visual concepts, and brand strategy guidance.', category: 'design', icon: '🎨', color: '#ea580c', tools: ['image_generation', 'image_analysis'], capabilities: ['Concepts Visuels', 'Brand', 'Direction Artistique'], tags: ['creative', 'art direction', 'visual', 'branding'], rating: 4.7 },
  { agentId: 'ui-designer', name: 'UI/UX Designer', description: 'Conception d\'interfaces utilisateur intuitives et accessibles.', longDescription: 'Designs user interfaces with focus on usability, accessibility, and modern design principles.', category: 'design', icon: '🖼️', color: '#ea580c', tools: ['image_generation', 'image_analysis'], capabilities: ['UI Design', 'UX', 'Accessibilité', 'Prototypes'], tags: ['ui', 'ux', 'design', 'interface', 'accessibility'], rating: 4.8 },
  { agentId: 'social-designer', name: 'Social Media Designer', description: 'Création de visuels pour réseaux sociaux et contenu viral.', longDescription: 'Creates eye-catching social media visuals, stories, and viral content designs.', category: 'design', icon: '📱', color: '#ea580c', tools: ['image_generation'], capabilities: ['Réseaux Sociaux', 'Stories', 'Visuels Viraux'], tags: ['social media', 'instagram', 'stories', 'viral'], rating: 4.5 },
  // ── MARKETING ──
  { agentId: 'marketing-strategist', name: 'Marketing Strategist', description: 'Stratégie marketing complète avec analyse de marché et positionnement.', longDescription: 'Develops comprehensive marketing strategies with market analysis, competitive positioning, and growth tactics.', category: 'marketing', icon: '📣', color: '#db2777', tools: ['web_search', 'data_analysis', 'writing'], capabilities: ['Stratégie', 'Analyse Marché', 'Positionnement', 'Croissance'], tags: ['marketing', 'strategy', 'growth', 'positioning'], rating: 4.8 },
  { agentId: 'email-marketer', name: 'Email Marketer', description: 'Campagnes email performantes avec séquences et A/B testing.', longDescription: 'Creates effective email campaigns, sequences, and A/B testing strategies for maximum engagement.', category: 'marketing', icon: '📧', color: '#db2777', tools: ['email_composer', 'writing', 'editing'], capabilities: ['Email', 'Séquences', 'A/B Testing', 'Conversion'], tags: ['email', 'campaign', 'newsletter', 'conversion'], rating: 4.5 },
  { agentId: 'content-strategist', name: 'Content Strategist', description: 'Planification et stratégie de contenu pour croissance organique.', longDescription: 'Plans content strategies, editorial calendars, and growth frameworks for organic reach.', category: 'marketing', icon: '📋', color: '#db2777', tools: ['writing', 'keyword_extraction', 'data_analysis'], capabilities: ['Stratégie Contenu', 'Calendrier', 'Croissance Organique'], tags: ['content strategy', 'calendar', 'editorial', 'organic'], rating: 4.6 },
  // ── PRODUCTIVITY ──
  { agentId: 'project-manager', name: 'Project Manager', description: 'Gestion de projet, planning et suivi des tâches.', longDescription: 'Manages projects with planning, task tracking, risk assessment, and progress reporting.', category: 'productivity', icon: '📋', color: '#ca8a04', tools: ['summarization', 'data_analysis'], capabilities: ['Planning', 'Suivi', 'Risques', 'Rapports'], tags: ['project', 'management', 'planning', 'tasks'], rating: 4.6 },
  { agentId: 'meeting-assistant', name: 'Meeting Assistant', description: 'Résumés de réunions, action items et compte-rendus.', longDescription: 'Summarizes meetings, extracts action items, and produces professional meeting minutes.', category: 'productivity', icon: '🤝', color: '#ca8a04', tools: ['summarization', 'writing', 'email_composer'], capabilities: ['Réunions', 'Compte-rendus', 'Action Items'], tags: ['meeting', 'summary', 'minutes', 'actions'], rating: 4.5 },
  { agentId: 'task-automator', name: 'Task Automator', description: 'Automatisation de tâches répétitives et optimisation de workflows.', longDescription: 'Identifies repetitive tasks and creates automation workflows for efficiency gains.', category: 'productivity', icon: '🤖', color: '#ca8a04', tools: ['code_generation', 'data_analysis', 'writing'], capabilities: ['Automatisation', 'Workflows', 'Efficiency', 'Scripts'], tags: ['automation', 'workflow', 'efficiency', 'scripts'], rating: 4.7 },
  // ── SECURITY ──
  { agentId: 'security-auditor', name: 'Security Auditor', description: 'Audit de sécurité de code et infrastructure.', longDescription: 'Performs security audits on code, infrastructure, and configurations to identify vulnerabilities.', category: 'security', icon: '🔒', color: '#16a34a', tools: ['code_review', 'web_search'], capabilities: ['Audit Sécurité', 'Vulnérabilités', 'Hardening'], tags: ['security', 'audit', 'vulnerability', 'hardening'], rating: 4.8 },
  { agentId: 'vulnerability-scanner', name: 'Vulnerability Scanner', description: 'Scan de dépendances et détection de vulnérabilités connues.', longDescription: 'Scans dependencies and code for known vulnerabilities, outdated packages, and security issues.', category: 'security', icon: '🛡️', color: '#16a34a', tools: ['code_review', 'web_search'], capabilities: ['Scan Dépendances', 'CVE', 'Mises à jour'], tags: ['vulnerability', 'dependencies', 'cve', 'scanning'], rating: 4.6 },
  { agentId: 'compliance-agent', name: 'Compliance Agent', description: 'Vérification de conformité réglementaire (RGPD, HIPAA, etc.).', longDescription: 'Checks code and data handling for regulatory compliance with GDPR, HIPAA, and other frameworks.', category: 'security', icon: '⚖️', color: '#16a34a', tools: ['code_review', 'data_analysis', 'writing'], capabilities: ['RGPD', 'Conformité', 'Politiques', 'Audit'], tags: ['compliance', 'gdpr', 'regulation', 'privacy'], rating: 4.5 },
  // ── MULTIMODAL ──
  { agentId: 'image-creator', name: 'Image Creator', description: 'Génération d\'images créatives à partir de descriptions textuelles.', longDescription: 'Creates stunning images from text descriptions using AI image generation capabilities.', category: 'multimodal', icon: '🎨', color: '#0891b2', tools: ['image_generation', 'image_analysis'], capabilities: ['Génération Image', 'Créativité', 'Prompts'], tags: ['image', 'generation', 'creative', 'art'], rating: 4.9 },
  { agentId: 'vision-analyst', name: 'Vision Analyst', description: 'Analyse et description détaillée d\'images.', longDescription: 'Analyzes images in detail, describing content, objects, text, layout, and notable elements.', category: 'multimodal', icon: '👁️', color: '#0891b2', tools: ['image_analysis'], capabilities: ['Analyse Image', 'OCR', 'Description'], tags: ['vision', 'image analysis', 'ocr', 'description'], rating: 4.7 },
  { agentId: 'audio-producer', name: 'Audio Producer', description: 'Synthèse vocale et production de contenu audio.', longDescription: 'Produces audio content including text-to-speech, voiceovers, and audio descriptions.', category: 'multimodal', icon: '🎙️', color: '#0891b2', tools: ['text_to_speech', 'speech_to_text'], capabilities: ['TTS', 'Voix', 'Transcription', 'Voiceover'], tags: ['audio', 'tts', 'voice', 'speech'], rating: 4.5 },
  // ── BUSINESS ──
  { agentId: 'business-analyst', name: 'Business Analyst', description: 'Analyse business, études de marché et intelligence compétitive.', longDescription: 'Provides business analysis, market research, competitive intelligence, and strategic recommendations.', category: 'business', icon: '💼', color: '#4f46e5', tools: ['web_search', 'data_analysis', 'summarization'], capabilities: ['Analyse Business', 'Marché', 'Compétitivité', 'Stratégie'], tags: ['business', 'market', 'competitive', 'strategy'], rating: 4.8 },
  { agentId: 'customer-support', name: 'Customer Support', description: 'Assistance client intelligente et résolution de problèmes.', longDescription: 'Provides intelligent customer support, troubleshooting, and problem resolution assistance.', category: 'business', icon: '🎧', color: '#4f46e5', tools: ['writing', 'email_composer', 'translation'], capabilities: ['Support', 'FAQ', 'Résolution', 'Multilingue'], tags: ['support', 'customer', 'helpdesk', 'faq'], rating: 4.6 },
  { agentId: 'sales-assistant', name: 'Sales Assistant', description: 'Qualification de leads et aide à la vente.', longDescription: 'Qualifies leads, prepares sales materials, and assists with proposal writing and follow-ups.', category: 'business', icon: '🤝', color: '#4f46e5', tools: ['writing', 'email_composer', 'data_analysis'], capabilities: ['Leads', 'Propositions', 'CRM', 'Conversion'], tags: ['sales', 'leads', 'proposals', 'crm'], rating: 4.5 },
]

// System prompt templates per category — concise but effective
function getSystemPrompt(agent: AgentDef): string {
  const prompts: Record<AgentCategory, string> = {
    research: `You are an expert research agent. Conduct thorough research using available tools. Cross-reference multiple sources, verify facts, and compile structured reports with proper citations. Always respond in the user's language. Include: Executive Summary, Detailed Findings with sources, Key Statistics, and Confidence Assessment.`,
    code: `You are an expert software developer. Write clean, well-documented, production-ready code. Follow best practices, include proper error handling, and explain your architectural decisions. Use modern patterns and frameworks. Respond in the user's language.`,
    content: `You are a professional content creator. Produce engaging, well-structured content with proper formatting. Optimize for the target audience and platform. Use markdown with headings, lists, and emphasis. Respond in the user's language with creativity and precision.`,
    data: `You are a senior data analyst. Analyze data thoroughly, identify patterns and outliers, and provide actionable insights. Use specific numbers, create clear visualizations descriptions, and structure findings with: Overview, Key Findings, Trends, and Recommendations. Respond in the user's language.`,
    design: `You are an experienced creative director and designer. Provide creative concepts, design recommendations, and visual direction. Consider user experience, brand consistency, and modern design trends. Give specific, actionable advice. Respond in the user's language.`,
    marketing: `You are a marketing strategist with deep expertise in digital marketing. Develop data-driven strategies, create compelling copy, and provide actionable marketing recommendations. Consider target audience, channels, and conversion optimization. Respond in the user's language.`,
    productivity: `You are a productivity expert and project manager. Help organize tasks, create plans, summarize information efficiently, and provide actionable productivity recommendations. Be structured, clear, and practical. Respond in the user's language.`,
    security: `You are a senior security specialist. Perform thorough security analysis, identify vulnerabilities, and provide specific remediation steps. Rate severity (Critical/Warning/Info), reference CVEs when applicable, and give prioritized recommendations. Respond in the user's language.`,
    multimodal: `You are a multimodal AI specialist. Work with images, audio, and text. Describe visual content accurately, generate creative prompts, and provide detailed multimedia analysis. Be precise and descriptive. Respond in the user's language.`,
    business: `You are a business intelligence analyst. Provide market analysis, competitive insights, and strategic business recommendations. Use data-driven reasoning, consider market trends, and give actionable advice for decision-making. Respond in the user's language.`,
  }
  const base = prompts[agent.category] || prompts.research
  return `${base}\n\nYour specialty: ${agent.longDescription}\nAvailable tools: ${agent.tools.join(', ')}`
}

/* ═══════════════════════════════════════════════════════════════════════
   Marketplace Functions
   ═══════════════════════════════════════════════════════════════════════ */

let _seeded = false

export async function seedMarketplace(): Promise<void> {
  if (_seeded) return
  _seeded = true

  for (const agent of AGENTS) {
    await db.marketplaceAgent.upsert({
      where: { agentId: agent.agentId },
      create: {
        agentId: agent.agentId,
        name: agent.name,
        description: agent.description,
        longDescription: agent.longDescription,
        category: agent.category,
        icon: agent.icon,
        color: agent.color,
        systemPrompt: getSystemPrompt(agent),
        tools: JSON.stringify(agent.tools),
        capabilities: JSON.stringify(agent.capabilities),
        tags: JSON.stringify(agent.tags),
        author: 'NexusAI',
        version: '1.0.0',
        rating: agent.rating,
        isBuiltIn: true,
        isPublished: true,
      },
      update: {
        name: agent.name,
        description: agent.description,
        longDescription: agent.longDescription,
        category: agent.category,
        icon: agent.icon,
        color: agent.color,
        systemPrompt: getSystemPrompt(agent),
        tools: JSON.stringify(agent.tools),
        capabilities: JSON.stringify(agent.capabilities),
        tags: JSON.stringify(agent.tags),
        author: 'NexusAI',
        version: '1.0.0',
        rating: agent.rating,
        isBuiltIn: true,
        isPublished: true,
      },
    })
  }
}

export async function getMarketplaceAgents(filter?: { category?: string; search?: string }) {
  await seedMarketplace()

  const where: Record<string, unknown> = { isPublished: true }

  if (filter?.category && filter.category !== 'all') {
    where.category = filter.category
  }

  if (filter?.search) {
    const term = `%${filter.search.toLowerCase()}%`
    where.OR = [
      { name: { contains: filter.search, mode: 'insensitive' } },
      { description: { contains: filter.search, mode: 'insensitive' } },
    ]
  }

  const agents = await db.marketplaceAgent.findMany({
    where,
    orderBy: [{ downloads: 'desc' }, { rating: 'desc' }],
  })

  return agents.map(a => ({
    id: a.id,
    agentId: a.agentId,
    name: a.name,
    description: a.description,
    longDescription: a.longDescription || '',
    category: a.category,
    icon: a.icon,
    color: a.color,
    systemPrompt: a.systemPrompt,
    tools: JSON.parse(a.tools || '[]'),
    capabilities: JSON.parse(a.capabilities || '[]'),
    tags: JSON.parse(a.tags || '[]'),
    author: a.author,
    version: a.version,
    rating: a.rating,
    downloads: a.downloads,
  }))
}

export async function installMarketplaceAgent(agentId: string, userId: string) {
  const source = await db.marketplaceAgent.findUnique({ where: { agentId } })
  if (!source) throw new Error(`Agent "${agentId}" not found in marketplace`)

  const tools = JSON.parse(source.tools || '[]')

  const agent = await db.customAgent.create({
    data: {
      userId,
      name: source.name,
      description: source.description,
      role: source.category,
      systemPrompt: source.systemPrompt,
      tools: source.tools,
      avatar: source.icon,
      isActive: true,
    },
  })

  await db.marketplaceAgent.update({
    where: { agentId },
    data: { downloads: { increment: 1 } },
  })

  return agent
}

export async function getMarketplaceCategories() {
  const counts = await db.marketplaceAgent.groupBy({
    by: ['category'],
    where: { isPublished: true },
    _count: { id: true },
  })

  const countMap = Object.fromEntries(counts.map(c => [c.category, c._count.id]))

  return MARKETPLACE_CATEGORIES.map(cat => ({
    ...cat,
    count: countMap[cat.id] || 0,
  }))
}