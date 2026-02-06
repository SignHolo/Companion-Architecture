# Companion Architecture — Research & Applied System

A research-driven, multi-agent AI system exploring **state-based prompt assembling**
to model dynamic *pseudo-emotional* behavior in large language model (LLM) systems.

This project is not a chatbot demo.  
It is an **inspectable, deterministic architecture** designed to study how emotion,
memory, and personality can be represented as explicit system states rather than
implicit narrative tricks.

---

##  Project Status

**Phase:** Research → Early Implementation  
This repository is actively used for experimentation, iteration, and architectural validation.

---

##  Core Motivation

Most LLM-based systems rely on:
- static prompts
- implicit emotional language
- opaque behavior changes

This project explores an alternative approach:

> **Emotion, memory, and personality as explicit, inspectable system states,
assembled into prompts deterministically per interaction.**

The goal is **behavioral consistency and explainability**, not human simulation.

---

##  Design Principles

- **Digital System First**  
  This companion is a software system, not a human analogy.

- **Pseudo-Emotion, Not Human Emotion**  
  Emotional behavior is represented as bounded, mutable state parameters
  (e.g. `mood`, `energy`, `attachment`), not subjective experience.

- **Deterministic Memory**  
  Memory is structured, promoted, and retrieved by rule-based logic —
  never injected raw into the context window.

- **Stable Personality Layer**  
  Personality acts as a response policy, separate from emotion and memory,
  and does not drift autonomously.

- **Inspectability Over Illusion**  
  All internal decisions and state transitions are observable via logs.

---

##  High-Level Architecture

```

User Input
↓
Input Normalizer
↓
Intent Decision
↓
Orchestrator (Central Controller)
↓
Emotion Agent → Memory Agent → Context Builder
↓
Response Agent
↓
Output

```

The **Orchestrator** owns all flow control and state update order.
Agents are modular, bounded, and replaceable.

---

##  Demo & Observability

The system includes a UI-based interaction layer for running scenarios.
All internal processes are **logged to the console** for research and inspection:

- Emotion state updates (before / after)
- Memory promotion decisions
- Prompt assembly segments
- Orchestration flow

This design intentionally prioritizes **system transparency**
over UI abstraction.

---

##  Tech Stack

### Client
- React Native (Expo)
- TypeScript
- React Navigation
- Custom themed UI components
- React Context + Hooks

### Server
- Node.js + Express
- TypeScript
- PostgreSQL (via Drizzle ORM)
- Google Generative AI (Gemini)
- Multi-agent orchestration architecture

---

##  Project Structure

```

client/                 # UI interaction layer
server/                 # Orchestrator and agent system
shared/                 # Shared schemas and types
scripts/                # Utilities and tooling
design_guidelines.md    # UI/UX specification
Project Guideline.md    # Deep architectural rationale

````

---

##  Getting Started

### Prerequisites
- Node.js v18+
- npm or yarn
- PostgreSQL database

### Installation

```bash
git clone <repository-url>
cd Companion-Architecture
npm install
````

### Environment Setup

Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://...
GEMINI_API_KEY=your_api_key
```

### Run (Development)

```bash
npm start
```

This runs both:

* the server (agent system)
* the client (UI interaction layer)

---

##  Intended Audience

This project is intended for:

* AI / GenAI Engineers
* System-oriented software engineers
* Researchers exploring LLM behavior control
* Developers interested in inspectable prompt architectures

It is **not** intended as:

* a production-ready AI companion
* a human-like emotional simulation
* a UX-focused chatbot demo

---

##  License

MIT
