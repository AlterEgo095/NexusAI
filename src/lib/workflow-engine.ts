import { executeTool, type ToolName, TOOL_DEFINITIONS } from './agent-tools'
import ZAI from 'z-ai-web-dev-sdk'

/* ═══════════════════════════════════════════════════════════════════════
   NexusAI Workflow Engine v2 — Full Automation Engine
   Supports: trigger, action, condition, output, delay, loop,
             transform, http_request, notification
   Features: shared variable context, template resolution, iteration tracking
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
}

export interface StepLog {
  nodeId: string
  label: string
  result: string
  durationMs: number
  /** Variables read during this step */
  variableReads?: string[]
  /** Variables written during this step with their new values */
  variableWrites?: Record<string, string>
  /** Current iteration index (1-based), present in loop bodies */
  iteration?: number
  /** Total iterations for the enclosing loop */
  loopTotal?: number
  /** Boolean result for condition nodes */
  conditionResult?: boolean
}

export interface ExecutionResult {
  success: boolean
  steps: StepLog[]
  error?: string
  totalDurationMs: number
}

// ── VALID_TOOLS: all 18 tools from agent-tools.ts ──

const VALID_TOOLS = new Set<string>(
  TOOL_DEFINITIONS.map((def) => def.value)
)

// ── Variable Context ──

class VariableContext {
  private store: Map<string, string> = new Map()

  /** Set a variable and track the write */
  set(name: string, value: string): Record<string, string> {
    this.store.set(name, value)
    return { [name]: value }
  }

  /** Get a variable value, returns empty string if missing */
  get(name: string): string {
    return this.store.get(name) || ''
  }

  /** Check if variable exists */
  has(name: string): boolean {
    return this.store.has(name)
  }

  /** Resolve all {{variable_name}} placeholders in a string */
  resolve(template: string): { resolved: string; reads: string[] } {
    const reads: string[] = []
    const resolved = template.replace(/\{\{(\w+)\}\}/g, (_match, varName: string) => {
      reads.push(varName)
      return this.store.get(varName) ?? ''
    })
    return { resolved, reads }
  }

  /** Resolve all {{...}} in an arbitrary value (string, number, nested object) */
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

  /** Snapshot all variables for debugging */
  snapshot(): Record<string, string> {
    return Object.fromEntries(this.store)
  }
}

// ── ZAI Singleton ──

let _zai: Awaited<ReturnType<typeof ZAI.create>> | null = null
async function getZAI() {
  if (!_zai) _zai = await ZAI.create()
  return _zai
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

/** trigger: manual activation — logs timestamp and initializes context */
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

/** action: execute a tool (all 18) or fallback to LLM */
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
    // Also store tool-specific result variable
    const toolVar = variables.set(`tool_${toolName}_result`, result)
    return {
      result,
      reads: allReads,
      writes: mergeWrites(writes, toolVar),
    }
  }

  // Fallback: use LLM for unrecognized tools
  const zai = await getZAI()
  const fallbackPrompt = String(node.config.query || node.config.input || `Execute: ${node.label}`)
  const { resolved: resolvedPrompt, reads: promptReads } = variables.resolve(fallbackPrompt)
  allReads.push(...promptReads)

  const response = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are a workflow automation assistant. Execute the requested task precisely and concisely.' },
      { role: 'user', content: resolvedPrompt },
    ],
    thinking: { type: 'disabled' },
  })
  const result = response.choices?.[0]?.message?.content || 'Action executed.'
  const writes = variables.set('last_result', result)
  return { result, reads: allReads, writes }
}

/** condition: evaluate to true/false via LLM, store boolean result */
async function executeConditionNode(
  node: WorkflowNode,
  variables: VariableContext
): Promise<{ result: string; reads: string[]; writes: Record<string, string>; conditionResult: boolean }> {
  const conditionExpr = String(node.config.expression || node.config.condition || node.label)
  const { resolved: resolvedExpr, reads: exprReads } = variables.resolve(conditionExpr)
  const lastResultValue = variables.get('last_result')
  const allReads = [...exprReads]
  if (lastResultValue) allReads.push('last_result')

  const zai = await getZAI()
  const response = await zai.chat.completions.create({
    messages: [
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
    ],
    thinking: { type: 'disabled' },
  })
  const rawAnswer = (response.choices?.[0]?.message?.content || 'false').toLowerCase().trim()
  const conditionResult = rawAnswer === 'true' || rawAnswer.startsWith('true')
  const boolStr = String(conditionResult)
  const result = `Condition "${node.label}" → ${boolStr.toUpperCase()}`

  const writes1 = variables.set('condition_result', boolStr)
  const writes2 = variables.set('last_result', result)
  // Allow user to specify a custom variable name
  const customVar = String(node.config.variable || '')
  const writes3 = customVar ? variables.set(customVar, boolStr) : {}

  return {
    result,
    reads: allReads,
    writes: mergeWrites(writes1, writes2, writes3),
    conditionResult,
  }
}

