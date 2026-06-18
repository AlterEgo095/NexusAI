import { executeTool, type ToolName } from './agent-tools'
import ZAI from 'z-ai-web-dev-sdk'

interface WorkflowNode {
  id: string
  type: 'trigger' | 'action' | 'condition' | 'output'
  label: string
  config: Record<string, unknown>
  position: { x: number; y: number }
}

interface ExecutionResult {
  success: boolean
  steps: Array<{ nodeId: string; label: string; result: string; durationMs: number }>
  error?: string
  totalDurationMs: number
}

const VALID_TOOLS = new Set<string>([
  'web_search', 'web_reader', 'code_generation', 'writing',
  'data_analysis', 'summarization',
])

export async function executeWorkflow(nodes: WorkflowNode[]): Promise<ExecutionResult> {
  const steps: ExecutionResult['steps'] = []
  const startTime = Date.now()
  let lastResult = ''

  for (const node of nodes) {
    const stepStart = Date.now()
    try {
      switch (node.type) {
        case 'trigger':
          lastResult = `Trigger "${node.label}" activé à ${new Date().toISOString()}`
          break
        case 'action': {
          const tool = (node.config.tool as string) || 'web_search'
          const input = String(node.config.query || node.config.input || node.config.prompt || lastResult)
          if (VALID_TOOLS.has(tool)) {
            const result = await executeTool(tool as ToolName, input)
            lastResult = result.data
          } else {
            const zai = await ZAI.create()
            const response = await zai.chat.completions.create({
              messages: [
                { role: 'system', content: 'Tu es un assistant d\'automatisation. Exécute la tâche demandée.' },
                { role: 'user', content: String(node.config.query || node.config.input || 'Exécute l\'action: ' + node.label) },
              ],
              thinking: { type: 'disabled' },
            })
            lastResult = response.choices?.[0]?.message?.content || 'Action exécutée.'
          }
          break
        }
        case 'condition': {
          const zai = await ZAI.create()
          const response = await zai.chat.completions.create({
            messages: [
              { role: 'system', content: 'Évalue la condition et répond UNIQUEMENT par "true" ou "false". Pas d\'explication.' },
              { role: 'user', content: `Condition: ${node.label}\nContexte: ${lastResult.substring(0, 500)}` },
            ],
            thinking: { type: 'disabled' },
          })
          const evalResult = response.choices?.[0]?.message?.content?.toLowerCase().includes('true')
          lastResult = evalResult ? 'Condition vérifiée: TRUE' : 'Condition non vérifiée: FALSE'
          break
        }
        case 'output':
          lastResult = `Output "${node.label}": ${JSON.stringify(node.config)}`
          break
      }
      steps.push({ nodeId: node.id, label: node.label, result: lastResult.substring(0, 500), durationMs: Date.now() - stepStart })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      steps.push({ nodeId: node.id, label: node.label, result: `ERREUR: ${msg}`, durationMs: Date.now() - stepStart })
      return { success: false, steps, error: msg, totalDurationMs: Date.now() - startTime }
    }
  }

  return { success: true, steps, totalDurationMs: Date.now() - startTime }
}