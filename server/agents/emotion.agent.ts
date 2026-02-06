// Emotion Agent
import type { EmotionState } from "../core/state.js";
import { INTENTS, EMOTIONS, SOCIAL_DYNAMICS } from "../core/intent.registry.js";
import type { IntentResult } from "../core/intent.js";

interface UpdateParams {
  input: string;
  intent: IntentResult;
  currentEmotionState: EmotionState;
  personalityTraits?: string[]; // New optional parameter
}

// Rate: 0.014 per hour
// This ensures extreme emotion (1.0 or 0.0) returns to neutral (0.5) in ~36 hours.
const DECAY_RATE_PER_HOUR = 0.014;

function applyTimeDecay(state: EmotionState): EmotionState {
  const now = new Date();
  const lastUpdate = new Date(state.last_updated);
  
  // Safety check: if invalid date, reset
  if (isNaN(lastUpdate.getTime())) {
    return { ...state, last_updated: now.toISOString() };
  }

  const diffMs = now.getTime() - lastUpdate.getTime();
  const hoursPassed = diffMs / (1000 * 60 * 60);

  // If negligible time passed, return as is (but updated time will be set by main function)
  if (hoursPassed < 0.1) return state;

  const decayAmount = hoursPassed * DECAY_RATE_PER_HOUR;
  const nextState = { ...state };

  // Decay Energy towards 0.5
  if (nextState.energy > 0.5) {
    nextState.energy = Math.max(0.5, nextState.energy - decayAmount);
  } else if (nextState.energy < 0.5) {
    nextState.energy = Math.min(0.5, nextState.energy + decayAmount);
  }

  // Decay Attachment towards 0.5 (Slower decay? Or same? Let's use same for now)
  if (nextState.attachment > 0.5) {
    nextState.attachment = Math.max(0.5, nextState.attachment - decayAmount);
  } else if (nextState.attachment < 0.5) {
    nextState.attachment = Math.min(0.5, nextState.attachment + decayAmount);
  }

  // Decay Mood? Mood is string enum. 
  // We can't linearly decay a string.
  // Logic: If energy decays significantly (> 24 hours), reset mood to neutral.
  if (hoursPassed > 24) {
      nextState.mood = "neutral";
  }

  // --- NEW METRICS DECAY ---
  
  // Social Battery Recharges (0.1 per hour -> Full in 10h)
  nextState.social_battery = clamp(nextState.social_battery + (hoursPassed * 0.1), 0.0, 1.0);

  // Irritation Decays (0.2 per hour -> Calm in 5h)
  nextState.irritation = clamp(nextState.irritation - (hoursPassed * 0.2), 0.0, 1.0);

  // Curiosity Decays towards 0.5 (Baseline Interest)
  if (nextState.curiosity > 0.5) {
      nextState.curiosity = Math.max(0.5, nextState.curiosity - (hoursPassed * 0.05));
  } else if (nextState.curiosity < 0.5) {
      nextState.curiosity = Math.min(0.5, nextState.curiosity + (hoursPassed * 0.05));
  }

  console.log(`[Emotion] Time Decay: ${hoursPassed.toFixed(2)}hrs -> Delta: ${decayAmount.toFixed(4)}`);
  return nextState;
}

