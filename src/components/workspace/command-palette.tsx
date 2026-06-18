'use client'

import { useEffect, useCallback } from 'react'
import {
  LayoutDashboard,
  MessageSquare,
  Search,
  Palette,
  FileText,
  Bot,
  Workflow,
  Monitor,
  Moon,
  Sun,
  Plus,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useWorkspaceStore, type ModuleId } from '@/store/workspace-store'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'

const moduleItems: { id: ModuleId; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'chat', label: 'Chat IA', icon: MessageSquare },
  { id: 'search', label: 'Recherche', icon: Search },
  { id: 'design', label: 'Design Studio', icon: Palette },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'agents', label: 'Agents IA', icon: Bot },
  { id: 'automation', label: 'Automatisation', icon: Workflow },
  { id: 'command-center', label: 'Command Center', icon: Monitor },
]

export function CommandPalette() {
  const { commandOpen, setCommandOpen, setActiveModule, createConversation } = useWorkspaceStore()
  const { theme, setTheme } = useTheme()
  const close = useCallback(() => setCommandOpen(false), [setCommandOpen])

  const navigateToModule = useCallback(
    (id: ModuleId) => {
      setActiveModule(id)
      close()
    },
    [setActiveModule, close]
  )

  const handleNewChat = useCallback(() => {
    createConversation()
    close()
  }, [createConversation, close])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
    close()
  }, [theme, setTheme, close])

  // Global keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(!commandOpen)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [commandOpen, setCommandOpen])

  return (
    <CommandDialog
      open={commandOpen}
      onOpenChange={(open) => {
        if (!open) close()
        else setCommandOpen(true)
      }}
      className="sm:max-w-lg"
    >
      <CommandInput
        placeholder="Rechercher un module, une action..."
      />
      <CommandList>
        <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {moduleItems.map((item) => (
            <CommandItem
              key={item.id}
              value={item.label}
              onSelect={() => navigateToModule(item.id)}
            >
              <item.icon className="size-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions rapides">
          <CommandItem value="Nouvelle conversation" onSelect={handleNewChat}>
            <Plus className="size-4 text-muted-foreground" />
            <span>Nouvelle conversation</span>
          </CommandItem>
          <CommandItem
            value={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            onSelect={toggleTheme}
          >
            {theme === 'dark' ? (
              <Sun className="size-4 text-muted-foreground" />
            ) : (
              <Moon className="size-4 text-muted-foreground" />
            )}
            <span>{theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Préférences">
          <CommandItem value="Paramètres" onSelect={close}>
            <Settings className="size-4 text-muted-foreground" />
            <span>Paramètres (bientôt)</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}