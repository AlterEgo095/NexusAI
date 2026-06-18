import { getProvider, type ChatMessage, type AIProvider } from './ai-provider'

/* ═══════════════════════════════════════════════════════════════════════
   NexusAI Agent Tools — 18 Scalable AI-Powered Tools
   Each tool is a self-contained unit that can be composed in workflows
   and autonomously selected by AI agents via ReAct loop.
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

/* ═══════════════════════════════════════════════════════════════════════
   Tool Implementations — All use getProvider() for multi-provider support
   ═══════════════════════════════════════════════════════════════════════ */

// ── 1. Web Search ──
async function toolWebSearch(query: string): Promise<string> {
  const provider = getProvider()
  const results = await provider.webSearch(query, 8)
  if (results.length === 0) {
    return `Aucun résultat trouvé pour "${query}".`
  }
  return results.map((r, i) =>
    `[${i + 1}] ${r.name || 'Sans titre'}\n    ${r.snippet || ''}\n    URL: ${r.url || ''}`
  ).join('\n\n')
}

// ── 2. Web Reader ──
async function toolWebReader(urlOrQuery: string): Promise<string> {
  const provider = getProvider()
  const urlPattern = /^https?:\/\//
  let url = urlOrQuery.trim()

  if (!urlPattern.test(url)) {
    const searchResults = await provider.webSearch(urlOrQuery, 1)
    if (searchResults.length > 0 && searchResults[0].url) {
      url = searchResults[0].url
    } else {
      return `Aucune URL trouvée pour "${urlOrQuery}". Essayez de fournir une URL directe (https://...).`
    }
  }

  const result = await provider.webReader(url)
  const title = result.title || 'Sans titre'
  const html = result.html || ''
  const plainText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const published = result.publishedTime ? `\nPublié: ${result.publishedTime}` : ''
  return `[${title}]${published}\n\n${plainText.substring(0, 4000)}`
}

// ── 3. Code Generation ──
async function toolCodeGeneration(spec: string): Promise<string> {
  const provider = getProvider()
  const response = await provider.chat([
    { role: 'system', content: 'You are an expert programmer. Generate clean, well-commented, production-ready code based on the specifications. Always include imports and make the code complete and runnable.' },
    { role: 'user', content: spec },
  ])
  return response.content || 'Erreur de génération de code.'
}

// ── 4. Code Review ──
async function toolCodeReview(code: string): Promise<string> {
  const provider = getProvider()
  const response = await provider.chat([
    { role: 'system', content: 'You are a senior code reviewer. Analyze the code for bugs, performance issues, security vulnerabilities, and best practices. Provide specific, actionable feedback with line references. Rate severity: 🔴 Critical, 🟡 Warning, 🟢 Suggestion.' },
    { role: 'user', content: `Review this code:\n\n${code}` },
  ])
  return response.content || 'Erreur de review.'
}

// ── 5. Writing ──
async function toolWriting(task: string): Promise<string> {
  const provider = getProvider()
  const response = await provider.chat([
    { role: 'system', content: 'You are a professional content writer. Create well-structured, engaging content that is clear, concise, and tailored to the audience. Use markdown formatting with proper headings, lists, and emphasis.' },
    { role: 'user', content: task },
  ])
  return response.content || 'Erreur de rédaction.'
}

// ── 6. Editing ──
async function toolEditing(text: string): Promise<string> {
  const provider = getProvider()
  const response = await provider.chat([
    { role: 'system', content: 'You are a professional editor. Improve the given text for clarity, grammar, style, and impact. Return only the improved version with a brief summary of changes made. Respond in the same language as the input.' },
    { role: 'user', content: `Edit and improve this text:\n\n${text}` },
  ])
  return response.content || 'Erreur d\'édition.'
}

// ── 7. Summarization ──
async function toolSummarization(text: string): Promise<string> {
  const provider = getProvider()
  const response = await provider.chat([
    { role: 'system', content: 'You are an expert summarizer. Provide a clear, concise summary. Use bullet points for key takeaways. Keep it under 200 words unless the source is very long. Respond in the same language as the input.' },
    { role: 'user', content: `Résume ce texte:\n\n${text}` },
  ])
  return response.content || 'Erreur de résumé.'
}

