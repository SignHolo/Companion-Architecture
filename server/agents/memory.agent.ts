// Memory Agent
import type { SessionMemory } from "../core/state.js";
import { storage } from "../storage.js";
import type { EpisodicMemory, EmotionalTrace } from "@shared/schema";

// --- Logic ---

interface PromoteParams {
  sessionMemory: SessionMemory;
}

const FORCE_EPISODIC_DEBUG = false;

export async function promoteMemory({ sessionMemory }: PromoteParams) {
  let promoted = false;

  console.log("[Episodic][Candidate]", {
    summary: sessionMemory.summary,
    emotion: sessionMemory.dominant_emotion,
    significance: sessionMemory.significance,
    unresolved: sessionMemory.unresolved
  });

  // 1. Episodic Promotion
  // Rule: significance >= 0.7 AND emotion is meaningful (negative OR positive/curious)
  // Companions should remember joy and breakthroughs, not just pain.
  const promotableEmotions = ["low", "positive", "curious_engaged", "joyful_excited"];
  if (
    FORCE_EPISODIC_DEBUG ||
    (sessionMemory.significance >= 0.7 &&
      promotableEmotions.includes(sessionMemory.dominant_emotion))
  ) {
    const newEpisodic = {
      summary: sessionMemory.summary || "Significant moment detected.",
      narrative: null,
      emotion: sessionMemory.dominant_emotion,
      importance: sessionMemory.significance,
      created_at: new Date().toISOString(),
    };

    await storage.createEpisodicMemory(newEpisodic);
    console.log("[Episodic][Stored]", newEpisodic);
    promoted = true;
  }

  // 2. Emotional Trace Promotion
  // Rule: unresolved AND dominant_emotion === "low" AND intent ∈ [emotional_support, venting]
  const validIntents = ["emotional_support", "venting"];
  const currentIntent = sessionMemory.dominant_intent || "";

  if (
    sessionMemory.unresolved &&
    sessionMemory.dominant_emotion === "low" &&
    validIntents.includes(currentIntent)
  ) {
    // Build pattern from what the LLM already classified — no keyword matching needed
    const pattern = `${currentIntent}_${sessionMemory.dominant_emotion}`;

    const topTraces = await storage.getTopEmotionalTraces(100);
    const existing = topTraces.find(t => t.pattern === pattern);

    const newConfidence = existing
      ? Math.min(existing.confidence + 0.1, 1.0)
      : 0.3;

    const tracePayload = {
      pattern,
      confidence: newConfidence,
      evidence_count: 1,
      last_updated: new Date().toISOString(),
    };

    await storage.upsertEmotionalTrace(tracePayload);
    console.log("[Memory][Updated][EmotionalTrace]", tracePayload);
    promoted = true;
  }

  if (!promoted) {
    console.log("[Memory] No promotion this turn");
  }
}

export async function getLongTermMemory() {
  const episodic = await storage.getRecentEpisodicMemories(5);
  const traces = await storage.getTopEmotionalTraces(5);
  const semantic = await storage.getAllSemanticMemories();
  const identity = await storage.getAllIdentityMemories();

  return {
    episodic,
    traces,
    semantic,
    identity,
  };
}

// Export for compatibility if needed elsewhere
export { type EpisodicMemory, type EmotionalTrace };

export function updateEmotionState(input: any) {
  return { mood: "neutral" };
}
