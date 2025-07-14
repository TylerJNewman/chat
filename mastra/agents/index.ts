import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { PgVector, PostgresStore } from "@mastra/pg";
import "dotenv/config";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not defined");

const connectionString = process.env.DATABASE_URL;

// Global singleton pattern that works with Next.js HMR
declare global {
  var __mastra_postgres_store: PostgresStore | undefined;
  var __mastra_pg_vector: PgVector | undefined;
  var __mastra_memory: Memory | undefined;
}

function getPostgresStore() {
  if (!global.__mastra_postgres_store) {
    global.__mastra_postgres_store = new PostgresStore({ connectionString });
  }
  return global.__mastra_postgres_store;
}

function getPgVector() {
  if (!global.__mastra_pg_vector) {
    global.__mastra_pg_vector = new PgVector({ connectionString });
  }
  return global.__mastra_pg_vector;
}

export const memory = (() => {
  if (!global.__mastra_memory) {
    global.__mastra_memory = new Memory({
      storage: getPostgresStore(),
      vector: getPgVector(),
      options: {
        lastMessages: 10,
      },
    });
  }
  return global.__mastra_memory;
})();

export const chatAgent = new Agent({
  name: "chat-agent",
  instructions: "You are a helpful AI assistant. You are friendly, concise, and helpful and remember previous conversations.",
  model: openai("gpt-4o-mini"),
  memory, // Add the memory module to the agent
}); 