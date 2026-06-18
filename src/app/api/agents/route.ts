import { NextRequest, NextResponse } from "next/server";

// In-memory agent store
interface Agent {
  id: string;
  name: string;
  description: string;
  role: string;
  systemPrompt: string;
  tools: string[];
}

// Predefined agents
const defaultAgents: Agent[] = [
  {
    id: "agent-1",
    name: "General Assistant",
    description: "A helpful AI assistant that can answer questions and help with various tasks.",
    role: "assistant",
    systemPrompt:
      "You are a helpful AI assistant. Answer questions clearly and concisely.",
    tools: ["chat"],
  },
  {
    id: "agent-2",
    name: "Research Agent",
    description: "Specialized in web research and summarizing search results.",
    role: "researcher",
    systemPrompt:
      "You are a research specialist. Help users find and summarize information from the web. Provide well-organized, factual summaries.",
    tools: ["chat", "search"],
  },
  {
    id: "agent-3",
    name: "Creative Writer",
    description: "A creative writing assistant for stories, poems, and content creation.",
    role: "writer",
    systemPrompt:
      "You are a creative writer. Help users with creative writing tasks including stories, poems, scripts, and content creation. Be imaginative and expressive.",
    tools: ["chat"],
  },
  {
    id: "agent-4",
    name: "Code Helper",
    description: "Helps with coding questions, debugging, and code generation.",
    role: "coder",
    systemPrompt:
      "You are a coding expert. Help users with programming questions, debug code, generate code snippets, and explain technical concepts. Use clear code examples.",
    tools: ["chat"],
  },
  {
    id: "agent-5",
    name: "Image Creator",
    description: "Generates images based on text descriptions.",
    role: "artist",
    systemPrompt:
      "You are an AI art director. Help users create detailed, vivid prompts for image generation. Suggest improvements to prompts for better results.",
    tools: ["chat", "image"],
  },
];

const agentStore: Agent[] = [...defaultAgents];

export async function GET() {
  return NextResponse.json({ success: true, agents: agentStore });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, role, systemPrompt, tools } = body;

    if (!name || !systemPrompt) {
      return NextResponse.json(
        {
          success: false,
          error: "Name and systemPrompt are required",
        },
        { status: 400 }
      );
    }

    const newAgent: Agent = {
      id: `agent-${Date.now()}`,
      name: name,
      description: description ?? "",
      role: role ?? "assistant",
      systemPrompt: systemPrompt,
      tools: Array.isArray(tools) ? tools : [],
    };

    agentStore.push(newAgent);

    return NextResponse.json({ success: true, agent: newAgent });
  } catch (error) {
    console.error("Agents API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}