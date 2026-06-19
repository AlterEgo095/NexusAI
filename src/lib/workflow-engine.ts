import { executeTool, type ToolName, TOOL_DEFINITIONS } from './agent-tools'
import { getProvider } from './ai-provider'

/* ═══════════════════════════════════════════════════════════════════════
   NexusAI Workflow Engine v3 — Full Automation Engine
   Supports: trigger, action, condition, output, delay, loop,
             transform, http_request, notification
   Features: shared variable context, template resolution, iteration tracking,
             REAL HTTP requests, conditional branching
   ═══════════════════════════════════════════════════════════════════════ */

// ── Types ──

type BaseNodeType = 'trigger' | 'action' | 'condition' | 'output'
type ExtendedNodeType = 'delay' | 'loop' | 'transform' | 'http_request' | 'notification'

export interface WorkflowNode {
  id: string
  type: BaseNodeType | ExtendedNodeType
  label: string
  config: Record<string, unknown>
  position: { x: number; y: number }
  /** IDs of next nodes for true/false branches (condition nodes) */
  branches?: { true?: string; false?: string }
}

export interface StepLog {
  nodeId: string
  label: string
  result: string
  durationMs: number
  variableReads?: string[]
  variableWrites?: Record<string, string>
  iteration?: number
  loopTotal?: number
  conditionResult?: boolean
  /** HTTP-specific metadata */
  httpStatus?: number
  /** Node type for UI display */
  nodeType?: string
}

export interface ExecutionResult {
  success: boolean
  steps: StepLog[]
  error?: string
  totalDurationMs: number
  /** Final variable state for debugging */
  variables?: Record<string, string>
}

// ── VALID_TOOLS: all 18 tools from agent-tools.ts ──

const VALID_TOOLS = new Set<string>(
  TOOL_DEFINITIONS.map((def) => def.value)
)

// ── Variable Context ──

class VariableContext {
  private store: Map<string, string> = new Map()

  set(name: string, value: string): Record<string, string> {
    this.store.set(name, value)
    return { [name]: value }
  }

  get(name: string): string {
    return this.store.get(name) || ''
  }

  has(name: string): boolean {
    return this.store.has(name)
  }

  resolve(template: string): { resolved: string; reads: string[] } {
    const reads: string[] = []
    const resolved = template.replace(/\{\{(\w+)\}\}/g, (_match, varName: string) => {
      reads.push(varName)
      return this.store.get(varName) ?? ''
    })
    return { resolved, reads }
  }

  resolveValue(value: unknown): { resolved: unknown; reads: string[] } {
    if (typeof value === 'string') {
      return this.resolve(value)
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return { resolved: value, reads: [] }
    }
    if (Array.isArray(value)) {
      const allReads: string[] = []
      const resolved = value.map((item) => {
        const r = this.resolveValue(item)
        allReads.push(...r.reads)
        return r.resolved
      })
      return { resolved, reads: allReads }
    }
    if (value !== null && typeof value === 'object') {
      const allReads: string[] = []
      const resolved: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        const r = this.resolveValue(v)
        allReads.push(...r.reads)
        resolved[k] = r.resolved
      }
      return { resolved, reads: allReads }
    }
    return { resolved: value, reads: [] }
  }

  snapshot(): Record<string, string> {
    return Object.fromEntries(this.store)
  }
}

// ── Helpers ──

function truncate(text: string, maxLen = 500): string {
  return text.length > maxLen ? text.substring(0, maxLen) + '…' : text
}

function mergeReads(...arrays: string[][]): string[] {
  const seen = new Set<string>()
  const merged: string[] = []
  for (const arr of arrays) {
    for (const item of arr) {
      if (!seen.has(item)) {
        seen.add(item)
        merged.push(item)
      }
    }
  }
  return merged
}

function mergeWrites(...objects: Record<string, string>[]): Record<string, string> {
  return Object.assign({}, ...objects)
}

// ── Node Executors ──

function executeTriggerNode(
  node: WorkflowNode,
  variables: VariableContext
): { result: string; reads: string[]; writes: Record<string, string> } {
  const timestamp = new Date().toISOString()
  const writes = variables.set('trigger_time', timestamp)
  return {
    result: `Trigger "${node.label}" activated at ${timestamp}`,
    reads: [],
    writes,
  }
}

