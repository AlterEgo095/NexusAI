import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/ensure-user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const document = await db.document.findUnique({ where: { id } });

    if (!document) {
      return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error("Document fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, content, type, status } = body;

    const existing = await db.document.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) updateData.status = status;

    const document = await db.document.update({
      where: { id },
      data: updateData,
    });

    await logActivity("document", "Document mis à jour", document.title);

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error("Document update error:", error);
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

    const existing = await db.document.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
    }

    await db.document.delete({ where: { id } });
    await logActivity("document", "Document supprimé", existing.title);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Document delete error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}