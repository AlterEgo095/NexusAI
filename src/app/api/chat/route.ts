import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDefaultUser, logActivity, incrementUsage } from "@/lib/ensure-user";
import { getProvider } from "@/lib/ai-provider";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, systemPrompt, conversationId, stream = false } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ success: false, error: "Messages array is required" }, { status: 400 });
    }

    const user = await ensureDefaultUser();

    // Ensure conversation exists and belongs to user
    let activeConversationId = conversationId;
    if (activeConversationId) {
      const existing = await db.conversation.findFirst({
        where: { id: activeConversationId, userId: user.id },
      });
      if (!existing) {
        const conv = await db.conversation.create({
          data: { userId: user.id, title: messages[0].content.slice(0, 60) + (messages[0].content.length > 60 ? "..." : "") },
        });
        activeConversationId = conv.id;
      }
    }

    // Save user message to DB
    if (activeConversationId) {
      await db.message.create({
        data: {
          conversationId: activeConversationId,
          role: "user",
          content: messages[messages.length - 1].content,
        },
      });
    }

    const provider = await getProvider();
    const sdkMessages = [];
    if (systemPrompt) {
      sdkMessages.push({ role: "system" as const, content: systemPrompt });
    }
    for (const msg of messages) {
      sdkMessages.push({ role: msg.role, content: msg.content });
    }

    // ── SSE Streaming ──
    if (stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let fullContent = '';
          try {
            const gen = provider.chatStream(sdkMessages);
            for await (const chunk of gen) {
              fullContent += chunk;
              const data = JSON.stringify({ type: 'chunk', content: chunk });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }

            // Save assistant message to DB
            if (activeConversationId && fullContent) {
              await db.message.create({
                data: { conversationId: activeConversationId, role: "assistant", content: fullContent },
              });
            }

            await logActivity("chat", "Message streamé", activeConversationId ? `Conversation: ${activeConversationId}` : undefined);
            await incrementUsage("chatRequests");
            await incrementUsage("tokensUsed", fullContent.length);

            // Update conversation title if first message
            if (activeConversationId && messages.length === 1) {
              await db.conversation.update({
                where: { id: activeConversationId },
                data: { title: messages[0].content.slice(0, 60) + (messages[0].content.length > 60 ? "..." : "") },
              });
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', content: fullContent })}\n\n`));
            controller.close();
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Stream error";
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: msg })}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // ── Non-streaming (original) ──
    const response = await provider.chat(sdkMessages);
    const content = response.content;

    if (activeConversationId && content) {
      await db.message.create({
        data: { conversationId: activeConversationId, role: "assistant", content },
      });
    }

    await logActivity("chat", "Message envoyé", activeConversationId ? `Conversation: ${activeConversationId}` : undefined);
    await incrementUsage("chatRequests");
    await incrementUsage("tokensUsed", content.length);

    if (activeConversationId && messages.length === 1) {
      await db.conversation.update({
        where: { id: activeConversationId },
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