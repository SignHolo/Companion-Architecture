import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateStoryResponse, retrieveRelevantMemories, summarizeForMemory } from "./gemini";
import { SmartRagAgent } from "./agents/SmartRagAgent";
import { GenerationAgent } from "./agents/generation.agent";
import { ProofreaderAgent } from "./agents/proofreader.agent";
import { insertMessageSchema, insertMemoryLogSchema, insertSettingsSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all messages
  app.get("/api/messages", async (_req, res) => {
    try {
      const messages = await storage.getAllMessages();
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get settings
  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings || {
        behaviorPrompt: "You are a creative and engaging storyteller. Your responses should be imaginative, vivid, and captivating.",
        frameworkTemplate: "",
        geminiApiKey: null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update settings
  app.put("/api/settings", async (req, res) => {
    try {
      const data = insertSettingsSchema.partial().parse(req.body);
      const updated = await storage.updateSettings(data);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get all memory logs
  app.get("/api/memory", async (_req, res) => {
    try {
      const logs = await storage.getAllMemoryLogs();
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update memory log
  app.put("/api/memory/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = z.object({ content: z.string() }).parse(req.body);
      const updated = await storage.updateMemoryLog(id, content);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete memory log
  app.delete("/api/memory/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMemoryLog(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Chat endpoint - main AI interaction with the complete agent flow
  app.post("/api/chat", async (req, res) => {
    try {
      const { content } = z.object({ content: z.string() }).parse(req.body);

      // Get settings for behavior and API key
      const settings = await storage.getSettings();
      const apiKey = settings?.geminiApiKey || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(400).json({
          error: "Gemini API key not configured. Please add it in Settings.",
        });
      }

      // Store user message first
      const userMessage = await storage.createMessage({
        role: "user",
        content: content,
      });

      // Get conversation history (now includes the user's message)
      const allMessages = await storage.getAllMessages();

      // Determine if this is a story mode request (you might have a different condition)
      // For now, assuming all requests go through the agent flow
      const isStoryMode = true; // You might want to implement a more sophisticated check

      let aiResponse: string;

      if (isStoryMode) {
        // Initialize agents
        const smartRagAgent = new SmartRagAgent(apiKey);
        const generationAgent = new GenerationAgent();
        const proofreaderAgent = new ProofreaderAgent();

        // Use Query Agent via SmartRagAgent to get relevant memories
        const filteredContext = await smartRagAgent.handleRequest(content, allMessages, apiKey);

        // Log the full output from SmartRagAgent for testing
        console.log(`[DEBUG] SmartRagAgent output (filtered canon):\n${filteredContext}`);

        // Prepare context for Generation Agent
        const chatContext = {
          behaviorPrompt: settings?.behaviorPrompt || "You are a creative and engaging storyteller. Your responses should be imaginative, vivid, and captivating.",
          frameworkTemplate: settings?.frameworkTemplate || "",
          characterPreset: settings?.characterPreset,
          lore: settings?.lore,
          relevantMemories: filteredContext ? [filteredContext] : [],
          conversationHistory: allMessages.slice(-20).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        };

        // Generate the response using the Generation Agent
        aiResponse = await generationAgent.generateStoryResponse(content, chatContext, apiKey);

        // Proofread the response
        const proofreaderResult = await proofreaderAgent.reviewResponse(aiResponse, apiKey, content);

        if (!proofreaderResult.isCompliant) {
          // If not compliant, you might want to regenerate or modify the response
          // For now, we'll return the original response with a note
          console.log(`[Proofreader] Response was not compliant: ${proofreaderResult.feedback}`);
          // In a real implementation, you might want to handle non-compliant responses differently
        }
      } else {
        // Fallback to original method if not in story mode
        const smartRagAgent = new SmartRagAgent(apiKey);
        aiResponse = await smartRagAgent.handleRequest(content, allMessages, apiKey);
      }

      // Store AI response
      const assistantMessage = await storage.createMessage({
        role: "assistant",
        content: aiResponse,
      });

      // Get updated message count after storing assistant message
      const updatedMessages = await storage.getAllMessages();
      const totalMessages = updatedMessages.length;

      // Create memory log every 4 messages (2 exchanges) - preserve original functionality
      if (totalMessages % 4 === 0 && totalMessages > 0) {
        const lastFourMessages = updatedMessages.slice(-4);
        const conversationSnippet = lastFourMessages
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n");

        const summary = await summarizeForMemory(
          lastFourMessages.map((m) => m.content),
          apiKey
        );

        await storage.createMemoryLog({
          content: conversationSnippet,
          summary,
          importance: 5,
        });
      }

      res.json(assistantMessage);
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: error.message || "Failed to generate response" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
