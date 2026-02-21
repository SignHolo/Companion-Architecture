import { storage } from "../storage.js";
import { generateText, generateEmbedding } from "../core/ai-provider.js";

export async function extractAndPromoteMemories(input: string, sessionSummary: string) {
  const settings = await storage.getSettings();

  const prompt = `
    You are a Memory Extraction System for an AI Companion.
    Analyze the user input and session summary to identify NEW permanent information worth storing.
    
    Extract three types of memories:

    1. "semantic": Explicit facts (e.g., name, job, likes, dislikes). Key should be snake_case.
    2. "identity": Abstract beliefs about the user (e.g., values, personality traits).
    3. "episodic": Significant emotional moments worth remembering long-term.
       For each episodic entry, include:
       - "summary": A factual third-person summary of what happened.
       - "narrative": A first-person passage written FROM YOUR PERSPECTIVE as the companion.
         Write it as if you are journaling about this moment — what you noticed, what felt important,
         what tone they used, what you think it meant. Be authentic and specific, not generic.
         Example: "He said it quietly — 'going through the motions.' I noticed the weight in it.
         Like he was describing distance, not just tiredness."
       - "emotion": The dominant emotion ('low', 'neutral', 'positive')
       - "importance": A float 0.0-1.0 representing how significant this moment is
       - "emotional_weight": 'low', 'medium', or 'high' — how deeply this moment landed emotionally
       - "significance_note": A brief note on WHY this mattered (e.g. "this was an admission, not a complaint — he was trusting")
       - "tone": The emotional register of the moment (e.g. "reflective, a little shy" or "frustrated but holding back")
       - "decay_rate": 'slow', 'normal', or 'fast' — high emotional weight = 'slow' (remembered longer)

    Return a JSON object with this structure:
    {
      "semantic": [ { "key": "user_name", "value": "Budi", "source": "explicit_user" } ],
      "identity": [ { "belief": "User values honesty", "confidence": 0.8 } ],
      "episodic": [ { "summary": "...", "narrative": "...", "emotion": "low", "importance": 0.8, "emotional_weight": "high", "significance_note": "...", "tone": "...", "decay_rate": "slow" } ]
    }

    Return empty arrays if nothing significant is found for a category.
    DO NOT extract trivial info (e.g., "User said hello").
    Only create episodic entries for moments with genuine emotional weight — not every message deserves one.
    
    Session Summary: ${sessionSummary}
    User Input: ${input}
  `;

  try {
    let text = await generateText(prompt, { jsonMode: true });

    // Strip markdown code fences if present
    text = text.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    const data = JSON.parse(text);

    // Promote Semantic Memories
    if (data.semantic && Array.isArray(data.semantic)) {
      for (const item of data.semantic) {
        await storage.createSemanticMemory({
          key: item.key,
          value: item.value,
          source: item.source || "system_inferred",
          timestamp: new Date().toISOString(),
        });
        console.log("[Extraction] Promoted Semantic:", item);
        // Embed asynchronously — don't block the write path
        generateEmbedding(`${item.key}: ${item.value}`).then(async (vec) => {
          if (vec) {
            await storage.updateSemanticEmbedding(item.key, vec);
          }
        }).catch(() => { });
      }
    }

    // Promote Identity Memories
    if (data.identity && Array.isArray(data.identity)) {
      for (const item of data.identity) {
        await storage.createIdentityMemory({
          belief: item.belief,
          confidence: item.confidence || 0.5,
        });
        console.log("[Extraction] Promoted Identity:", item);
      }
    }

    // Promote Episodic Memories (with first-person narrative + emotional tagging)
    if (data.episodic && Array.isArray(data.episodic)) {
      for (const item of data.episodic) {
        if (item.importance >= 0.6) {
          const saved = await storage.createEpisodicMemory({
            summary: item.summary || "Significant moment detected.",
            narrative: item.narrative || null,
            emotion: item.emotion || "neutral",
            importance: item.importance,
            emotional_weight: item.emotional_weight || null,
            significance_note: item.significance_note || null,
            tone: item.tone || null,
            decay_rate: item.decay_rate || "normal",
            created_at: new Date().toISOString(),
          });
          console.log("[Extraction] Promoted Episodic:", {
            summary: item.summary,
            narrative: item.narrative ? item.narrative.substring(0, 60) + "..." : "none",
            weight: item.emotional_weight,
            importance: item.importance
          });
          // Embed using the richer narrative if available, else summary
          const textToEmbed = item.narrative || item.summary || "";
          generateEmbedding(textToEmbed).then(async (vec) => {
            if (vec && saved?.id) {
              await storage.updateEpisodicEmbedding(saved.id, vec);
            }
          }).catch(() => { });
        }
      }
    }

  } catch (error) {
    console.error("[Extraction] Error:", error);
  }
}

