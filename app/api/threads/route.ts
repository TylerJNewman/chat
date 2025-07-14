import type { NextRequest } from "next/server";
import { mastra } from "@/mastra";
import { memory } from "@/mastra/agents";
import type { PostgresStore } from "@mastra/pg";

interface Thread {
  id: string;
  title: string;
  updatedAt: string;
}

interface ContentPart {
  type: string;
  text?: string;
}

interface MessageContent {
  parts: ContentPart[];
}

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const resourceId = "user-123"; // Static for now

    // Query the PostgreSQL memory store for all threads for this resource
    const threads: Thread[] = [];
    
    try {
      // Use the exported memory directly since it's not attached to the agent properly
      if (memory?.storage && 'db' in memory.storage) {
        const storage = memory.storage as PostgresStore; // Cast to access db property
        
        // Query the mastra_messages table to get unique thread IDs
        const query = `
          SELECT DISTINCT thread_id, 
                 MAX("createdAt") as updated_at,
                 COUNT(*) as message_count
          FROM mastra_messages 
          WHERE "resourceId" = $1 
          GROUP BY thread_id 
          ORDER BY updated_at DESC
          LIMIT 50
        `;
        
        const result = await storage.db.manyOrNone(query, [resourceId]);
        
        for (const row of result) {
          // Get the first user message to use as title
          const titleQuery = `
            SELECT content 
            FROM mastra_messages 
            WHERE thread_id = $1 AND "resourceId" = $2 AND role = 'user'
            ORDER BY "createdAt" ASC 
            LIMIT 1
          `;
          const titleResult = await storage.db.oneOrNone(titleQuery, [row.thread_id, resourceId]);
          
          let title = 'New conversation';
          if (titleResult?.content) {
            try {
              // Parse the JSON content structure
              const contentObj = JSON.parse(titleResult.content) as MessageContent;
              if (contentObj.parts && contentObj.parts.length > 0) {
                // Extract text from the first text part
                const textPart = contentObj.parts.find((part: ContentPart) => part.type === 'text');
                if (textPart?.text) {
                  title = textPart.text.length > 50 ? `${textPart.text.substring(0, 50)}...` : textPart.text;
                }
              }
            } catch (e) {
              // Fallback to using the raw content if JSON parsing fails
              const content = typeof titleResult.content === 'string' ? titleResult.content : JSON.stringify(titleResult.content);
              title = content.length > 50 ? `${content.substring(0, 50)}...` : content;
            }
          }
          
          threads.push({
            id: row.thread_id,
            title,
            updatedAt: row.updated_at,
          });
        }
      }
    } catch (dbError) {
      console.error("Database query error:", dbError);
      // Fallback to empty array if database query fails
    }

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