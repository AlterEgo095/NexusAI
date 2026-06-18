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
    const { name, description, role, systemPrompt, tools, avatar, isActive } = body;

    const agent = await db.customAgent.findUnique({ where: { id } });
    if (!agent) {
      return NextResponse.json({ success: false, error: "Agent not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (role !== undefined) updateData.role = role;
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
    if (tools !== undefined) updateData.tools = JSON.stringify(tools);
    if (avatar !== undefined) updateData.avatar = avatar;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await db.customAgent.update({
      where: { id },
      data: updateData,
    });

    await logActivity('agent', 'Agent mis à jour', name || agent.name);

    return NextResponse.json({ success: true, agent: updated });
  } catch (error) {
    console.error("Agent update error:", error);
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

    const agent = await db.customAgent.findUnique({ where: { id } });
    if (!agent) {
      return NextResponse.json({ success: false, error: "Agent not found" }, { status: 404 });
    }

    await db.customAgent.delete({ where: { id } });
    await logActivity('agent', 'Agent supprimé', agent.name);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Agent delete error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}