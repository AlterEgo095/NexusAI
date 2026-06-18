import { db } from '@/lib/db'

/* ═══════════════════════════════════════════════════════════════════════
   Connector Template System
   ═══════════════════════════════════════════════════════════════════════ */

export interface ConnectorTemplate {
  type: string
  name: string
  description: string
  icon: string
  color: string
  authType: 'api_key' | 'oauth' | 'webhook' | 'token'
  configFields: Array<{
    key: string
    label: string
    type: 'text' | 'password' | 'url' | 'select'
    placeholder?: string
    required?: boolean
    options?: string[]
  }>
  capabilities: string[]
  docsUrl?: string
}

export const CONNECTOR_TEMPLATES: ConnectorTemplate[] = [
  {
    type: 'github',
    name: 'GitHub',
    description: 'Connect to GitHub for repository management, pull request reviews, issue tracking, and code search.',
    icon: '🐙',
    color: '#24292e',
    authType: 'api_key',
    configFields: [
      { key: 'token', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_xxxxxxxxxxxx', required: true },
      { key: 'baseUrl', label: 'API Base URL', type: 'url', placeholder: 'https://api.github.com', required: false },
    ],
    capabilities: ['repo_management', 'pr_reviews', 'issues', 'code_search'],
    docsUrl: 'https://docs.github.com/en/rest',
  },
  {
    type: 'gitlab',
    name: 'GitLab',
    description: 'Connect to GitLab for repository management, merge request reviews, issue tracking, and CI/CD pipelines.',
    icon: '🦊',
    color: '#fc6d26',
    authType: 'token',
    configFields: [
      { key: 'token', label: 'Private Token', type: 'password', placeholder: 'glpat-xxxxxxxxxxxx', required: true },
      { key: 'baseUrl', label: 'GitLab URL', type: 'url', placeholder: 'https://gitlab.com', required: false },
    ],
    capabilities: ['repo_management', 'merge_requests', 'issues', 'pipelines'],
    docsUrl: 'https://docs.gitlab.com/ee/api/',
  },
  {
    type: 'slack',
    name: 'Slack',
    description: 'Connect to Slack to manage channels, send messages, and share files across your workspace.',
    icon: '💬',
    color: '#4a154b',
    authType: 'token',
    configFields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: 'xoxb-xxxxxxxxxxxx', required: true },
      { key: 'webhookUrl', label: 'Webhook URL', type: 'url', placeholder: 'https://hooks.slack.com/services/...', required: false },
      { key: 'signingSecret', label: 'Signing Secret', type: 'password', placeholder: 'Enter signing secret', required: false },
    ],
    capabilities: ['channels', 'messages', 'file_sharing'],
    docsUrl: 'https://api.slack.com/docs',
  },
  {
    type: 'discord',
    name: 'Discord',
    description: 'Connect to Discord to manage servers, channels, and messages using the bot API.',
    icon: '🎮',
    color: '#5865f2',
    authType: 'token',
    configFields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: 'Enter bot token', required: true },
      { key: 'webhookUrl', label: 'Webhook URL', type: 'url', placeholder: 'https://discord.com/api/webhooks/...', required: false },
      { key: 'serverId', label: 'Server (Guild) ID', type: 'text', placeholder: 'Enter server ID', required: false },
    ],
    capabilities: ['servers', 'channels', 'messages'],
    docsUrl: 'https://discord.com/developers/docs',
  },
  {
    type: 'gmail',
    name: 'Gmail',
    description: 'Connect to Gmail to send and read emails, search your inbox, and manage labels.',
    icon: '📧',
    color: '#ea4335',
    authType: 'oauth',
    configFields: [
      { key: 'clientId', label: 'OAuth Client ID', type: 'text', placeholder: 'Enter OAuth client ID', required: true },
      { key: 'clientSecret', label: 'OAuth Client Secret', type: 'password', placeholder: 'Enter OAuth client secret', required: true },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', placeholder: 'Enter refresh token', required: true },
    ],
    capabilities: ['send_email', 'read_email', 'search', 'labels'],
    docsUrl: 'https://developers.google.com/gmail/api/reference/rest',
  },
  {
    type: 'notion',
    name: 'Notion',
    description: 'Connect to Notion to manage pages, query databases, and create or update content.',
    icon: '📓',
    color: '#000000',
    authType: 'token',
    configFields: [
      { key: 'token', label: 'Integration Token', type: 'password', placeholder: 'ntn_xxxxxxxxxxxx', required: true },
      { key: 'workspaceId', label: 'Workspace ID', type: 'text', placeholder: 'Enter workspace ID (optional)', required: false },
    ],
    capabilities: ['pages', 'databases', 'content'],
    docsUrl: 'https://developers.notion.com/reference',
  },
  {
    type: 'trello',
    name: 'Trello',
    description: 'Connect to Trello to manage boards, cards, lists, and automate your project workflows.',
    icon: '📋',
    color: '#0079bf',
    authType: 'api_key',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'text', placeholder: 'Enter API key', required: true },
      { key: 'apiSecret', label: 'API Secret', type: 'password', placeholder: 'Enter API secret', required: true },
      { key: 'token', label: 'Member Token', type: 'password', placeholder: 'Enter member token', required: true },
    ],
    capabilities: ['boards', 'cards', 'lists'],
    docsUrl: 'https://developer.atlassian.com/cloud/trello/rest/api-group/',
  },
  {
    type: 'jira',
    name: 'Jira',
    description: 'Connect to Jira to manage projects, issues, sprints, and track team progress.',
    icon: '🎫',
    color: '#0052cc',
    authType: 'token',
    configFields: [
      { key: 'baseUrl', label: 'Jira Instance URL', type: 'url', placeholder: 'https://your-domain.atlassian.net', required: true },
      { key: 'email', label: 'Email', type: 'text', placeholder: 'your-email@example.com', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', placeholder: 'Enter API token', required: true },
    ],
    capabilities: ['projects', 'issues', 'sprints'],
    docsUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/',
  },
  {
    type: 'google_drive',
    name: 'Google Drive',
    description: 'Connect to Google Drive to manage files, folders, sharing permissions, and document content.',
    icon: '📁',
    color: '#4285f4',
    authType: 'oauth',
    configFields: [
      { key: 'clientId', label: 'OAuth Client ID', type: 'text', placeholder: 'Enter OAuth client ID', required: true },
      { key: 'clientSecret', label: 'OAuth Client Secret', type: 'password', placeholder: 'Enter OAuth client secret', required: true },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', placeholder: 'Enter refresh token', required: true },
    ],
    capabilities: ['files', 'folders', 'sharing'],
    docsUrl: 'https://developers.google.com/drive/api/v3/reference',
  },
  {
    type: 'webhook',
    name: 'Webhook',
    description: 'Set up a generic incoming webhook endpoint to receive data from any external service.',
    icon: '🔗',
    color: '#6366f1',
    authType: 'webhook',
    configFields: [
      { key: 'url', label: 'Webhook URL', type: 'url', placeholder: 'https://example.com/webhook', required: true },
      { key: 'secret', label: 'HMAC Secret', type: 'password', placeholder: 'Enter secret for payload verification (optional)', required: false },
      { key: 'events', label: 'Event Types', type: 'select', placeholder: 'Select event types', required: false, options: ['push', 'pull_request', 'issue', 'custom'] },
    ],
    capabilities: ['incoming_webhooks', 'event_forwarding'],
  },
  {
    type: 'custom',
    name: 'Custom',
    description: 'Create a custom API connector to integrate with any REST API or internal service.',
    icon: '🔌',
    color: '#8b5cf6',
    authType: 'api_key',
    configFields: [
      { key: 'name', label: 'Connection Name', type: 'text', placeholder: 'My Custom API', required: true },
      { key: 'baseUrl', label: 'Base URL', type: 'url', placeholder: 'https://api.example.com', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Enter API key', required: false },
      { key: 'authHeader', label: 'Auth Header Name', type: 'text', placeholder: 'Authorization', required: false },
    ],
    capabilities: ['custom_api', 'rest_requests'],
  },
]

/* ═══════════════════════════════════════════════════════════════════════
   Template Access Functions
   ═══════════════════════════════════════════════════════════════════════ */

export function getConnectorTemplates(): ConnectorTemplate[] {
  return CONNECTOR_TEMPLATES
}

export function getConnectorTemplate(type: string): ConnectorTemplate | undefined {
  return CONNECTOR_TEMPLATES.find((t) => t.type === type)
}

/* ═══════════════════════════════════════════════════════════════════════
   Connector CRUD Functions
   ═══════════════════════════════════════════════════════════════════════ */

export async function createConnector(
  userId: string,
  type: string,
  config: Record<string, string>,
) {
  const template = getConnectorTemplate(type)
  if (!template) {
    throw new Error(`Unknown connector type: ${type}`)
  }

  const connector = await db.connector.create({
    data: {
      userId,
      name: config.name || template.name,
      type: template.type,
      icon: template.icon,
      status: 'disconnected',
      config: JSON.stringify(config),
      capabilities: JSON.stringify(template.capabilities),
    },
  })

  return connector
}

export async function listUserConnectors(userId: string) {
  return db.connector.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function deleteConnector(id: string, userId: string) {
  return db.connector.deleteMany({
    where: { id, userId },
  })
}

/* ═══════════════════════════════════════════════════════════════════════
   Connection Test Function
   ═══════════════════════════════════════════════════════════════════════ */

export async function testConnector(id: string): Promise<{
  success: boolean
  message: string
}> {
  const connector = await db.connector.findUnique({ where: { id } })
  if (!connector) {
    return { success: false, message: 'Connector not found' }
  }

  const config = JSON.parse(connector.config) as Record<string, string>
  const template = getConnectorTemplate(connector.type)

  // For API key and token auth types, attempt a real API call
  if (
    (template?.authType === 'api_key' || template?.authType === 'token') &&
    connector.type !== 'custom'
  ) {
    try {
      let response: Response
      const headers: Record<string, string> = {}

      switch (connector.type) {
        case 'github': {
          headers['Authorization'] = `token ${config.token}`
          headers['Accept'] = 'application/vnd.github.v3+json'
          const baseUrl = config.baseUrl || 'https://api.github.com'
          response = await fetch(`${baseUrl}/user`, { headers, signal: AbortSignal.timeout(10000) })
          break
        }
        case 'gitlab': {
          headers['PRIVATE-TOKEN'] = config.token
          const baseUrl = config.baseUrl || 'https://gitlab.com'
          response = await fetch(`${baseUrl}/api/v4/user`, { headers, signal: AbortSignal.timeout(10000) })
          break
        }
        case 'slack': {
          headers['Authorization'] = `Bearer ${config.botToken}`
          response = await fetch('https://slack.com/api/auth.test', { headers, signal: AbortSignal.timeout(10000) })
          break
        }
        case 'discord': {
          headers['Authorization'] = `Bot ${config.botToken}`
          response = await fetch('https://discord.com/api/v10/users/@me', { headers, signal: AbortSignal.timeout(10000) })
          break
        }
        case 'notion': {
          headers['Authorization'] = `Bearer ${config.token}`
          headers['Notion-Version'] = '2022-06-28'
          response = await fetch('https://api.notion.com/v1/users/me', { headers, signal: AbortSignal.timeout(10000) })
          break
        }
        case 'trello': {
          const params = new URLSearchParams({ key: config.apiKey, token: config.token })
          response = await fetch(`https://api.trello.com/1/members/me?${params}`, { signal: AbortSignal.timeout(10000) })
          break
        }
        case 'jira': {
          const encoded = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')
          headers['Authorization'] = `Basic ${encoded}`
          response = await fetch(`${config.baseUrl}/rest/api/3/myself`, { headers, signal: AbortSignal.timeout(10000) })
          break
        }
        default: {
          // Fallback: just mark as saved
          await db.connector.update({
            where: { id },
            data: { status: 'connected', lastTestedAt: new Date() },
          })
          return { success: true, message: 'Configuration saved' }
        }
      }

      if (response.ok) {
        await db.connector.update({
          where: { id },
          data: { status: 'connected', lastTestedAt: new Date(), lastError: null },
        })
        return { success: true, message: 'Connection successful' }
      } else {
        const errorText = await response.text().catch(() => 'Unknown error')
        await db.connector.update({
          where: { id },
          data: { status: 'error', lastTestedAt: new Date(), lastError: errorText.slice(0, 500) },
        })
        return { success: false, message: `Connection failed (${response.status}): ${errorText.slice(0, 200)}` }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection test failed'
      await db.connector.update({
        where: { id },
        data: { status: 'error', lastTestedAt: new Date(), lastError: message },
      })
      return { success: false, message: `Connection error: ${message}` }
    }
  }

  // For OAuth, Webhook, and Custom types — just save and confirm
  await db.connector.update({
    where: { id },
    data: { status: 'connected', lastTestedAt: new Date(), lastError: null },
  })
  return { success: true, message: 'Configuration saved' }
}