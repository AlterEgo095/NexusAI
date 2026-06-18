import ZAI from 'z-ai-web-dev-sdk'

export const TOOL_DEFINITIONS = [
  { value: 'web_search', label: 'Recherche Web', description: 'Recherche des informations sur le web' },
  { value: 'web_reader', label: 'Lecture Web', description: 'Lit et extrait le contenu d\'une page web' },
  { value: 'code_generation', label: 'Génération de Code', description: 'Génère du code selon les spécifications' },
  { value: 'code_review', label: 'Code Review', description: 'Analyse et révise du code existant' },
  { value: 'writing', label: 'Rédaction', description: 'Rédige du contenu professionnel' },
  { value: 'editing', label: 'Édition', description: 'Édite et améliore du texte' },
  { value: 'data_analysis', label: 'Analyse de Données', description: 'Analyse des données et fournit des insights' },
  { value: 'visualization', label: 'Visualisation', description: 'Crée des descriptions de visualisations de données' },
  { value: 'image_generation', label: 'Génération d\'Images', description: 'Génère des images à partir de texte' },
  { value: 'summarization', label: 'Résumé', description: 'Résume des textes longs' },
] as const

export type ToolName = typeof TOOL_DEFINITIONS[number]['value']

interface ToolResult {
  tool: ToolName
  success: boolean
  data: string
  durationMs: number
}

async function createZAI() {
  return await ZAI.create()
}

async function toolWebSearch(query: string): Promise<string> {
  const zai = await createZAI()
  const results = await zai.functions.invoke('web_search', { query, num: 5 })
  if (!Array.isArray(results) || results.length === 0) {
    return `Aucun résultat trouvé pour "${query}".`
  }
  return results.map((r: { name?: string; snippet?: string; url?: string }, i: number) =>
    `[${i + 1}] ${r.name || 'Sans titre'}\n    ${r.snippet || ''}\n    URL: ${r.url || ''}`
  ).join('\n\n')
}

async function toolWebReader(url: string): Promise<string> {
  const zai = await createZAI()
  try {
    // web_reader not in SDK FunctionMap, fallback to web_search with URL as query
    const content = await zai.functions.invoke('web_search', { query: url, num: 1 })
    if (typeof content === 'string') return content.substring(0, 4000)
    if (Array.isArray(content) && content.length > 0) {
      const item = content[0]
      return `[${item.name || url}]\n${item.snippet || ''}\nURL: ${item.url || url}`.substring(0, 4000)
    }
    return JSON.stringify(content).substring(0, 4000)
  } catch {
    return `Impossible de lire le contenu de ${url}`
  }
}

async function toolCodeGeneration(spec: string): Promise<string> {
  const zai = await createZAI()
  const response = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are an expert programmer. Generate clean, well-commented, production-ready code based on the specifications. Always include imports and make the code complete and runnable.' },
      { role: 'user', content: spec },
    ],
    thinking: { type: 'disabled' },
  })
  return response.choices?.[0]?.message?.content || 'Erreur de génération de code.'
}

async function toolCodeReview(code: string): Promise<string> {
  const zai = await createZAI()
  const response = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are a senior code reviewer. Analyze the code for bugs, performance issues, security vulnerabilities, and best practices. Provide specific, actionable feedback with line references.' },
      { role: 'user', content: `Review this code:\n\n${code}` },
    ],
    thinking: { type: 'disabled' },
  })
  return response.choices?.[0]?.message?.content || 'Erreur de review.'
}

async function toolWriting(task: string): Promise<string> {
  const zai = await createZAI()
  const response = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are a professional content writer. Create well-structured, engaging content that is clear, concise, and tailored to the audience. Use markdown formatting.' },
      { role: 'user', content: task },
    ],
    thinking: { type: 'disabled' },
  })
  return response.choices?.[0]?.message?.content || 'Erreur de rédaction.'
}

async function toolEditing(text: string): Promise<string> {
  const zai = await createZAI()
  const response = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are a professional editor. Improve the given text for clarity, grammar, style, and impact. Return only the improved version with a brief summary of changes made.' },
      { role: 'user', content: `Edit and improve this text:\n\n${text}` },
    ],
    thinking: { type: 'disabled' },
  })
  return response.choices?.[0]?.message?.content || 'Erreur d\'édition.'
}

