import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { handleTurn } from "./core/orchestrator.js";
import { storage } from "./storage.js";
import { insertSettingsSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Chat Endpoint
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Check if API key exists
      const settings = await storage.getSettings();
      if (!settings.gemini_api_key) {
        return res.status(401).json({ 
          error: "Gemini API Key not configured. Please set it in settings." 
        });
      }

      // Process turn via Orchestrator
      const response = await handleTurn(message);

      return res.json({ response });
    } catch (error) {
      console.error("Chat error:", error);
      return res.status(500).json({
        error: "An error occurred while processing your message.",
      });
    }
  });

  // Settings Endpoint - Get All Settings
  app.get("/api/settings", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();

      // Return masked keys
      const maskedGemini = settings.gemini_api_key 
        ? `${settings.gemini_api_key.substring(0, 4)}...${settings.gemini_api_key.substring(settings.gemini_api_key.length - 4)}` 
        : "";

      return res.json({ 
        ...settings,
        gemini_api_key: maskedGemini,
        openai_api_key: settings.openai_api_key ? "configured" : "" 
      });
    } catch (error) {
      console.error("Settings get error:", error);
      return res.status(500).json({ error: "Failed to retrieve settings" });
    }
  });

  // Settings Endpoint - Update Settings
  app.post("/api/settings", async (req: Request, res: Response) => {
    try {
      const updateData = { ...req.body };
      
      const updated = await storage.updateSettings(updateData);
      return res.json({ success: true });
    } catch (error) {
      console.error("Settings update error:", error);
      return res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Chat History Endpoint
  app.get("/api/messages", async (req: Request, res: Response) => {
    try {
      const messages = await storage.getRecentChatMessages(50);
      // Reverse to chronological order (oldest first)
      const reversedMessages = messages.reverse();
      return res.json({ messages: reversedMessages });
    } catch (error) {
      console.error("Chat history error:", error);
      return res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
