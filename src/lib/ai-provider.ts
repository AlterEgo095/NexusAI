/* ═══════════════════════════════════════════════════════════════════════
   NexusAI Provider Abstraction Layer
   Multi-provider AI support: ZAI (default), OpenAI, Anthropic, Ollama
   ═══════════════════════════════════════════════════════════════════════ */

// ── Unified Types ──

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface VisionMessage {
  role: 'user'
  content: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>
}

export interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  thinking?: 'enabled' | 'disabled'
}

export interface ChatResponse {
  content: string
  model: string
  usage?: { promptTokens: number; completionTokens: number }
}

export interface ImageGenOptions {
  prompt: string
  size?: string
  quality?: string
  model?: string
}

export interface ImageGenResponse {
  base64: string
  revisedPrompt?: string
}

export interface TTSOptions {
  input: string
  voice?: string
  speed?: number
  responseFormat?: string
  stream?: boolean
}

export interface TTSResponse {
  arrayBuffer: ArrayBuffer
}

export interface ASRResponse {
  text: string
}

export interface WebSearchResult {
  name?: string
  snippet?: string
  url?: string
  host_name?: string
  rank?: number
  date?: string
  favicon?: string
}

export interface WebReaderResult {
  title?: string
  html?: string
  publishedTime?: string
  data?: { title?: string; html?: string; publishedTime?: string }
}

// ── Provider Interface ──

export interface AIProvider {
  readonly name: string
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>
  chatVision(messages: VisionMessage[], options?: ChatOptions): Promise<ChatResponse>
  chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string, void, unknown>
  imageGeneration(opts: ImageGenOptions): Promise<ImageGenResponse>
  tts(opts: TTSOptions): Promise<TTSResponse>
  asr(fileBase64: string): Promise<ASRResponse>
  webSearch(query: string, num?: number): Promise<WebSearchResult[]>
  webReader(url: string): Promise<WebReaderResult>
}

// ── ZAI Provider (default — uses z-ai-web-dev-sdk) ──

class ZAIProvider implements AIProvider {
  readonly name = 'zai'
  private _zai: Awaited<ReturnType<typeof import('z-ai-web-dev-sdk').default.create>> | null = null

  private async getZAI() {
    if (!this._zai) {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      this._zai = await ZAI.create()
    }
    return this._zai
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const zai = await this.getZAI()
    const sdkMessages = messages.map(m => ({ role: m.role, content: m.content }))
    const response = await zai.chat.completions.create({
      messages: sdkMessages,
      model: options?.model,
      thinking: { type: options?.thinking ?? 'disabled' },
    })
    return {
      content: response.choices?.[0]?.message?.content ?? '',
      model: response.model || 'default',
    }
  }

  async chatVision(messages: VisionMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const zai = await this.getZAI()
    const response = await zai.chat.completions.createVision({
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      thinking: { type: options?.thinking ?? 'disabled' },
    })
    return {
      content: response.choices?.[0]?.message?.content ?? '',
      model: response.model || 'default',
    }
  }

  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string, void, unknown> {
    const zai = await this.getZAI()
    const sdkMessages = messages.map(m => ({ role: m.role, content: m.content }))

    // ZAI SDK might not support native streaming, so we chunk the response
    const response = await zai.chat.completions.create({
      messages: sdkMessages,
      model: options?.model,
      thinking: { type: options?.thinking ?? 'disabled' },
    })

    const fullContent = response.choices?.[0]?.message?.content ?? ''
    // Simulate streaming by emitting word-by-word
    const words = fullContent.split(/(\s+)/)
    for (const word of words) {
      yield word
    }
  }

  async imageGeneration(opts: ImageGenOptions): Promise<ImageGenResponse> {
    const zai = await this.getZAI()
    const response = await zai.images.generations.create({
      prompt: opts.prompt,
      size: (opts.size || '1024x1024') as '1024x1024',
      quality: opts.quality as 'standard' | 'hd' | undefined,
    })
    const base64 = response.data?.[0]?.base64
    if (!base64) throw new Error('No image generated')
    return { base64, revisedPrompt: response.data?.[0]?.revised_prompt }
  }

