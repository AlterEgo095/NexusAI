'use client'

import { lazy, Suspense, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { Menu, Command, Loader2 } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { useWorkspaceStore } from '@/store/workspace-store'
import { WorkspaceSidebar } from '@/components/workspace/sidebar'
import { CommandPalette } from '@/components/workspace/command-palette'
import { ThemeToggle } from '@/components/workspace/theme-toggle'
import { UserMenu } from '@/components/auth/user-menu'
import { AuthDialogs } from '@/components/auth/auth-dialogs'
import { LandingPage } from '@/components/landing/landing-page'
import { Button } from '@/components/ui/button'

// Lazy load all modules for code splitting
const HomeModule = lazy(() => import('@/components/modules/home-module'))
const ChatModule = lazy(() => import('@/components/modules/chat-module'))
const SearchModule = lazy(() => import('@/components/modules/search-module'))
const DesignModule = lazy(() => import('@/components/modules/design-module'))
const DocumentsModule = lazy(() => import('@/components/modules/documents-module'))
const AgentsModule = lazy(() => import('@/components/modules/agents-module'))
const AutomationModule = lazy(() => import('@/components/modules/automation-module'))
const CommandCenterModule = lazy(() => import('@/components/modules/command-center-module'))
const VoiceModule = lazy(() => import('@/components/modules/voice-module'))
const MemoryModule = lazy(() => import('@/components/modules/memory-module'))
const TimelineModule = lazy(() => import('@/components/modules/timeline-module'))
const KnowledgeModule = lazy(() => import('@/components/modules/knowledge-module'))
const OrchestratorModule = lazy(() => import('@/components/modules/orchestrator-module'))
const CanvasModule = lazy(() => import('@/components/modules/canvas-module'))
const BrowserModule = lazy(() => import('@/components/modules/browser-module'))
const TerminalModule = lazy(() => import('@/components/modules/terminal-module'))
const McpModule = lazy(() => import('@/components/modules/mcp-module'))
const MarketplaceModule = lazy(() => import('@/components/modules/marketplace-module'))
const ComposerModule = lazy(() => import('@/components/modules/composer-module'))
const ConnectorsModule = lazy(() => import('@/components/modules/connectors-module'))
const SkillsModule = lazy(() => import('@/components/modules/skills-module'))
const SettingsModule = lazy(() => import('@/components/modules/settings-module'))
const moduleComponents: Record<string, React.ComponentType> = {
  home: HomeModule,
  chat: ChatModule,
  search: SearchModule,
  design: DesignModule,
  documents: DocumentsModule,
  agents: AgentsModule,
  automation: AutomationModule,
  voice: VoiceModule,
  memory: MemoryModule,
  knowledge: KnowledgeModule,
  orchestrator: OrchestratorModule,
  timeline: TimelineModule,
  'command-center': CommandCenterModule,
  canvas: CanvasModule,
  browser: BrowserModule,
  terminal: TerminalModule,
  mcp: McpModule,
  marketplace: MarketplaceModule,
  composer: ComposerModule,
  connectors: ConnectorsModule,
  skills: SkillsModule,
  settings: SettingsModule,
}

function ModuleLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="size-8 animate-spin text-primary/60" />
        <p className="text-sm text-muted-foreground">Chargement du module...</p>
      </div>
    </div>
  )
}

function ModuleRouter() {
  const activeModule = useWorkspaceStore((s) => s.activeModule)
  const ModuleComponent = moduleComponents[activeModule] || HomeModule

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeModule}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="h-full"
      >
        <Suspense fallback={<ModuleLoader />}>
          <ModuleComponent />
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}

function TopBar() {
  const { toggleSidebar, setCommandOpen, setActiveModule } = useWorkspaceStore()
  const isMobile = useIsMobile()
  const [loginOpen, setLoginOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)

  return (
    <header className="glass-strong sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/50 px-4">
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={toggleSidebar}
          aria-label="Ouvrir la navigation"
        >
          <Menu className="size-5" />
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        className="hidden sm:flex h-8 w-64 items-center gap-2 text-muted-foreground font-normal"
        onClick={() => setCommandOpen(true)}
      >
        <Command className="size-3.5" />
        <span className="text-xs">Rechercher...</span>
        <kbd className="ml-auto rounded border bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/70">
          Ctrl+K
        </kbd>
      </Button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserMenu onLoginClick={() => setLoginOpen(true)} onNavigate={(mod) => { setActiveModule(mod as any) }} />
      </div>
      <AuthDialogs
        loginOpen={loginOpen} setLoginOpen={setLoginOpen}
        registerOpen={registerOpen} setRegisterOpen={setRegisterOpen}
        onSuccess={() => {}}
      />
    </header>
  )
}

/* ─── Loading state ─── */
function FullPageLoader() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="size-8 animate-spin text-primary/60" />
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    </div>
  )
}

/* ─── Unauthenticated view (Landing + Auth dialogs) ─── */
function UnauthenticatedView() {
  const [loginOpen, setLoginOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)

  return (
    <>
      <LandingPage
        onLogin={() => setLoginOpen(true)}
        onRegister={() => setRegisterOpen(true)}
      />
      <AuthDialogs
        loginOpen={loginOpen}
        setLoginOpen={setLoginOpen}
        registerOpen={registerOpen}
        setRegisterOpen={setRegisterOpen}
        onSuccess={() => {}}
      />
    </>
  )
}

/* ─── Authenticated view (Workspace) ─── */
function WorkspacePage() {
  const sidebarCollapsed = useWorkspaceStore((s) => s.sidebarCollapsed)
  const isMobile = useIsMobile()

  return (
    <div className="min-h-screen gradient-bg">
      <WorkspaceSidebar />
      <CommandPalette />

      <div
        className="flex min-h-screen flex-col transition-[margin-left] duration-300 ease-in-out"
        style={{
          marginLeft: isMobile ? 0 : sidebarCollapsed ? 64 : 256,
        }}
      >
        <TopBar />

        <main className="flex-1 overflow-hidden">
          <ModuleRouter />
        </main>
      </div>
    </div>
  )
}

/* ─── Root page with session-based routing ─── */
export default function Page() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <FullPageLoader />
  }

  if (session) {
    return <WorkspacePage />
  }

  return <UnauthenticatedView />
}