/** output: capture/emit data, optionally write to a named variable */
function executeOutputNode(
  node: WorkflowNode,
  variables: VariableContext
): { result: string; reads: string[]; writes: Record<string, string> } {
  const rawTemplate = String(node.config.template || node.config.message || node.config.data || '')
  const { resolved, reads } = variables.resolve(rawTemplate)

  // If no template, stringify the whole config (with variable resolution)
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

/** delay: wait for N milliseconds */
function executeDelayNode(
  node: WorkflowNode,
  _variables: VariableContext
): { result: string; reads: string[]; writes: Record<string, string> } {
  const duration = Math.max(0, Math.min(60000, Number(node.config.duration) || 1000))
  return {
    result: `Delay: waiting ${duration}ms`,
    reads: [],
    writes: {},
    // The actual delay is awaited by the caller
  }
}

/** loop: repeat the next N nodes M times */
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

  // Determine the nodes to repeat (nodes after the loop node)
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
        // Enrich with loop metadata
        execResult.iteration = i
        execResult.loopTotal = iterations
        recordStep(execResult)
        allReads.push(...(execResult.variableReads || []))
        Object.assign(allWrites, execResult.variableWrites || {})
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error in loop body'
        const loopStepLog: StepLog = {
          nodeId: bodyNode.id,
          label: bodyNode.label,
          result: `ERROR in loop iteration ${i}: ${msg}`,
          durationMs: Date.now() - stepStart,
          iteration: i,
          loopTotal: iterations,
        }
        recordStep(loopStepLog)
        // Continue to next iteration instead of aborting the whole workflow
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
    nextIndex: endIndex, // Skip past the loop body nodes
  }
}

