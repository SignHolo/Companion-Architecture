import { GoogleGenerativeAI } from "@google/generative-ai";
import { ai } from "../gemini"; // Import the initialized genAI instance
import { safetySettings } from "../gemini"; // Import safetySettings

const classificationPrompt = `
Analyze the following memory log. Your task is to classify it into ONE of the following types: PLOT, CHARACTER, EVENT, LORE, OTHER.

Return your answer ONLY in a valid JSON format with a single key "type".

- PLOT: A crucial event that drives the main narrative forward.
- CHARACTER: Describes a character's traits, appearance, backstory, or development.
- EVENT: A specific, self-contained occurrence in the story.
- LORE: Background information about the world, its history, rules, or objects.
- OTHER: Anything else.

Memory Log:
---
{{MEMORY_LOG}}
---

JSON Response:
`;

export class ClassificationAgent {
  constructor() {}

  async classifyMemory(text: string, apiKey?: string): Promise<{ type: string }> {
    const geminiClient = apiKey ? new GoogleGenerativeAI(apiKey) : ai;
    const model = geminiClient.getGenerativeModel({
      model: "gemini-3-flash-preview", // Fast and efficient for classification
      safetySettings,
    });

    const prompt = classificationPrompt.replace("{{MEMORY_LOG}}", text);

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Clean the response to extract only the JSON part
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Model did not return valid JSON.");
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed && typeof parsed.type === 'string') {
        return { type: parsed.type };
      } else {
        throw new Error("Parsed JSON does not contain a 'type' string property.");
      }

    } catch (err: any) {
      console.error("Failed to classify memory:", err);
      // Fallback in case of any error
      return { type: "OTHER" };
    }
  }
}
