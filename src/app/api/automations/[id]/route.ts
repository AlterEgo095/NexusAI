import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/ensure-user";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, trigger, triggerConfig, workflow, isActive } = body;

    const existing = await db.automation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Automation not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (trigger !== undefined) updateData.trigger = trigger;
    if (triggerConfig !== undefined) updateData.triggerConfig = typeof triggerConfig === 'string' ? triggerConfig : JSON.stringify(triggerConfig);
    if (workflow !== undefined) updateData.workflow = typeof workflow === 'string' ? workflow : JSON.stringify(workflow);
    if (isActive !== undefined) updateData.isActive = isActive;

    const automation = await db.automation.update({
      where: { id },
      data: updateData,
    });

    await logActivity("automation", "Automatisation mise à jour", automation.name);

    return NextResponse.json({ success: true, automation });
  } catch (error) {
    console.error("Automation update error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.automation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Automation not found" }, { status: 404 });
    }

    await db.automation.delete({ where: { id } });
    await logActivity("automation", "Automatisation supprimée", existing.name);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Automation delete error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}