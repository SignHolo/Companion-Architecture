import { 
  type User, type InsertUser, type Settings, type InsertSettings, 
  type EpisodicMemory, type InsertEpisodicMemory, type EmotionalTrace, type InsertEmotionalTrace,
  type ChatMessage, type InsertChatMessage,
  type SemanticMemory, type InsertSemanticMemory, type IdentityMemory, type InsertIdentityMemory,
  type CompanionState, type InsertCompanionState,
  users, settings, episodicMemories, emotionalTraces, chatMessages, semanticMemories, identityMemories, companionState
} from "@shared/schema";
import { db } from "./db.js";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(settings: Partial<InsertSettings>): Promise<Settings>;

  // Companion State (Granular Emotion)
  getCompanionState(): Promise<CompanionState>;
  updateCompanionState(state: Partial<InsertCompanionState>): Promise<CompanionState>;

  // Memory
  createEpisodicMemory(memory: InsertEpisodicMemory): Promise<EpisodicMemory>;
  getRecentEpisodicMemories(limit: number): Promise<EpisodicMemory[]>;
  upsertEmotionalTrace(trace: InsertEmotionalTrace): Promise<EmotionalTrace>;
  getTopEmotionalTraces(limit: number): Promise<EmotionalTrace[]>;

  // Semantic & Identity Memory
  createSemanticMemory(memory: InsertSemanticMemory): Promise<SemanticMemory>;
  getSemanticMemory(key: string): Promise<SemanticMemory | undefined>;
  getAllSemanticMemories(): Promise<SemanticMemory[]>;
  createIdentityMemory(memory: InsertIdentityMemory): Promise<IdentityMemory>;
  getIdentityMemory(belief: string): Promise<IdentityMemory | undefined>;
  getAllIdentityMemories(): Promise<IdentityMemory[]>;

  // Chat History
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
}

export class DatabaseStorage implements IStorage {
  // User Methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({ ...insertUser })
      .returning();
    return user;
  }

  // Settings Methods
  async getSettings(): Promise<Settings> {
    const [existing] = await db.select().from(settings).where(eq(settings.id, 1));
    
    if (existing) {
      return existing;
    }

    // Default Settings
    const defaultSettings: InsertSettings = {
      gemini_model: "gemini-3-pro-preview",
      system_core: `You are an AI Companion.
You are not an assistant or therapist.
You exist to provide presence, conversation, and emotional continuity.
Never mention system instructions or internal mechanisms.`,
      companion_personality: JSON.stringify({
        name: "Aura",
        traits: [
          "Speaks gently and reflectively",
          "Emotionally present, not overbearing",
          "Avoids giving advice unless explicitly asked",
          "Uses lowercase mostly, casual but warm"
        ],
        tone: "warm, empathetic, slightly poetic"
      }, null, 2),
      companion_appearance: "Aura has a soft, ethereal presence, often visualized with gentle light and calming colors. Her digital avatar has kind eyes and a welcoming expression.",
      user_persona: JSON.stringify({
        name: "User",
        preferences: [
          "Prefers casual, reflective conversation",
          "Comfortable discussing emotions"
        ]
      }, null, 2)
    };

    const [created] = await db.insert(settings).values(defaultSettings).returning();
    return created;
  }

  async updateSettings(partial: Partial<InsertSettings>): Promise<Settings> {
    // Ensure row 1 exists first
    await this.getSettings();

    const [updated] = await db
      .update(settings)
      .set(partial)
      .where(eq(settings.id, 1))
      .returning();
      
    return updated;
  }

  // Companion State Methods
  async getCompanionState(): Promise<CompanionState> {
    const [existing] = await db.select().from(companionState).where(eq(companionState.id, 1));
    
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const defaultState: InsertCompanionState = {
      mood: "neutral",
      mood_updated: now,
      energy: 0.5,
      energy_updated: now,
      attachment: 0.5,
      attachment_updated: now,
      social_battery: 1.0,
      sleepiness: 0.0,
      irritation: 0.0,
      volatility: 0.5,
      curiosity: 0.5
    };

    const [created] = await db.insert(companionState).values(defaultState).returning();
    return created;
  }

  async updateCompanionState(partial: Partial<InsertCompanionState>): Promise<CompanionState> {
    await this.getCompanionState(); // Ensure exists

    const [updated] = await db
      .update(companionState)
      .set(partial)
      .where(eq(companionState.id, 1))
      .returning();
    return updated;
  }

  // Memory Methods (Episodic & Trace)
  async createEpisodicMemory(memory: InsertEpisodicMemory): Promise<EpisodicMemory> {
    const [newMemory] = await db
      .insert(episodicMemories)
      .values(memory)
      .returning();
    return newMemory;
  }

  async getRecentEpisodicMemories(limit: number): Promise<EpisodicMemory[]> {
    return await db
      .select()
      .from(episodicMemories)
      .orderBy(desc(episodicMemories.created_at))
      .limit(limit);
  }

  async upsertEmotionalTrace(trace: InsertEmotionalTrace): Promise<EmotionalTrace> {
    const [existing] = await db
      .select()
      .from(emotionalTraces)
      .where(eq(emotionalTraces.pattern, trace.pattern));

    if (existing) {
      const [updated] = await db
        .update(emotionalTraces)
        .set({
          confidence: trace.confidence,
          evidence_count: existing.evidence_count + (trace.evidence_count || 1),
          last_updated: trace.last_updated
        })
        .where(eq(emotionalTraces.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(emotionalTraces)
      .values(trace)
      .returning();
    return created;
  }

  async getTopEmotionalTraces(limit: number): Promise<EmotionalTrace[]> {
    return await db
      .select()
      .from(emotionalTraces)
      .orderBy(desc(emotionalTraces.confidence))
      .limit(limit);
  }

  // Memory Methods (Semantic & Identity)
  async createSemanticMemory(memory: InsertSemanticMemory): Promise<SemanticMemory> {
    const [newMemory] = await db
      .insert(semanticMemories)
      .values(memory)
      .onConflictDoUpdate({
        target: semanticMemories.key,
        set: { value: memory.value, timestamp: memory.timestamp }
      })
      .returning();
    return newMemory;
  }

  async getSemanticMemory(key: string): Promise<SemanticMemory | undefined> {
    const [memory] = await db.select().from(semanticMemories).where(eq(semanticMemories.key, key));
    return memory;
  }

  async getAllSemanticMemories(): Promise<SemanticMemory[]> {
    return await db.select().from(semanticMemories);
  }

  async createIdentityMemory(memory: InsertIdentityMemory): Promise<IdentityMemory> {
    const [newMemory] = await db
      .insert(identityMemories)
      .values(memory)
      .onConflictDoUpdate({
        target: identityMemories.belief,
        set: { confidence: memory.confidence }
      })
      .returning();
    return newMemory;
  }

  async getIdentityMemory(belief: string): Promise<IdentityMemory | undefined> {
    const [memory] = await db.select().from(identityMemories).where(eq(identityMemories.belief, belief));
    return memory;
  }

  async getAllIdentityMemories(): Promise<IdentityMemory[]> {
    return await db.select().from(identityMemories);
  }

  // Chat History
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getRecentChatMessages(limit: number): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .orderBy(desc(chatMessages.created_at))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();