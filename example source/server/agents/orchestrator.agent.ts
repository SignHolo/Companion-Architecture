import { GenerationAgent } from "./generation.agent";
import { ProofreaderAgent } from "./proofreader.agent";
import { storage } from "../storage";
import type { Message } from "@shared/schema";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SmartRagAgent } from "./SmartRagAgent";

export class OrchestratorAgent {
  private generationAgent: GenerationAgent;
  private proofreaderAgent: ProofreaderAgent;

  constructor() {
    this.generationAgent = new GenerationAgent();
    this.proofreaderAgent = new ProofreaderAgent();
  }

  private async _extractLocation(text: string, apiKey: string): Promise<string | undefined> {
    if (!text) return undefined;
    const explicitMatch = text.match(/^\s*\*\*Location:\*\*\s*(.*)/);
    if (explicitMatch && explicitMatch[1]) {
      return explicitMatch[1].trim();
    }
    const header = text.split('\n').slice(0, 5).join('\n');
    try {
      const gemini = new GoogleGenerativeAI(apiKey);
      const model = gemini.getGenerativeModel({ model: "gemini-3-flash-preview" });
      const prompt = `
From the following header, extract the full location string. The location is typically the first line, often containing a place, time, and day. It might look like "Heizen Academy - Classroom 1-A | Morning | [Day 1] | 09:00".
Respond with *only* the location string, and nothing else. If no clear location is found, respond with "N/A".
Header:
"""
${header}
"""
`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const location = response.text().trim();
      if (location && location !== "N/A" && location.length > 5) {
        return location;
      }
      return undefined;
    } catch (error) {
      console.error("AI-based location extraction failed:", error);
      return undefined;
    }
  }

  async handleRequest(userMessage: string, rawConversationHistory: Message[], clientApiKey?: string): Promise<string> {
    const settings = await storage.getSettings();
    if (!settings) throw new Error("Settings not found.");
    
    const geminiApiKey = clientApiKey || settings.geminiApiKey;
    if (!geminiApiKey) throw new Error("Gemini API key is missing.");

    const smartRagAgent = new SmartRagAgent(geminiApiKey);

    const lastKnownLocation = rawConversationHistory.length > 0 ? rawConversationHistory[rawConversationHistory.length - 1].location || "Unknown" : "Unknown";

    // Save the user's message
    const createdMessage = await storage.createMessage({ role: "user", content: userMessage, location: lastKnownLocation });
    
    // Create the full history for the context, including the new user message
    const updatedConversationHistory = [...rawConversationHistory, createdMessage];

    const filteredCanon = await smartRagAgent.handleRequest(userMessage, updatedConversationHistory, geminiApiKey);

    const chatContext: any = {
      behaviorPrompt: settings.behaviorPrompt,
      frameworkTemplate: settings.frameworkTemplate,
      characterPreset: settings.characterPreset || undefined,
      relevantMemories: [filteredCanon],
      conversationHistory: updatedConversationHistory.slice(-20).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        content: msg.content
      })),
    };

    let response = "";
    const MAX_RETRIES = 2;
    for (let i = 0; i < MAX_RETRIES; i++) {
      console.log(`[Orchestrator] Generation attempt ${i + 1}`);
      const generatedResponse = await this.generationAgent.generateStoryResponse(
        userMessage, chatContext, geminiApiKey
      );
      
      console.log("[Orchestrator] Reviewing response with ProofreaderAgent...");
      const review = await this.proofreaderAgent.reviewResponse(generatedResponse, geminiApiKey, userMessage);

      if (review.isCompliant) {
        response = generatedResponse;
        break;
      } else {
        response = generatedResponse;
        console.log(`[Orchestrator] Response non-compliant. Adding feedback for retry.`);
        chatContext.conversationHistory.push(
            { role: 'model', content: generatedResponse },
            { role: 'user', content: `System Note: The previous response was not compliant. Please fix the following issues and regenerate the response:\n- ${review.feedback}` }
        );
      }
    }

    const newLocation = (await this._extractLocation(response, geminiApiKey)) || lastKnownLocation;
    
    // Save the final assistant message
    await storage.createMessage({ role: "assistant", content: response, location: newLocation });

    return response;
  }
}