// ── 8. Translation ──
async function toolTranslation(input: string): Promise<string> {
  const provider = getProvider()
  const response = await provider.chat([
    { role: 'system', content: 'You are a professional translator. Detect the source language and translate to the target language specified by the user. If no target language is specified, translate to French. Preserve formatting (markdown, lists, code blocks). Return ONLY the translated text, no explanations.' },
    { role: 'user', content: input },
  ])
  return response.content || 'Erreur de traduction.'
}

// ── 9. Data Analysis ──
async function toolDataAnalysis(data: string): Promise<string> {
  const provider = getProvider()
  const response = await provider.chat([
    { role: 'system', content: 'You are a data analyst expert. Analyze the provided data, identify patterns, trends, and outliers. Provide actionable insights with specific numbers. Structure your response with clear sections: Overview, Key Findings, Trends, Recommendations.' },
    { role: 'user', content: data },
  ])
  return response.content || 'Erreur d\'analyse.'
}

// ── 10. Visualization ──
async function toolVisualization(data: string): Promise<string> {
  const provider = getProvider()
  const response = await provider.chat([
    { role: 'system', content: 'You are a data visualization expert. Based on the data provided, recommend specific chart types (bar, line, pie, scatter, heatmap, etc.) with color schemes, and describe what each visualization would show. Be specific about axes, labels, and insights. Format as a structured recommendation.' },
    { role: 'user', content: data },
  ])
  return response.content || 'Erreur de visualisation.'
}

// ── 11. Sentiment Analysis ──
async function toolSentimentAnalysis(text: string): Promise<string> {
  const provider = getProvider()
  const response = await provider.chat([
    { role: 'system', content: `You are a sentiment analysis expert. Analyze the sentiment and emotions of the text. Provide your analysis in this exact JSON format (no markdown, no code fences):
{"sentiment": "positive|negative|neutral|mixed", "confidence": 0.0-1.0, "emotions": [{"name": "emotion", "score": 0.0-1.0}], "summary": "Brief explanation in French", "key_phrases": ["phrase1", "phrase2"]}` },
    { role: 'user', content: `Analyse ce texte:\n\n${text}` },
  ])
  return response.content || '{"sentiment": "neutral", "confidence": 0.5, "emotions": [], "summary": "Analyse impossible"}'
}

// ── 12. Keyword Extraction ──
async function toolKeywordExtraction(text: string): Promise<string> {
  const provider = getProvider()
  const response = await provider.chat([
    { role: 'system', content: `You are an NLP expert. Extract the most important keywords, topics, and entities from the text. Return in this exact JSON format (no markdown, no code fences):
{"keywords": [{"term": "keyword", "relevance": 0.0-1.0, "category": "person|org|location|concept|technology|event|other"}], "topics": ["topic1", "topic2"], "entities": [{"name": "entity", "type": "type"}, ...], "language": "detected_language"}` },
    { role: 'user', content: `Extrais les mots-clés de:\n\n${text}` },
  ])
  return response.content || '{"keywords": [], "topics": [], "entities": []}'
}

// ── 13. Image Generation ──
async function toolImageGeneration(prompt: string): Promise<string> {
  const provider = getProvider()
  const result = await provider.imageGeneration({ prompt, size: '1024x1024' })
  return `Image générée avec succès (base64 length: ${result.base64.length})`
}

// ── 14. Image Analysis (VLM) ──
async function toolImageAnalysis(input: string): Promise<string> {
  const provider = getProvider()
  let imageUrl = input.trim()
  let question = 'Describe this image in detail, including objects, text, colors, layout, and any notable elements.'

  const questionMatch = input.match(/^(.+?)\s*(?:image|photo|picture)[:\s]+(https?:\/\/\S+|data:image\/\S+)/i)
  if (questionMatch) {
    question = questionMatch[1]
    imageUrl = questionMatch[2]
  }

  if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
    return 'Veuillez fournir une URL d\'image valide (https://...) ou une image en base64 (data:image/...).'
  }

  const response = await provider.chatVision([
    {
      role: 'user',
      content: [
        { type: 'text', text: question },
        { type: 'image_url', image_url: { url: imageUrl } },
      ],
    },
  ])
  return response.content || 'Erreur d\'analyse d\'image.'
}

