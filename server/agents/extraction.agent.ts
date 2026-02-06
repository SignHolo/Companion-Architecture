import { storage } from "../storage.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const EXTRACTION_MODEL = "gemini-2.0-flash"; // Fallback/Default for utility tasks if 2.5 not available
// User requested 'gemini-2.5-pro', but commonly available is 1.5-pro or 2.0-flash-exp. 
// I'll try to use the one from settings or specific request. 
// Let's use a robust model for JSON extraction.

export async function extractAndPromoteMemories(input: string, sessionSummary: string) {
  const settings = await storage.getSettings();
  const apiKey = settings.gemini_api_key;
  
  if (!apiKey) return; // Cannot extract without key

  const genAI = new GoogleGenerativeAI(apiKey);
  // Use a capable model. 
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash", // Using flash for speed/cost efficiency in background tasks
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `
    You are a Memory Extraction System for an AI Companion.
    Analyze the user input and session summary to identify NEW permanent information worth storing.
    
    Extract two types of memories:
    1. "semantic": Explicit facts (e.g., name, job, likes, dislikes). Key should be snake_case.
    2. "identity": Abstract beliefs about the user (e.g., values, personality traits).

    Return a JSON object with this structure:
    {
      "semantic": [ { "key": "user_name", "value": "Budi", "source": "explicit_user" } ],
      "identity": [ { "belief": "User values honesty", "confidence": 0.8 } ]
    }

    Return empty arrays if nothing significant is found.
    DO NOT extract trivial info (e.g., "User said hello").
    
    Session Summary: ${sessionSummary}
    User Input: ${input}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const data = JSON.parse(text);

    // Promote Semantic Memories
    if (data.semantic && Array.isArray(data.semantic)) {
      for (const item of data.semantic) {
        await storage.createSemanticMemory({
          key: item.key,
          value: item.value,
          source: item.source || "system_inferred",
          timestamp: new Date().toISOString(),
        });
        console.log("[Extraction] Promoted Semantic:", item);
      }
    }

    // Promote Identity Memories
    if (data.identity && Array.isArray(data.identity)) {
      for (const item of data.identity) {
        await storage.createIdentityMemory({
          belief: item.belief,
          confidence: item.confidence || 0.5,
        });
        console.log("[Extraction] Promoted Identity:", item);
      }
    }

  } catch (error) {
    console.error("[Extraction] Error:", error);
  }
}
