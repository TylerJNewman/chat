import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { PgVector, PostgresStore } from "@mastra/pg";
import "dotenv/config";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not defined");

const connectionString = process.env.DATABASE_URL;

// Singleton pattern for database connections to avoid duplicates
let _postgresStore: PostgresStore | null = null;
let _pgVector: PgVector | null = null;
let _memory: Memory | null = null;

function getPostgresStore() {
  if (!_postgresStore) {
    _postgresStore = new PostgresStore({ connectionString });
  }
  return _postgresStore;
}

function getPgVector() {
  if (!_pgVector) {
    _pgVector = new PgVector({ connectionString });
  }
  return _pgVector;
}

export const memory = (() => {
  if (!_memory) {
    _memory = new Memory({
      storage: getPostgresStore(),
      vector: getPgVector(),
      options: {
        lastMessages: 10,
      },
    });
  }
  return _memory;
})();

export const chatAgent = new Agent({
  name: "chat-agent",
  instructions: "You are a helpful AI assistant. You are friendly, concise, and helpful and remember previous conversations.",
  model: openai("gpt-4o-mini"),
  memory, // Add the memory module to the agent
}); 