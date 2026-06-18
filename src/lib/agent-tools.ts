import ZAI from 'z-ai-web-dev-sdk'

/* ═══════════════════════════════════════════════════════════════════════
   NexusAI Agent Tools — 18 Scalable AI-Powered Tools
   Each tool is a self-contained unit that can be composed in workflows
   and autonomously selected by AI agents.
   ═══════════════════════════════════════════════════════════════════════ */

export const TOOL_DEFINITIONS = [
  // ── Information Retrieval ──
  { value: 'web_search', label: 'Recherche Web', description: 'Recherche des informations sur le web', category: 'search' },
  { value: 'web_reader', label: 'Lecture Web', description: 'Lit et extrait le contenu complet d\'une page web', category: 'search' },
  // ── Code & Dev ──
  { value: 'code_generation', label: 'Génération de Code', description: 'Génère du code selon les spécifications', category: 'dev' },
  { value: 'code_review', label: 'Code Review', description: 'Analyse et révise du code existant', category: 'dev' },
  // ── Content & Writing ──
  { value: 'writing', label: 'Rédaction', description: 'Rédige du contenu professionnel', category: 'content' },
  { value: 'editing', label: 'Édition', description: 'Édite et améliore du texte', category: 'content' },
  { value: 'summarization', label: 'Résumé', description: 'Résume des textes longs', category: 'content' },
  { value: 'translation', label: 'Traduction', description: 'Traduit du texte entre langues', category: 'content' },
  // ── Data & Analysis ──
  { value: 'data_analysis', label: 'Analyse de Données', description: 'Analyse des données et fournit des insights', category: 'data' },
  { value: 'visualization', label: 'Visualisation', description: 'Recommande des visualisations de données', category: 'data' },
  { value: 'sentiment_analysis', label: 'Analyse de Sentiment', description: 'Analyse le sentiment et les émotions d\'un texte', category: 'data' },
  { value: 'keyword_extraction', label: 'Extraction de Mots-clés', description: 'Extrait les mots-clés et concepts importants', category: 'data' },
  // ── Multimodal ──
  { value: 'image_generation', label: 'Génération d\'Images', description: 'Génère des images à partir de texte', category: 'multimodal' },
  { value: 'image_analysis', label: 'Analyse d\'Images', description: 'Analyse et décrit le contenu d\'images', category: 'multimodal' },
  // ── Voice ──
  { value: 'text_to_speech', label: 'Synthèse Vocale', description: 'Convertit du texte en parole audio', category: 'voice' },
  { value: 'speech_to_text', label: 'Transcription Audio', description: 'Transcrit l\'audio en texte', category: 'voice' },
  // ── Productivity ──
  { value: 'email_composer', label: 'Rédaction Email', description: 'Compose des emails professionnels', category: 'productivity' },
  { value: 'math_evaluation', label: 'Évaluation Mathématique', description: 'Résout des problèmes mathématiques', category: 'productivity' },
] as const

export type ToolName = typeof TOOL_DEFINITIONS[number]['value']
export type ToolCategory = typeof TOOL_DEFINITIONS[number]['category']

export interface ToolResult {
  tool: ToolName
  success: boolean
  data: string
  durationMs: number
}

export interface ToolCategoryInfo {
  label: string
  color: string
  icon: string
}

export const TOOL_CATEGORIES: Record<ToolCategory, ToolCategoryInfo> = {
  search: { label: 'Recherche', color: 'text-chart-2', icon: '🔍' },
  dev: { label: 'Développement', color: 'text-primary', icon: '💻' },
  content: { label: 'Contenu', color: 'text-chart-3', icon: '✍️' },
  data: { label: 'Données', color: 'text-chart-5', icon: '📊' },
  multimodal: { label: 'Multimodal', color: 'text-chart-4', icon: '🎨' },
  voice: { label: 'Voix', color: 'text-amber-500', icon: '🎙️' },
  productivity: { label: 'Productivité', color: 'text-emerald-500', icon: '⚡' },
}

/* ── SDK Singleton ── */
let _zai: Awaited<ReturnType<typeof ZAI.create>> | null = null
async function getZAI() {
  if (!_zai) _zai = await ZAI.create()
  return _zai
}

/* ═══════════════════════════════════════════════════════════════════════
   Tool Implementations
   ═══════════════════════════════════════════════════════════════════════ */

