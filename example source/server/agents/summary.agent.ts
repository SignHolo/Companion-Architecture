import { GoogleGenerativeAI } from "@google/generative-ai";
import { ai } from "../gemini"; // Import the initialized genAI instance
import { safetySettings } from "../gemini"; // Import safetySettings

export class SummaryAgent {
  constructor() {}

  async summarizeForMemory(messages: string[], location: string, apiKey?: string): Promise<string> {
    const geminiClient = apiKey ? new GoogleGenerativeAI(apiKey) : ai;
    const model = geminiClient.getGenerativeModel({
      model: "gemini-2.5-pro", // Keep the requested model change
      safetySettings,
    });

    const text = messages.map(m => `- ${m}`).join("\n");
    const prompt = `Create a summary of the following scene. The summary MUST begin with a "Header:" line containing the provided scene location.

Scene Location: ${location}

Conversation Snippet:
---
${text}
---

Summary:
Header: ${location}
`;

    try {
      const result = await model.generateContent(prompt);
      return result.response.text() || text;
    } catch (err: any) {
      console.error("Failed to summarize:", err);
      return `Summary of conversation at ${location}: ${messages.join(" ... ")}`;
    }
  }
}
