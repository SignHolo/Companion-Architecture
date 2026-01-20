import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";

interface GenerateStoryRequest {
  prompt: string;
  apiKey: string;
  systemPrompt: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/generate-story", async (req: Request, res: Response) => {
    try {
      const { prompt, apiKey, systemPrompt } = req.body as GenerateStoryRequest;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      if (!apiKey) {
        return res.status(400).json({ error: "API key is required" });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `${systemPrompt}\n\nUser's story prompt: ${prompt}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.9,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage =
          errorData.error?.message || "Failed to generate story";
        return res.status(response.status).json({ error: errorMessage });
      }

      const data = await response.json();

      const story =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Unable to generate story. Please try again.";

      return res.json({ story });
    } catch (error) {
      console.error("Story generation error:", error);
      return res.status(500).json({
        error: "An error occurred while generating the story. Please try again.",
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
