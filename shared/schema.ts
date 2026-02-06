import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  // API Keys
  openai_api_key: text("openai_api_key"),
  gemini_api_key: text("gemini_api_key"),
  gemini_model: text("gemini_model").default("gemini-3-pro-preview"),
  // Agent Config (Stored as JSON strings or raw text)
  system_core: text("system_core"),
  companion_personality: text("companion_personality"), // JSON string
  companion_appearance: text("companion_appearance"), // Raw text description
  user_persona: text("user_persona"), // JSON string
});

// Memory System Tables
export const episodicMemories = pgTable("episodic_memories", {
  id: serial("id").primaryKey(),
  summary: text("summary").notNull(),
  emotion: text("emotion").notNull(), // 'low' | 'neutral' | 'positive'
  importance: real("importance").notNull(), 
  created_at: text("created_at").notNull(), // ISO string
});

export const emotionalTraces = pgTable("emotional_traces", {
  id: serial("id").primaryKey(),
  pattern: text("pattern").notNull().unique(),
  confidence: real("confidence").notNull(),
  evidence_count: integer("evidence_count").notNull().default(1),
  last_updated: text("last_updated").notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(), // 'user' or 'model'
  content: text("content").notNull(),
  created_at: text("created_at").notNull(), // ISO string
});

export const semanticMemories = pgTable("semantic_memories", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  source: text("source").notNull(),
  timestamp: text("timestamp").notNull(),
});

export const identityMemories = pgTable("identity_memories", {
  id: serial("id").primaryKey(),
  belief: text("belief").notNull().unique(),
  confidence: real("confidence").notNull(),
});

export const companionState = pgTable("companion_state", {
  id: serial("id").primaryKey(),
  // Granular State Tracking
  mood: text("mood").notNull(), // 'low' | 'neutral' | 'positive'
  mood_updated: text("mood_updated").notNull(), // ISO string
  energy: real("energy").notNull(), // 0.0 - 1.0
  energy_updated: text("energy_updated").notNull(), // ISO string
  attachment: real("attachment").notNull(), // 0.0 - 1.0
  attachment_updated: text("attachment_updated").notNull(), // ISO string
  
  // Advanced 'Aliveness' Metrics
  social_battery: real("social_battery").notNull().default(1.0), // 0.0 (Drained) - 1.0 (Full)
  sleepiness: real("sleepiness").notNull().default(0.0), // 0.0 (Awake) - 1.0 (Asleep)
  irritation: real("irritation").notNull().default(0.0), // 0.0 (Calm) - 1.0 (Furious)
  volatility: real("volatility").notNull().default(0.5), // 0.0 (Stable) - 1.0 (Unpredictable)
  curiosity: real("curiosity").notNull().default(0.5), // 0.0 (Bored) - 1.0 (Invested)
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSettingsSchema = createInsertSchema(settings);
export const insertEpisodicMemorySchema = createInsertSchema(episodicMemories);
export const insertEmotionalTraceSchema = createInsertSchema(emotionalTraces);
export const insertChatMessageSchema = createInsertSchema(chatMessages);
export const insertSemanticMemorySchema = createInsertSchema(semanticMemories);
export const insertIdentityMemorySchema = createInsertSchema(identityMemories);
export const insertCompanionStateSchema = createInsertSchema(companionState);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;
export type EpisodicMemory = typeof episodicMemories.$inferSelect;
export type EmotionalTrace = typeof emotionalTraces.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type SemanticMemory = typeof semanticMemories.$inferSelect;
export type InsertSemanticMemory = z.infer<typeof insertSemanticMemorySchema>;
export type IdentityMemory = typeof identityMemories.$inferSelect;
export type InsertIdentityMemory = z.infer<typeof insertIdentityMemorySchema>;
export type CompanionState = typeof companionState.$inferSelect;
export type InsertCompanionState = z.infer<typeof insertCompanionStateSchema>;
