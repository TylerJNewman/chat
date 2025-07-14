import { mastra } from "@/mastra";
import { memory } from "@/mastra/agents";
import type { NextRequest } from "next/server";
import type { PostgresStore } from "@mastra/pg";

interface MessageContentPart {
  type: string;
  text?: string;
}

interface MessageContent {
  parts: MessageContentPart[];
}

interface ThreadMessage {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}

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

    // Get messages for this thread from the database
    let messages: ThreadMessage[] = [];
    
    try {
      if (memory?.storage && 'db' in memory.storage) {
        const storage = memory.storage as PostgresStore;
        
        // Optimized query that processes JSON in the database
        const query = `
          SELECT 
            id,
            role,
            content,
            "createdAt",
            CASE 
              WHEN content::jsonb ? 'parts' THEN 
                (SELECT string_agg(part->>'text', '') 
                 FROM jsonb_array_elements(content::jsonb->'parts') part 
                 WHERE part->>'type' = 'text')
              ELSE 
                content::text
            END as extracted_content
          FROM mastra_messages 
          WHERE thread_id = $1 AND "resourceId" = $2
          ORDER BY "createdAt" ASC
        `;
        
        const result = await storage.db.manyOrNone(query, [threadId, resourceId]);
        
        messages = result.map(row => ({
          id: row.id,
          role: row.role,
          content: row.extracted_content || row.content,
          createdAt: row.createdAt,
        }));
      }
    } catch (dbError) {
      console.error("Database query error for thread messages:", dbError);
      
      // Fallback to the original approach if the optimized query fails
      try {
        if (memory?.storage && 'db' in memory.storage) {
          const storage = memory.storage as PostgresStore;
          
          const fallbackQuery = `
            SELECT id, content, role, "createdAt"
            FROM mastra_messages 
            WHERE thread_id = $1 AND "resourceId" = $2
            ORDER BY "createdAt" ASC
          `;
          
          const result = await storage.db.manyOrNone(fallbackQuery, [threadId, resourceId]);
          
          messages = result.map(row => {
            try {
              const contentObj = JSON.parse(row.content) as MessageContent;
              let messageContent = '';
              
              if (contentObj.parts && contentObj.parts.length > 0) {
                const textParts = contentObj.parts
                  .filter((part: MessageContentPart) => part.type === 'text')
                  .map((part: MessageContentPart) => part.text)
                  .join('');
                messageContent = textParts;
              } else {
                messageContent = row.content;
              }
              
              return {
                id: row.id,
                role: row.role,
                content: messageContent,
                createdAt: row.createdAt,
              };
            } catch (parseError) {
              console.warn('Failed to parse message content:', parseError);
              return {
                id: row.id,
                role: row.role,
                content: row.content,
                createdAt: row.createdAt,
              };
            }
          });
        }
      } catch (fallbackError) {
        console.error("Fallback query also failed:", fallbackError);
        // Return empty array on complete failure
      }
    }
    
    return Response.json({ 
      messages,
      threadId,
      resourceId 
    });

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: threadId } = await params;
    const resourceId = "user-123"; // Static for now

    if (!threadId) {
      return Response.json({ error: "Thread ID is required" }, { status: 400 });
    }

    console.log(`Deleting thread: ${threadId} for resource: ${resourceId}`);
    
    // Delete the thread from PostgreSQL database
    try {
      if (memory?.storage && 'db' in memory.storage) {
        const storage = memory.storage as PostgresStore;
        
        // Delete all messages for this thread
        const deleteQuery = `
          DELETE FROM mastra_messages 
          WHERE thread_id = $1 AND "resourceId" = $2
        `;
        
        const result = await storage.db.none(deleteQuery, [threadId, resourceId]);
        console.log(`Successfully deleted thread ${threadId} from database`);
      }
    } catch (dbError) {
      console.error("Database deletion error:", dbError);
      return Response.json(
        { error: "Failed to delete thread from database" },
        { status: 500 }
      );
    }
    
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