// ── 1. Web Search ──
async function toolWebSearch(query: string): Promise<string> {
  const zai = await getZAI()
  const results = await zai.functions.invoke('web_search', { query, num: 8 })
  if (!Array.isArray(results) || results.length === 0) {
    return `Aucun résultat trouvé pour "${query}".`
  }
  return results.map((r: { name?: string; snippet?: string; url?: string }, i: number) =>
    `[${i + 1}] ${r.name || 'Sans titre'}\n    ${r.snippet || ''}\n    URL: ${r.url || ''}`
  ).join('\n\n')
}

// ── 2. Web Reader (REAL page_reader SDK function) ──
async function toolWebReader(urlOrQuery: string): Promise<string> {
  const zai = await getZAI()
  // Detect if input is a URL
  const urlPattern = /^https?:\/\//
  let url = urlOrQuery.trim()

  if (!urlPattern.test(url)) {
    // Try to search first, then read the top result
    const searchResults = await zai.functions.invoke('web_search', { query: urlOrQuery, num: 1 })
    if (Array.isArray(searchResults) && searchResults.length > 0 && searchResults[0].url) {
      url = searchResults[0].url
    } else {
      return `Aucune URL trouvée pour "${urlOrQuery}". Essayez de fournir une URL directe (https://...).`
    }
  }

  const result = await zai.functions.invoke('page_reader', { url })
  if (result?.data) {
    const title = result.data.title || 'Sans titre'
    const html = result.data.html || ''
    // Strip HTML tags for clean text
    const plainText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const published = result.data.publishedTime ? `\nPublié: ${result.data.publishedTime}` : ''
    return `[${title}]${published}\n\n${plainText.substring(0, 4000)}`
  }
  return `Impossible de lire le contenu de ${url}`
}

// ── 3. Code Generation ──
async function toolCodeGeneration(spec: string): Promise<string> {
  const zai = await getZAI()
  const response = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are an expert programmer. Generate clean, well-commented, production-ready code based on the specifications. Always include imports and make the code complete and runnable.' },
      { role: 'user', content: spec },
    ],
    thinking: { type: 'disabled' },
  })
  return response.choices?.[0]?.message?.content || 'Erreur de génération de code.'
}

// ── 4. Code Review ──
async function toolCodeReview(code: string): Promise<string> {
  const zai = await getZAI()
  const response = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are a senior code reviewer. Analyze the code for bugs, performance issues, security vulnerabilities, and best practices. Provide specific, actionable feedback with line references. Rate severity: 🔴 Critical, 🟡 Warning, 🟢 Suggestion.' },
      { role: 'user', content: `Review this code:\n\n${code}` },
    ],
    thinking: { type: 'disabled' },
  })
  return response.choices?.[0]?.message?.content || 'Erreur de review.'
}

// ── 5. Writing ──
async function toolWriting(task: string): Promise<string> {
  const zai = await getZAI()
  const response = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are a professional content writer. Create well-structured, engaging content that is clear, concise, and tailored to the audience. Use markdown formatting with proper headings, lists, and emphasis.' },
      { role: 'user', content: task },
    ],
    thinking: { type: 'disabled' },
  })
  return response.choices?.[0]?.message?.content || 'Erreur de rédaction.'
}

// ── 6. Editing ──
async function toolEditing(text: string): Promise<string> {
  const zai = await getZAI()
  const response = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are a professional editor. Improve the given text for clarity, grammar, style, and impact. Return only the improved version with a brief summary of changes made. Respond in the same language as the input.' },
      { role: 'user', content: `Edit and improve this text:\n\n${text}` },
    ],
    thinking: { type: 'disabled' },
  })
  return response.choices?.[0]?.message?.content || 'Erreur d\'édition.'
}

// ── 7. Summarization ──
async function toolSummarization(text: string): Promise<string> {
  const zai = await getZAI()
  const response = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are an expert summarizer. Provide a clear, concise summary. Use bullet points for key takeaways. Keep it under 200 words unless the source is very long. Respond in the same language as the input.' },
      { role: 'user', content: `Résume ce texte:\n\n${text}` },
    ],
    thinking: { type: 'disabled' },
  })
  return response.choices?.[0]?.message?.content || 'Erreur de résumé.'
}

// ── 8. Translation ──
async function toolTranslation(input: string): Promise<string> {
  const zai = await getZAI()
  const response = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `You are a professional translator. Detect the source language and translate to the target language specified by the user. If no target language is specified, translate to French. Preserve formatting (markdown, lists, code blocks). Return ONLY the translated text, no explanations.`,
      },
      { role: 'user', content: input },
    ],
    thinking: { type: 'disabled' },
  })
  return response.choices?.[0]?.message?.content || 'Erreur de traduction.'
}

