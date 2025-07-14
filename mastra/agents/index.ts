import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { PgVector, PostgresStore } from "@mastra/pg";
import "dotenv/config";

if (!process.env.POSTGRES_HOST) throw new Error("POSTGRES_HOST is not defined");
// if (!process.env.POSTGRES_PORT) throw new Error("POSTGRES_PORT is not defined");
if (!process.env.POSTGRES_USER) throw new Error("POSTGRES_USER is not defined");
if (!process.env.POSTGRES_PASSWORD) throw new Error("POSTGRES_PASSWORD is not defined");
if (!process.env.POSTGRES_DATABASE) throw new Error("POSTGRES_DATABASE is not defined");

const connectionString = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DATABASE}`;

export const memory = new Memory({
  storage: new PostgresStore({
     host: process.env.POSTGRES_HOST,
     port: Number(process.env.POSTGRES_PORT || 5432),
     user: process.env.POSTGRES_USER,
     database: process.env.POSTGRES_DATABASE,
     password: process.env.POSTGRES_PASSWORD,
  }),
  vector: new PgVector({ connectionString }),
}); 

export const chatAgent = new Agent({
  name: "chat-agent",
  instructions: "You are a helpful AI assistant. You are friendly, concise, and helpful and remember previous conversations.",
  model: openai("gpt-4o-mini"),
  memory, // Add the memory module to the agent
}); 