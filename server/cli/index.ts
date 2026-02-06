// CLI entry point
import readline from "readline";
import { handleTurn } from "../core/orchestrator.js";
import { storage } from "../storage.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("AI Companion CLI");
console.log("Commands:");
console.log("  /setkey <YOUR_GEMINI_KEY>  : Set Gemini API Key");
console.log("  exit                       : Quit");
console.log("------------------------------------------------");

function ask() {
  rl.question("> ", async (input) => {
    const trimmed = input.trim();
    
    if (trimmed === "exit") {
      rl.close();
      return;
    }

    if (trimmed.startsWith("/setkey ")) {
      const key = trimmed.split(" ")[1];
      if (key) {
        await storage.updateApiSetting({
          provider: "gemini",
          apiKey: key,
          model: "gemini-3-pro-preview"
        });
        console.log("[System] Gemini API Key saved.");
      } else {
        console.log("[System] Usage: /setkey <YOUR_KEY>");
      }
      ask();
      return;
    }

    if (trimmed) {
        const response = await handleTurn(trimmed);
        console.log("\nCompanion:", response);
    }

    ask();
  });
}

ask();
