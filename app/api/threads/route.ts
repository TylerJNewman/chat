import type { NextRequest } from "next/server";

interface Thread {
  id: string;
  title: string;
  updatedAt: string;
}

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const resourceId = "user-123"; // Static for now

    // TODO: In a real implementation, you would query the PostgreSQL database
    // to get all threads for this resourceId. For now, we'll return mock data
    // or try to get thread info from the memory store
    
    // For now, return empty array since we don't have a direct way to query
    // all threads from Mastra memory. This would require custom database queries.
    const threads: Thread[] = [
      // Mock thread for demonstration
      // In reality, these would come from your database
    ];

    return Response.json({ 
      threads,
      resourceId 
    });

  } catch (error) {
    console.error("Error fetching threads:", error);
    return Response.json(
      { error: "Failed to fetch threads" },
      { status: 500 }
    );
  }
} 