async function executeActionNode(
  node: WorkflowNode,
  variables: VariableContext
): Promise<{ result: string; reads: string[]; writes: Record<string, string> }> {
  const toolName = String(node.config.tool || 'web_search')
  const rawInput = String(
    node.config.query || node.config.input || node.config.prompt || '{{last_result}}'
  )
  const { resolved: input, reads: inputReads } = variables.resolve(rawInput)

  const allReads = [...inputReads]

  if (VALID_TOOLS.has(toolName)) {
    const toolResult = await executeTool(toolName as ToolName, input)
    const result = toolResult.data
    const writes = variables.set('last_result', result)
    const toolVar = variables.set(`tool_${toolName}_result`, result)
    return {
      result,
      reads: allReads,
      writes: mergeWrites(writes, toolVar),
    }
  }

  // Fallback: use LLM for unrecognized tools
  const provider = await getProvider()
  const fallbackPrompt = String(node.config.query || node.config.input || `Execute: ${node.label}`)
  const { resolved: resolvedPrompt, reads: promptReads } = variables.resolve(fallbackPrompt)
  allReads.push(...promptReads)

  const response = await provider.chat([
    { role: 'system', content: 'You are a workflow automation assistant. Execute the requested task precisely and concisely.' },
    { role: 'user', content: resolvedPrompt },
  ])
  const result = response.content || 'Action executed.'
  const writes = variables.set('last_result', result)
  return { result, reads: allReads, writes }
}

async function executeConditionNode(
  node: WorkflowNode,
  variables: VariableContext
): Promise<{ result: string; reads: string[]; writes: Record<string, string>; conditionResult: boolean }> {
  const conditionExpr = String(node.config.expression || node.config.condition || node.label)
  const { resolved: resolvedExpr, reads: exprReads } = variables.resolve(conditionExpr)
  const lastResultValue = variables.get('last_result')
  const allReads = [...exprReads]
  if (lastResultValue) allReads.push('last_result')

  const provider = await getProvider()
  const response = await provider.chat([
    {
      role: 'system',
      content:
        'You are a condition evaluator. Evaluate the given condition against the provided context. ' +
        'Respond with ONLY "true" or "false" — no explanation, no punctuation, no extra text.',
    },
    {
      role: 'user',
      content: `Condition: ${resolvedExpr}\n\nContext:\n${truncate(lastResultValue, 1000)}`,
    },
  ])
  const rawAnswer = (response.content || 'false').toLowerCase().trim()
  const conditionResult = rawAnswer === 'true' || rawAnswer.startsWith('true')
  const boolStr = String(conditionResult)
  const result = `Condition "${node.label}" → ${boolStr.toUpperCase()}`

  const writes1 = variables.set('condition_result', boolStr)
  const writes2 = variables.set('last_result', result)
  const customVar = String(node.config.variable || '')
  const writes3 = customVar ? variables.set(customVar, boolStr) : {}

  return {
    result,
    reads: allReads,
    writes: mergeWrites(writes1, writes2, writes3),
    conditionResult,
  }
}

function executeOutputNode(
  node: WorkflowNode,
  variables: VariableContext
): { result: string; reads: string[]; writes: Record<string, string> } {
  const rawTemplate = String(node.config.template || node.config.message || node.config.data || '')
  const { resolved, reads } = variables.resolve(rawTemplate)

  let result: string
  let allReads = reads
  if (!rawTemplate) {
    const { resolved: resolvedConfig, reads: configReads } = variables.resolveValue(node.config)
    result = `Output "${node.label}": ${JSON.stringify(resolvedConfig, null, 2)}`
    allReads = mergeReads(reads, configReads)
  } else {
    result = resolved
  }

  const writes1 = variables.set('last_result', result)
  const outVar = String(node.config.variable || '')
  const writes2 = outVar ? variables.set(outVar, result) : {}

  return { result, reads: allReads, writes: mergeWrites(writes1, writes2) }
}

function executeDelayNode(
  node: WorkflowNode,
  _variables: VariableContext
): { result: string; reads: string[]; writes: Record<string, string> } {
  const duration = Math.max(0, Math.min(60000, Number(node.config.duration) || 1000))
  return {
    result: `Delay: waiting ${duration}ms`,
    reads: [],
    writes: {},
  }
}

