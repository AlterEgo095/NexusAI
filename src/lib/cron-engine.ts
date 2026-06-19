import { db } from '@/lib/db'
import type { CronJob } from '@prisma/client'

/* ═══════════════════════════════════════════════════════════════════════
   NexusAI Cron Engine — Parse, schedule, and execute cron-based automations
   Supports standard 5-field cron: minute hour day month weekday
   ═══════════════════════════════════════════════════════════════════════ */

// ── Types ──

interface CronFields {
  minute: string
  hour: string
  day: string
  month: string
  weekday: string
}

// ── Field Constraints ──

const FIELD_RANGES: Record<keyof CronFields, { min: number; max: number }> = {
  minute: { min: 0, max: 59 },
  hour: { min: 0, max: 23 },
  day: { min: 1, max: 31 },
  month: { min: 1, max: 12 },
  weekday: { min: 0, max: 6 },
}

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

// ── Parsing ──

/**
 * Parse a single cron field into an array of matching integers.
 * Supports: star, star-slash-N, specific N, comma list N,M, range N-M
 */
function parseField(field: string, min: number, max: number): number[] | null {
  const values = new Set<number>()

  for (const part of field.split(',')) {
    const trimmed = part.trim()
    if (!trimmed) return null

    if (trimmed === '*') {
      for (let i = min; i <= max; i++) values.add(i)
      continue
    }

    // */N — every N starting from min
    const stepMatch = trimmed.match(/^\*\/(\d+)$/)
    if (stepMatch) {
      const step = parseInt(stepMatch[1], 10)
      if (step <= 0) return null
      for (let i = min; i <= max; i += step) values.add(i)
      continue
    }

    // N-M or N-M/S
    const rangeMatch = trimmed.match(/^(\d+)-(\d+)(?:\/(\d+))?$/)
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10)
      const end = parseInt(rangeMatch[2], 10)
      const step = rangeMatch[3] ? parseInt(rangeMatch[3], 10) : 1
      if (start > end || step <= 0) return null
      for (let i = start; i <= end; i += step) values.add(i)
      continue
    }

    // Plain number
    const numMatch = trimmed.match(/^(\d+)$/)
    if (numMatch) {
      const val = parseInt(numMatch[1], 10)
      if (val < min || val > max) return null
      values.add(val)
      continue
    }

    // Named months / weekdays
    const lower = trimmed.toLowerCase()
    const monthIdx = MONTH_NAMES.indexOf(lower)
    if (monthIdx !== -1) {
      values.add(monthIdx + 1) // 1-based
      continue
    }
    const dayIdx = DAY_NAMES.indexOf(lower)
    if (dayIdx !== -1) {
      values.add(dayIdx) // 0-based (0 = Sunday)
      continue
    }

    return null // Unrecognised token
  }

  return [...values].sort((a, b) => a - b)
}

/**
 * Parse a 5-field cron expression into structured fields.
 * Returns null if the expression is invalid.
 */
export function parseCronExpression(expr: string): CronFields | null {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return null

  const keys: (keyof CronFields)[] = ['minute', 'hour', 'day', 'month', 'weekday']
  const fields: Record<string, string> = {}

  for (let i = 0; i < 5; i++) {
    const key = keys[i]
    const range = FIELD_RANGES[key]
    const parsed = parseField(parts[i], range.min, range.max)
    if (!parsed) return null
    fields[key] = parts[i]
  }

  return fields as unknown as CronFields
}

/**
 * Validate a cron expression (returns true/false).
 */
export function isValidCronExpression(expr: string): boolean {
  return parseCronExpression(expr) !== null
}

// ── Next Run Time Computation ──

/**
 * Get the next run time for a cron expression starting from `after`.
 * Uses brute-force minute-by-minute search capped at ~4 years to avoid infinite loops.
 */
export function getNextRunTime(expr: string, after?: Date): Date | null {
  const parsed = parseCronExpression(expr)
  if (!parsed) return null

  const keys: (keyof CronFields)[] = ['minute', 'hour', 'day', 'month', 'weekday']
  const ranges = keys.map((k) => FIELD_RANGES[k])
  const parsedValues = keys.map((k) => {
    const range = FIELD_RANGES[k]
    return parseField(parsed[k], range.min, range.max)! // guaranteed non-null
  })

  const start = after ?? new Date()
  // Round up to the next whole minute
  const candidate = new Date(start.getTime())
  candidate.setSeconds(0, 0)
  candidate.setMinutes(candidate.getMinutes() + 1)

  // Cap iterations at ~4 years worth of minutes
  const MAX_ITERATIONS = 365 * 4 * 24 * 60

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const m = candidate.getMinutes()
    const h = candidate.getHours()
    const d = candidate.getDate()
    const mo = candidate.getMonth() + 1 // 1-based
    const wd = candidate.getDay() // 0 = Sunday

    if (
      parsedValues[0].includes(m) &&
      parsedValues[1].includes(h) &&
      parsedValues[2].includes(d) &&
      parsedValues[3].includes(mo) &&
      parsedValues[4].includes(wd)
    ) {
      return new Date(candidate.getTime())
    }

    // Advance by one minute
    candidate.setMinutes(candidate.getMinutes() + 1)
  }

  return null // No match found within the cap
}

// ── Humanization ──

/**
 * Produce a human-readable description of a cron expression.
 */
