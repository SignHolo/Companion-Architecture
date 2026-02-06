# AI Companion & Storyteller Architecture

A sophisticated multi-agent AI system designed to be a persistent, emotionally aware digital companion. This project combines a React Native (Expo) frontend with a complex Node.js backend driven by stateful agents.

## 🚀 Status
**Phase:** Planning → Early Implementation

## 📖 Overview

### Core Philosophy
- **Digital Native:** The companion is a digital system, not a human simulation.
- **Deterministic Memory:** Memory is accurate, traceable, and structured (not just a context window dump).
- **State-Based Emotion:** Emotions are mutable states (e.g., `mood`, `energy`), not just narrative descriptions.
- **Stable Personality:** Personality is a fixed policy layer that dictates *how* the AI responds, separate from its current mood or memory.

### Architecture
The system follows a strict unidirectional flow:
```
User Input → Normalizer → Intent Decision → Orchestrator → Agents (Emotion, Memory) → Context Builder → Response
```

## 🛠️ Tech Stack

### Frontend (Client)
- **Framework:** React Native (via Expo)
- **Language:** TypeScript
- **Navigation:** React Navigation (Drawer, Stack, Tabs)
- **UI:** Custom components with themed styling
- **State Management:** React Context + Hooks

### Backend (Server)
- **Runtime:** Node.js
- **Framework:** Express
- **Language:** TypeScript
- **Database:** PostgreSQL (via Drizzle ORM)
- **AI Model:** Google Generative AI (Gemini)
- **Architecture:** Multi-agent system (Orchestrator, Emotion, Memory, Response agents)

## 📂 Project Structure

- `client/` - React Native application code.
- `server/` - Node.js backend and agent logic.
- `shared/` - Shared types and schema definitions.
- `scripts/` - Build and utility scripts.
- `design_guidelines.md` - UI/UX specifications.
- `Project Guideline.md` - Deep dive into the agent architecture.

## 🏁 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn
- PostgreSQL database

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd Companion-Architecture
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env` file in the root directory (copy from `.env.example` if available). You will likely need:
    - `DATABASE_URL` (PostgreSQL connection string)
    - `GEMINI_API_KEY` (Google AI Studio key)

### Running the Project

The project uses `concurrently` to run both the server and client.

*   **Development (Server + Client):**
    ```bash
    npm start
    ```
    This runs `npm run server:dev` and `npm run expo:dev`.

*   **Server Only:**
    ```bash
    npm run server:dev
    ```

*   **Client Only:**
    ```bash
    npm run expo:dev
    ```

## 🧩 Agent System Details

- **Orchestrator:** The central brain. Decides intents and routes tasks. Does *not* generate text.
- **Emotion Agent:** Manages the internal emotional state vector (mood, energy, attachment).
- **Memory Agent:** Handles Short-Term (STM), Working (WM), and Long-Term (LTM) memory promotion and retrieval.
- **Response Agent:** Generates the final output based on the constructed context.

## 🎨 UI/UX Design

The application features a "Storybook Editorial" aesthetic with:
- **Palette:** Warm earthy tones (Saddle Brown, Cream, White).
- **Typography:** Playfair Display (Headings) & Inter (Body).
- **Interactions:** Gentle animations and a focus on readability.

## 📄 License
ISC
