import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { PgVector, PostgresStore } from "@mastra/pg";
import "dotenv/config";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not defined");

const connectionString = process.env.DATABASE_URL;

export const memory = new Memory({
  storage: new PostgresStore({ connectionString }),
  vector: new PgVector({ connectionString }),
  options: {
    lastMessages: 10,
  },
}); 

type ChatAgent = Agent<any, any> & { memory: Memory };

export const chatAgent: ChatAgent = new Agent({
  name: "chat-agent",
  instructions: "You are a helpful AI assistant. You are friendly, concise, and helpful and remember previous conversations.",
  model: openai("gpt-4o-mini"),
  memory, // Add the memory module to the agent
}) as ChatAgent; 