import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDefaultUser, logActivity, incrementUsage } from "@/lib/ensure-user";
import { executeWorkflow } from "@/lib/workflow-engine";

export async function GET() {
  try {
    const user = await ensureDefaultUser();
    const automations = await db.automation.findMany({
      where: { userId: user.id },
      include: {
        _count: { select: { executions: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ success: true, automations });
  } catch (error) {
    console.error("Automations fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch automations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, automationId, name, description, trigger, triggerConfig, workflow, isActive } = body;

    // Handle workflow execution
    if (action === 'execute') {
      if (!automationId) {
        return NextResponse.json({ success: false, error: "automationId is required for execution" }, { status: 400 });
      }

      const automation = await db.automation.findUnique({ where: { id: automationId } });
      if (!automation) {
        return NextResponse.json({ success: false, error: "Automation not found" }, { status: 404 });
      }

      const nodes = JSON.parse(automation.workflow || '[]')
      const startTime = Date.now()

      // Create execution record
      const execution = await db.workflowExecution.create({
        data: {
          automationId,
          status: 'running',
        },
      })

      try {
        const result = await executeWorkflow(nodes)

        await db.workflowExecution.update({
          where: { id: execution.id },
          data: {
            status: result.success ? 'completed' : 'failed',
            result: JSON.stringify(result.steps),
            error: result.error || null,
            durationMs: result.totalDurationMs,
          },
        })

        await db.automation.update({
          where: { id: automationId },
          data: {
            lastRun: new Date(),
            runCount: { increment: 1 },
          },
        })

        await logActivity('automation', `Automatisation "${automation.name}" exécutée`, result.success ? 'Succès' : `Échec: ${result.error}`)
        await incrementUsage('automationRuns')

        return NextResponse.json({
          success: true,
          steps: result.steps,
          totalDurationMs: result.totalDurationMs,
          executionId: execution.id,
        })
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Execution failed'
        await db.workflowExecution.update({
          where: { id: execution.id },
          data: { status: 'failed', durationMs: Date.now() - startTime },
        })
        return NextResponse.json({ success: false, error: msg }, { status: 500 })
      }
    }

    // Handle automation creation
    if (!name || !workflow) {
      return NextResponse.json({ success: false, error: "Name and workflow are required" }, { status: 400 });
    }

    const user = await ensureDefaultUser()
    const automation = await db.automation.create({
      data: {
        userId: user.id,
        name,
        description: description || null,
        trigger: trigger || 'manual',
        triggerConfig: JSON.stringify(triggerConfig || {}),
        workflow: typeof workflow === 'string' ? workflow : JSON.stringify(workflow),
        isActive: isActive ?? false,
      },
    })

    await logActivity('automation', 'Automatisation créée', name)

    return NextResponse.json({ success: true, automation })
  } catch (error) {
    console.error("Automations API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}