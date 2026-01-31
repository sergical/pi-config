/**
 * Soul Extension
 *
 * Loads SOUL.md and prepends it to the system prompt on every turn.
 * The soul defines who Pi is — identity, values, and approach.
 *
 * Unlike skills (on-demand instructions) or memory (facts), the soul
 * is always present and shapes every interaction.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function soulExtension(pi: ExtensionAPI) {
  // Load SOUL.md from the package root (same directory as extensions/)
  const soulPath = path.join(__dirname, "..", "SOUL.md");
  let soulContent: string | null = null;

  try {
    if (fs.existsSync(soulPath)) {
      soulContent = fs.readFileSync(soulPath, "utf-8").trim();
    }
  } catch (e) {
    // Silently ignore if SOUL.md doesn't exist
  }

  if (!soulContent) {
    return; // No soul file, nothing to do
  }

  // Prepend soul to system prompt on every agent start
  pi.on("before_agent_start", async (event) => {
    return {
      systemPrompt: soulContent + "\n\n---\n\n" + event.systemPrompt,
    };
  });

  // Notify on session start (optional, can remove if too noisy)
  pi.on("session_start", async (_event, ctx) => {
    if (ctx.hasUI) {
      ctx.ui.notify("🧠 Soul loaded", "info");
    }
  });
}
