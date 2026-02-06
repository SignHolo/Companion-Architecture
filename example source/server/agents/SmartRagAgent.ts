import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Message } from "@shared/schema";
import { QueryAgent } from "./query.agent";

export class SmartRagAgent {
  private gemini: GoogleGenerativeAI;
  private queryAgent: QueryAgent;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("API key is required to initialize SmartRagAgent");
    }
    console.log(`[SmartRagAgent] Initializing with API key: ${apiKey ? '***REDACTED***' : 'undefined'}`);
    this.gemini = new GoogleGenerativeAI(apiKey);
    this.queryAgent = new QueryAgent();
  }

  async handleRequest(userMessage: string, rawConversationHistory: Message[], clientApiKey: string): Promise<string> {
    const retrievedMemories = await this.queryAgent.queryMessages(userMessage, clientApiKey);
    console.log(`[SmartRagAgent] Total queried messages: ${retrievedMemories.length}`);

    const recentHistory = rawConversationHistory.slice(-5);
    const filteredCanon = await this.filterContext(userMessage, retrievedMemories, recentHistory);

    console.log(`[SmartRagAgent] Filtered canon words count: ${filteredCanon.split(/\s+/).length}`);
    console.log(`[SmartRagAgent] Filtered canon character count: ${filteredCanon.length}`);

    return filteredCanon;
  }

  /**
   * Filters retrieved memories to find excerpts strictly relevant to the user's query.
   * @param userMessage The user's current input.
   * @param retrievedMemories The full memory chunks from a semantic search.
   * @param recentHistory The last 5 messages for immediate context.
   * @returns A string containing only the verbatim, relevant excerpts, or an empty string if none are found.
   */
  async filterContext(
    userMessage: string,
    retrievedMemories: Message[],
    recentHistory: Message[]
  ): Promise<string> {
    if (retrievedMemories.length === 0) {
      return ""; // No memories to filter
    }

    // 1. Construct the detailed prompt for the LLM
    const prompt = this.buildFilteringPrompt(userMessage, retrievedMemories, recentHistory);

    // 2. Call the specified Gemini model
    const model = this.gemini.getGenerativeModel({ model: "gemini-2.5-pro" });

    // Log token usage info
    const estimatedTokenCount = this.estimateTokenCount(prompt);
    console.log(`[SmartRagAgent] Estimated token usage for filterContext: ~${estimatedTokenCount} tokens`);

    const result = await model.generateContent(prompt);
    const response = await result.response;

    // 3. Return the clean, filtered text
    return response.text().trim();
  }

  private buildFilteringPrompt(
    userMessage: string,
    retrievedMemories: Message[],
    recentHistory: Message[]
  ): string {
    const memoriesText = retrievedMemories.map(mem => `[Memory Chunk]\n${mem.role}: ${mem.content}`).join('\n\n');
    const historyText = recentHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');

    return `
**ROLE AND FUNCTION:**
You are a canonical context selector for a story-driven AI system.
Your task is NOT to write prose, but to SELECT existing story passages
that are REQUIRED to maintain narrative continuity for the current scene.

---

**SOURCE OF TRUTH (OUTPUT MAY ONLY COME FROM HERE):**
Below are the retrieved canonical story messages.
These messages are the ONLY allowed source for your output.

---
${memoriesText}
---

**AUXILIARY CONTEXT (FOR REASONING ONLY — NEVER OUTPUT):**
The following messages are provided ONLY to help you understand
the current narrative flow and intent.

Recent conversation:
---
${historyText}
---

User's current input:
---
"${userMessage}"
---

**YOUR TASK:**
1. Understand the current scene, tone, and narrative direction
   based on the auxiliary context.
2. Review the canonical story messages.
3. Select ONLY the passages that:
   - Add background, lore, or prior events REQUIRED to understand the current scene
   - Introduce or explain entities, symbols, titles, or factions referenced or implied
   - Maintain continuity of character roles, identities, or power dynamics
4. The selected passages must contribute NEW information,
   not merely repeat or mirror the user's current input.

**STRICT OUTPUT RULES:**
- You MUST output text ONLY from the canonical story messages.
- You MUST NOT output anything from:
  - User's current input
  - Recent conversation context
- Restating, paraphrasing, or echoing the user's input is FORBIDDEN.
- Partial relevance is NOT sufficient.
- If a passage is only loosely related, DO NOT include it.
- If no canonical passages are truly required, return an EMPTY RESPONSE.

**CRITICAL FAILURE CONDITIONS (AVOID):**
- Including any text not found verbatim in the canonical story messages
- Including passages that only match keywords but do not add narrative value
- Including text that the user already knows from their own input

**FINAL OUTPUT:**
Return ONLY the exact, verbatim passages from the canonical story messages.
Do NOT add headings, explanations, or formatting.
`;
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters or 0.75 words
    return Math.ceil(text.length / 4);
  }
}