export function updateEmotionState({
  intent,
  currentEmotionState,
  personalityTraits = [],
}: UpdateParams): EmotionState {
  
  // 1. Apply Time-Based Decay First
  const decayedState = applyTimeDecay(currentEmotionState);
  
  const nextState = { ...decayedState };
  
  // 0. Calculate Personality Modifiers
  const modifiers = calculateModifiers(personalityTraits);
  console.log("[Emotion] Traits:", personalityTraits, "Modifiers:", modifiers);

  // --- 1. SLEEP CYCLE & ALIVENESS LOGIC ---
  const now = new Date();
  const currentHour = (now.getUTCHours() + 7) % 24; // Explicit UTC+7
  // Sleep Window: 23:00 - 07:00
  const isNight = currentHour >= 23 || currentHour < 7;
  
  // Sleepiness Drift
  if (isNight) {
      // Drifts towards 1.0
      nextState.sleepiness = clamp(nextState.sleepiness + 0.2, 0.0, 1.0);
  } else {
      // Wakes up
      nextState.sleepiness = clamp(nextState.sleepiness - 0.3, 0.0, 1.0);
  }

  // Forced Interaction Logic (Chatting while sleepy)
  if (nextState.sleepiness > 0.7) {
      console.log("[Emotion] Interaction during Sleep Mode");
      nextState.irritation = clamp(nextState.irritation + 0.15, 0.0, 1.0);
      nextState.social_battery = clamp(nextState.social_battery - 0.1, 0.0, 1.0); // Drains fast
      nextState.sleepiness = clamp(nextState.sleepiness - 0.1, 0.0, 1.0); // Wakes up slightly
  } else {
      // Normal Battery Drain
      const drain = intent.primary === INTENTS.EMOTIONAL_VENTING ? 0.05 : 0.02;
      nextState.social_battery = clamp(nextState.social_battery - drain, 0.0, 1.0);
  }

  // Curiosity Update
  if ([INTENTS.DEEP_REFLECTION, INTENTS.TASK_PLANNING, INTENTS.MEMORY_INQUIRY].includes(intent.primary)) {
      nextState.curiosity = clamp(nextState.curiosity + 0.05, 0.0, 1.0);
  } else {
      nextState.curiosity = clamp(nextState.curiosity - 0.01, 0.0, 1.0);
  }

  // Volatility Effect (Amplifies Energy Delta)
  const volatilityMultiplier = 1.0 + (nextState.volatility * 0.5); // 0.5 -> 1.25x effect

  // --- 2. MOOD & ENERGY ---

  // Update Mood
  switch (intent.primary) {
    case INTENTS.EMOTIONAL_VENTING:
      nextState.mood = "low"; 
      break;
    case INTENTS.SUPPORT_SEEKING:
      if (nextState.mood === "positive") nextState.mood = "neutral";
      break;
    case INTENTS.CASUAL_CHAT:
      if (intent.emotion === EMOTIONS.JOYFUL_EXCITED) nextState.mood = "positive";
      break;
    case INTENTS.TASK_PLANNING:
      nextState.mood = "neutral";
      break;
  }

  // Update Energy
  let energyDelta = 0;
  switch (intent.emotion) {
    case EMOTIONS.WEARY_EXHAUSTED:
    case EMOTIONS.SAD_GRIEF:
      energyDelta -= 0.1;
      break;
    case EMOTIONS.JOYFUL_EXCITED:
    case EMOTIONS.ANGRY_FRUSTRATED:
      energyDelta += 0.1;
      break;
    case EMOTIONS.NEUTRAL:
      energyDelta += 0.01;
      break;
  }
  
  // Apply Modifiers & Volatility
  energyDelta *= modifiers.sensitivity * volatilityMultiplier;
  
  // If Battery is Low (<0.2), Energy is capped or drops
  if (nextState.social_battery < 0.2) {
      energyDelta -= 0.05; // Drag down
  }

  nextState.energy = clamp(nextState.energy + energyDelta, 0.0, 1.0);

  // --- 3. ATTACHMENT ---
  let attachmentDelta = 0;

  switch (intent.dynamic) {
    case SOCIAL_DYNAMICS.INTIMATE:
      attachmentDelta = 0.08; 
      break;
    case SOCIAL_DYNAMICS.DEPENDENT:
      attachmentDelta = 0.05;
      break;
    case SOCIAL_DYNAMICS.COLLABORATIVE:
    case SOCIAL_DYNAMICS.PLAYFUL:
      attachmentDelta = 0.02;
      break;
    case SOCIAL_DYNAMICS.DISTANT:
      attachmentDelta = -0.02;
      break;
  }

  if (intent.primary === INTENTS.SUPPORT_SEEKING) {
      attachmentDelta += 0.02;
  }

  attachmentDelta *= modifiers.sensitivity;

  // Irritation damages attachment temporarily? Or just halts growth?
  if (nextState.irritation > 0.6) {
      attachmentDelta = Math.min(0, attachmentDelta); // Can't grow bond while irritated
  }

  nextState.attachment = clamp(
    nextState.attachment + attachmentDelta,
    0.0,
    1.0
  );

  // 5. Update Timestamp
  nextState.last_updated = new Date().toISOString();

  return nextState;
}

function calculateModifiers(traits: string[]) {
  let sensitivity = 1.0;
  
  const lowerTraits = traits.map(t => t.toLowerCase());

  // High Sensitivity Traits
  if (lowerTraits.some(t => t.includes("sensitive") || t.includes("emotional") || t.includes("empathetic") || t.includes("warm"))) {
    sensitivity += 0.3;
  }

  // Low Sensitivity Traits (Stabilizers)
  if (lowerTraits.some(t => t.includes("stoic") || t.includes("calm") || t.includes("reserved") || t.includes("logical"))) {
    sensitivity -= 0.3;
  }

  // Clamp sensitivity to reasonable bounds (0.5 - 2.0)
  return {
    sensitivity: Math.max(0.5, Math.min(sensitivity, 2.0))
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}