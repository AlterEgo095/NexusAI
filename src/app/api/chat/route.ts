import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, systemPrompt } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Messages array is required and must not be empty" },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    // Build the messages array for the SDK
    const sdkMessages: Array<{ role: string; content: string }> = [];

    // System prompt uses 'assistant' role as specified
    if (systemPrompt) {
      sdkMessages.push({ role: "assistant", content: systemPrompt });
    }

    // Add user/assistant messages
    for (const msg of messages) {
      sdkMessages.push({ role: msg.role, content: msg.content });
    }

    const response = await zai.chat.completions.create({
      messages: sdkMessages,
      thinking: { type: "disabled" },
    });

    const content =
      response.choices?.[0]?.message?.content ?? response.content ?? "";

    return NextResponse.json({ success: true, content });
  } catch (error) {
    console.error("Chat API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}