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

export async function handleTurn(input: string) {
  console.log("\n[Orchestrator] New turn");

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
  
  // --- 6. Retrieval (LTM) ---
  const ltm = await getLongTermMemory();

  // --- 7. Context Builder ---
  const context = buildContext({
    emotionState: updatedEmotion,
    sessionMemory: updatedSession,
    longTermMemory: ltm,
    interactionGap: interactionGap, // Pass the calculated gap
  });
  // console.log("[Context] built.");

  // --- 8. Response Generation ---
  const response = await generateResponse({
    input,
    intent,
    emotionState: updatedEmotion,
    context,
  });

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
    // We pass the raw input and the session summary context
    await extractAndPromoteMemories(input, updatedSession.summary);
  } catch (e) {
    console.error("[Orchestrator] Extraction failed:", e);
  }

  return response;
}