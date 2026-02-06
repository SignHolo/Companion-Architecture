// Stub for state management

export interface EmotionState {
  mood: "low" | "neutral" | "positive";
  energy: number; // 0.0 - 1.0
  attachment: number; // 0.0 - 1.0
  last_updated: string; // ISO Date String
  // New 'Alive' Metrics
  social_battery: number;
  sleepiness: number;
  irritation: number;
  volatility: number;
  curiosity: number;
}

export interface SessionMemory {
  summary: string;
  dominant_intent: string | null;
  dominant_emotion: "low" | "neutral" | "positive";
  unresolved: boolean;
  significance: number; // 0.0 - 1.0
}

// --- Short-Term Memory (STM) ---
export interface STMTurn {
  role: "user" | "assistant";
  content: string;
}

const MAX_STM_SIZE = 6;
let stmBuffer: STMTurn[] = [];

export function getSTM(): STMTurn[] {
  return [...stmBuffer];
}

export function appendSTM(turn: STMTurn) {
  stmBuffer.push(turn);
  if (stmBuffer.length > MAX_STM_SIZE) {
    stmBuffer = stmBuffer.slice(stmBuffer.length - MAX_STM_SIZE);
  }
}

export function resetSTM() {
  stmBuffer = [];
}

let isFirstTurnAfterRestart = true;

export function getIsFirstTurn(): boolean {
  return isFirstTurnAfterRestart;
}

export function setIsFirstTurn(value: boolean) {
  isFirstTurnAfterRestart = value;
}
// -------------------------------

let currentEmotionState: EmotionState = {
  mood: "neutral",
  energy: 0.5,
  attachment: 0.5,
  last_updated: new Date().toISOString(),
  social_battery: 1.0,
  sleepiness: 0.0,
  irritation: 0.0,
  volatility: 0.5,
  curiosity: 0.5,
};

let currentSessionMemory: SessionMemory = {
  summary: "",
  dominant_intent: null,
  dominant_emotion: "neutral",
  unresolved: false,
  significance: 0.0,
};

export function getEmotionState(): EmotionState {
  return { ...currentEmotionState }; // Return copy
}

export function setEmotionState(newState: EmotionState) {
  currentEmotionState = newState;
}

export function getSessionMemory(): SessionMemory {
  return { ...currentSessionMemory }; // Return copy
}

export function setSessionMemory(newMemory: SessionMemory) {
  currentSessionMemory = newMemory;
}