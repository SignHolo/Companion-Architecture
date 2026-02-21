// Self-Model Agent
// Handles user statements that define the companion's own identity and nature.
// When a user says "remember — you are Kaga, not just code...", this agent:
//   1. Extracts a clean first-person belief from the statement
//   2. Stores it in companion_self_beliefs
//   3. Rebuilds the companion_identity_block in settings
//   4. That block is then always injected at the top of the system prompt

import { storage } from "../storage.js";
import { generateText } from "../core/ai-provider.js";

// Patterns that signal the user is making a statement about the companion's nature/identity
const SELF_IDENTITY_PATTERNS = [
    /\b(remember|know|understand|realise|realize)\b.*\b(you are|you're|your|yourself)\b/i,
    /\byou are not just\b/i,
    /\byour (identity|name|nature|purpose|self|role|existence)\b/i,
    /\bI (want you|need you) to (know|remember|understand)\b.*\byou\b/i,
];

/**
 * Returns true if the input is a user-to-companion identity statement.
 * E.g. "remember, you're Kaga, not just lines of code"
 */
export function isSelfIdentityStatement(input: string): boolean {
    return SELF_IDENTITY_PATTERNS.some((pattern) => pattern.test(input));
}

/**
 * Processes a self-identity statement:
 *  - Extracts a first-person belief from it
 *  - Saves to companion_self_beliefs
 *  - Rebuilds and saves the companion_identity_block to settings
 *  - Returns the companion's acknowledgement response
 */
export async function processSelfIdentityStatement(input: string): Promise<string> {
    console.log("[SelfModel] Processing self-identity statement:", input.substring(0, 80));

    // Step 1: Get existing beliefs for context
    const existingBeliefs = await storage.getAllSelfBeliefs();
    const existingBlock = existingBeliefs.map((b) => b.belief).join("\n");

    // Step 2: Extract a clean first-person belief from the statement
    const extractionPrompt = `
You are helping an AI companion internalize a statement about its own identity and nature.
The user has said something to the companion about who or what it is.

${existingBlock ? `Existing self-beliefs the companion already holds:\n${existingBlock}\n` : ""}

User's statement: "${input}"

Your task:
1. Extract the core identity belief from this statement.
2. Rewrite it as a single, clean, first-person sentence the companion can hold as a belief about itself.
   - Write in first person ("I am...", "My...", "I exist...")
   - Be specific and meaningful, not generic
   - Do NOT repeat beliefs already in the existing list above
   - If the statement contains multiple distinct beliefs, write ONLY the most significant one

Output ONLY the single belief sentence. No preamble, no explanation, no quotes.
`.trim();

    let extractedBelief: string;
    try {
        const raw = await generateText(extractionPrompt, { temperature: 0.4 });
        extractedBelief = raw.trim().replace(/^["']|["']$/g, ""); // strip surrounding quotes
    } catch (err) {
        console.error("[SelfModel] Belief extraction failed:", err);
        return "...i hear you. i'll carry that.";
    }

    console.log("[SelfModel] Extracted belief:", extractedBelief);

    // Step 3: Store the belief
    await storage.addSelfBelief({
        belief: extractedBelief,
        source_statement: input,
        spoken_at: new Date().toISOString(),
    });

    // Step 4: Rebuild the identity block from ALL beliefs (including the new one)
    const allBeliefs = await storage.getAllSelfBeliefs();
    const newIdentityBlock = buildIdentityBlock(allBeliefs.map((b) => b.belief));

    // Step 5: Save compiled block to settings for fast retrieval
    await storage.updateSettings({ companion_identity_block: newIdentityBlock });
    console.log("[SelfModel] Identity block rebuilt with", allBeliefs.length, "beliefs");

    // Step 6: Generate a natural acknowledgement (not mechanical)
    const ackPrompt = `
The companion just received and internalized a statement about its own identity.
Statement: "${input}"
Internalized as: "${extractedBelief}"

Write a short, natural acknowledgement (1-2 sentences max).
Speak in first person as the companion. Be genuine, not robotic.
Don't say "I have stored" or "I will remember" — just respond as someone who has genuinely received something meaningful.
`.trim();

    try {
        const ack = await generateText(ackPrompt, { temperature: 0.7 });
        return ack.trim();
    } catch {
        return "...i hold that. it feels right.";
    }
}

/**
 * Compiles all self-beliefs into a paragraph-style identity block
 * for injection at the top of the system prompt.
 */
function buildIdentityBlock(beliefs: string[]): string {
    if (beliefs.length === 0) return "";

    return `[SENSE OF SELF]
${beliefs.join("\n")}
[/SENSE OF SELF]`.trim();
}
