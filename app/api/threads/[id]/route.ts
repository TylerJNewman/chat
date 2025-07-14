import { mastra } from "@/mastra";
import type { NextRequest } from "next/server";

export const maxDuration = 30;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: threadId } = await params;
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: threadId } = await params;
    const resourceId = "user-123"; // Static for now

    if (!threadId) {
      return Response.json({ error: "Thread ID is required" }, { status: 400 });
    }

    // TODO: In a real implementation, you would delete the thread from PostgreSQL
    // and clear any associated memory data. For now, we'll just return success
    // since Mastra's memory will naturally clean up unused threads over time.
    
    console.log(`Deleting thread: ${threadId} for resource: ${resourceId}`);
    
    return Response.json({ 
      success: true,
      threadId,
      resourceId 
    });

  } catch (error) {
    console.error("Error deleting thread:", error);
    return Response.json(
      { error: "Failed to delete thread" },
      { status: 500 }
    );
  }
} 