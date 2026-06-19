'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  MessageSquare,
  Search,
  Palette,
  Bot,
  Workflow,
  FileText,
  Mic,
  Globe,
  TerminalSquare,
  Brain,
  Store,
  Plug,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Cpu,
  ChevronRight,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/workspace/theme-toggle'

/* ─── Types ─── */
interface LandingPageProps {
  onLogin: () => void
  onRegister: () => void
}

/* ─── Animation helpers ─── */
const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
}

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
}

/* ─── Features data ─── */
const features = [
  {
    icon: MessageSquare,
    title: 'Chat IA',
    description:
      'Conversez avec des modèles d\'IA avancés. Chat fluide, contexte persistant et réponses intelligentes.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Search,
    title: 'Recherche Web',
    description:
      'Recherchez en temps réel sur le web grâce à l\'IA. Résultats pertinents et synthétisés.',
    color: 'text-sky-500',
    bg: 'bg-sky-500/10',
  },
  {
    icon: Palette,
    title: 'Design Studio',
    description:
      'Générez des images, logos et créations visuelles avec des modèles de diffusion IA.',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
  },
  {
    icon: Bot,
    title: 'Agents IA Autonomes',
    description:
      'Créez et déployez des agents IA capables d\'exécuter des tâches complexes de manière autonome.',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
  {
    icon: Workflow,
    title: 'Automatisation',
    description:
      'Automatisez vos workflows avec des flux visuels. Connectez vos outils et optimisez vos processus.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    icon: FileText,
    title: 'Génération de Documents',
    description:
      'Créez des rapports, articles et documents professionnels grâce à l\'intelligence artificielle.',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: Mic,
    title: 'Voix & Transcription',
    description:
      'Transcrivez vos enregistrements audio et interagissez avec l\'IA par la voix.',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  {
    icon: Globe,
    title: 'Navigateur IA',
    description:
      'Naviguez sur le web avec un assistant IA intégré. Scraping intelligent et extraction de données.',
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
  },
  {
    icon: TerminalSquare,
    title: 'Terminal & Code',
    description:
      'Générez et exécutez du code directement dans votre espace de travail. Support multi-langages.',
    color: 'text-lime-500',
    bg: 'bg-lime-500/10',
  },
  {
    icon: Brain,
    title: 'Orchestrateur Multi-Agents',
    description:
      'Orchestrez plusieurs agents IA travaillant en collaboration pour résoudre des problèmes complexes.',
    color: 'text-fuchsia-500',
    bg: 'bg-fuchsia-500/10',
  },
  {
    icon: Store,
    title: 'Marketplace d\'Agents',
    description:
      'Découvrez et installez des agents IA pré-configurés créés par la communauté.',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
  },
  {
    icon: Plug,
    title: 'Connecteurs & API',
    description:
      'Connectez vos outils préférés via des API. Intégrations Slack, Notion, GitHub et bien plus.',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
  },
]

/* ─── Stats data ─── */
const stats = [
  {
    icon: Layers,
    value: '18+',
    label: 'Modules IA',
    description: 'Modules spécialisés couvrant tous vos besoins',
  },
  {
    icon: Bot,
    value: '∞',
    label: 'Agents Autonomes',
    description: 'Agents intelligents pour chaque tâche',
  },
  {
    icon: Cpu,
    value: 'Multi-Modèle',
    label: 'GPT, Claude, Gemini…',
    description: 'Choisissez le meilleur modèle pour chaque usage',
  },
  {
    icon: Shield,
    value: '100%',
    label: 'Sécurisé & Privé',
    description: 'Vos données restent confidentielles',
  },
]

/* ─── Navbar ─── */
function Navbar({ onLogin, onRegister }: LandingPageProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="glass-strong sticky top-0 z-50 flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8 border-b border-border/50"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 glow-sm">
          <Sparkles className="size-5 text-primary" />
        </div>
        <span className="text-lg font-bold tracking-tight">
          Nexus<span className="text-primary">AI</span>
        </span>
      </div>

      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />

        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogin}
            className="font-medium"
          >
            Se connecter
          </Button>
          <Button
            size="sm"
            onClick={onRegister}
            className="font-medium"
          >
            <Sparkles className="size-3.5" />
            Créer un compte
          </Button>
        </div>

        {/* Mobile: show both buttons */}
        <div className="flex sm:hidden items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onLogin}
            className="text-xs"
          >
            Connexion
          </Button>
          <Button
            size="sm"
            onClick={onRegister}
            className="text-xs"
          >
            Inscription
          </Button>
        </div>
      </div>
    </motion.header>
  )
}

