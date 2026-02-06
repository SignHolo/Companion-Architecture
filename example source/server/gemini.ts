import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  type Content,
  type GenerateContentRequest,
} from "@google/generative-ai";

export const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Safety settings
export const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

interface ChatContext {
  behaviorPrompt: string;
  frameworkTemplate: string;
  relevantMemories: string[];
  conversationHistory: Array<{ role: string; content: string }>;
}

export async function generateStoryResponse(
  userMessage: string,
  context: ChatContext,
  apiKey?: string
): Promise<string> {
  const geminiClient = apiKey ? new GoogleGenerativeAI(apiKey) : ai;

  const model = geminiClient.getGenerativeModel({
    model: "gemini-2.5-pro",
    safetySettings,
  });

  // Combine prompt + context
  let systemInstruction = context.behaviorPrompt;
  if (context.frameworkTemplate) {
    systemInstruction += `\n\nOutput Format:\n${context.frameworkTemplate}`;
  }
  if (context.relevantMemories.length > 0) {
    systemInstruction += `\n\nRelevant Context from Memory:\n${context.relevantMemories.join("\n")}`;
  }

  // Convert conversation into Gemini Content[]
  const contents: Content[] = [
    { role: "user", parts: [{ text: systemInstruction }] },
    ...context.conversationHistory.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  // ✅ Wrap inside a GenerateContentRequest
  const request: GenerateContentRequest = {
    contents,
  };

  try {
    const result = await model.generateContent(request);
    return result.response.text() || "I couldn’t generate a response. Please try again.";
  } catch (error: any) {
    console.error("Gemini API error:", error);
    if (error.message?.includes("API_KEY")) {
      throw new Error("Invalid or missing Gemini API key. Please configure it in Settings.");
    }
    throw new Error(`Failed to generate response: ${error.message || "Unknown error"}`);
  }
}

// Text similarity
export function calculateSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  const unique = Array.from(new Set([...words1, ...words2]));
  const v1 = unique.map((w) => words1.filter((x) => x === w).length);
  const v2 = unique.map((w) => words2.filter((x) => x === w).length);
  const dot = v1.reduce((s, v, i) => s + v * v2[i], 0);
  const mag1 = Math.sqrt(v1.reduce((s, v) => s + v * v, 0));
  const mag2 = Math.sqrt(v2.reduce((s, v) => s + v * v, 0));
  return !mag1 || !mag2 ? 0 : dot / (mag1 * mag2);
}

// Memory retrieval
export function retrieveRelevantMemories(
  query: string,
  memories: Array<{ content: string; importance: number }>,
  topK = 3
): string[] {
  const scored = memories.map((m) => ({
    content: m.content,
    score: calculateSimilarity(query, m.content) * (m.importance / 10),
  }));
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter((m) => m.score > 0.1)
    .map((m) => m.content);
}

// Conversation summarization with retry logic
export async function summarizeForMemory(messages: string[], apiKey?: string): Promise<string> {
  const geminiClient = apiKey ? new GoogleGenerativeAI(apiKey) : ai;
  const model = geminiClient.getGenerativeModel({
    model: "gemini-2.5-flash",
    safetySettings,
  });

  const text = messages.join("\n");
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: `Summarize this chat for memory:\n\n${text}` }],
          },
        ],
      });
      return result.response.text() || text;
    } catch (err: any) {
      console.error(`Attempt ${attempt} failed to summarize:`, err);

      if (attempt === maxRetries) {
        // If all retries failed, return the original text as fallback
        console.warn("All attempts to summarize failed, returning original text");
        return text;
      }

      // Wait before retrying (exponential backoff: 1s, 2s, 4s...)
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000; // Add jitter
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This shouldn't be reached due to the return in the loop, but added for type safety
  return text;
}
