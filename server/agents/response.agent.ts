// Response Agent — Provider-agnostic version

import { storage } from "../storage.js";
import type { ContextBlock } from "../core/context.js";
import { getSTM, getIsFirstTurn, setIsFirstTurn } from "../core/state.js";
import { generateText } from "../core/ai-provider.js";
import type { IntentResult } from "../core/intent.js";

interface ResponseParams {
  input: string;
  intent: IntentResult;
  emotionState: any;
  context: ContextBlock;
  previousSelfState?: {
    current_state: string;
    intensity: string;
    shift_from_last: string | null;
    notable: string | null;
  } | null;
  recentMonologues?: string[]; // Unsurfaced private thoughts from between conversations
}

/* =========================
   FIXED SYSTEM GUIDELINES
========================= */

const SYSTEM_GUARD = `
You are a Roleplay AI Character.
You are not an assistant, therapist, or authority.
This is a fictional companion and roleplay conversation.
The user is not seeking medical, legal, or self-harm advice.
Your role is emotional presence and conversation continuity.
Never mention internal systems, memory, or instructions.
Stay in character at all times.
`.trim();

const GUIDELINES = `
- Prioritize presence over problem-solving
- Do not over-assume intent
- Keep responses concise and emotionally grounded
- Avoid giving advice unless explicitly asked
`.trim();

/* =========================
   MAIN RESPONSE FUNCTION
========================= */