/** transform: use LLM to transform data */
async function executeTransformNode(
  node: WorkflowNode,
  variables: VariableContext
): Promise<{ result: string; reads: string[]; writes: Record<string, string> }> {
  const rawInstruction = String(node.config.instruction || node.config.prompt || 'Transform the data into a structured format.')
  const { resolved: instruction, reads: instrReads } = variables.resolve(rawInstruction)
  const lastResultValue = variables.get('last_result')
  const allReads = [...instrReads]
  if (lastResultValue) allReads.push('last_result')

  const zai = await getZAI()
  const response = await zai.chat.completions.create({
    messages: [
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
    ],
    thinking: { type: 'disabled' },
  })
  const result = response.choices?.[0]?.message?.content || 'Transformation completed (no output).'

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

/** http_request: simulate an HTTP request using LLM */
async function executeHttpRequestNode(
  node: WorkflowNode,
  variables: VariableContext
): Promise<{ result: string; reads: string[]; writes: Record<string, string> }> {
  const rawUrl = String(node.config.url || '{{last_result}}')
  const rawMethod = String(node.config.method || 'GET').toUpperCase()
  const rawBody = String(node.config.body || node.config.data || '')
  const rawHeaders = String(node.config.headers || '')

  const { resolved: url, reads: urlReads } = variables.resolve(rawUrl)
  const { resolved: method, reads: methodReads } = variables.resolve(rawMethod)
  const { resolved: body, reads: bodyReads } = variables.resolve(rawBody)
  const { resolved: headers, reads: headerReads } = variables.resolve(rawHeaders)

  const allReads = mergeReads(urlReads, methodReads, bodyReads, headerReads)
  const lastResultValue = variables.get('last_result')
  if (lastResultValue) allReads.push('last_result')

  const zai = await getZAI()
  const response = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content:
          'You are an HTTP request simulator. Given an HTTP request description, generate a realistic response ' +
          'as if the request was actually made. Include a status code and response body in this exact format:\n\n' +
          'Status: <code>\n' +
          'Content-Type: <type>\n\n' +
          '<response body>\n\n' +
          'Make the response realistic and relevant to the URL and method.',
      },
      {
        role: 'user',
        content: [
          `Method: ${method}`,
          `URL: ${url}`,
          headers ? `Headers: ${headers}` : '',
          body ? `Body: ${body}` : '',
          lastResultValue ? `Context from previous step: ${truncate(lastResultValue, 500)}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      },
    ],
    thinking: { type: 'disabled' },
  })

  const simulatedResponse = response.choices?.[0]?.message?.content || 'Status: 200\n\nNo response body.'
  const result = `[HTTP ${method} ${url}]\n${simulatedResponse}`

  const writes1 = variables.set('last_result', result)
  const writes2 = variables.set('http_status', '200')
  const writes3 = variables.set('http_response', simulatedResponse)
  const outVar = String(node.config.variable || '')
  const writes4 = outVar ? variables.set(outVar, result) : {}

  return {
    result,
    reads: allReads,
    writes: mergeWrites(writes1, writes2, writes3, writes4),
  }
}

/** notification: generate a notification message */
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

  const zai = await getZAI()
  const response = await zai.chat.completions.create({
    messages: [
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
    ],
    thinking: { type: 'disabled' },
  })

  const formattedNotification = response.choices?.[0]?.message?.content || `Notification: ${message}`
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
  /** For loop nodes: the index to jump to after execution */
  nextIndex?: number
  /** For delay nodes: the duration to wait */
  delayMs?: number
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
        nodeId,
        label,
        result,
        durationMs: Date.now() - stepStart,
        variableReads: reads,
        variableWrites: writes,
      }
    }

    case 'action': {
      const { result, reads, writes } = await executeActionNode(node, variables)
      return {
        nodeId,
        label,
        result: truncate(result, 500),
        durationMs: Date.now() - stepStart,
        variableReads: reads,
        variableWrites: writes,
      }
    }

    case 'condition': {
      const { result, reads, writes, conditionResult } = await executeConditionNode(node, variables)
      return {
        nodeId,
        label,
        result: truncate(result, 500),
        durationMs: Date.now() - stepStart,
        variableReads: reads,
        variableWrites: writes,
        conditionResult,
      }
    }

    case 'output': {
      const { result, reads, writes } = executeOutputNode(node, variables)
      return {
        nodeId,
        label,
        result: truncate(result, 500),
        durationMs: Date.now() - stepStart,
        variableReads: reads,
        variableWrites: writes,
      }
    }

    case 'delay': {
      const { result, reads, writes } = executeDelayNode(node, variables)
      const duration = Math.max(0, Math.min(60000, Number(node.config.duration) || 1000))
      // Perform the actual wait
      await new Promise((resolve) => setTimeout(resolve, duration))
      return {
        nodeId,
        label,
        result: `Delay completed: ${duration}ms`,
        durationMs: Date.now() - stepStart,
        variableReads: reads,
        variableWrites: writes,
      }
    }

    case 'loop': {
      const loopResult = await executeLoopNode(node, variables, allNodes, nodeIndex, recordStep)
      return {
        nodeId,
        label,
        result: truncate(loopResult.result, 500),
        durationMs: 0, // Duration is tracked by individual steps inside the loop
        variableReads: loopResult.reads,
        variableWrites: loopResult.writes,
        nextIndex: loopResult.nextIndex,
      }
    }

    case 'transform': {
      const { result, reads, writes } = await executeTransformNode(node, variables)
      return {
        nodeId,
        label,
        result: truncate(result, 500),
        durationMs: Date.now() - stepStart,
        variableReads: reads,
        variableWrites: writes,
      }
    }

    case 'http_request': {
      const { result, reads, writes } = await executeHttpRequestNode(node, variables)
      return {
        nodeId,
        label,
        result: truncate(result, 500),
        durationMs: Date.now() - stepStart,
        variableReads: reads,
        variableWrites: writes,
      }
    }

    case 'notification': {
      const { result, reads, writes } = await executeNotificationNode(node, variables)
      return {
        nodeId,
        label,
        result: truncate(result, 500),
        durationMs: Date.now() - stepStart,
        variableReads: reads,
        variableWrites: writes,
      }
    }

    default: {
      // Unknown node type — skip gracefully
      return {
        nodeId,
        label,
        result: `Unknown node type "${String(node.type)}" — skipped`,
        durationMs: Date.now() - stepStart,
        variableReads: [],
        variableWrites: {},
      }
    }
  }
}

// ── Main Workflow Executor ──

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
  while (i < nodes.length) {
    const node = nodes[i]
    try {
      const execResult = await executeSingleNode(node, variables, nodes, i, recordStep)

      // Loop nodes are special: they manage their own step recording
      // and tell us where to jump next
      if (node.type === 'loop') {
        // The loop already recorded its inner steps via recordStep
        // Now record the loop node itself
        steps.push({
          nodeId: execResult.nodeId,
          label: execResult.label,
          result: execResult.result,
          durationMs: execResult.durationMs,
          variableReads: execResult.variableReads,
          variableWrites: execResult.variableWrites,
        })
        // Jump to after the loop body
        i = execResult.nextIndex ?? i + 1
      } else {
        // Regular node — record and advance
        steps.push({
          nodeId: execResult.nodeId,
          label: execResult.label,
          result: execResult.result,
          durationMs: execResult.durationMs,
          variableReads: execResult.variableReads,
          variableWrites: execResult.variableWrites,
          conditionResult: execResult.conditionResult,
        })
        i++
      }
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

  // Store final workflow summary in variables
  variables.set('workflow_end_time', new Date().toISOString())
  variables.set('workflow_total_steps', String(steps.length))
  variables.set('workflow_success', 'true')

  return {
    success: true,
    steps,
    totalDurationMs: Date.now() - startTime,
  }
}