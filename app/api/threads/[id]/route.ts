import { mastra } from "@/mastra";
import type { NextRequest } from "next/server";

export const maxDuration = 30;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const threadId = params.id;
    const resourceId = "user-123"; // Static for now, should match the one in chat provider

    if (!threadId) {
      return Response.json({ error: "Thread ID is required" }, { status: 400 });
    }

    // Get the agent to access its memory
    const agent = mastra.getAgent("chatAgent");
    
    // Try to get the memory for this thread
    // Note: This is a simplified approach. In a real implementation,
    // you'd have a more direct way to query the memory store
    try {
      // For now, we'll return an empty array for new threads
      // The actual memory retrieval would depend on the Mastra memory API
      // which might not have a direct "get messages" method
      
      return Response.json({ 
        messages: [],
        threadId,
        resourceId 
      });
    } catch (memoryError) {
      // If thread doesn't exist, return empty messages
      return Response.json({ 
        messages: [],
        threadId,
        resourceId 
      });
    }

  } catch (error) {
    console.error("Error fetching thread:", error);
    return Response.json(
      { error: "Failed to fetch thread" },
      { status: 500 }
    );
  }
} 