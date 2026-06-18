'use client'

import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  MessageSquare,
  Search,
  Palette,
  FileText,
  Bot,
  Workflow,
  Monitor,
  Brain,
  Clock,
  Mic,
  Database,
  Users,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Command,
  LayoutGrid,
  Globe,
  TerminalSquare,
  Plug,
  Settings,
  Shield,
  Store,
  Network,
  Link2,
} from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { useWorkspaceStore, type ModuleId } from '@/store/workspace-store'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/workspace/theme-toggle'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface NavItem {
  id?: ModuleId
  label?: string
  icon?: React.ElementType
  shortcut?: string
  separator?: boolean
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'chat', label: 'Chat IA', icon: MessageSquare },
  { id: 'search', label: 'Recherche', icon: Search },
  { id: 'design', label: 'Design Studio', icon: Palette },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'agents', label: 'Agents IA', icon: Bot },
  { id: 'automation', label: 'Automatisation', icon: Workflow },
  { id: 'voice', label: 'Mode Vocal', icon: Mic },
  { id: 'memory', label: 'Mémoire', icon: Brain },
  { id: 'knowledge', label: 'RAG', icon: Database },
  { id: 'orchestrator', label: 'Orchestrateur', icon: Users },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'command-center', label: 'Command Center', icon: Monitor },
  { id: 'canvas', label: 'Canvas', icon: LayoutGrid },
  { id: 'browser', label: 'Browser Agent', icon: Globe },
  { id: 'terminal', label: 'Terminal IA', icon: TerminalSquare },
  { id: 'mcp', label: 'MCP', icon: Plug },
  { id: 'marketplace', label: 'Marketplace', icon: Store },
  { id: 'composer', label: 'Composer', icon: Network },
  { id: 'connectors', label: 'Connecteurs', icon: Link2 },
  { separator: true },
  { id: 'settings', label: 'Paramètres', icon: Settings },
  { id: 'admin', label: 'Admin', icon: Shield },
]

function SidebarNavContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean
  onNavigate?: () => void
}) {
  const { activeModule, setActiveModule } = useWorkspaceStore()

  const handleNavClick = useCallback(
    (id: ModuleId) => {
      setActiveModule(id)
      onNavigate?.()
    },
    [setActiveModule, onNavigate]
  )

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-2" aria-label="Main navigation">
      <ul className="flex flex-col gap-1">
        {navItems.map((item, idx) => {
          if (item.separator) {
            return (
              <li key={`sep-${idx}`} className="my-2">
                <Separator />
              </li>
            )
          }
          const isActive = activeModule === item.id
          const Icon = item.icon

          const button = (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`
                group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5
                text-sm font-medium transition-all duration-200 outline-none
                focus-visible:ring-2 focus-visible:ring-ring/50
                ${
                  isActive
                    ? 'glass-subtle text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }
                ${collapsed ? 'justify-center px-0' : ''}
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-[60%] w-[3px] rounded-r-full bg-primary"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <Icon
                className={`size-5 shrink-0 transition-colors duration-200 ${
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                }`}
              />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="truncate overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )

          if (collapsed) {
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>
                  <span className="font-medium">{item.label}</span>
                  {item.shortcut && (
                    <kbd className="ml-2 text-[10px] text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded">
                      {item.shortcut}
                    </kbd>
                  )}
                </TooltipContent>
              </Tooltip>
            )
          }

          return button
        })}
      </ul>
    </nav>
  )
}

function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Sparkles className="size-5" />
      </div>
      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden whitespace-nowrap"
          >
            <h1 className="text-lg font-bold tracking-tight text-foreground">NexusAI</h1>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Workspace
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const { sidebarCollapsed, setSidebarCollapsed, setCommandOpen } = useWorkspaceStore()

  return (
    <div className="mt-auto flex flex-col gap-1 p-3">
      <Separator className="mb-2" />
      <div className={`flex items-center gap-2 ${collapsed ? 'flex-col' : ''}`}>
        <Button
          variant="ghost"
          size="icon"
          className={`size-9 shrink-0 ${collapsed ? 'w-full' : ''}`}
          onClick={() => setCommandOpen(true)}
          aria-label="Open command palette"
        >
          <Command className="size-4" />
        </Button>
        <ThemeToggle />
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="ml-auto"
          >
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronLeft className="size-4" />
              )}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  )
}

function DesktopSidebar() {
  const { sidebarCollapsed, setSidebarCollapsed } = useWorkspaceStore()

  return (
    <motion.aside
      className="fixed left-0 top-0 z-30 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar glass-strong md:flex"
      animate={{ width: sidebarCollapsed ? 64 : 256 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <SidebarBrand collapsed={sidebarCollapsed} />
      <SidebarNavContent collapsed={sidebarCollapsed} />
      <SidebarFooter collapsed={sidebarCollapsed} />

      {/* Invisible expand hit area when collapsed */}
      {sidebarCollapsed && (
        <div
          className="absolute -right-3 top-1/2 z-40 -translate-y-1/2"
          onClick={() => setSidebarCollapsed(false)}
        >
          <div className="flex size-6 cursor-pointer items-center justify-center rounded-full border bg-background shadow-sm transition-colors hover:bg-accent">
            <ChevronRight className="size-3" />
          </div>
        </div>
      )}
    </motion.aside>
  )
}

function MobileSidebar() {
  const { sidebarOpen, toggleSidebar, activeModule, setActiveModule, setCommandOpen } = useWorkspaceStore()
  const isMobile = useIsMobile()

  const handleClose = useCallback(() => {
    if (sidebarOpen) toggleSidebar()
  }, [sidebarOpen, toggleSidebar])

  const handleMobileNavigate = useCallback(
    (id: ModuleId) => {
      setActiveModule(id)
      handleClose()
    },
    [setActiveModule, handleClose]
  )

  const handleOpenCommand = useCallback(() => {
    setCommandOpen(true)
    handleClose()
  }, [setCommandOpen, handleClose])

  if (!isMobile) return null

  return (
    <Sheet open={sidebarOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent
        side="left"
        className="w-72 p-0 bg-sidebar glass-strong border-sidebar-border"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
          <SheetDescription>Main workspace navigation</SheetDescription>
        </SheetHeader>
        <div className="flex h-full flex-col">
          <SidebarBrand collapsed={false} />
          <Separator />
          <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
            <ul className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = activeModule === item.id
                const Icon = item.icon

                return (
                  <button
                    key={item.id}
                    onClick={() => handleMobileNavigate(item.id)}
                    className={`
                      group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5
                      text-sm font-medium transition-all duration-200 outline-none
                      focus-visible:ring-2 focus-visible:ring-ring/50
                      ${
                        isActive
                          ? 'glass-subtle text-primary shadow-sm'
                          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      }
                    `}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[60%] w-[3px] rounded-r-full bg-primary" />
                    )}
                    <Icon
                      className={`size-5 shrink-0 transition-colors duration-200 ${
                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                )
              })}
            </ul>
          </nav>
          <div className="p-3">
            <Separator className="mb-2" />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                onClick={handleOpenCommand}
                aria-label="Open command palette"
              >
                <Command className="size-4" />
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function WorkspaceSidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  )
}

export { navItems }
export type { NavItem }