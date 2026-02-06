import type { SessionMemory, EmotionState } from "./state.js";
import { INTENTS, EMOTIONS } from "./intent.registry.js";
import type { IntentResult } from "./intent.js";

interface UpdateParams {
  intent: IntentResult;
  emotionState: EmotionState;
  previousSessionMemory: SessionMemory;
  input: string;
}

export function updateSessionMemory({
  intent,
  emotionState,
  previousSessionMemory,
  input,
}: UpdateParams): SessionMemory {
  const nextMemory = { ...previousSessionMemory };

  // 1. Update Summary (Rule-based mostly for now)
  // Example: "User feels empty and seeks presence." or "User is casually chatting."
  nextMemory.summary = generateSummary(input, intent, emotionState.mood);

  // 2. Dominant Intent
  // Set to the most recent non-casual intent
  // casual_chat should NOT overwrite meaningful intents
  if (intent.primary !== INTENTS.CASUAL_CHAT) {
    nextMemory.dominant_intent = intent.primary;
  }
  // If it's the very first turn and it's casual, set it.
  if (nextMemory.dominant_intent === null && intent.primary === INTENTS.CASUAL_CHAT) {
    nextMemory.dominant_intent = INTENTS.CASUAL_CHAT;
  }

  // 3. Dominant Emotion
  // mood = low → "low", neutral → "neutral", positive → "positive"
  nextMemory.dominant_emotion = emotionState.mood;

  // 4. Unresolved Flag
  // Set unresolved = true if: intent ∈ [emotional_support, venting, reflection] AND mood === "low"
  const isEmotionalIntent = [
    INTENTS.SUPPORT_SEEKING,
    INTENTS.EMOTIONAL_VENTING,
    INTENTS.DEEP_REFLECTION,
  ].includes(intent.primary);

  if (isEmotionalIntent && emotionState.mood === "low") {
    nextMemory.unresolved = true;
  }

  // Reset to false if: mood stabilizes (neutral or positive) AND intent is casual_chat or task_or_planning
  const isStableIntent = [INTENTS.CASUAL_CHAT, INTENTS.TASK_PLANNING].includes(
    intent.primary
  );
  if (
    (emotionState.mood === "neutral" || emotionState.mood === "positive") &&
    isStableIntent
  ) {
    nextMemory.unresolved = false;
  }

  // 5. Significance Score
  let delta = 0;
  if (intent.primary === INTENTS.SUPPORT_SEEKING) delta += 0.2;
  if (intent.primary === INTENTS.EMOTIONAL_VENTING) delta += 0.3;
  if (intent.primary === INTENTS.DEEP_REFLECTION) delta += 0.2;
  if (intent.primary === INTENTS.TASK_PLANNING) delta += 0.1;
  // casual_chat + 0.0

  if (emotionState.mood === "low") delta += 0.2;

  nextMemory.significance = clamp(nextMemory.significance + delta, 0.0, 1.0);

  return nextMemory;
}

function generateSummary(
  input: string,
  intent: IntentResult,
  mood: string
): string {
  const primary = intent.primary;
  const emotion = intent.emotion;

  // Casual
  if (primary === INTENTS.CASUAL_CHAT) {
    return "User is casually chatting.";
  }

  // Venting
  if (primary === INTENTS.EMOTIONAL_VENTING) {
    if (emotion === EMOTIONS.WEARY_EXHAUSTED) {
       return "User feels exhausted and is venting.";
    }
    return "User is venting negative emotions.";
  }

  // Support
  if (primary === INTENTS.SUPPORT_SEEKING) {
     if (emotion === EMOTIONS.SAD_GRIEF) {
         return "User feels sad and seeks presence.";
     }
     return "User seeks emotional support.";
  }
  
  // Task
  if (primary === INTENTS.TASK_PLANNING) {
      return "User is planning a task.";
  }

  // Reflection
  if (primary === INTENTS.DEEP_REFLECTION) {
      return "User is deeply reflecting on personal topics.";
  }

  return "User is interacting with the system.";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