async function executeLoopNode(
  node: WorkflowNode,
  variables: VariableContext,
  allNodes: WorkflowNode[],
  nodeIndex: number,
  recordStep: (log: StepLog) => void
): Promise<{ result: string; reads: string[]; writes: Record<string, string>; nextIndex: number }> {
  const iterations = Math.max(1, Math.min(50, Math.round(Number(node.config.iterations) || 1)))
  const repeatCount = Math.max(1, Math.min(20, Math.round(Number(node.config.repeatCount) || 1)))
  const loopVarName = String(node.config.variable || 'loop_index')

  const startIndex = nodeIndex + 1
  const endIndex = Math.min(startIndex + repeatCount, allNodes.length)
  const loopBody = allNodes.slice(startIndex, endIndex)

  if (loopBody.length === 0) {
    const result = `Loop "${node.label}": no nodes to repeat (repeatCount=${repeatCount} but no subsequent nodes)`
    return {
      result,
      reads: [],
      writes: variables.set('last_result', result),
      nextIndex: nodeIndex + 1,
    }
  }

  const allReads: string[] = []
  const allWrites: Record<string, string> = {}
  const iterationResults: string[] = []

  for (let i = 1; i <= iterations; i++) {
    const writes1 = variables.set(loopVarName, String(i))
    const writes2 = variables.set('loop_iteration', String(i))
    const writes3 = variables.set('loop_total', String(iterations))
    Object.assign(allWrites, writes1, writes2, writes3)

    const stepStart = Date.now()
    for (const bodyNode of loopBody) {
      try {
        const execResult = await executeSingleNode(bodyNode, variables, allNodes, startIndex + loopBody.indexOf(bodyNode), recordStep)
        execResult.iteration = i
        execResult.loopTotal = iterations
        recordStep(execResult)
        allReads.push(...(execResult.variableReads || []))
        Object.assign(allWrites, execResult.variableWrites || {})
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error in loop body'
        recordStep({
          nodeId: bodyNode.id,
          label: bodyNode.label,
          result: `ERROR in loop iteration ${i}: ${msg}`,
          durationMs: Date.now() - stepStart,
          iteration: i,
          loopTotal: iterations,
        })
        break
      }
    }
    iterationResults.push(`  Iteration ${i}/${iterations}: ${truncate(variables.get('last_result'), 100)}`)
  }

  const result = `Loop "${node.label}": ${iterations} iterations × ${loopBody.length} nodes\n${iterationResults.join('\n')}`
  variables.set('last_result', result)
  Object.assign(allWrites, variables.set('last_result', result))

  return {
    result,
    reads: allReads,
    writes: allWrites,
    nextIndex: endIndex,
  }
}

