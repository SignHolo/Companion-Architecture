// Context Builder
import type { EmotionState, SessionMemory } from "./state.js";
import type { EpisodicMemory, EmotionalTrace, SemanticMemory, IdentityMemory } from "../agents/memory.agent.js";

interface ContextParams {
  emotionState: EmotionState;
  sessionMemory: SessionMemory;
  longTermMemory: {
    episodic: EpisodicMemory[];
    traces: EmotionalTrace[];
    semantic: SemanticMemory[];
    identity: IdentityMemory[];
  };
  interactionGap: {
    hours: number;
    loneliness_label: string;
  };
}

export interface ContextBlock {
  emotion: {
    mood: string;
    energy: number;
    attachment: number;
    social_battery: number;
    sleepiness: number;
    irritation: number;
    curiosity: number;
    is_sleep_time: boolean;
  };
  interaction_gap: {
    hours: number;
    loneliness_label: string;
  };
  session: {
    summary: string;
    unresolved: boolean;
  };
  memories: {
    episodic: string[];
    emotional_traces: string[];
    semantic: string[]; // key: value
    identity: string[]; // belief
  };
}

export function buildContext({
  emotionState,
  sessionMemory,
  longTermMemory,
  interactionGap,
}: ContextParams): ContextBlock {
  
  // Sleep Calculation (UTC+7)
  const dateNow = new Date();
  const currentHour = (dateNow.getUTCHours() + 7) % 24;
  const isSleepTime = currentHour >= 23 || currentHour < 7;

  // 1. Emotion (Compressed)
  const emotion = {
    mood: emotionState.mood,
    energy: emotionState.energy,
    attachment: emotionState.attachment,
    social_battery: emotionState.social_battery,
    sleepiness: emotionState.sleepiness,
    irritation: emotionState.irritation,
    curiosity: emotionState.curiosity,
    is_sleep_time: isSleepTime,
  };

  // 2. Session Memory (Compressed)
  const session = {
    summary: sessionMemory.summary,
    unresolved: sessionMemory.unresolved,
  };

  // 3. Episodic Memory Selection
  // Max 2, Sort by: 1. recency (newest first), 2. importance
  // Since our array is chronological, newest is last.
  const sortedEpisodic = [...longTermMemory.episodic].sort((a, b) => {
    // Sort by timestamp descending (newest first)
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    if (timeA !== timeB) return timeB - timeA;
    // Then by importance descending
    return b.importance - a.importance; // importanceVal if text, need parseFloat? Assuming real now.
  });

  const selectedEpisodic = sortedEpisodic
    .slice(0, 2)
    .map((m) => m.summary);

  // 4. Emotional Trace Selection
  // Max 2, Sort by: 1. confidence descending
  const sortedTraces = [...longTermMemory.traces].sort((a, b) => {
    return b.confidence - a.confidence;
  });

  const selectedTraces = sortedTraces
    .slice(0, 2)
    .map((t) => t.pattern);

  // 5. Semantic & Identity Selection
  // For v1, take all retrieved (storage limits them if needed, currently we take all)
  // Format: "Key: Value"
  const selectedSemantic = longTermMemory.semantic.map(s => `${s.key}: ${s.value}`);
  const selectedIdentity = longTermMemory.identity.map(i => i.belief);

  return {
    emotion,
    interaction_gap: interactionGap,
    session,
    memories: {
      episodic: selectedEpisodic,
      emotional_traces: selectedTraces,
      semantic: selectedSemantic,
      identity: selectedIdentity
    },
  };
}