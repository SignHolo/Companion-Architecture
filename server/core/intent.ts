import { generateText } from "./ai-provider.js";
import { INTENTS, EMOTIONS, SOCIAL_DYNAMICS } from "./intent.registry.js";

// Types for the 3-Axis Result
export interface IntentResult {
  primary: string;
  emotion: string;
  dynamic: string;
  confidence: number;
  source: "llm" | "keyword";
}

// 1. Fallback Logic (Legacy + Safety Net)
function fallbackKeywordCheck(input: string): IntentResult {
  const lowerInput = input.toLowerCase();

  // Mapping old keywords to new 3-Axis schema
  if (
    lowerInput.includes("capek") ||
    lowerInput.includes("lelah") ||
    lowerInput.includes("exhausted")
  ) {
    return {
      primary: INTENTS.EMOTIONAL_VENTING,
      emotion: EMOTIONS.WEARY_EXHAUSTED,
      dynamic: SOCIAL_DYNAMICS.INTIMATE,
      confidence: 0.8,
      source: "keyword",
    };
  }

  if (
    lowerInput.includes("kesal") ||
    lowerInput.includes("marah") ||
    lowerInput.includes("benci")
  ) {
    return {
      primary: INTENTS.EMOTIONAL_VENTING,
      emotion: EMOTIONS.ANGRY_FRUSTRATED,
      dynamic: SOCIAL_DYNAMICS.DISTANT,
      confidence: 0.8,
      source: "keyword",
    };
  }

  if (
    lowerInput.includes("bantu") ||
    lowerInput.includes("tolong") ||
    lowerInput.includes("rencana") ||
    lowerInput.includes("buat")
  ) {
    return {
      primary: INTENTS.TASK_PLANNING,
      emotion: EMOTIONS.CURIOUS_ENGAGED,
      dynamic: SOCIAL_DYNAMICS.COLLABORATIVE,
      confidence: 0.8,
      source: "keyword",
    };
  }

  if (lowerInput.includes("sedih") || lowerInput.includes("galau") || lowerInput.includes("cry")) {
    return {
      primary: INTENTS.SUPPORT_SEEKING,
      emotion: EMOTIONS.SAD_GRIEF,
      dynamic: SOCIAL_DYNAMICS.DEPENDENT,
      confidence: 0.85,
      source: "keyword",
    };
  }

  if (lowerInput.includes("ingat") || lowerInput.includes("kapan") || lowerInput.includes("remember")) {
    return {
      primary: INTENTS.MEMORY_INQUIRY,
      emotion: EMOTIONS.NEUTRAL,
      dynamic: SOCIAL_DYNAMICS.COLLABORATIVE,
      confidence: 0.7,
      source: "keyword"
    }
  }

  return {
    primary: INTENTS.CASUAL_CHAT,
    emotion: EMOTIONS.NEUTRAL,
    dynamic: SOCIAL_DYNAMICS.PLAYFUL,
    confidence: 1.0,
    source: "keyword",
  };
}

// 2. LLM Classification Logic
async function classifyWithLLM(input: string): Promise<IntentResult> {
  const prompt = `
    You are the Empathy Engine for an AI Companion. 
    Classify the User Input into a 3-Axis Interaction Model.

    Axis 1: Primary Intent (Choose ONE)
    - casual_chat (Small talk, greetings, jokes)
    - deep_reflection (Analyzing self, life decisions, philosophy)
    - emotional_venting (Releasing frustration, anger, or exhaustion)
    - support_seeking (Asking for comfort, reassurance, or validation)
    - task_planning (Asking for help with a specific task or idea)
    - memory_inquiry (Asking about past conversations or shared history)

    Axis 2: Emotional Spectrum (Choose ONE)
    - neutral
    - joyful_excited
    - anxious_fearful
    - sad_grief
    - angry_frustrated
    - weary_exhausted (Distinct from sad - burnout/tiredness)
    - curious_engaged

    Axis 3: Social Dynamic (Choose ONE)
    - collaborative (Let's do this together)
    - dependent (Help me, I'm lost)
    - distant (Pushing away, cold)
    - intimate (Vulnerable, sharing secrets/deep feelings)
    - playful (Joking, teasing)

    Output JSON:
    {
      "primary_intent": "string",
      "emotional_spectrum": "string",
      "social_dynamic": "string",
      "confidence": number (0.0-1.0)
    }

    User Input: "${input}"
  `;

  let text = await generateText(prompt, { jsonMode: true });

  // Strip markdown code fences if present
  text = text.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  const data = JSON.parse(text);

  return {
    primary: data.primary_intent,
    emotion: data.emotional_spectrum,
    dynamic: data.social_dynamic,
    confidence: data.confidence,
    source: "llm",
  };
}

// 3. Main Exported Function
export async function detectIntent(input: string): Promise<IntentResult> {
  // Race condition: LLM vs 5s Timeout
  try {
    const semanticResult = await Promise.race([
      classifyWithLLM(input),
      new Promise<IntentResult>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 10000)
      ),
    ]);
    return semanticResult;
  } catch (error) {
    console.warn("[Intent] Fallback triggered:", error instanceof Error ? error.message : "Unknown error");
    return fallbackKeywordCheck(input);
  }
}