  async tts(opts: TTSOptions): Promise<TTSResponse> {
    const zai = await this.getZAI()
    const response = await zai.audio.tts.create({
      input: opts.input,
      voice: opts.voice || 'tongtong',
      speed: opts.speed || 1.0,
      response_format: (opts.responseFormat || 'wav') as 'wav',
      stream: false,
    })
    const arrayBuffer = await response.arrayBuffer()
    return { arrayBuffer }
  }

  async asr(fileBase64: string): Promise<ASRResponse> {
    const zai = await this.getZAI()
    const response = await zai.audio.asr.create({ file_base64: fileBase64 })
    return { text: response.text || '' }
  }

  async webSearch(query: string, num = 8): Promise<WebSearchResult[]> {
    const zai = await this.getZAI()
    const results = await zai.functions.invoke('web_search', { query, num })
    if (!Array.isArray(results)) return []
    return results as WebSearchResult[]
  }

  async webReader(url: string): Promise<WebReaderResult> {
    const zai = await this.getZAI()
    const result = await zai.functions.invoke('page_reader', { url })
    return (result as WebReaderResult) || {}
  }
}

// ── OpenAI Provider (for VPS deployment with OPENAI_API_KEY) ──

class OpenAIProvider implements AIProvider {
  readonly name = 'openai'
  private _client: any | null = null

  private async getClient() {
    if (!this._client) {
      try {
        const { default: OpenAI } = await import('openai')
        this._client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      } catch {
        throw new Error('openai package is required for OpenAI provider. Install it with: bun add openai')
      }
    }
    return this._client
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const client = await this.getClient()
    const response = await client.chat.completions.create({
      model: options?.model || 'gpt-4o',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
    })
    return {
      content: response.choices?.[0]?.message?.content ?? '',
      model: response.model,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
      } : undefined,
    }
  }

  async chatVision(messages: VisionMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const client = await this.getClient()
    const response = await client.chat.completions.create({
      model: options?.model || 'gpt-4o',
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: options?.maxTokens,
    })
    return {
      content: response.choices?.[0]?.message?.content ?? '',
      model: response.model,
    }
  }

  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string, void, unknown> {
    const client = await this.getClient()
    const stream = await client.chat.completions.create({
      model: options?.model || 'gpt-4o',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      stream: true,
    })
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content
      if (delta) yield delta
    }
  }

  async imageGeneration(opts: ImageGenOptions): Promise<ImageGenResponse> {
    const client = await this.getClient()
    const response = await client.images.generate({
      model: 'dall-e-3',
      prompt: opts.prompt,
      size: (opts.size || '1024x1024') as '1024x1024',
      n: 1,
      response_format: 'b64_json',
    })
    const data = response.data?.[0]
    if (!data?.b64_json) throw new Error('No image generated')
    return { base64: data.b64_json, revisedPrompt: data.revised_prompt }
  }

  async tts(opts: TTSOptions): Promise<TTSResponse> {
    const client = await this.getClient()
    const response = await client.audio.speech.create({
      model: 'tts-1',
      voice: (opts.voice || 'alloy') as 'alloy',
      input: opts.input,
      response_format: (opts.responseFormat || 'wav') as 'wav',
    })
    return { arrayBuffer: await response.arrayBuffer() }
  }

  async asr(fileBase64: string): Promise<ASRResponse> {
    const client = await this.getClient()
    const buffer = Buffer.from(fileBase64, 'base64')
    const file = new File([buffer], 'audio.wav', { type: 'audio/wav' })
    const response = await client.audio.transcriptions.create({
      model: 'whisper-1',
      file,
    })
    return { text: response.text }
  }

  async webSearch(_query: string, _num?: number): Promise<WebSearchResult[]> {
    // OpenAI doesn't have native web search — use Tavily if available
    if (process.env.TAVILY_API_KEY) {
      try {
        const tavily = await import('tavily')
        const client = new (tavily as any).Tavily({ apiKey: process.env.TAVILY_API_KEY })
        const results = await client.search(_query, { maxResults: _num || 8 })
        return (results.results || []).map((r: any) => ({
          name: r.title,
          snippet: r.content,
          url: r.url,
        }))
      } catch {
        // Tavily not installed — fall through to error
      }
    }
    throw new Error('Web search requires TAVILY_API_KEY and tavily package for OpenAI provider')
  }

  async webReader(url: string): Promise<WebReaderResult> {
    const res = await fetch(url)
    const html = await res.text()
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is)
    return {
      title: titleMatch?.[1]?.trim() || '',
      html,
    }
  }
}

