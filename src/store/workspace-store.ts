import { create } from 'zustand'

export type ModuleId = 'home' | 'chat' | 'search' | 'design' | 'documents' | 'agents' | 'automation' | 'command-center'

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

  customAgents: [
    {
      id: 'agent-research',
      name: 'Research Agent',
      description: 'Recherche approfondie sur le web et synthèse d\'informations',
      role: 'Research Assistant',
      systemPrompt: 'You are a research assistant specialized in finding and synthesizing information.',
      tools: ['web_search', 'web_reader'],
      avatar: '🔬',
      isActive: true,
      status: 'idle',
      createdAt: new Date(),
    },
    {
      id: 'agent-coder',
      name: 'Coding Agent',
      description: 'Génération et review de code, debug, architecture',
      role: 'Senior Developer',
      systemPrompt: 'You are a senior software developer. Write clean, efficient, well-documented code.',
      tools: ['code_generation', 'code_review'],
      avatar: '💻',
      isActive: true,
      status: 'idle',
      createdAt: new Date(),
    },
    {
      id: 'agent-writer',
      name: 'Content Agent',
      description: 'Rédaction de contenu, articles, documents professionnels',
      role: 'Professional Writer',
      systemPrompt: 'You are a professional content writer. Create engaging, well-structured content.',
      tools: ['writing', 'editing'],
      avatar: '✍️',
      isActive: true,
      status: 'idle',
      createdAt: new Date(),
    },
    {
      id: 'agent-data',
      name: 'Data Agent',
      description: 'Analyse de données, visualisation, rapports',
      role: 'Data Analyst',
      systemPrompt: 'You are a data analyst expert. Analyze data and create clear visualizations.',
      tools: ['data_analysis', 'visualization'],
      avatar: '📊',
      isActive: true,
      status: 'idle',
      createdAt: new Date(),
    },
  ],
  activeAgentId: null,

  workflows: [],
  activities: [],

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
}))