import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDefaultUser, logActivity } from "@/lib/ensure-user";

export async function GET() {
  try {
    const user = await ensureDefaultUser();
    const documents = await db.document.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ success: true, documents });
  } catch (error) {
    console.error("Documents fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, type, status, generateWithAI, aiPrompt } = body;

    const user = await ensureDefaultUser();

    let docContent = content || "";

    // If AI generation is requested, generate content via LLM
    if (generateWithAI && aiPrompt) {
      const { getProvider } = await import('@/lib/ai-provider');
      const provider = await getProvider();
      const response = await provider.chat([
          {
            role: "system",
            content: "Tu es un assistant de rédaction professionnel. Génère du contenu structuré en français. Utilise le formatage markdown. Sois concis et professionnel.",
          },
          { role: "user", content: aiPrompt },
        ]);
      docContent = response || docContent;
    }

    const document = await db.document.create({
      data: {
        userId: user.id,
        title: title || "Sans titre",
        type: type || "markdown",
        content: docContent,
        status: status || "draft",
      },
    });

    await logActivity("document", "Document créé", document.title);

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error("Document create error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}