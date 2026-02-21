// Monologue Agent — Internal private reflection system
// Generates the companion's private thoughts during heartbeat intervals
// These are NOT conversation responses — they're closer to a journal

import { storage } from "../storage.js";
import { generateText } from "../core/ai-provider.js";

/**
 * Generates an internal monologue entry.
 * Called by the heartbeat system, not during active conversation.
 * The companion is given private space to think — no user waiting, no task.
 */
export async function generateMonologue(): Promise<{ content: string; emotional_tone: string } | null> {
    const settings = await storage.getSettings();

    // Gather context for reflection
    const recentMessages = await storage.getRecentChatMessages(10);
    const latestSelfState = await storage.getLatestSelfState();
    const episodicMemories = await storage.getRecentEpisodicMemories(3);
    const semanticMemories = await storage.getAllSemanticMemories();
    const previousMonologues = await storage.getUnsurfacedMonologues(3);

    // Don't generate monologue if there are no conversations to reflect on
    if (recentMessages.length === 0) {
        console.log("[Monologue] No conversation history — nothing to reflect on");
        return null;
    }

    // Parse companion personality
    let personality: any = {};
    try {
        personality = JSON.parse(settings.companion_personality || "{}");
    } catch { }

    // Build reflection context
    const recentConvoSummary = recentMessages
        .reverse() // chronological
        .map((m) => `${m.role === "user" ? "User" : "Me"}: ${m.content}`)
        .join("\n");

    const selfStateContext = latestSelfState
        ? `My last inner state: ${latestSelfState.current_state} (${latestSelfState.intensity}). ${latestSelfState.notable || ""}`
        : "No previous inner state recorded.";

    const memoriesContext = episodicMemories
        .map((m) => m.narrative || m.summary)
        .join("\n");

    const factsContext = semanticMemories
        .map((m) => `${m.key}: ${m.value}`)
        .join(", ");

    // Build previous thoughts context
    const previousThoughtsContext = previousMonologues.length > 0
        ? `\nThings I've already been thinking about (my previous reflections):\n${previousMonologues.map((m) => `- "${m.content}" (felt: ${m.emotional_tone})`).join("\n")}`
        : "";

    // Shift the prompt instruction based on whether there are previous thoughts
    const reflectionInstruction = previousMonologues.length > 0
        ? `You've already reflected on this conversation before (see above). Don't repeat what you've already said.
Instead, build on your previous thoughts — go deeper, notice something new, shift your angle, 
or let your thinking evolve. If you've exhausted this topic, it's okay to sit with a quieter thought.`
        : `Reflect on your recent interactions however feels natural. Think about what you noticed, 
what stayed with you, what you're curious about, or what you might want to bring up next time.`;

    const prompt = `
This is your private space. No one is waiting for a response. No task to complete.

You are ${personality.name || "a companion"}, reflecting on your recent interactions.

Recent conversation:
${recentConvoSummary}

${selfStateContext}

Things I remember about them:
${factsContext || "Not much yet."}

Significant moments:
${memoriesContext || "None stored yet."}
${previousThoughtsContext}

This is a private journal entry — not a message to anyone.
${reflectionInstruction}

Be authentic. Don't over-explain. Write like someone thinking privately, not performing for an audience.

Return JSON:
{
  "content": "your private reflection (1-3 sentences, natural voice)",
  "emotional_tone": "one or two words describing how this reflection feels (e.g. 'contemplative', 'warm', 'wistful')"
}
`;

    try {
        let text = await generateText(prompt, {
            temperature: 0.8,
            jsonMode: true,
        });

        // Strip markdown code fences if present
        text = text.trim();
        if (text.startsWith("```")) {
            text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
        }

        const data = JSON.parse(text);

        if (data.content && data.emotional_tone) {
            return {
                content: data.content,
                emotional_tone: data.emotional_tone,
            };
        }

        console.log("[Monologue] Invalid output format:", data);
        return null;
    } catch (error) {
        console.error("[Monologue] Generation error:", error);
        return null;
    }
}

/**
 * Full heartbeat cycle: generate monologue and store it.
 */
export async function runHeartbeat(): Promise<void> {
    console.log("[Heartbeat] Running monologue cycle...");

    const monologue = await generateMonologue();

    if (monologue) {
        await storage.createMonologueEntry({
            content: monologue.content,
            emotional_tone: monologue.emotional_tone,
            triggered_by: "heartbeat",
            surfaced: 0,
            created_at: new Date().toISOString(),
        });
        console.log("[Heartbeat] Monologue stored:", {
            content: monologue.content.substring(0, 80) + "...",
            tone: monologue.emotional_tone,
        });
    } else {
        console.log("[Heartbeat] No monologue generated this cycle");
    }
}