// ── 15. Text-to-Speech ──
async function toolTextToSpeech(text: string): Promise<string> {
  const provider = getProvider()
  const maxChunk = 1000
  const chunks: string[] = []
  if (text.length <= maxChunk) {
    chunks.push(text)
  } else {
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

  const response = await provider.tts({
    input: chunks[0],
    voice: 'tongtong',
    speed: 1.0,
    responseFormat: 'wav',
  })
  const buffer = Buffer.from(new Uint8Array(await response.arrayBuffer))
  const totalChars = chunks.reduce((sum, c) => sum + c.length, 0)
  return `Audio généré avec succès. ${chunks.length} segment(s), ${totalChars} caractères traités, taille audio: ${buffer.length} octets.${chunks.length > 1 ? ` (${chunks.length - 1} segment(s) supplémentaires disponibles via l'API TTS)` : ''}`
}

// ── 16. Speech-to-Text ──
async function toolSpeechToText(input: string): Promise<string> {
  const provider = getProvider()
  if (!input || input.length < 100) {
    return 'Veuillez fournir de l\'audio en base64 pour la transcription. Utilisez l\'API /api/asr pour uploader un fichier audio.'
  }
  const response = await provider.asr(input)
  return response.text || 'Aucune transcription obtenue.'
}

// ── 17. Email Composer ──
async function toolEmailComposer(input: string): Promise<string> {
  const provider = getProvider()
  const response = await provider.chat([
    { role: 'system', content: `You are a professional email writer. Compose a well-structured, polite, and effective email based on the request. Include:
- Subject line (Objet:)
- Appropriate greeting
- Well-organized body paragraphs
- Professional closing
- Signature placeholder

Respond in the same language as the request. Use markdown formatting.` },
    { role: 'user', content: input },
  ])
  return response.content || 'Erreur de composition d\'email.'
}

// ── 18. Math Evaluation ──
async function toolMathEvaluation(input: string): Promise<string> {
  const provider = getProvider()
  const response = await provider.chat([
    { role: 'system', content: `You are a mathematical expert. Solve the given problem step by step. Show all work clearly. For numerical answers, provide the exact value and a decimal approximation when applicable. Use LaTeX formatting for mathematical expressions. Structure your response with:
1. Problem understanding
2. Step-by-step solution
3. Final answer (clearly highlighted)
4. Verification (when possible)` },
    { role: 'user', content: input },
  ])
  return response.content || 'Erreur d\'évaluation mathématique.'
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
   ReAct Agent — True iterative reasoning + action loop
   
   Pattern: Think → Act → Observe → Think → Act → ... → Final Answer
   The agent reasons about which tools to use, executes them, observes
   the results, and decides whether to continue or provide the final answer.
   Max 5 reasoning iterations to prevent infinite loops.
   ═══════════════════════════════════════════════════════════════════════ */

const MAX_REACT_ITERATIONS = 5

const REACT_SYSTEM_PROMPT = `You are an advanced AI agent with access to tools. You MUST use the following JSON format for EVERY response:

{"thought": "Your reasoning about what to do next", "tool": "tool_name_or_null", "tool_input": "input_for_tool_or_empty", "final_answer": "your_final_answer_or_empty"}

Rules:
- If you need to use a tool, set "tool" to the tool name and "tool_input" to the input, leave "final_answer" empty.
- If you have enough information to answer, set "final_answer" to your complete answer, leave "tool" and "tool_input" empty/null.
- You can use up to ${MAX_REACT_ITERATIONS} tool calls in a chain. Think carefully about efficiency.
- Always think before acting. Explain your reasoning in the "thought" field.
- When using web_search before web_reader, do it in one step: search first, then use the URL found.
- Respond in the same language as the user's message.`

interface ReActStep {
  thought: string
  tool: string | null
  toolInput: string
  finalAnswer: string
}

function parseReActResponse(text: string): ReActStep {
  // Try to extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return { thought: '', tool: null, toolInput: '', finalAnswer: text }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    return {
      thought: String(parsed.thought || ''),
      tool: parsed.tool ? String(parsed.tool) : null,
      toolInput: String(parsed.tool_input || parsed.toolInput || ''),
      finalAnswer: String(parsed.final_answer || parsed.finalAnswer || ''),
    }
  } catch {
    return { thought: '', tool: null, toolInput: '', finalAnswer: text }
  }
}

export interface ReActResult {
  content: string
  toolResults: ToolResult[]
  iterations: number
  steps: Array<{ thought: string; tool: string | null; result: string }>
}

export async function executeAgentAutonomously(
  systemPrompt: string,
  userMessage: string,
  tools: ToolName[],
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<ReActResult> {
  const provider = getProvider()
  const toolResults: ToolResult[] = []
  const steps: Array<{ thought: string; tool: string | null; result: string }> = []

  // Build the conversation context
  const messages: ChatMessage[] = [
    { role: 'system', content: REACT_SYSTEM_PROMPT + '\n\n' + systemPrompt + '\n\nQuand tu utilises des outils, intègre leurs résultats naturellement dans ta réponse finale. Réponds en français.' },
  ]

  // Add conversation history (last 6 messages for context window)
  const recentHistory = conversationHistory.slice(-6)
  for (const msg of recentHistory) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({ role: msg.role, content: msg.content })
    }
  }

  // Add current user message
  messages.push({ role: 'user', content: userMessage })

  // Build tool descriptions for the system
  const toolDescriptions = tools.length > 0
    ? `\n\nAvailable tools: ${tools.join(', ')}\nTool details:\n${tools.map(t => {
        const def = TOOL_DEFINITIONS.find(d => d.value === t)
        return `- ${t}: ${def?.description || 'No description'}`
      }).join('\n')}`
    : ''

  if (toolDescriptions) {
    messages[0] = { ...messages[0], content: messages[0].content + toolDescriptions }
  }

  // ── ReAct Loop ──
  for (let iteration = 0; iteration < MAX_REACT_ITERATIONS; iteration++) {
    const response = await provider.chat(messages)
    const parsed = parseReActResponse(response.content)

    // If we have a final answer, we're done
    if (parsed.finalAnswer && !parsed.tool) {
      steps.push({ thought: parsed.thought, tool: null, result: parsed.finalAnswer })
      return {
        content: parsed.finalAnswer,
        toolResults,
        iterations: iteration + 1,
        steps,
      }
    }

    // If a tool was selected, execute it
    if (parsed.tool && tools.includes(parsed.tool as ToolName)) {
      steps.push({ thought: parsed.thought, tool: parsed.tool, result: 'Executing...' })

      const toolResult = await executeTool(parsed.tool as ToolName, parsed.toolInput || userMessage)
      toolResults.push(toolResult)

      const observation = toolResult.success
        ? `[Result of ${parsed.tool}]:\n${toolResult.data}`
        : `[Error in ${parsed.tool}]: ${toolResult.data}`

      steps[steps.length - 1].result = observation

      // Add assistant response and observation to conversation
      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: `OBSERVATION:\n${observation}\n\nNow continue. Think about what to do next. If you have enough information, provide your final_answer. Otherwise, use another tool. Remember: respond ONLY with JSON.` })

      continue
    }

    // No tool, no final answer — treat the response as the final answer
    steps.push({ thought: parsed.thought, tool: null, result: response.content })
    return {
      content: response.content,
      toolResults,
      iterations: iteration + 1,
      steps,
    }
  }

  // Max iterations reached — generate a final synthesis
  const toolSummary = toolResults.map(r => `[${r.tool}]: ${r.data.substring(0, 300)}`).join('\n\n')

  const synthesisResponse = await provider.chat([
    { role: 'system', content: systemPrompt + '\n\nTu as utilisé plusieurs outils pour répondre. Synthétise les résultats en une réponse claire et complète en français.' },
    { role: 'user', content: `Question originale: ${userMessage}\n\nRésultats des outils:\n${toolSummary}` },
  ])

  return {
    content: synthesisResponse.content,
    toolResults,
    iterations: MAX_REACT_ITERATIONS,
    steps,
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   Utility: TTS chunking helper
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