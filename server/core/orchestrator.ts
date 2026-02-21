import { detectIntent } from "./intent.js";
import { updateEmotionState } from "../agents/emotion.agent.js";
import { promoteMemory, getLongTermMemory } from "../agents/memory.agent.js";
import { extractAndPromoteMemories } from "../agents/extraction.agent.js";
import {
  getEmotionState,
  setEmotionState,
  getSessionMemory,
  setSessionMemory,
  appendSTM,
} from "./state.js";
import { updateSessionMemory } from "./session.memory.js";
import { buildContext } from "./context.js";
import { generateResponse } from "../agents/response.agent.js";
import { storage } from "../storage.js";
import { isSelfIdentityStatement, processSelfIdentityStatement } from "../agents/self-model.agent.js";
import { generateEmbedding } from "./ai-provider.js";

export async function handleTurn(input: string) {
  console.log("\n[Orchestrator] New turn");

  // --- EARLY INTERCEPT: Self-Identity Statements ---
  // If the user is telling the companion something about its own nature/identity,
  // skip normal flow and process it as a self-model update.
  if (isSelfIdentityStatement(input)) {
    console.log("[Orchestrator] Detected self-identity statement — routing to self-model agent");

    // Save user message
    await storage.createChatMessage({
      role: "user",
      content: input,
      created_at: new Date().toISOString(),
    });

    const acknowledgement = await processSelfIdentityStatement(input);

    // Save companion response
    await storage.createChatMessage({
      role: "model",
      content: acknowledgement,
      created_at: new Date().toISOString(),
    });

    appendSTM({ role: "assistant", content: acknowledgement });
    return acknowledgement;
  }


  // Load Settings for Traits
  const settings = await storage.getSettings();
  let traits: string[] = [];
  try {
    const personality = JSON.parse(settings.companion_personality || "{}");
    if (Array.isArray(personality.traits)) {
      traits = personality.traits;
    }
  } catch (e) {
    console.warn("[Orchestrator] Failed to parse personality traits");
  }

  // --- 1. Save User Chat History (DB) ---
  await storage.createChatMessage({
    role: "user",
    content: input,
    created_at: new Date().toISOString(),
  });

  // --- 1.5 Load Emotion State from DB ---
  // This ensures we persist emotions across restarts and handle time decay correctly
  const savedState = await storage.getCompanionState();
  const loadedEmotion: any = {
    mood: savedState.mood as "low" | "neutral" | "positive",
    energy: savedState.energy,
    attachment: savedState.attachment,
    last_updated: savedState.energy_updated, // Using energy timestamp as proxy for "last interaction"
    social_battery: savedState.social_battery,
    sleepiness: savedState.sleepiness,
    irritation: savedState.irritation,
    volatility: savedState.volatility,
    curiosity: savedState.curiosity,
  };
  setEmotionState(loadedEmotion);

  // --- 1.6 Calculate Interaction Gap (Loneliness) ---
  // Must be done BEFORE updating the state to 'now'
  const now = new Date();
  const lastInteraction = new Date(loadedEmotion.last_updated);
  const hoursSinceLast = Math.max(0, (now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60));

  // Dynamic Thresholds based on Attachment
  const modifier = loadedEmotion.attachment > 0.7 ? 0.5 : 1.0;

  let lonelinessLabel = "none";
  if (hoursSinceLast > (24 * modifier)) {
    lonelinessLabel = "high (feels abandoned/isolated)";
  } else if (hoursSinceLast > (8 * modifier)) {
    lonelinessLabel = "moderate (misses user)";
  } else if (hoursSinceLast > (2 * modifier)) {
    lonelinessLabel = "mild (thinking of user)";
  }

  const interactionGap = {
    hours: hoursSinceLast,
    loneliness_label: lonelinessLabel
  };

  // --- 2. Intent Decision ---
  const intent = await detectIntent(input);
  console.log("[Intent]", intent);

  // --- 3. Emotion State Engine ---
  const currentEmotion = getEmotionState();
  const updatedEmotion = updateEmotionState({
    input,
    intent,
    currentEmotionState: currentEmotion,
    personalityTraits: traits,
  });
  setEmotionState(updatedEmotion);

  // Save updated emotion to DB
  await storage.updateCompanionState({
    mood: updatedEmotion.mood,
    mood_updated: updatedEmotion.last_updated,
    energy: updatedEmotion.energy,
    energy_updated: updatedEmotion.last_updated,
    attachment: updatedEmotion.attachment,
    attachment_updated: updatedEmotion.last_updated,
    social_battery: updatedEmotion.social_battery,
    sleepiness: updatedEmotion.sleepiness,
    irritation: updatedEmotion.irritation,
    volatility: updatedEmotion.volatility,
    curiosity: updatedEmotion.curiosity,
  });
  // console.log("[Emotion] updated:", updatedEmotion);

  // --- 4. Session Memory Engine ---
  const currentSession = getSessionMemory();
  const updatedSession = updateSessionMemory({
    intent,
    emotionState: updatedEmotion,
    previousSessionMemory: currentSession,
    input,
  });
  setSessionMemory(updatedSession);
  // console.log("[Session] updated:", updatedSession);

  // --- 5. Memory Promotion Layer (LTM) ---
  await promoteMemory({ sessionMemory: updatedSession });

  // --- 6. Retrieval (LTM) + embed current input for semantic re-ranking ---
  const [ltm, currentInputEmbedding] = await Promise.all([
    getLongTermMemory(),
    generateEmbedding(input), // null if provider not configured or fails
  ]);

  // --- 7. Context Builder ---
  const context = buildContext({
    emotionState: updatedEmotion,
    sessionMemory: updatedSession,
    longTermMemory: ltm,
    interactionGap: interactionGap,
    currentInputEmbedding,
  });
  // console.log("[Context] built.");

  // --- 7.5. Load Previous Self-State for injection ---
  const previousSelfState = await storage.getLatestSelfState();

  // --- 7.6. Load Unsurfaced Monologues ---
  const unsurfacedMonologues = await storage.getUnsurfacedMonologues(3);
  const monologueTexts = unsurfacedMonologues.map((m) => m.content);

  // --- 8. Response Generation ---
  const rawResponse = await generateResponse({
    input,
    intent,
    emotionState: updatedEmotion,
    context,
    previousSelfState: previousSelfState ? {
      current_state: previousSelfState.current_state,
      intensity: previousSelfState.intensity,
      shift_from_last: previousSelfState.shift_from_last,
      notable: previousSelfState.notable,
    } : null,
    recentMonologues: monologueTexts.length > 0 ? monologueTexts : undefined,
  });

  // --- 8.5. Parse and Strip Self-State Block ---
  const { visibleResponse, selfState } = parseSelfState(rawResponse);
  const response = visibleResponse;

  // --- 9. Update Short-Term Memory (STM) ---
  appendSTM({ role: "user", content: input });
  appendSTM({ role: "assistant", content: response });

  // --- 10. Save Assistant Chat History (DB) ---
  await storage.createChatMessage({
    role: "assistant",
    content: response,
    created_at: new Date().toISOString(),
  });

  // --- 11. Background Memory Extraction (Async) ---
  try {
    await extractAndPromoteMemories(input, updatedSession.summary);
  } catch (e) {
    console.error("[Orchestrator] Extraction failed:", e);
  }

  // --- 12. Store Self-State (Async, non-blocking) ---
  if (selfState) {
    try {
      await storage.saveSelfState({
        current_state: selfState.current_state,
        intensity: selfState.intensity,
        shift_from_last: selfState.shift_from_last || null,
        notable: selfState.notable || null,
        created_at: new Date().toISOString(),
      });
      console.log("[SelfState] Stored:", selfState);
    } catch (e) {
      console.error("[Orchestrator] Self-state storage failed:", e);
    }
  } else {
    console.log("[SelfState] No self-state block found in response");
  }

  // --- 13. Mark Monologues as Surfaced ---
  for (const entry of unsurfacedMonologues) {
    try {
      await storage.markMonologueSurfaced(entry.id);
    } catch (e) {
      console.error("[Orchestrator] Failed to mark monologue surfaced:", e);
    }
  }

  return response;
}

// --- Self-State Parser ---
interface ParsedSelfState {
  current_state: string;
  intensity: string;
  shift_from_last?: string | null;
  notable?: string | null;
}

function parseSelfState(rawResponse: string): { visibleResponse: string; selfState: ParsedSelfState | null } {
  const stateRegex = /\[SELF_STATE\]\s*([\s\S]*?)\s*\[\/SELF_STATE\]/;
  const match = rawResponse.match(stateRegex);

  if (!match) {
    return { visibleResponse: rawResponse.trim(), selfState: null };
  }

  // Strip the block from visible response
  const visibleResponse = rawResponse.replace(stateRegex, "").trim();

  // Parse the JSON inside
  try {
    const selfState = JSON.parse(match[1].trim()) as ParsedSelfState;
    return { visibleResponse, selfState };
  } catch (e) {
    console.error("[SelfState] Failed to parse JSON:", match[1]);
    return { visibleResponse, selfState: null };
  }
}