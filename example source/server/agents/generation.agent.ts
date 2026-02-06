import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  type Content,
  type GenerateContentRequest,
} from "@google/generative-ai";

const generationSafetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

interface ChatContext {
  behaviorPrompt: string;
  frameworkTemplate: string;
  characterPreset?: string;
  lore?: string;
  relevantMemories: string[];
  highFidelityTranscript?: string; // For Tier 2 memory
  conversationHistory: Array<{ role: string; content: string }>;
}

// Simple token counting function (approximate)
function countTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters or 0.75 words
  return Math.ceil(text.length / 4);
}

export class GenerationAgent {
  private ai: GoogleGenerativeAI;

  constructor() {
    this.ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  }

  async generateStoryResponse(
    userMessage: string,
    context: ChatContext,
    apiKey?: string
  ): Promise<string> {
    const geminiClient = apiKey ? new GoogleGenerativeAI(apiKey) : this.ai;

    const model = geminiClient.getGenerativeModel({
      model: "gemini-3-pro-preview", // User specified model
      safetySettings: generationSafetySettings,
    });

    let systemInstruction = context.behaviorPrompt;

    if (context.characterPreset) {
      systemInstruction += `\n\n--- PRESET CHARACTER DETAILS ---\n${context.characterPreset}`;
    }

    if (context.lore) {
      systemInstruction += `\n\n--- WORLD LORE & BACKGROUND ---\n${context.lore}`;
    }

    if (context.frameworkTemplate) {
      systemInstruction += `\n\nOutput Format:\n${context.frameworkTemplate}`;
    }

    // --- Memory Injection ---
    if (context.highFidelityTranscript) {
      systemInstruction += `\n\n--- Full Transcript of a Relevant Past Event ---\nYou have requested details about a past event. Here is the full transcript of that scene to help you provide a detailed answer:\n${context.highFidelityTranscript}`;
    } else if (context.relevantMemories.length > 0) {
      const memoryContext = context.relevantMemories.map((mem, i) => `[Memory ${i+1}]: ${mem}`).join("\n");
      systemInstruction += `\n\n--- Relevant Context from Memory ---\n${memoryContext}`;
    }
    // --- End Memory Injection ---

    const contents: Content[] = context.conversationHistory.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    // Inject system instructions into the first user message for better adherence
    if (contents.length > 0 && contents[0].role === "user") {
      contents[0].parts[0].text = `${systemInstruction}\n\n---\n\n${contents[0].parts[0].text}`;
    } else {
      contents.unshift({ role: "user", parts: [{ text: systemInstruction }] });
    }

    contents.push({ role: "user", parts: [{ text: userMessage }] });

    const request: GenerateContentRequest = { contents };

    // Calculate approximate token count for logging
    let totalTokens = 0;
    for (const content of contents) {
      for (const part of content.parts) {
        if ('text' in part && typeof part.text === 'string') {
          totalTokens += countTokens(part.text);
        }
      }
    }

    console.log(`[GenerationAgent] Token count for request: ~${totalTokens} tokens`);
    console.log(`[GenerationAgent] Conversation history length: ${context.conversationHistory.length} messages`);
    console.log(`[GenerationAgent] System instruction length: ~${countTokens(systemInstruction)} tokens`);
    console.log(`[GenerationAgent] User message length: ~${countTokens(userMessage)} tokens`);

    try {
      const result = await model.generateContent(request);
      // Before returning, check if the response itself was blocked.
      if (result.response.promptFeedback?.blockReason === 'SAFETY' || result.response.candidates?.[0]?.finishReason === 'SAFETY') {
        console.warn("[GenerationAgent] Response was blocked due to safety settings.");
        return "Maaf, generasi respons diblokir karena terdeteksi adanya konten yang melanggar kebijakan. Silakan coba sesuaikan atau ubah prompt Anda.";
      }
      return result.response.text() || "I couldn’t generate a response. Please try again.";
    } catch (error: any) {
      console.error("Gemini API error:", error);

      // Check for safety-related blocking in the error object itself
      if (error.response?.promptFeedback?.blockReason === 'SAFETY' || error.response?.candidates?.[0]?.finishReason === 'SAFETY') {
        return "Maaf, generasi respons diblokir karena terdeteksi adanya konten yang melanggar kebijakan. Silakan coba sesuaikan atau ubah prompt Anda.";
      }

      if (error.message?.includes("API_KEY")) {
        throw new Error("Invalid or missing Gemini API key. Please configure it in Settings.");
      }

      // For other errors, re-throw to let the caller handle it.
      throw new Error(`Failed to generate response: ${error.message || "Unknown error"}`);
    }
  }
}
