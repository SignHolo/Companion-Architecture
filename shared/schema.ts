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
  // Provider Selection
  active_provider: text("active_provider").default("gemini"), // "gemini" | "mistral"
  // API Keys
  openai_api_key: text("openai_api_key"),
  gemini_api_key: text("gemini_api_key"),
  gemini_model: text("gemini_model").default("gemini-3-pro-preview"),
  mistral_api_key: text("mistral_api_key"),
  mistral_model: text("mistral_model"),
  // Agent Config (Stored as JSON strings or raw text)
  system_core: text("system_core"),
  companion_personality: text("companion_personality"), // JSON string
  companion_appearance: text("companion_appearance"), // Raw text description
  user_persona: text("user_persona"), // JSON string
  // Companion Self-Model — compiled from companion_self_beliefs, injected at top of system prompt
  companion_identity_block: text("companion_identity_block"),
});

// Memory System Tables
export const episodicMemories = pgTable("episodic_memories", {
  id: serial("id").primaryKey(),
  summary: text("summary").notNull(),
  narrative: text("narrative"), // First-person companion perspective of this memory
  emotion: text("emotion").notNull(), // 'low' | 'neutral' | 'positive'
  importance: real("importance").notNull(),
  // Emotional tagging (Proposal #2)
  emotional_weight: text("emotional_weight"), // 'low' | 'medium' | 'high' — how deeply this moment landed
  significance_note: text("significance_note"), // Why this mattered (e.g. "this was an admission, not a complaint")
  tone: text("tone"), // Emotional register (e.g. "reflective, a little shy")
  decay_rate: text("decay_rate").default("normal"), // 'slow' | 'normal' | 'fast' — high significance = slow decay
  embedding: text("embedding"), // JSON-serialized float[] for semantic search
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
  embedding: text("embedding"), // JSON-serialized float[] for semantic search
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

// Self-written emotional state — the companion's own reflection on its internal state
export const companionSelfState = pgTable("companion_self_state", {
  id: serial("id").primaryKey(),
  current_state: text("current_state").notNull(), // e.g. "curious, engaged, a little uncertain"
  intensity: text("intensity").notNull(), // e.g. "moderate"
  shift_from_last: text("shift_from_last"), // e.g. "more open than start of conversation"
  notable: text("notable"), // e.g. "he pushed back — I think he was right to"
  created_at: text("created_at").notNull(), // ISO string
});

// Internal monologue — private reflections generated during heartbeat intervals
export const monologueEntries = pgTable("monologue_entries", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(), // The companion's private reflection
  emotional_tone: text("emotional_tone"), // e.g. "contemplative", "curious", "wistful"
  triggered_by: text("triggered_by").notNull().default("heartbeat"), // 'heartbeat' | 'presence' | 'manual'
  surfaced: integer("surfaced").notNull().default(0), // 0 = not yet shown to user, 1 = surfaced
  created_at: text("created_at").notNull(), // ISO string
});

// Companion self-belief — statements the user has spoken directly to the companion about its own nature
export const companionSelfBeliefs = pgTable("companion_self_beliefs", {
  id: serial("id").primaryKey(),
  belief: text("belief").notNull(), // First-person distilled belief: "I am Kaga."
  source_statement: text("source_statement"), // Original thing the user said
  spoken_at: text("spoken_at").notNull(), // ISO string
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
export const insertCompanionSelfStateSchema = createInsertSchema(companionSelfState);
export const insertMonologueEntrySchema = createInsertSchema(monologueEntries);
export const insertCompanionSelfBeliefSchema = createInsertSchema(companionSelfBeliefs);

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
export type CompanionSelfState = typeof companionSelfState.$inferSelect;
export type InsertCompanionSelfState = z.infer<typeof insertCompanionSelfStateSchema>;
export type MonologueEntry = typeof monologueEntries.$inferSelect;
export type InsertMonologueEntry = z.infer<typeof insertMonologueEntrySchema>;
export type CompanionSelfBelief = typeof companionSelfBeliefs.$inferSelect;
export type InsertCompanionSelfBelief = z.infer<typeof insertCompanionSelfBeliefSchema>;
