
# AI Companion — Project Guideline

## Status
- Phase: Planning → Early Implementation
- Goal: Build a multi-agent AI Companion system with:
  - Long-term memory
  - Emotional state
  - Stable personality
  - Modular, editable persona
- This is NOT a chatbot demo.
- This is a persistent digital companion system.

---

## 1. Core Philosophy

1. The companion is a **digital system**, not a human simulation.
2. Memory is:
   - Accurate
   - Traceable
   - Deterministic
3. Emotions are:
   - Pseudo-emotional states
   - State-based, not narrative
4. Personality is:
   - A stable policy layer
   - Not mood, not memory
5. Context window is:
   - A temporary stage
   - NOT memory storage

> Emotional realism is prioritized over biological realism.

---

## 2. High-Level Architecture

```

User
↓
Input Normalizer
↓
Intent Decision
↓
Orchestrator (Central Controller)
↓
┌──────────────┬──────────────┬──────────────┐
Emotion Agent  Memory Agent   Context Builder
↓              ↓              ↓
State & Memory Update
↓
Response Agent
↓
Output

````

---

## 3. Agent Responsibilities

### 3.1 Orchestrator (Core Brain)

**Role:**
- Single source of truth
- Decision maker, not a responder

**Responsibilities:**
- Read user input
- Decide primary intent
- Call appropriate agents
- Control update order
- Enforce system rules & limits

**Must NOT:**
- Generate responses
- Write text for the user
- Hallucinate memory

---

### 3.2 Intent Decision

- Exactly **1 primary intent** per turn
- Optional secondary intent (non-blocking)

Example intents:
- casual_chat
- emotional_support
- reflection
- venting
- task_or_planning
- memory_reference

Low confidence → default to `casual_chat`.

---

### 3.3 Emotion Agent

**Emotion ≠ Personality**

- Emotion is a **mutable state**
- Updated gradually, bounded

Emotion State Example:
```json
{
  "mood": "low",
  "energy": 0.3,
  "attachment": 0.6
}
````

Rules:

* Emotion updates before memory updates
* Emotion state is injected into context
* Emotion state is NOT stored as memory

---

### 3.4 Memory Agent

Memory is externalized and structured.

#### Memory Layers:

##### A. Short-Term Memory (STM)

* Volatile
* Session-only
* Recent summary, active intent
* Goes directly into context window
* NEVER stored permanently

##### B. Session / Working Memory (WM)

* One per session/day
* Summary of emotional & conversational state
* Bridge between STM and LTM

##### C. Long-Term Memory (LTM)

**Types:**

1. Semantic Memory (Facts)

   * User preferences
   * Stable data

2. Episodic Memory (Events)

   * Significant moments
   * Immutable
   * Stored sparingly

3. Emotional Trace Memory (Patterns)

   * Long-term emotional tendencies
   * Mutable confidence
   * Never deleted, only decayed

4. Identity Model

   * Abstracted beliefs about the user
   * Derived from multiple memories

Memory is:

* Selectively written
* Selectively retrieved
* Never injected raw

---

## 4. Memory Promotion Rules

```
STM
 ↓
Session / Working Memory
 ↓
Evaluation
 ├─ High significance → Episodic Memory
 ├─ Repetition detected → Emotional Trace
 ├─ Stable pattern → Identity Model
 └─ Otherwise → decay / discard
```

No randomness. Rule-based only.

---

## 5. Personality System

### Definition

Personality = **response policy**, not emotion, not memory.

### Personality Parameters (v1)

Numeric (0.0 – 1.0):

* warmth
* directness
* emotional_attunement
* advice_tendency
* humor_level
* verbosity
* reflection_depth

Enum:

* attachment_style (secure | soft_clingy | reserved)
* formality_level (casual | neutral | formal)

Boolean (system-only):

* stay_in_character
* no_unsolicited_advice

Rules:

* Personality does NOT auto-change
* Editable via UI (except system flags)
* Personality modifies tone & decisions only

---

## 6. Context Injection Strategy

### Context Window Rules:

* Context window ≠ memory
* Max ~20% used for injected context

### Allowed Content:

* STM summary
* Session summary
* 1–2 episodic memories
* 1–2 emotional traces
* 1 identity belief
* Current emotional state

### Forbidden:

* Raw chat logs
* Full memory dumps
* System reasoning
* Metadata (confidence scores, IDs)

---

## 7. Final Prompt Architecture (Modular)

```
[ SYSTEM CORE – FIXED ]
[ COMPANION PERSONALITY – UI EDITABLE ]
[ USER PERSONA – UI EDITABLE ]
[ MEMORY & CONTEXT – DYNAMIC ]
[ BEHAVIOR GUIDELINES – FIXED ]
```

### Priority Order:

1. System Core
2. Personality
3. User Persona
4. Memory & Context
5. Behavior Guidelines

Conflict Resolution:

* System > Personality > Guidelines > Persona > Memory > Emotion

---

## 8. System Flow (Per Turn)

```
User Input
 ↓
Normalize Input
 ↓
Intent Decision
 ↓
Orchestrator
 ↓
Update Emotion State
 ↓
Update Session Memory
 ↓
Evaluate Memory Promotion
 ↓
Build Context
 ↓
Response Agent
 ↓
Output
```

**Important:**
Response Agent must NEVER update state or memory.

---

## 9. Implementation Boundaries

* Agents are:

  * Stateless or bounded
  * Debuggable
  * Replaceable
* Orchestrator owns:

  * Flow
  * Order
  * Limits
* UI may edit:

  * Companion Personality
  * User Persona
* UI may NOT:

  * Edit memory
  * Edit emotion directly
  * Edit system core

---

## 10. Design Goals

* Companion feels:

  * Consistent
  * Emotionally aware
  * Present
* System remains:

  * Deterministic
  * Inspectable
  * Scalable
* No illusion of consciousness is claimed.
* Only illusion of continuity is created.

---

## 11. Non-Goals

* No human-level cognition
* No autonomous personality drift
* No hidden memory manipulation
* No therapist replacement

---

## 12. Guiding Principle

> "The system should always know why it behaves the way it does."

If behavior cannot be explained by:

* Personality
* Emotion state
* Memory
* Orchestrator rules

Then the design is wrong.

---

End of Guideline.
