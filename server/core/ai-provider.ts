// AI Provider Abstraction Layer
// Routes text generation to Gemini or Mistral based on active_provider setting.
// All agents should use generateText() instead of importing SDKs directly.

import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
} from "@google/generative-ai";
import { Mistral } from "@mistralai/mistralai";
import { storage } from "../storage.js";

export interface GenerateOptions {
    temperature?: number;
    jsonMode?: boolean;
    systemPrompt?: string;
    maxOutputTokens?: number;
    disableSafety?: boolean; // Gemini: sets all harm categories to BLOCK_NONE
}

/**
 * Unified text generation — reads active_provider from settings
 * and routes to the correct SDK.
 */
export async function generateText(
    prompt: string,
    opts: GenerateOptions = {}
): Promise<string> {
    const settings = await storage.getSettings();
    const provider = settings.active_provider || "gemini";

    if (provider === "mistral") {
        return generateWithMistral(settings, prompt, opts);
    } else {
        return generateWithGemini(settings, prompt, opts);
    }
}

// --- Gemini Provider ---

async function generateWithGemini(
    settings: any,
    prompt: string,
    opts: GenerateOptions
): Promise<string> {
    const apiKey = settings.gemini_api_key;
    if (!apiKey) throw new Error("No Gemini API key configured");

    const modelName = settings.gemini_model || "gemini-2.5-flash";
    const isGemma = modelName.toLowerCase().includes("gemma");

    const genAI = new GoogleGenerativeAI(apiKey);

    const generationConfig: any = {};
    if (opts.temperature !== undefined) {
        generationConfig.temperature = opts.temperature;
    }
    if (opts.maxOutputTokens !== undefined) {
        generationConfig.maxOutputTokens = opts.maxOutputTokens;
    }
    if (opts.jsonMode && !isGemma) {
        // Gemma doesn't support JSON mode
        generationConfig.responseMimeType = "application/json";
    }

    // Safety settings (only used when disableSafety is true)
    const safetySettings = opts.disableSafety
        ? [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
        : undefined;

    // Handle Gemma systemInstruction workaround
    let systemInstruction: string | undefined;
    let finalPrompt = prompt;

    if (opts.systemPrompt) {
        if (isGemma) {
            // Gemma doesn't support systemInstruction — prepend to prompt
            finalPrompt = opts.systemPrompt + "\n\n" + prompt;
        } else {
            systemInstruction = opts.systemPrompt;
        }
    }

    const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig,
        ...(systemInstruction ? { systemInstruction } : {}),
        ...(safetySettings ? { safetySettings } : {}),
    });

    const result = await model.generateContent(finalPrompt);
    const response = result.response;
    const text = response.text();

    console.log(`[AI] Gemini (${modelName}) generated ${text.length} chars`);
    return text;
}

// --- Mistral Provider ---

async function generateWithMistral(
    settings: any,
    prompt: string,
    opts: GenerateOptions
): Promise<string> {
    const apiKey = settings.mistral_api_key;
    if (!apiKey) throw new Error("No Mistral API key configured");

    const modelName = settings.mistral_model;
    if (!modelName) throw new Error("No Mistral model configured — set it in settings");

    const client = new Mistral({ apiKey });

    // Build messages array
    const messages: Array<{ role: "system" | "user"; content: string }> = [];

    if (opts.systemPrompt) {
        messages.push({ role: "system", content: opts.systemPrompt });
    }

    messages.push({ role: "user", content: prompt });

    const response = await client.chat.complete({
        model: modelName,
        messages,
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
        ...(opts.jsonMode ? { responseFormat: { type: "json_object" as const } } : {}),
    });

    const text =
        response.choices?.[0]?.message?.content?.toString() || "";

    console.log(`[AI] Mistral (${modelName}) generated ${text.length} chars`);
    return text;
}

/**
 * Helper: get the current active provider name and model for logging
 */
export async function getActiveProviderInfo(): Promise<{ provider: string; model: string }> {
    const settings = await storage.getSettings();
    const provider = settings.active_provider || "gemini";

    if (provider === "mistral") {
        return { provider: "mistral", model: settings.mistral_model || "(not set)" };
    } else {
        return { provider: "gemini", model: settings.gemini_model || "gemini-2.5-flash" };
    }
}

/**
 * Generates an embedding vector for text.
 * Gemini → text-embedding-004
 * Mistral → mistral-embed
 * Returns null if embedding fails (caller should handle gracefully).
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
    const settings = await storage.getSettings();
    const provider = settings.active_provider || "gemini";

    try {
        if (provider === "mistral") {
            const apiKey = settings.mistral_api_key;
            if (!apiKey) return null;

            const client = new Mistral({ apiKey });
            const response = await client.embeddings.create({
                model: "mistral-embed",
                inputs: [text],
            });
            return response.data?.[0]?.embedding ?? null;

        } else {
            const apiKey = settings.gemini_api_key;
            if (!apiKey) return null;

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
            const result = await model.embedContent(text);
            return result.embedding?.values ?? null;
        }
    } catch (err) {
        console.warn("[AI] Embedding generation failed:", err);
        return null;
    }
}

/**
 * Computes cosine similarity between two vectors.
 * Returns a value between -1 and 1 (1 = identical direction).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
}