async function executeTransformNode(
  node: WorkflowNode,
  variables: VariableContext
): Promise<{ result: string; reads: string[]; writes: Record<string, string> }> {
  const rawInstruction = String(node.config.instruction || node.config.prompt || 'Transform the data into a structured format.')
  const { resolved: instruction, reads: instrReads } = variables.resolve(rawInstruction)
  const lastResultValue = variables.get('last_result')
  const allReads = [...instrReads]
  if (lastResultValue) allReads.push('last_result')

  const provider = await getProvider()
  const response = await provider.chat([
    {
      role: 'system',
      content:
        'You are a data transformation specialist. Apply the requested transformation to the input data. ' +
        'Be precise and follow the instruction exactly. Return only the transformed result.',
    },
    {
      role: 'user',
      content: `Instruction: ${instruction}\n\nInput data:\n${truncate(lastResultValue, 3000)}`,
    },
  ])
  const result = response.content || 'Transformation completed (no output).'

  const writes1 = variables.set('last_result', result)
  const writes2 = variables.set('transform_result', result)
  const outVar = String(node.config.variable || '')
  const writes3 = outVar ? variables.set(outVar, result) : {}

  return {
    result,
    reads: allReads,
    writes: mergeWrites(writes1, writes2, writes3),
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   HTTP Request Node — REAL HTTP fetch (v3 upgrade)
   Uses native fetch() for actual HTTP calls, with:
   - Variable template resolution in URL, headers, body
   - Timeout support (default 30s)
   - Response body and status tracking
   ═══════════════════════════════════════════════════════════════════════ */

async function executeHttpRequestNode(
  node: WorkflowNode,
  variables: VariableContext
): Promise<{ result: string; reads: string[]; writes: Record<string, string>; httpStatus?: number }> {
  const rawUrl = String(node.config.url || '{{last_result}}')
  const rawMethod = String(node.config.method || 'GET').toUpperCase()
  const rawBody = String(node.config.body || node.config.data || '')
  const rawHeaders = String(node.config.headers || '')
  const timeout = Math.min(60000, Math.max(1000, Number(node.config.timeout) || 30000))

  const { resolved: url, reads: urlReads } = variables.resolve(rawUrl)
  const { resolved: method, reads: methodReads } = variables.resolve(rawMethod)
  const { resolved: body, reads: bodyReads } = variables.resolve(rawBody)
  const { resolved: headers, reads: headerReads } = variables.resolve(rawHeaders)

  const allReads = mergeReads(urlReads, methodReads, bodyReads, headerReads)
  const lastResultValue = variables.get('last_result')
  if (lastResultValue) allReads.push('last_result')

  if (!url) {
    const msg = 'No URL provided for HTTP request node'
    return { result: msg, reads: allReads, writes: {}, httpStatus: 0 }
  }

  // Build fetch options
  const fetchOptions: RequestInit = {
    method: method as RequestInit['method'],
    headers: {},
    signal: AbortSignal.timeout(timeout),
  }

  // Parse headers
  if (headers) {
    try {
      const parsedHeaders = JSON.parse(headers)
      if (typeof parsedHeaders === 'object' && parsedHeaders !== null) {
        fetchOptions.headers = parsedHeaders
      }
    } catch {
      // If not valid JSON, try comma-separated key:value
      headers.split(',').forEach(h => {
        const [key, ...valueParts] = h.split(':')
        if (key && valueParts.length > 0) {
          (fetchOptions.headers as Record<string, string>)[key.trim()] = valueParts.join(':').trim()
        }
      })
    }
  }

  // Add body for POST/PUT/PATCH
  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    fetchOptions.body = body
    if (!(fetchOptions.headers as Record<string, string>)['Content-Type']) {
      (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json'
    }
  }

  let httpStatus = 0
  let responseText = ''

  try {
    const response = await fetch(url, fetchOptions)
    httpStatus = response.status

    responseText = await response.text()

    // Truncate large responses
    if (responseText.length > 5000) {
      responseText = responseText.substring(0, 5000) + `\n... (truncated, total ${responseText.length} chars)`
    }

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'HTTP request failed'
    const result = `[HTTP ${method} ${url}] ERROR: ${msg}`
    variables.set('last_result', result)
    variables.set('http_error', msg)
    return {
      result,
      reads: allReads,
      writes: { last_result: result, http_error: msg, http_status: '0' },
      httpStatus: 0,
    }
  }

  const result = `[HTTP ${method} ${url}]\nStatus: ${httpStatus}\n\n${responseText}`

  const writes1 = variables.set('last_result', result)
  const writes2 = variables.set('http_status', String(httpStatus))
  const writes3 = variables.set('http_response', responseText)
  const writes4 = variables.set('http_body', responseText)
  const outVar = String(node.config.variable || '')
  const writes5 = outVar ? variables.set(outVar, result) : {}

  return {
    result,
    reads: allReads,
    writes: mergeWrites(writes1, writes2, writes3, writes4, writes5),
    httpStatus,
  }
}

async function executeNotificationNode(
  node: WorkflowNode,
  variables: VariableContext
): Promise<{ result: string; reads: string[]; writes: Record<string, string> }> {
  const rawChannel = String(node.config.channel || 'general')
  const rawMessage = String(node.config.message || node.config.content || '{{last_result}}')
  const rawTitle = String(node.config.title || 'Workflow Notification')

  const { resolved: channel, reads: channelReads } = variables.resolve(rawChannel)
  const { resolved: message, reads: msgReads } = variables.resolve(rawMessage)
  const { resolved: title, reads: titleReads } = variables.resolve(rawTitle)

  const allReads = mergeReads(channelReads, msgReads, titleReads)
  const lastResultValue = variables.get('last_result')
  if (lastResultValue) allReads.push('last_result')

  const provider = await getProvider()
  const response = await provider.chat([
    {
      role: 'system',
      content:
        'You are a notification message formatter. Given a notification request, produce a polished, ' +
        'professional notification message appropriate for the specified channel (email, slack, discord, ' +
        'sms, webhook, or general). Format the output as a complete, ready-to-send notification. ' +
        'Include a subject line for email, keep SMS short, use markdown for Slack/Discord.',
    },
    {
      role: 'user',
      content: `Channel: ${channel}\nTitle: ${title}\nRaw message: ${message}\n\nContext:\n${truncate(lastResultValue, 1000)}`,
    },
  ])

  const formattedNotification = response.content || `Notification: ${message}`
  const result = `[${channel.toUpperCase()}] ${title}\n${formattedNotification}`

  const writes1 = variables.set('last_result', result)
  const writes2 = variables.set('notification', formattedNotification)
  const outVar = String(node.config.variable || '')
  const writes3 = outVar ? variables.set(outVar, result) : {}

  return {
    result,
    reads: allReads,
    writes: mergeWrites(writes1, writes2, writes3),
  }
}

// ── Single Node Execution Dispatcher ──

interface NodeExecutionResult extends StepLog {
  variableReads: string[]
  variableWrites: Record<string, string>
  conditionResult?: boolean
  nextIndex?: number
  delayMs?: number
  httpStatus?: number
}

async function executeSingleNode(
  node: WorkflowNode,
  variables: VariableContext,
  allNodes: WorkflowNode[],
  nodeIndex: number,
  recordStep: (log: StepLog) => void
): Promise<NodeExecutionResult> {
  const stepStart = Date.now()
  const nodeId = node.id
  const label = node.label

  switch (node.type) {
    case 'trigger': {
      const { result, reads, writes } = executeTriggerNode(node, variables)
      return {
        nodeId, label, result,
        durationMs: Date.now() - stepStart,
        variableReads: reads, variableWrites: writes,
        nodeType: 'trigger',
      }
    }

    case 'action': {
      const { result, reads, writes } = await executeActionNode(node, variables)
      return {
        nodeId, label, result: truncate(result, 500),
        durationMs: Date.now() - stepStart,
        variableReads: reads, variableWrites: writes,
        nodeType: 'action',
      }
    }

    case 'condition': {
      const { result, reads, writes, conditionResult } = await executeConditionNode(node, variables)
      return {
        nodeId, label, result: truncate(result, 500),
        durationMs: Date.now() - stepStart,
        variableReads: reads, variableWrites: writes,
        conditionResult,
        nodeType: 'condition',
      }
    }

    case 'output': {
      const { result, reads, writes } = executeOutputNode(node, variables)
      return {
        nodeId, label, result: truncate(result, 500),
        durationMs: Date.now() - stepStart,
        variableReads: reads, variableWrites: writes,
        nodeType: 'output',
      }
    }

    case 'delay': {
      const { result, reads, writes } = executeDelayNode(node, variables)
      const duration = Math.max(0, Math.min(60000, Number(node.config.duration) || 1000))
      await new Promise((resolve) => setTimeout(resolve, duration))
      return {
        nodeId, label,
        result: `Delay completed: ${duration}ms`,
        durationMs: Date.now() - stepStart,
        variableReads: reads, variableWrites: writes,
        nodeType: 'delay',
      }
    }

    case 'loop': {
      const loopResult = await executeLoopNode(node, variables, allNodes, nodeIndex, recordStep)
      return {
        nodeId, label, result: truncate(loopResult.result, 500),
        durationMs: 0,
        variableReads: loopResult.reads, variableWrites: loopResult.writes,
        nextIndex: loopResult.nextIndex,
        nodeType: 'loop',
      }
    }

    case 'transform': {
      const { result, reads, writes } = await executeTransformNode(node, variables)
      return {
        nodeId, label, result: truncate(result, 500),
        durationMs: Date.now() - stepStart,
        variableReads: reads, variableWrites: writes,
        nodeType: 'transform',
      }
    }

    case 'http_request': {
      const { result, reads, writes, httpStatus } = await executeHttpRequestNode(node, variables)
      return {
        nodeId, label, result: truncate(result, 500),
        durationMs: Date.now() - stepStart,
        variableReads: reads, variableWrites: writes,
        httpStatus,
        nodeType: 'http_request',
      }
    }

    case 'notification': {
      const { result, reads, writes } = await executeNotificationNode(node, variables)
      return {
        nodeId, label, result: truncate(result, 500),
        durationMs: Date.now() - stepStart,
        variableReads: reads, variableWrites: writes,
        nodeType: 'notification',
      }
    }

    default: {
      return {
        nodeId, label,
        result: `Unknown node type "${String(node.type)}" — skipped`,
        durationMs: Date.now() - stepStart,
        variableReads: [], variableWrites: {},
      }
    }
  }
}

// ── Main Workflow Executor with Conditional Branching ──

export async function executeWorkflow(nodes: WorkflowNode[]): Promise<ExecutionResult> {
  const steps: StepLog[] = []
  const startTime = Date.now()
  const variables = new VariableContext()

  // Initialize built-in variables
  variables.set('workflow_start_time', new Date().toISOString())
  variables.set('workflow_node_count', String(nodes.length))
  variables.set('last_result', '')
  variables.set('condition_result', 'false')
  variables.set('loop_iteration', '0')
  variables.set('loop_total', '0')

  // Build node index for branching
  const nodeIndexMap = new Map<string, number>()
  nodes.forEach((n, i) => nodeIndexMap.set(n.id, i))

  if (nodes.length === 0) {
    return {
      success: true,
      steps: [{ nodeId: '', label: 'Empty Workflow', result: 'No nodes to execute.', durationMs: 0 }],
      totalDurationMs: Date.now() - startTime,
    }
  }

  const recordStep = (log: StepLog) => {
    steps.push(log)
  }

  let i = 0
  let skipConditionBranch = false // When true, skip the next node (used for false branches)

  while (i < nodes.length) {
    const node = nodes[i]
    try {
      const execResult = await executeSingleNode(node, variables, nodes, i, recordStep)

      if (node.type === 'loop') {
        steps.push({
          nodeId: execResult.nodeId,
          label: execResult.label,
          result: execResult.result,
          durationMs: execResult.durationMs,
          variableReads: execResult.variableReads,
          variableWrites: execResult.variableWrites,
          nodeType: 'loop',
        })
        i = execResult.nextIndex ?? i + 1
        continue
      }

      // ── Conditional Branching ──
      if (node.type === 'condition' && node.branches) {
        const branchId = execResult.conditionResult
          ? node.branches.true
          : node.branches.false

        steps.push({
          nodeId: execResult.nodeId,
          label: execResult.label,
          result: execResult.result,
          durationMs: execResult.durationMs,
          variableReads: execResult.variableReads,
          variableWrites: execResult.variableWrites,
          conditionResult: execResult.conditionResult,
          nodeType: 'condition',
        })

        if (branchId) {
          const branchIndex = nodeIndexMap.get(branchId)
          if (branchIndex !== undefined) {
            i = branchIndex
            continue
          }
        }
        // No valid branch — continue to next node
        i++
        continue
      }

      steps.push({
        nodeId: execResult.nodeId,
        label: execResult.label,
        result: execResult.result,
        durationMs: execResult.durationMs,
        variableReads: execResult.variableReads,
        variableWrites: execResult.variableWrites,
        conditionResult: execResult.conditionResult,
        nodeType: execResult.nodeType,
        httpStatus: execResult.httpStatus,
      })
      i++
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      steps.push({
        nodeId: node.id,
        label: node.label,
        result: `ERROR: ${msg}`,
        durationMs: Date.now() - (startTime + steps.reduce((s, st) => s + st.durationMs, 0)),
        variableReads: [],
        variableWrites: {},
      })
      return {
        success: false,
        steps,
        error: `Node "${node.label}" (${node.id}): ${msg}`,
        totalDurationMs: Date.now() - startTime,
      }
    }
  }

  // Store final workflow summary
  variables.set('workflow_end_time', new Date().toISOString())
  variables.set('workflow_total_steps', String(steps.length))
  variables.set('workflow_success', 'true')

  return {
    success: true,
    steps,
    totalDurationMs: Date.now() - startTime,
    variables: variables.snapshot(),
  }
}