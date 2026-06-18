import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDefaultUser, logActivity } from "@/lib/ensure-user";

export async function GET() {
  try {
    const user = await ensureDefaultUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Utilisateur introuvable" }, { status: 401 });
    }
    const canvases = await db.canvas.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        nodes: true,
        edges: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const canvasesWithCounts = canvases.map((c) => {
      let nodeCount = 0;
      let edgeCount = 0;
      try {
        const parsedNodes = JSON.parse(c.nodes);
        nodeCount = Array.isArray(parsedNodes) ? parsedNodes.length : 0;
      } catch { /* ignore */ }
      try {
        const parsedEdges = JSON.parse(c.edges);
        edgeCount = Array.isArray(parsedEdges) ? parsedEdges.length : 0;
      } catch { /* ignore */ }

      return {
        id: c.id,
        name: c.name,
        description: c.description,
        nodeCount,
        edgeCount,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    return NextResponse.json({ success: true, canvases: canvasesWithCounts });
  } catch (error) {
    console.error("Canvas list error:", error);
    return NextResponse.json(
      { success: false, error: "Échec du chargement des canevas" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, id, name, description, nodes, edges } = body;
    const user = await ensureDefaultUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Utilisateur introuvable" }, { status: 401 });
    }

    // Action: save existing canvas
    if (action === "save" && id) {
      const existing = await db.canvas.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Canevas introuvable" },
          { status: 404 }
        );
      }

      const updateData: Record<string, unknown> = {};
      if (nodes !== undefined) updateData.nodes = typeof nodes === "string" ? nodes : JSON.stringify(nodes);
      if (edges !== undefined) updateData.edges = typeof edges === "string" ? edges : JSON.stringify(edges);

      const canvas = await db.canvas.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json({ success: true, canvas });
    }

    // Action: create new canvas
    const canvas = await db.canvas.create({
      data: {
        userId: user!.id,
        name: name || "Nouveau canevas",
        description: description || null,
        nodes: "[]",
        edges: "[]",
      },
    });

    await logActivity("canvas", "Canevas créé", canvas.name);

    return NextResponse.json({ success: true, canvas });
  } catch (error) {
    console.error("Canvas create error:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}