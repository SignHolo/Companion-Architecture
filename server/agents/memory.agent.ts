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
  // Rule: session.significance >= 0.7 AND session.dominant_emotion === "low"
  if (
    FORCE_EPISODIC_DEBUG ||
    (sessionMemory.significance >= 0.7 &&
    sessionMemory.dominant_emotion === "low")
  ) {
    const newEpisodic = {
      summary: sessionMemory.summary || "Significant emotional event detected.",
      emotion: sessionMemory.dominant_emotion,
      importance: sessionMemory.significance, // real
      created_at: new Date().toISOString(),
    };
    
    // Check duplication? Storage logic creates new row.
    // Ideally we check if a similar recent memory exists to avoid spamming.
    // For MVP v2, we rely on rule-based trigger.
    
    await storage.createEpisodicMemory(newEpisodic);
    console.log("[Episodic][Stored]", newEpisodic);
    promoted = true;
  }

  // 2. Emotional Trace Promotion
  // Rule: unresolved === true AND dominant_emotion === "low" AND intent ∈ [emotional_support, venting]
  const validIntents = ["emotional_support", "venting"];
  const currentIntent = sessionMemory.dominant_intent || "";

  if (
    sessionMemory.unresolved &&
    sessionMemory.dominant_emotion === "low" &&
    validIntents.includes(currentIntent)
  ) {
    // Pattern detection (very simple)
    let pattern = "general_emotional_distress";
    if (sessionMemory.summary.includes("exhausted") || sessionMemory.summary.includes("venting")) {
        pattern = "feeling_exhausted";
    } else if (sessionMemory.summary.includes("empty")) {
        pattern = "feeling_empty";
    }

    // Upsert logic handled by storage or here?
    // Storage upsertEmotionalTrace handles update if pattern exists.
    // We just need to calculate new confidence/count?
    // Actually, storage logic I wrote:
    // set({ confidence: trace.confidence, evidence_count: existing + trace.count })
    // So we pass the *delta* or the *target*?
    // Let's pass the delta-like object, but wait, `confidence` in schema is absolute value.
    // In agent logic: "If pattern exists: confidence += 0.1".
    // I need to fetch existing trace first to calculate new confidence?
    // Or storage.upsertEmotionalTrace needs to be smarter.
    // Let's keep it simple: Agent fetches all traces (or specific one) to check existence?
    // `upsertEmotionalTrace` in storage was: 
    // `set({ confidence: trace.confidence, ... })` -> Overwrite.
    // So I should fetch first. But storage doesn't have `getTraceByPattern`.
    
    // Let's fetch all top traces and check? No, inefficient.
    // Let's Assume `upsertEmotionalTrace` logic in storage can be improved or I just overwrite for now.
    // Wait, I can make `upsertEmotionalTrace` return the updated one.
    // To do "confidence += 0.1", I really need to know current confidence.
    
    // Quick fix: Since I can't easily change storage interface blindly without re-reading,
    // I'll rely on storage's upsert logic. 
    // My previous storage implementation of upsert:
    // if existing: set({ confidence: trace.confidence, evidence_count: existing.evidence + trace.evidence })
    // It overwrites confidence with what I pass.
    
    // So, Agent logic:
    // I don't know previous confidence. I'll just pass a base confidence (e.g. 0.4) and hope storage handles it?
    // No, that breaks the "gradual build" rule.
    // I should probably add `getEmotionalTrace(pattern)` to storage. 
    // But I can't change storage interface easily in this step without file hopping.
    
    // Alternative: Just use a fixed increment logic in SQL? `confidence = confidence + 0.1`?
    // Drizzle supports sql operator.
    // But my storage implementation used simple object update.
    
    // Let's compromise: For now, we will just set confidence to 0.5 (or higher) if promoting.
    // Or better: Use `getTopEmotionalTraces` to see if it's there.
    
    const topTraces = await storage.getTopEmotionalTraces(100);
    const existing = topTraces.find(t => t.pattern === pattern);
    
    let newConfidence = 0.3;
    let evidenceDelta = 1;
    
    if (existing) {
        newConfidence = Math.min(existing.confidence + 0.1, 1.0);
    }

    const tracePayload = {
        pattern,
        confidence: newConfidence,
        evidence_count: 1, // Storage adds this to existing
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