// ── 9. Data Analysis ──
async function toolDataAnalysis(data: string): Promise<string> {
  const zai = await getZAI()
  const response = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are a data analyst expert. Analyze the provided data, identify patterns, trends, and outliers. Provide actionable insights with specific numbers. Structure your response with clear sections: Overview, Key Findings, Trends, Recommendations.' },
      { role: 'user', content: data },
    ],
    thinking: { type: 'disabled' },
  })
  return response.choices?.[0]?.message?.content || 'Erreur d\'analyse.'
}

// ── 10. Visualization ──
async function toolVisualization(data: string): Promise<string> {
  const zai = await getZAI()
  const response = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are a data visualization expert. Based on the data provided, recommend specific chart types (bar, line, pie, scatter, heatmap, etc.) with color schemes, and describe what each visualization would show. Be specific about axes, labels, and insights. Format as a structured recommendation.' },
      { role: 'user', content: data },
    ],
    thinking: { type: 'disabled' },
  })
  return response.choices?.[0]?.message?.content || 'Erreur de visualisation.'
}

// ── 11. Sentiment Analysis ──
async function toolSentimentAnalysis(text: string): Promise<string> {
  const zai = await getZAI()
  const response = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `You are a sentiment analysis expert. Analyze the sentiment and emotions of the text. Provide your analysis in this exact JSON format (no markdown, no code fences):
{"sentiment": "positive|negative|neutral|mixed", "confidence": 0.0-1.0, "emotions": [{"name": "emotion", "score": 0.0-1.0}], "summary": "Brief explanation in French", "key_phrases": ["phrase1", "phrase2"]}`,
      },
      { role: 'user', content: `Analyse ce texte:\n\n${text}` },
    ],
    thinking: { type: 'disabled' },
  })
  return response.choices?.[0]?.message?.content || '{"sentiment": "neutral", "confidence": 0.5, "emotions": [], "summary": "Analyse impossible"}'
}

// ── 12. Keyword Extraction ──
async function toolKeywordExtraction(text: string): Promise<string> {
  const zai = await getZAI()
  const response = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `You are an NLP expert. Extract the most important keywords, topics, and entities from the text. Return in this exact JSON format (no markdown, no code fences):
{"keywords": [{"term": "keyword", "relevance": 0.0-1.0, "category": "person|org|location|concept|technology|event|other"}], "topics": ["topic1", "topic2"], "entities": [{"name": "entity", "type": "type"}, ...], "language": "detected_language"}`,
      },
      { role: 'user', content: `Extrais les mots-clés de:\n\n${text}` },
    ],
    thinking: { type: 'disabled' },
  })
  return response.choices?.[0]?.message?.content || '{"keywords": [], "topics": [], "entities": []}'
}

// ── 13. Image Generation ──
async function toolImageGeneration(prompt: string): Promise<string> {
  const zai = await getZAI()
  const response = await zai.images.generations.create({ prompt, size: '1024x1024' })
  const base64 = response.data?.[0]?.base64
  return base64 ? `Image générée avec succès (base64 length: ${base64.length})` : 'Erreur de génération d\'image.'
}

// ── 14. Image Analysis (VLM) ──
async function toolImageAnalysis(input: string): Promise<string> {
  const zai = await getZAI()
  // Input can be a URL or a description like "analyze this image: <base64 or url>"
  let imageUrl = input.trim()
  let question = 'Describe this image in detail, including objects, text, colors, layout, and any notable elements.'

  // If input contains "analyze" or has specific question pattern
  const questionMatch = input.match(/^(.+?)\s*(?:image|photo|picture)[:\s]+(https?:\/\/\S+|data:image\/\S+)/i)
  if (questionMatch) {
    question = questionMatch[1]
    imageUrl = questionMatch[2]
  }

  if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
    return 'Veuillez fournir une URL d\'image valide (https://...) ou une image en base64 (data:image/...).'
  }

  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: question },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  })
  return response.choices?.[0]?.message?.content || 'Erreur d\'analyse d\'image.'
}