async function toolDataAnalysis(data: string): Promise<string> {
  const zai = await createZAI()
  const response = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are a data analyst expert. Analyze the provided data, identify patterns, trends, and outliers. Provide actionable insights with specific numbers. Structure your response with clear sections.' },
      { role: 'user', content: data },
    ],
    thinking: { type: 'disabled' },
  })
  return response.choices?.[0]?.message?.content || 'Erreur d\'analyse.'
}

async function toolVisualization(data: string): Promise<string> {
  const zai = await createZAI()
  const response = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are a data visualization expert. Based on the data provided, recommend specific chart types (bar, line, pie, scatter, heatmap, etc.) with color schemes, and describe what each visualization would show. Be specific about axes, labels, and insights.' },
      { role: 'user', content: data },
    ],
    thinking: { type: 'disabled' },
  })
  return response.choices?.[0]?.message?.content || 'Erreur de visualisation.'
}

async function toolImageGeneration(prompt: string): Promise<string> {
  const zai = await createZAI()
  const response = await zai.images.generations.create({ prompt, size: '1024x1024' })
  const base64 = response.data?.[0]?.base64
  return base64 ? `Image générée avec succès (base64 length: ${base64.length})` : 'Erreur de génération d\'image.'
}

async function toolSummarization(text: string): Promise<string> {
  const zai = await createZAI()
  const response = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are an expert summarizer. Provide a clear, concise summary of the text in French. Use bullet points for key takeaways. Keep it under 200 words unless the source is very long.' },
      { role: 'user', content: `Résume ce texte:\n\n${text}` },
    ],
    thinking: { type: 'disabled' },
  })
  return response.choices?.[0]?.message?.content || 'Erreur de résumé.'
}

export async function executeTool(toolName: ToolName, input: string): Promise<ToolResult> {
  const start = Date.now()
  try {
    let data: string
    switch (toolName) {
      case 'web_search': data = await toolWebSearch(input); break
      case 'web_reader': data = await toolWebReader(input); break
      case 'code_generation': data = await toolCodeGeneration(input); break
      case 'code_review': data = await toolCodeReview(input); break
      case 'writing': data = await toolWriting(input); break
      case 'editing': data = await toolEditing(input); break
      case 'data_analysis': data = await toolDataAnalysis(input); break
      case 'visualization': data = await toolVisualization(input); break
      case 'image_generation': data = await toolImageGeneration(input); break
      case 'summarization': data = await toolSummarization(input); break
      default: data = `Outil inconnu: ${toolName}`
    }
    return { tool: toolName, success: true, data, durationMs: Date.now() - start }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    return { tool: toolName, success: false, data: msg, durationMs: Date.now() - start }
  }
}

export async function executeAgentAutonomously(
  systemPrompt: string,
  userMessage: string,
  tools: ToolName[]
): Promise<{ content: string; toolResults: ToolResult[] }> {
  const zai = await createZAI()
  const toolResults: ToolResult[] = []

  // Step 1: Decide which tools to use based on user message
  let toolPlan: ToolName[] = []
  if (tools.length > 0) {
    try {
      const planResponse = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a tool-selection AI. Given the user message and available tools, decide which tools to use. Return ONLY a JSON array of tool names to execute, in order. Return an empty array [] if no tools are needed.\n\nAvailable tools: ${tools.join(', ')}\n\nTool descriptions:\n- web_search: Use when user asks about current info, facts, or needs web data\n- web_reader: Use when you have a URL to read\n- code_generation: Use when user asks to write/generate code\n- code_review: Use when user provides code to review\n- writing: Use when user asks to create content, articles, stories\n- editing: Use when user asks to improve/edit existing text\n- data_analysis: Use when user provides data to analyze\n- visualization: Use when user asks about charts or data viz\n- image_generation: Use when user asks to create/generate images\n- summarization: Use when user asks to summarize text`,
          },
          { role: 'user', content: userMessage },
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