// Context Builder
import type { EmotionState, SessionMemory } from "./state.js";
import type { EpisodicMemory, EmotionalTrace } from "../agents/memory.agent.js";
import type { SemanticMemory, IdentityMemory } from "@shared/schema";
import { cosineSimilarity } from "./ai-provider.js";

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
  // Optional — if provided, episodic memories are re-ranked by semantic similarity
  currentInputEmbedding?: number[] | null;
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
  currentInputEmbedding,
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

  // 3. Episodic Memory Selection — Significance-Weighted Retrieval
  // Score = recency bonus + importance + emotional weight bonus
  // This ensures high-emotion moments surface even when not the most recent
  const WEIGHT_SCORE = { high: 0.4, medium: 0.2, low: 0.0 };
  const now = Date.now();

  const scoredEpisodic = [...longTermMemory.episodic].map((m) => {
    const ageHours = (now - new Date(m.created_at).getTime()) / (1000 * 60 * 60);
    // decay_rate controls the relevance window: slow=30d, normal=7d, fast=2d
    const decayDays = { slow: 30, normal: 7, fast: 2 }[(m.decay_rate as string) || "normal"] ?? 7;
    const recencyScore = Math.max(0, 1.0 - (ageHours / (24 * decayDays)));
    const weightBonus = WEIGHT_SCORE[(m.emotional_weight as keyof typeof WEIGHT_SCORE) || "low"] || 0;
    const baseScore = recencyScore + m.importance + weightBonus;

    // Semantic similarity re-ranking: blend cosine similarity (60%) with base score (40%)
    let finalScore = baseScore;
    if (currentInputEmbedding && m.embedding) {
      try {
        const memVec: number[] = JSON.parse(m.embedding);
        const sim = cosineSimilarity(currentInputEmbedding, memVec); // -1 to 1
        const normSim = (sim + 1) / 2; // normalize to 0-1
        finalScore = normSim * 0.6 + baseScore * 0.4;
      } catch { /* malformed embedding — use base score */ }
    }

    return { ...m, _score: finalScore };
  }).sort((a, b) => b._score - a._score);

  const selectedEpisodic = scoredEpisodic
    .slice(0, 3) // Allow 3 instead of 2 to capture both recent + high-weight memories
    .map((m) => m.narrative || m.summary); // Prefer first-person narrative

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