export function humanizeCronExpression(expr: string): string {
  const parsed = parseCronExpression(expr)
  if (!parsed) return 'Invalid cron expression'

  const parts = expr.trim().split(/\s+/)

  // Try to detect common patterns
  if (parts[0] === '*' && parts[1] === '*' && parts[2] === '*' && parts[3] === '*' && parts[4] === '*') {
    return 'Every minute'
  }

  // Every N minutes
  if (parts[1] === '*' && parts[2] === '*' && parts[3] === '*' && parts[4] === '*') {
    const stepMatch = parts[0].match(/^\*\/(\d+)$/)
    if (stepMatch) {
      const n = parseInt(stepMatch[1], 10)
      return n === 1 ? 'Every minute' : `Every ${n} minutes`
    }
    if (parts[0] === '0') return 'Every hour (at :00)'
  }

  // Every N hours
  if (parts[0] === '0' && parts[2] === '*' && parts[3] === '*' && parts[4] === '*') {
    const stepMatch = parts[1].match(/^\*\/(\d+)$/)
    if (stepMatch) {
      const n = parseInt(stepMatch[1], 10)
      return n === 1 ? 'Every hour' : `Every ${n} hours`
    }
    return `Daily at ${pad(parts[1])}:00`
  }

  // Specific time daily
  if (parts[2] === '*' && parts[3] === '*' && parts[4] === '*') {
    return `Daily at ${pad(parts[1])}:${pad(parts[0])}`
  }

  // Specific weekday
  if (parts[2] === '*' && parts[3] === '*') {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayNum = parseInt(parts[4], 10)
    if (!isNaN(dayNum) && dayNum >= 0 && dayNum <= 6) {
      return `${dayNames[dayNum]} at ${pad(parts[1])}:${pad(parts[0])}`
    }
  }

  // Specific month
  if (parts[4] === '*') {
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']
    const monthNum = parseInt(parts[3], 10)
    if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
      return `${monthNames[monthNum]} ${pad(parts[2])} at ${pad(parts[1])}:${pad(parts[0])}`
    }
  }

  // Fallback: raw expression
  return expr
}

function pad(n: string): string {
  return n.length < 2 ? `0${n}` : n
}

// ── Database Operations ──

/**
 * Create a new cron job in the database.
 */
export async function createCronJob(
  automationId: string,
  name: string,
  expression: string,
  timezone?: string
): Promise<CronJob> {
  if (!isValidCronExpression(expression)) {
    throw new Error(`Invalid cron expression: ${expression}`)
  }

  const automation = await db.automation.findUnique({ where: { id: automationId } })
  if (!automation) {
    throw new Error(`Automation not found: ${automationId}`)
  }

  const nextRun = getNextRunTime(expression, new Date())
  if (!nextRun) {
    throw new Error(`Could not compute next run time for expression: ${expression}`)
  }

  const cronJob = await db.cronJob.create({
    data: {
      userId: automation.userId,
      automationId,
      name,
      expression,
      timezone: timezone ?? 'UTC',
      isActive: true,
      nextRun,
      runCount: 0,
    },
  })

  return cronJob
}

/**
 * List all cron jobs for a user, including the automation name.
 */
export async function listCronJobs(
  userId: string
): Promise<Array<CronJob & { automationName: string }>> {
  const jobs = await db.cronJob.findMany({
    where: { userId },
    include: { automation: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return jobs.map((job) => ({
    ...job,
    automationName: job.automation.name,
  }))
}

/**
 * Delete a cron job by ID.
 */
export async function deleteCronJob(id: string): Promise<void> {
  await db.cronJob.delete({ where: { id } })
}

/**
 * Toggle a cron job's active state.
 * When re-activated, recompute nextRun.
 */
export async function toggleCronJob(id: string, isActive: boolean): Promise<void> {
  const data: Record<string, unknown> = { isActive }
  if (isActive) {
    const job = await db.cronJob.findUnique({ where: { id } })
    if (job) {
      const nextRun = getNextRunTime(job.expression, new Date())
      data.nextRun = nextRun
    }
  }
  await db.cronJob.update({ where: { id }, data })
}

// ── Tick Engine ──

/**
 * Check and execute all due cron jobs.
 * Called periodically by a scheduler (e.g., setInterval or external cron).
 * Returns counts of executed and errored jobs.
 */
export async function tickCronJobs(): Promise<{ executed: number; errors: number }> {
  const now = new Date()
  let executed = 0
  let errors = 0

  // Find all active cron jobs that are due
  const dueJobs = await db.cronJob.findMany({
    where: {
      isActive: true,
      nextRun: { lte: now },
    },
    include: {
      automation: true,
    },
  })

  for (const job of dueJobs) {
    try {
      // Dynamically import workflow engine only when executing (saves memory on compile)
      const { executeWorkflow } = await import('./workflow-engine')
      const nodes = JSON.parse(job.automation.workflow)

      // Execute the workflow
      await executeWorkflow(nodes)

      // Update the cron job
      const nextRun = getNextRunTime(job.expression, now)
      await db.cronJob.update({
        where: { id: job.id },
        data: {
          lastRun: now,
          nextRun,
          runCount: { increment: 1 },
        },
      })

      // Also update the parent automation's run count
      await db.automation.update({
        where: { id: job.automationId },
        data: {
          lastRun: now,
          runCount: { increment: 1 },
        },
      })

      executed++
    } catch (err) {
      console.error(`[cron-engine] Error executing cron job ${job.id}:`, err)

      // Still advance the nextRun so we don't get stuck retrying
      try {
        const nextRun = getNextRunTime(job.expression, now)
        await db.cronJob.update({
          where: { id: job.id },
          data: { nextRun },
        })
      } catch {
        // Ignore update errors
      }

      errors++
    }
  }

  return { executed, errors }
}