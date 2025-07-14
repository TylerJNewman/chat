import { mastra } from "@/mastra";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  // Extract threadId along with messages
  const { messages, threadId, resourceId } = await req.json();

  const agent = mastra.getAgent("chatAgent");

  // Pass threadId to the agent stream
  const result = await agent.stream(messages, { threadId, resourceId });

  return result.toDataStreamResponse();
}