// ── 15. Text-to-Speech ──
async function toolTextToSpeech(text: string): Promise<string> {
  const zai = await getZAI()
  // TTS has 1024 char limit — chunk if needed
  const maxChunk = 1000
  const chunks: string[] = []
  if (text.length <= maxChunk) {
    chunks.push(text)
  } else {
    // Split on sentence boundaries
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
    let current = ''
    for (const sentence of sentences) {
      if ((current + sentence).length <= maxChunk) {
        current += sentence
      } else {
        if (current) chunks.push(current.trim())
        current = sentence
      }
    }
    if (current) chunks.push(current.trim())
  }

  // Generate audio for first chunk (tool result is text, audio is served via API)
  const response = await zai.audio.tts.create({
    input: chunks[0],
    voice: 'tongtong',
    speed: 1.0,
    response_format: 'wav',
    stream: false,
  })
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(new Uint8Array(arrayBuffer))
  const totalChars = chunks.reduce((sum, c) => sum + c.length, 0)
  return `Audio généré avec succès. ${chunks.length} segment(s), ${totalChars} caractères traités, taille audio: ${buffer.length} octets.${chunks.length > 1 ? ` (${chunks.length - 1} segment(s) supplémentaires disponibles via l'API TTS)` : ''}`
}

// ── 16. Speech-to-Text ──
async function toolSpeechToText(input: string): Promise<string> {
  const zai = await getZAI()
  // Input should be base64 encoded audio
  let base64Audio = input.trim()

  // If input is a file path, it would need to be read server-side
  // For agent context, assume base64 is provided
  if (!base64Audio || base64Audio.length < 100) {
    return 'Veuillez fournir de l\'audio en base64 pour la transcription. Utilisez l\'API /api/asr pour uploader un fichier audio.'
  }

  const response = await zai.audio.asr.create({ file_base64: base64Audio })
  return response.text || 'Aucune transcription obtenue.'
}

// ── 17. Email Composer ──
async function toolEmailComposer(input: string): Promise<string> {
  const zai = await getZAI()
  const response = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `You are a professional email writer. Compose a well-structured, polite, and effective email based on the request. Include:
- Subject line (Objet:)
- Appropriate greeting
- Well-organized body paragraphs
- Professional closing
- Signature placeholder

Respond in the same language as the request. Use markdown formatting.`,
      },
      { role: 'user', content: input },
    ],
    thinking: { type: 'disabled' },
  })
  return response.choices?.[0]?.message?.content || 'Erreur de composition d\'email.'
}

// ── 18. Math Evaluation ──
async function toolMathEvaluation(input: string): Promise<string> {
  const zai = await getZAI()
  const response = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `You are a mathematical expert. Solve the given problem step by step. Show all work clearly. For numerical answers, provide the exact value and a decimal approximation when applicable. Use LaTeX formatting for mathematical expressions. Structure your response with:
1. Problem understanding
2. Step-by-step solution
3. Final answer (clearly highlighted)
4. Verification (when possible)`,
      },
      { role: 'user', content: input },
    ],
    thinking: { type: 'disabled' },
  })
  return response.choices?.[0]?.message?.content || 'Erreur d\'évaluation mathématique.'
}

/* ═══════════════════════════════════════════════════════════════════════
   Tool Executor — Master dispatch
   ═══════════════════════════════════════════════════════════════════════ */

const TOOL_MAP: Record<ToolName, (input: string) => Promise<string>> = {
  web_search: toolWebSearch,
  web_reader: toolWebReader,
  code_generation: toolCodeGeneration,
  code_review: toolCodeReview,
  writing: toolWriting,
  editing: toolEditing,
  summarization: toolSummarization,
  translation: toolTranslation,
  data_analysis: toolDataAnalysis,
  visualization: toolVisualization,
  sentiment_analysis: toolSentimentAnalysis,
  keyword_extraction: toolKeywordExtraction,
  image_generation: toolImageGeneration,
  image_analysis: toolImageAnalysis,
  text_to_speech: toolTextToSpeech,
  speech_to_text: toolSpeechToText,
  email_composer: toolEmailComposer,
  math_evaluation: toolMathEvaluation,
}

