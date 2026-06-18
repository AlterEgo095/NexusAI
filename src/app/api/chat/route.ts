import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { ensureDefaultUser, logActivity, incrementUsage } from "@/lib/ensure-user";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, systemPrompt, conversationId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ success: false, error: "Messages array is required" }, { status: 400 });
    }

    const user = await ensureDefaultUser();

    // Save user message to DB if conversationId provided
    if (conversationId) {
      await db.message.create({
        data: {
          conversationId,
          role: "user",
          content: messages[messages.length - 1].content,
        },
      });
    }

    const zai = await ZAI.create();
    const sdkMessages: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      sdkMessages.push({ role: "system" as const, content: systemPrompt });
    }

    for (const msg of messages) {
      sdkMessages.push({ role: msg.role, content: msg.content });
    }

    const response = await zai.chat.completions.create({
      messages: sdkMessages,
      thinking: { type: "disabled" },
    });

    const content = response.choices?.[0]?.message?.content ?? "";

    // Save assistant message to DB
    if (conversationId) {
      await db.message.create({
        data: {
          conversationId,
          role: "assistant",
          content,
        },
      });
    }

    // Log activity and usage
    await logActivity("chat", "Message envoyé", conversationId ? `Conversation: ${conversationId}` : undefined);
    await incrementUsage("chatRequests");
    await incrementUsage("tokensUsed", content.length);

    // Update conversation title if first message
    if (conversationId && messages.length === 1) {
      await db.conversation.update({
        where: { id: conversationId },
        data: { title: messages[0].content.slice(0, 60) + (messages[0].content.length > 60 ? "..." : "") },
      });
    }

    return NextResponse.json({ success: true, content });
  } catch (error) {
    console.error("Chat API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await ensureDefaultUser();
    const conversations = await db.conversation.findMany({
      where: { userId: user.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ success: true, conversations });
  } catch (error) {
    console.error("Conversations fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });
    await db.conversation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Conversation delete error:", error);
    return NextResponse.json({ success: false, error: "Delete failed" }, { status: 500 });
  }
}

export async function PUT() {
  try {
    const user = await ensureDefaultUser();
    const conversation = await db.conversation.create({
      data: { userId: user.id, title: "Nouvelle conversation" },
    });
    return NextResponse.json({ success: true, conversation });
  } catch (error) {
    console.error("Conversation create error:", error);
    return NextResponse.json({ success: false, error: "Create failed" }, { status: 500 });
  }
}