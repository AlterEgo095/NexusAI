import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/ensure-user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const canvas = await db.canvas.findUnique({ where: { id } });

    if (!canvas) {
      return NextResponse.json(
        { success: false, error: "Canevas introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, canvas });
  } catch (error) {
    console.error("Canvas fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Échec du chargement du canevas" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, nodes, edges } = body;

    const existing = await db.canvas.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Canevas introuvable" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (nodes !== undefined) updateData.nodes = typeof nodes === "string" ? nodes : JSON.stringify(nodes);
    if (edges !== undefined) updateData.edges = typeof edges === "string" ? edges : JSON.stringify(edges);

    const canvas = await db.canvas.update({
      where: { id },
      data: updateData,
    });

    await logActivity("canvas", "Canevas mis à jour", canvas.name);

    return NextResponse.json({ success: true, canvas });
  } catch (error) {
    console.error("Canvas update error:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.canvas.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Canevas introuvable" },
        { status: 404 }
      );
    }

    await db.canvas.delete({ where: { id } });
    await logActivity("canvas", "Canevas supprimé", existing.name);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Canvas delete error:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}