export async function executeTool(toolName: ToolName, input: string): Promise<ToolResult> {
  const start = Date.now()
  try {
    const handler = TOOL_MAP[toolName]
    if (!handler) {
      return { tool: toolName, success: false, data: `Outil inconnu: ${toolName}`, durationMs: Date.now() - start }
    }
    const data = await handler(input)
    return { tool: toolName, success: true, data, durationMs: Date.now() - start }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    return { tool: toolName, success: false, data: msg, durationMs: Date.now() - start }
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   Autonomous Agent Execution — AI-driven tool selection & multi-step reasoning
   ═══════════════════════════════════════════════════════════════════════ */

const TOOL_SELECTION_PROMPT = `You are a tool-selection AI. Given the user message and available tools, decide which tools to use and in what order. Return ONLY a JSON array of tool names to execute, in order. Return an empty array [] if no tools are needed (just answer directly).

Available tools:
- web_search: Use when user asks about current info, facts, news, or needs web data
- web_reader: Use when you have a URL to read or need full article content
- code_generation: Use when user asks to write/generate code
- code_review: Use when user provides code to review/analyze
- writing: Use when user asks to create content, articles, stories, social media posts
- editing: Use when user asks to improve/edit/proofread existing text
- summarization: Use when user asks to summarize or condense text
- translation: Use when user asks to translate text between languages
- data_analysis: Use when user provides data to analyze or asks for insights
- visualization: Use when user asks about charts or data visualization recommendations
- sentiment_analysis: Use when user asks about sentiment, emotions, or tone of text
- keyword_extraction: Use when user asks to extract keywords, topics, or entities from text
- image_generation: Use when user asks to create/generate images
- image_analysis: Use when user provides an image to analyze or asks about visual content
- text_to_speech: Use when user asks to convert text to speech/audio
- speech_to_text: Use when user provides audio to transcribe
- email_composer: Use when user asks to write an email or professional message
- math_evaluation: Use when user asks math questions or needs calculations

Rules:
- Select at most 3 tools per request
- Choose the minimum tools needed to answer
- Use web_search BEFORE web_reader when you need to find a URL first
- Use keyword_extraction BEFORE summarization when processing unknown text
- Use sentiment_analysis when analyzing reviews, feedback, or opinions`

export async function executeAgentAutonomously(
  systemPrompt: string,
  userMessage: string,
  tools: ToolName[]
): Promise<{ content: string; toolResults: ToolResult[] }> {
  const zai = await getZAI()
  const toolResults: ToolResult[] = []

  // Step 1: Decide which tools to use
  let toolPlan: ToolName[] = []
  if (tools.length > 0) {
    try {
      const planResponse = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: TOOL_SELECTION_PROMPT },
          { role: 'user', content: `Available tools for this agent: ${tools.join(', ')}\n\nUser message: ${userMessage}` },
        ],
        thinking: { type: 'disabled' },
      })
      const planText = planResponse.choices?.[0]?.message?.content || '[]'
      const match = planText.match(/\[[\s\S]*?\]/)
      if (match) {
        toolPlan = JSON.parse(match[0]).filter((t: string) => tools.includes(t as ToolName))
      }
    } catch {
      toolPlan = []
    }
  }

  // Step 2: Execute selected tools
  const toolOutputs: string[] = []
  for (const tool of toolPlan.slice(0, 3)) {
    const result = await executeTool(tool, userMessage)
    toolResults.push(result)
    if (result.success) {
      toolOutputs.push(`[Résultat ${tool}]:\n${result.data}`)
    }
  }

  // Step 3: Generate final response with tool context
  const contextMessage = toolOutputs.length > 0
    ? `\n\n---\nRésultats des outils exécutés:\n${toolOutputs.join('\n\n')}\n---\n`
    : ''

  const finalResponse = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt + '\n\nQuand tu utilises des outils, intègre leurs résultats naturellement dans ta réponse. Réponds en français.' },
      { role: 'user', content: userMessage + contextMessage },
    ],
    thinking: { type: 'disabled' },
  })

  return {
    content: finalResponse.choices?.[0]?.message?.content || 'Erreur de génération.',
    toolResults,
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   Utility: TTS chunking helper (for API route use)
   ═══════════════════════════════════════════════════════════════════════ */

export function splitTextForTTS(text: string, maxLength = 1000): string[] {
  if (text.length <= maxLength) return [text]
  const chunks: string[] = []
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  let current = ''
  for (const sentence of sentences) {
    if ((current + sentence).length <= maxLength) {
      current += sentence
    } else {
      if (current) chunks.push(current.trim())
      current = sentence
    }
  }
  if (current) chunks.push(current.trim())
  return chunks
}

export const TTS_VOICES = [
  { value: 'tongtong', label: 'Tongtong', description: 'Chaleureux et amical' },
  { value: 'chuichui', label: 'Chuichui', description: 'Vif et mignon' },
  { value: 'xiaochen', label: 'Xiaochen', description: 'Professionnel et stable' },
  { value: 'jam', label: 'Jam', description: 'Gentleman britannique' },
  { value: 'kazi', label: 'Kazi', description: 'Clair et standard' },
  { value: 'douji', label: 'Douji', description: 'Naturel et fluide' },
  { value: 'luodo', label: 'Luodo', description: 'Expressif et captivant' },
] as const

export type TTSVoice = typeof TTS_VOICES[number]['value']