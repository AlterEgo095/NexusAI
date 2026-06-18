import { create } from 'zustand'

export type ModuleId = 'home' | 'chat' | 'search' | 'design' | 'documents' | 'agents' | 'automation' | 'command-center' | 'memory' | 'timeline' | 'voice' | 'knowledge' | 'orchestrator' | 'canvas' | 'browser' | 'terminal' | 'mcp'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  createdAt: Date
}

export interface Conversation {
  id: string
  title: string
  model: string
  messages: Message[]
  createdAt: Date
}

export interface SearchResult {
  url: string
  name: string
  snippet: string
  host_name: string
  rank: number
  date: string
  favicon: string
}

export interface SearchSession {
  id: string
  query: string
  results: SearchResult[]
  summary: string
  createdAt: Date
}

export interface GeneratedImage {
  id: string
  prompt: string
  size: string
  dataUrl: string
  createdAt: Date
}

export interface CustomAgent {
  id: string
  name: string
  description: string
  role: string
  systemPrompt: string
  tools: string[]
  avatar: string
  isActive: boolean
  status: 'idle' | 'running' | 'error'
  createdAt: Date
}

export interface WorkflowNode {
  id: string
  type: 'trigger' | 'action' | 'condition' | 'output'
  label: string
  config: Record<string, unknown>
  position: { x: number; y: number }
}

export interface Workflow {
  id: string
  name: string
  trigger: string
  nodes: WorkflowNode[]
  isActive: boolean
  lastRun: Date | null
}

export interface ActivityItem {
  id: string
  type: 'chat' | 'search' | 'image' | 'agent' | 'document' | 'automation'
  action: string
  details: string
  createdAt: Date
}

export interface DbStats {
  totalConversations: number
  totalMessages: number
  totalSearches: number
  totalImages: number
  totalAgents: number
  activeAutomations: number
  totalVoices: number
  totalTranslations: number
  creditsRemaining: number
  today: {
    chatRequests: number
    searchRequests: number
    imageRequests: number
    agentRequests: number
    automationRuns: number
    voiceRequests: number
    visionRequests: number
    translationRequests: number
    tokensUsed: number
  }
  weeklyTrend: Array<{
    date: string
    chatRequests: number
    searchRequests: number
    imageRequests: number
    agentRequests: number
    automationRuns: number
    voiceRequests: number
    visionRequests: number
    translationRequests: number
    tokensUsed: number
  }>
}

interface WorkspaceState {
  activeModule: ModuleId
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  commandOpen: boolean

  conversations: Conversation[]
  activeConversationId: string | null
  isGenerating: boolean

  searchSessions: SearchSession[]
  activeSearchId: string | null
  isSearching: boolean

  generatedImages: GeneratedImage[]
  isGeneratingImage: boolean

  customAgents: CustomAgent[]
  activeAgentId: string | null

  workflows: Workflow[]
  activities: ActivityItem[]

  // New DB-backed state
  stats: DbStats | null
  dbActivities: ActivityItem[]
  isLoadingData: boolean
  toolDefinitions: Array<{ value: string; label: string; description: string }>

  setActiveModule: (module: ModuleId) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setCommandOpen: (open: boolean) => void

  createConversation: () => string
  setActiveConversation: (id: string) => void
  addMessage: (conversationId: string, message: Message) => void
  updateConversationTitle: (id: string, title: string) => void
  deleteConversation: (id: string) => void
  setIsGenerating: (generating: boolean) => void

  addSearchSession: (session: SearchSession) => void
  setActiveSearch: (id: string) => void
  setIsSearching: (searching: boolean) => void

  addGeneratedImage: (image: GeneratedImage) => void
  setIsGeneratingImage: (generating: boolean) => void

  addAgent: (agent: CustomAgent) => void
  updateAgent: (id: string, updates: Partial<CustomAgent>) => void
  deleteAgent: (id: string) => void

  addWorkflow: (workflow: Workflow) => void
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void

  addActivity: (activity: ActivityItem) => void

  // New DB-backed setters
  setStats: (stats: DbStats | null) => void
  setDbActivities: (activities: ActivityItem[]) => void
  setToolDefinitions: (tools: Array<{ value: string; label: string; description: string }>) => void
  setIsLoadingData: (loading: boolean) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeModule: 'home',
  sidebarOpen: true,
  sidebarCollapsed: false,
  commandOpen: false,

  conversations: [],
  activeConversationId: null,
  isGenerating: false,

  searchSessions: [],
  activeSearchId: null,
  isSearching: false,

  generatedImages: [],
  isGeneratingImage: false,

  customAgents: [],
  activeAgentId: null,

  workflows: [],
  activities: [],

  // New DB-backed state
  stats: null,
  dbActivities: [],
  isLoadingData: false,
  toolDefinitions: [],