// ── Ollama Provider (free, self-hosted) ──

class OllamaProvider implements AIProvider {
  readonly name = 'ollama'
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options?.model || 'llama3',
        messages,
        stream: false,
        options: {
          temperature: options?.temperature,
          num_predict: options?.maxTokens,
        },
      }),
    })
    const data = await response.json()
    return {
      content: data.message?.content || '',
      model: data.model || 'ollama',
    }
  }

  async chatVision(messages: VisionMessage[], options?: ChatOptions): Promise<ChatResponse> {
    // Convert vision messages to Ollama format
    const ollamaMessages = messages.map(m => {
      const textPart = m.content.find(c => c.type === 'text')
      const imagePart = m.content.find(c => c.type === 'image_url')
      if (imagePart?.image_url?.url?.startsWith('data:')) {
        const base64 = imagePart.image_url.url.replace(/^data:image\/\w+;base64,/, '')
        return {
          role: m.role,
          content: textPart?.text || '',
          images: [base64],
        }
      }
      return { role: m.role, content: textPart?.text || '' }
    })
    return this.chat(ollamaMessages as ChatMessage[], options)
  }

  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string, void, unknown> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options?.model || 'llama3',
        messages,
        stream: true,
      }),
    })
    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const parsed = JSON.parse(line)
          if (parsed.message?.content) yield parsed.message.content
        } catch { /* skip malformed */ }
      }
    }
  }

  async imageGeneration(_opts: ImageGenOptions): Promise<ImageGenResponse> {
    // Use Ollama with a compatible model or fallback
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OLLAMA_IMAGE_MODEL || 'llava',
        prompt: _opts.prompt,
        stream: false,
      }),
    })
    const data = await response.json()
    // Ollama image models may not exist — throw informative error
    throw new Error('Ollama image generation requires a compatible model. Use ZAI or OpenAI provider.')
  }

  async tts(_opts: TTSOptions): Promise<TTSResponse> {
    throw new Error('TTS not available in Ollama provider. Use ZAI or OpenAI provider.')
  }

  async asr(_fileBase64: string): Promise<ASRResponse> {
    throw new Error('ASR not available in Ollama provider. Use ZAI or OpenAI provider.')
  }

  async webSearch(_query: string, _num?: number): Promise<WebSearchResult[]> {
    throw new Error('Web search not available in Ollama provider. Use ZAI or OpenAI provider.')
  }

  async webReader(url: string): Promise<WebReaderResult> {
    const res = await fetch(url)
    const html = await res.text()
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is)
    return {
      title: titleMatch?.[1]?.trim() || '',
      html,
    }
  }
}

// ── Provider Manager (singleton) ──

let _provider: AIProvider | null = null

export function getProvider(): AIProvider {
  if (_provider) return _provider

  const providerName = (process.env.AI_PROVIDER || 'zai').toLowerCase()

  switch (providerName) {
    case 'openai':
      if (!process.env.OPENAI_API_KEY) {
        console.warn('OPENAI_API_KEY not set, falling back to ZAI provider')
        _provider = new ZAIProvider()
      } else {
        _provider = new OpenAIProvider()
      }
      break
    case 'ollama':
      _provider = new OllamaProvider()
      break
    case 'zai':
    default:
      _provider = new ZAIProvider()
      break
  }

  console.log(`[NexusAI] Using AI provider: ${_provider.name}`)
  return _provider
}

export function setProvider(provider: AIProvider) {
  _provider = provider
}

// Re-export types for convenience
export type { WebSearchResult, WebReaderResult }