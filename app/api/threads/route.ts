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
        
        // Optimized single query using window functions to get thread info and first user message
        const query = `
          WITH thread_info AS (
            SELECT DISTINCT thread_id, 
                   MAX("createdAt") OVER (PARTITION BY thread_id) as updated_at,
                   COUNT(*) OVER (PARTITION BY thread_id) as message_count
            FROM mastra_messages 
            WHERE "resourceId" = $1
          ),
          first_user_messages AS (
            SELECT DISTINCT ON (thread_id) 
                   thread_id,
                   content
            FROM mastra_messages 
            WHERE "resourceId" = $1 AND role = 'user'
            ORDER BY thread_id, "createdAt" ASC
          )
          SELECT DISTINCT 
                 ti.thread_id,
                 ti.updated_at,
                 COALESCE(fum.content, '') as first_message_content
          FROM thread_info ti
          LEFT JOIN first_user_messages fum ON ti.thread_id = fum.thread_id
          ORDER BY ti.updated_at DESC
          LIMIT 50
        `;
        
        const result = await storage.db.manyOrNone(query, [resourceId]);
        
        for (const row of result) {
          let title = 'New conversation';
          
          if (row.first_message_content) {
            try {
              // Parse the JSON content structure
              const contentObj = JSON.parse(row.first_message_content) as MessageContent;
              if (contentObj.parts && contentObj.parts.length > 0) {
                // Extract text from the first text part
                const textPart = contentObj.parts.find((part: ContentPart) => part.type === 'text');
                if (textPart?.text) {
                  title = textPart.text.length > 50 ? `${textPart.text.substring(0, 50)}...` : textPart.text;
                }
              }
            } catch (e) {
              // Fallback to using the raw content if JSON parsing fails
              const content = typeof row.first_message_content === 'string' ? row.first_message_content : JSON.stringify(row.first_message_content);
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