/* ─── Hero Section ─── */
function HeroSection({ onLogin, onRegister }: LandingPageProps) {
  return (
    <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32">
      {/* Background glow orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 size-[500px] rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute -bottom-20 right-1/4 size-[400px] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-4xl text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Badge
            variant="secondary"
            className="mb-6 gap-1.5 px-3.5 py-1.5 text-sm font-medium glass-subtle"
          >
            <Zap className="size-3.5 text-amber-500" />
            Plateforme IA nouvelle génération
          </Badge>
        </motion.div>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]"
        >
          <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            NexusAI
          </span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-4 text-xl sm:text-2xl font-semibold text-foreground/90"
        >
          Votre espace de travail IA tout-en-un
        </motion.p>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed"
        >
          Centralisez tous vos outils d'intelligence artificielle dans une seule
          interface puissante. Chat, recherche, design, automatisation et bien
          plus encore.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
        >
          <Button
            size="lg"
            onClick={onRegister}
            className="h-12 px-8 text-base font-semibold rounded-xl glow-sm"
          >
            Créer un compte gratuitement
            <ArrowRight className="ml-1 size-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onLogin}
            className="h-12 px-8 text-base font-medium rounded-xl glass-subtle"
          >
            Se connecter
          </Button>
        </motion.div>

        {/* Trust line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mt-6 text-xs sm:text-sm text-muted-foreground/70"
        >
          Aucune carte bancaire requise · Configuration en 30 secondes
        </motion.p>
      </div>
    </section>
  )
}

/* ─── Features Section ─── */
function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="px-4 sm:px-6 lg:px-8 pb-24 sm:pb-32">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 sm:mb-16"
        >
          <Badge variant="outline" className="mb-4 text-xs font-medium">
            Fonctionnalités
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            Tout ce dont vous avez besoin,{' '}
            <span className="text-primary">en un seul endroit</span>
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            Plus de 18 modules IA spécialisés pour booster votre productivité
            au quotidien.
          </p>
        </motion.div>

        {/* Features grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5"
        >
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              variants={scaleIn}
              custom={i}
              className="glass module-card group rounded-xl p-5 sm:p-6 cursor-default"
            >
              <div
                className={`mb-4 flex size-10 sm:size-11 items-center justify-center rounded-xl ${feature.bg}`}
              >
                <feature.icon className={`size-5 sm:size-5 ${feature.color}`} />
              </div>
              <h3 className="font-semibold text-sm sm:text-base tracking-tight">
                {feature.title}
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Stats / Trust Section ─── */
function StatsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section ref={ref} className="px-4 sm:px-6 lg:px-8 pb-24 sm:pb-32">
      <div className="mx-auto max-w-5xl">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="glass rounded-2xl p-6 sm:p-8 md:p-10"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={fadeInUp}
                custom={i}
                className="text-center"
              >
                <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10">
                  <stat.icon className="size-5 text-primary" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground/90">
                  {stat.label}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground hidden sm:block">
                  {stat.description}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ─── CTA Section ─── */
function CTASection({ onLogin, onRegister }: LandingPageProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section ref={ref} className="px-4 sm:px-6 lg:px-8 pb-24 sm:pb-32">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="glass rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden"
        >
          {/* Background glow */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 size-[300px] rounded-full bg-primary/10 blur-[80px]" />
          </div>

          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Prêt à transformer votre productivité ?
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
              Rejoignez NexusAI et découvrez la puissance de l'intelligence
              artificielle réunie dans une seule plateforme.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={onRegister}
                className="h-12 px-8 text-base font-semibold rounded-xl"
              >
                Commencer gratuitement
                <ArrowRight className="ml-1 size-4" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={onLogin}
                className="h-12 px-6 text-base font-medium rounded-xl gap-1.5"
              >
                Se connecter
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="border-t border-border/50 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="size-4 text-primary/60" />
          <span>© 2026 NexusAI — AENews Platform</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <a
            href="/?mod=settings"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Administration
          </a>
        </div>
      </div>
    </footer>
  )
}

/* ─── Main Landing Page Component ─── */
export function LandingPage({ onLogin, onRegister }: LandingPageProps) {
  return (
    <div className="min-h-screen flex flex-col gradient-bg">
      <Navbar onLogin={onLogin} onRegister={onRegister} />

      <main className="flex-1">
        <HeroSection onLogin={onLogin} onRegister={onRegister} />
        <FeaturesSection />
        <StatsSection />
        <CTASection onLogin={onLogin} onRegister={onRegister} />
      </main>

      <Footer />
    </div>
  )
}
