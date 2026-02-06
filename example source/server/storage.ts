// Based on javascript_database blueprint
import {
  settings,
  messages,
  memoryLogs,
  archivedTranscripts,
  type Settings,
  type InsertSettings,
  type Message,
  type InsertMessage,
  type MemoryLog,
  type InsertMemoryLog,
  type ArchivedTranscript,
  type InsertArchivedTranscript,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Settings
  getSettings(): Promise<Settings | undefined>;
  updateSettings(data: Partial<InsertSettings>): Promise<Settings>;

  // Messages
  getAllMessages(): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteAllMessages(): Promise<void>;

  // Memory Logs
  getAllMemoryLogs(): Promise<MemoryLog[]>;
  createMemoryLog(log: InsertMemoryLog): Promise<MemoryLog>;
  updateMemoryLog(id: string, content: string): Promise<MemoryLog>;
  deleteMemoryLog(id: string): Promise<void>;
  getLatestMemoryLogForLocation(location: string): Promise<MemoryLog | undefined>;
  
  //Archived Transcripts
  createArchivedTranscript(transcript: InsertArchivedTranscript): Promise<ArchivedTranscript>;
  getArchivedTranscriptByMemoryLogId(memoryLogId: string): Promise<ArchivedTranscript | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Settings
  async getSettings(): Promise<Settings | undefined> {
    const [result] = await db.select().from(settings).limit(1);
    return result || undefined;
  }

  async updateSettings(data: Partial<InsertSettings>): Promise<Settings> {
    // Check if settings exist
    const existing = await this.getSettings();

    if (existing) {
      // Update existing settings
      const [updated] = await db
        .update(settings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(settings.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new settings
      const [created] = await db
        .insert(settings)
        .values({
          behaviorPrompt: data.behaviorPrompt || "You are a creative and engaging storyteller.",
          frameworkTemplate: data.frameworkTemplate || "",
          geminiApiKey: data.geminiApiKey || null,
        })
        .returning();
      return created;
    }
  }

  // Messages
  async getAllMessages(): Promise<Message[]> {
    return await db.select().from(messages).orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    return created;
  }

  async deleteAllMessages(): Promise<void> {
    await db.delete(messages);
  }

  // Memory Logs
  async getAllMemoryLogs(): Promise<MemoryLog[]> {
    return await db.select().from(memoryLogs).orderBy(desc(memoryLogs.createdAt));
  }

  async createMemoryLog(log: InsertMemoryLog): Promise<MemoryLog> {
    const [created] = await db.insert(memoryLogs).values(log).returning();
    return created;
  }

  async updateMemoryLog(id: string, content: string): Promise<MemoryLog> {
    const [updated] = await db
      .update(memoryLogs)
      .set({ content, updatedAt: new Date() })
      .where(eq(memoryLogs.id, id))
      .returning();
    return updated;
  }

  async deleteMemoryLog(id: string): Promise<void> {
    await db.delete(memoryLogs).where(eq(memoryLogs.id, id));
  }
  
  async getLatestMemoryLogForLocation(location: string): Promise<MemoryLog | undefined> {
    const [result] = await db.select().from(memoryLogs).where(eq(memoryLogs.location, location)).orderBy(desc(memoryLogs.createdAt)).limit(1);
    return result;
  }
  
  //Archived Transcripts
  async createArchivedTranscript(transcript: InsertArchivedTranscript): Promise<ArchivedTranscript> {
    const [created] = await db.insert(archivedTranscripts).values(transcript).returning();
    return created;
  }
  
  async getArchivedTranscriptByMemoryLogId(memoryLogId: string): Promise<ArchivedTranscript | undefined> {
    const [result] = await db.select().from(archivedTranscripts).where(eq(archivedTranscripts.memory_log_id, memoryLogId)).limit(1);
    return result;
  }
}

export const storage = new DatabaseStorage();