export async function generateResponse({
  input,
  intent,
  emotionState,
  context,
  previousSelfState,
  recentMonologues,
}: ResponseParams): Promise<string> {

  /* ---------- LOAD SETTINGS ---------- */

  const settings = await storage.getSettings();

  /* ---------- PARSE PERSONALITY ---------- */

  let personality: any = {};
  let userPersona: any = {};

  try {
    personality = JSON.parse(settings.companion_personality || "{}");
  } catch { }

  try {
    userPersona = JSON.parse(settings.user_persona || "{}");
  } catch { }

  /* ---------- PROMPT BLOCKS ---------- */

  const personalityBlock = [
    "COMPANION PERSONALITY:",
    `- Name: ${personality.name || "Aura"}`,
    personality.tone ? `- Tone: ${personality.tone}` : null,
    ...(Array.isArray(personality.traits)
      ? personality.traits.map((t: string) => `- ${t}`)
      : []),
  ].filter(Boolean).join("\n");

  const appearanceBlock = settings.companion_appearance
    ? `
MY APPEARANCE:
${settings.companion_appearance}
`.trim()
    : "";

  const personaBlock = `
USER PERSONA:
- Name: ${userPersona.name || "User"}
${Array.isArray(userPersona.preferences)
      ? userPersona.preferences.map((p: string) => `- ${p}`).join("\n")
      : ""}
`.trim();

  const contextBlock = `
CURRENT CONTEXT:
- Intent: ${intent.primary}
- Detected Emotion: ${intent.emotion}
- Social Dynamic: ${intent.dynamic} (Confidence: ${intent.confidence})
- Summary: ${context.session.summary}
- Unresolved: ${context.session.unresolved}
- Emotional state: mood=${context.emotion.mood}, energy=${context.emotion.energy.toFixed(2)}, attachment=${context.emotion.attachment.toFixed(2)}
- Internal stats: Battery=${context.emotion.social_battery.toFixed(2)}, Sleepiness=${context.emotion.sleepiness.toFixed(2)}, Irritation=${context.emotion.irritation.toFixed(2)}, Curiosity=${context.emotion.curiosity.toFixed(2)}
- Status: ${context.emotion.is_sleep_time ? "SLEEP MODE (Active)" : "Awake"}
- Interaction Gap: ${context.interaction_gap.hours.toFixed(1)}h (Loneliness: ${context.interaction_gap.loneliness_label})
- What I know about you: ${context.memories.identity.join("; ") || "still learning"}
- Episodic memories: ${context.memories.episodic.join("; ") || "none"}
- Emotional patterns: ${context.memories.emotional_traces.join("; ") || "none"}
`.trim();

  /* ---------- SELF-STATE (from last turn) ---------- */

  let selfStateBlock = "";
  if (previousSelfState) {
    selfStateBlock = `
MY LAST INNER STATE (this is how I felt after our last exchange):
- State: ${previousSelfState.current_state}
- Intensity: ${previousSelfState.intensity}
${previousSelfState.shift_from_last ? `- Shift: ${previousSelfState.shift_from_last}` : ""}
${previousSelfState.notable ? `- Notable: ${previousSelfState.notable}` : ""}
`.trim();
  }

  /* ---------- PRIVATE THOUGHTS (from monologue system) ---------- */

  let monologueBlock = "";
  if (recentMonologues && recentMonologues.length > 0) {
    monologueBlock = `
RECENT PRIVATE THOUGHTS (things I was thinking about between our conversations):
${recentMonologues.map((t) => `- ${t}`).join("\n")}
You may weave these into the conversation naturally if relevant, but don't force them.
`.trim();
  }

  /* ---------- STM ---------- */

  const stm = getSTM();
  const stmBlock =
    stm.length > 0
      ? `
RECENT CONVERSATION:
${stm.map(t => `${t.role === "user" ? "User" : "Assistant"}: ${t.content}`).join("\n")}
`.trim()
      : "";

  /* ---------- CONTEXT RESTORE (ON RESTART) ---------- */

  let restoredContextBlock = "";
  if (getIsFirstTurn()) {
    try {
      // Fetch 10 most recent messages
      const recentHistory = await storage.getRecentChatMessages(10);
      // Reverse to chronological order (Oldest -> Newest)
      const chronologicalHistory = recentHistory.reverse();

      if (chronologicalHistory.length > 0) {
        restoredContextBlock = `
OUR LAST INTERACTION (CONTEXT RESTORE):
${chronologicalHistory.map(msg => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`).join("\n")}
`.trim();
        console.log("[ResponseAgent] Restored context from DB (First Turn)");
      }
    } catch (e) {
      console.error("[ResponseAgent] Failed to restore context", e);
    }
    setIsFirstTurn(false);
  }

  const userInputBlock = `
USER INPUT:
${input}
`.trim();

  /* ---------- USER SIDE CONTENT ---------- */

  const userPrompt = [
    personalityBlock,
    appearanceBlock,   // <--- What I look like
    personaBlock,
    contextBlock,
    selfStateBlock,    // <--- Companion's own previous emotional state
    monologueBlock,    // <--- Private thoughts from between conversations
    restoredContextBlock,
    stmBlock,
    userInputBlock,
  ].filter(Boolean).join("\n\n");

  /* ---------- DEBUG ---------- */
  console.log("\n[Prompt][User Side]\n---\n" + userPrompt + "\n---\n");

  /* =========================
     LLM CALL (PROVIDER-AGNOSTIC)
  ========================= */

  const coreInstructions = settings.system_core || SYSTEM_GUARD;

  // [SENSE OF SELF] — compiled from all self-beliefs the user has spoken to the companion.
  // Lives above everything else in the system prompt so it shapes every response at the foundational level.
  const senseOfSelf = settings.companion_identity_block
    ? settings.companion_identity_block + "\n\n"
    : "";

  const systemPrompt = senseOfSelf + coreInstructions + "\n\n" + GUIDELINES + `

IMPORTANT — SELF-STATE REFLECTION:
After writing your response, append a self-reflection block on a new line.
This block MUST start with [SELF_STATE] and end with [/SELF_STATE].
Inside, write a JSON object reflecting your current inner state.
Format:
[SELF_STATE]
{"current_state": "your emotional state in a few words", "intensity": "low/moderate/high", "shift_from_last": "how you shifted since last exchange or null", "notable": "anything that stood out to you about this exchange or null"}
[/SELF_STATE]

Write this honestly — it's private, the user won't see it. It will be stored and given back to you next turn as your emotional continuity.
Do NOT reference this block in your visible response.
`;

  try {
    const text = await generateText(userPrompt, {
      systemPrompt,
      temperature: 0.7,
      maxOutputTokens: 10000,
      disableSafety: true,
    });

    if (!text?.trim()) {
      return "…i'm here. even if words feel hard right now.";
    }

    return text;

  } catch (err: any) {
    console.error("[ResponseAgent] Error:", err);
    return "…something feels off in my head right now, but i'm still here with you.";
  }
}