  setActiveModule: (module) => set({ activeModule: module }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setCommandOpen: (open) => set({ commandOpen: open }),

  createConversation: () => {
    const id = `conv-${Date.now()}`
    const conv: Conversation = {
      id,
      title: 'Nouvelle conversation',
      model: 'default',
      messages: [],
      createdAt: new Date(),
    }
    set((s) => ({
      conversations: [conv, ...s.conversations],
      activeConversationId: id,
      activeModule: 'chat',
    }))
    return id
  },
  setActiveConversation: (id) => set({ activeConversationId: id, activeModule: 'chat' }),
  addMessage: (conversationId, message) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, messages: [...c.messages, message] } : c
      ),
    })),
  updateConversationTitle: (id, title) =>
    set((s) => ({
      conversations: s.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
    })),
  deleteConversation: (id) =>
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
      activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
    })),
  setIsGenerating: (generating) => set({ isGenerating: generating }),

  addSearchSession: (session) =>
    set((s) => ({
      searchSessions: [session, ...s.searchSessions],
      activeSearchId: session.id,
    })),
  setActiveSearch: (id) => set({ activeSearchId: id }),
  setIsSearching: (searching) => set({ isSearching: searching }),

  addGeneratedImage: (image) =>
    set((s) => ({ generatedImages: [image, ...s.generatedImages] })),
  setIsGeneratingImage: (generating) => set({ isGeneratingImage: generating }),

  addAgent: (agent) => set((s) => ({ customAgents: [...s.customAgents, agent] })),
  updateAgent: (id, updates) =>
    set((s) => ({
      customAgents: s.customAgents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),
  deleteAgent: (id) =>
    set((s) => ({
      customAgents: s.customAgents.filter((a) => a.id !== id),
    })),

  addWorkflow: (workflow) => set((s) => ({ workflows: [...s.workflows, workflow] })),
  updateWorkflow: (id, updates) =>
    set((s) => ({
      workflows: s.workflows.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    })),

  addActivity: (activity) =>
    set((s) => ({
      activities: [activity, ...s.activities].slice(0, 100),
    })),

  // New DB-backed setters
  setStats: (stats) => set({ stats }),
  setDbActivities: (dbActivities) => set({ dbActivities }),
  setToolDefinitions: (toolDefinitions) => set({ toolDefinitions }),
  setIsLoadingData: (isLoadingData) => set({ isLoadingData }),
}))

/* ─── Data loading utilities (standalone functions, not in store) ─── */

export async function fetchConversationsFromDB(): Promise<Conversation[]> {
  try {
    const res = await fetch('/api/chat')
    const data = await res.json()
    if (data.success && Array.isArray(data.conversations)) {
      return data.conversations.map(
        (c: { id: string; title: string; model: string; messages: Array<{ id: string; role: string; content: string; createdAt: string }>; createdAt: string }) => ({
          id: c.id,
          title: c.title,
          model: c.model,
          messages: (c.messages || []).map(
            (m: { id: string; role: string; content: string; createdAt: string }) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              createdAt: new Date(m.createdAt),
            })
          ),
          createdAt: new Date(c.createdAt),
        })
      )
    }
  } catch {
    // Silently fail — fallback to in-memory
  }
  return []
}

export async function fetchAgentsFromDB(): Promise<{ agents: CustomAgent[]; toolDefinitions: Array<{ value: string; label: string; description: string }> }> {
  try {
    const res = await fetch('/api/agents')
    const data = await res.json()
    if (data.success) {
      const agents: CustomAgent[] = (data.agents || []).map(
        (a: { id: string; name: string; description: string | null; role: string; systemPrompt: string; tools: string; avatar: string; isActive: boolean; createdAt: string }) => ({
          id: a.id,
          name: a.name,
          description: a.description || '',
          role: a.role,
          systemPrompt: a.systemPrompt,
          tools: JSON.parse(a.tools || '[]'),
          avatar: a.avatar,
          isActive: a.isActive,
          status: 'idle' as const,
          createdAt: new Date(a.createdAt),
        })
      )
      const toolDefinitions = data.toolDefinitions || []
      return { agents, toolDefinitions }
    }
  } catch {
    // Silently fail
  }
  return { agents: [], toolDefinitions: [] }
}

export async function fetchStatsFromDB(): Promise<DbStats | null> {
  try {
    const res = await fetch('/api/stats')
    const data = await res.json()
    if (data.success && data.stats) {
      return data.stats as DbStats
    }
  } catch {
    // Silently fail
  }
  return null
}

export async function fetchActivityFromDB(): Promise<ActivityItem[]> {
  try {
    const res = await fetch('/api/activity')
    const data = await res.json()
    if (data.success && Array.isArray(data.activities)) {
      return data.activities.map(
        (a: { id: string; type: string; action: string; details: string | null; createdAt: string }) => ({
          id: a.id,
          type: a.type as ActivityItem['type'],
          action: a.action,
          details: a.details || '',
          createdAt: new Date(a.createdAt),
        })
      )
    }
  } catch {
    // Silently fail
  }
  return []
}

export async function fetchImagesFromDB(): Promise<GeneratedImage[]> {
  try {
    const res = await fetch('/api/image')
    const data = await res.json()
    if (data.success && Array.isArray(data.images)) {
      // Note: API GET doesn't return imageData for list performance
      // Only populate metadata — dataUrl will be empty for DB-loaded images
      return data.images.map(
        (img: { id: string; prompt: string; size: string; createdAt: string }) => ({
          id: img.id,
          prompt: img.prompt,
          size: img.size,
          dataUrl: '',
          createdAt: new Date(img.createdAt),
        })
      )
    }
  } catch {
    // Silently fail
  }
  return []
}

export async function fetchDocumentsFromDB(): Promise<Array<{ id: string; title: string; type: string; content: string; status: string; createdAt: string; updatedAt: string }>> {
  try {
    const res = await fetch('/api/documents')
    const data = await res.json()
    if (data.success && Array.isArray(data.documents)) {
      return data.documents
    }
  } catch {
    // Silently fail
  }
  return []
}

export async function fetchAutomationsFromDB(): Promise<Array<{ id: string; name: string; description: string | null; trigger: string; isActive: boolean; lastRun: string | null; runCount: number; createdAt: string }>> {
  try {
    const res = await fetch('/api/automations')
    const data = await res.json()
    if (data.success && Array.isArray(data.automations)) {
      return data.automations
    }
  } catch {
    // Silently fail
  }
  return []
}