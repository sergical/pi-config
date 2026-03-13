#!/usr/bin/env node

/**
 * Claude Code SDK Demo
 *
 * Shows how to programmatically invoke Claude Code from another agent/script.
 * The SDK spawns Claude Code as a subprocess and streams messages back.
 *
 * Install: npm install -g @anthropic-ai/claude-code
 * Run:     node examples/claude-sdk-demo.mjs
 */

import { query } from "@anthropic-ai/claude-code";

// ─────────────────────────────────────────────
// Example 1: Simple one-shot query
// ─────────────────────────────────────────────
async function simpleQuery() {
  console.log("=== Example 1: Simple Query ===\n");

  const conversation = query({
    prompt: "What files are in the current directory? Just list them briefly.",
    options: {
      allowedTools: ["Bash", "Glob"],
      maxTurns: 3,
    },
  });

  for await (const message of conversation) {
    // "assistant" messages contain Claude's responses and tool calls
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "text") {
          console.log("[Claude]:", block.text);
        }
        if (block.type === "tool_use") {
          console.log(`[Tool Call]: ${block.name}(${JSON.stringify(block.input).slice(0, 100)})`);
        }
      }
    }

    // "result" messages indicate the conversation is done
    if (message.type === "result") {
      console.log(`\n[Done] Cost: $${message.total_cost_usd?.toFixed(4)}, Turns: ${message.num_turns}`);
      console.log(`[Session ID]: ${message.session_id}`);
      return message.session_id;
    }
  }
}

// ─────────────────────────────────────────────
// Example 2: Resume a previous session
// ─────────────────────────────────────────────
async function resumeSession(sessionId) {
  console.log("\n=== Example 2: Resume Session ===\n");

  const conversation = query({
    prompt: "Based on what you just saw, which file is the most interesting?",
    options: {
      allowedTools: ["Read"],
      maxTurns: 2,
      resume: sessionId, // continues with full context from previous session
    },
  });

  for await (const message of conversation) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "text") {
          console.log("[Claude]:", block.text);
        }
      }
    }
    if (message.type === "result") {
      console.log(`\n[Done] Cost: $${message.total_cost_usd?.toFixed(4)}`);
    }
  }
}

// ─────────────────────────────────────────────
// Example 3: With custom tool permission handler
// ─────────────────────────────────────────────
async function queryWithPermissions() {
  console.log("\n=== Example 3: Custom Permission Handler ===\n");

  // When using canUseTool, prompt must be an async iterable (stream-json mode)
  async function* promptStream() {
    yield {
      type: "user_message",
      message: {
        role: "user",
        content: "Read the package.json and tell me the project name.",
      },
    };
  }

  const conversation = query({
    prompt: promptStream(),
    options: {
      maxTurns: 3,

      // This callback fires whenever Claude wants to use a tool.
      // Return { behavior: "allow" } or { behavior: "deny", message: "reason" }
      canUseTool: async (toolName, input) => {
        console.log(`[Permission Check] Tool: ${toolName}, Input: ${JSON.stringify(input).slice(0, 80)}`);

        // Example: block writes, allow reads
        if (toolName === "Write" || toolName === "Edit") {
          return { behavior: "deny", message: "Read-only mode: writes are blocked" };
        }

        // Example: block dangerous bash commands
        if (toolName === "Bash" && input.command?.match(/rm |sudo |chmod /)) {
          return { behavior: "deny", message: "Dangerous command blocked" };
        }

        return { behavior: "allow", updatedInput: input };
      },
    },
  });

  for await (const message of conversation) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "text") {
          console.log("[Claude]:", block.text);
        }
      }
    }
    if (message.type === "result") {
      console.log(`\n[Done] Cost: $${message.total_cost_usd?.toFixed(4)}`);
    }
  }
}

// ─────────────────────────────────────────────
// Example 4: Inject custom system prompt
// ─────────────────────────────────────────────
async function queryWithSystemPrompt() {
  console.log("\n=== Example 4: Custom System Prompt ===\n");

  const conversation = query({
    prompt: "Analyze this project.",
    options: {
      allowedTools: ["Read", "Glob", "Grep"],
      maxTurns: 5,
      appendSystemPrompt:
        "You are a senior code reviewer. Focus only on security issues. Be very brief.",
    },
  });

  for await (const message of conversation) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "text") {
          console.log("[Claude]:", block.text);
        }
      }
    }
    if (message.type === "result") {
      console.log(`\n[Done] Cost: $${message.total_cost_usd?.toFixed(4)}`);
    }
  }
}

// ─────────────────────────────────────────────
// Example 5: Abort a long-running query
// ─────────────────────────────────────────────
async function queryWithAbort() {
  console.log("\n=== Example 5: Abort After Timeout ===\n");

  const abortController = new AbortController();

  // Auto-abort after 10 seconds
  const timeout = setTimeout(() => {
    console.log("[Aborting after 10s timeout]");
    abortController.abort();
  }, 10_000);

  try {
    const conversation = query({
      prompt: "Do a comprehensive analysis of this entire codebase.",
      options: {
        allowedTools: ["Read", "Glob", "Grep"],
        maxTurns: 20,
        abortController,
      },
    });

    for await (const message of conversation) {
      if (message.type === "assistant") {
        for (const block of message.message.content) {
          if (block.type === "text") {
            console.log("[Claude]:", block.text.slice(0, 200));
          }
        }
      }
      if (message.type === "result") {
        console.log(`\n[Done] Cost: $${message.total_cost_usd?.toFixed(4)}`);
      }
    }
  } catch (err) {
    console.log(`[Aborted]: ${err.message}`);
  } finally {
    clearTimeout(timeout);
  }
}

// ─────────────────────────────────────────────
// Run whichever example you want
// ─────────────────────────────────────────────
const example = process.argv[2] || "1";

switch (example) {
  case "1": {
    await simpleQuery();
    break;
  }
  case "2": {
    const sid = await simpleQuery();
    await resumeSession(sid);
    break;
  }
  case "3": {
    await queryWithPermissions();
    break;
  }
  case "4": {
    await queryWithSystemPrompt();
    break;
  }
  case "5": {
    await queryWithAbort();
    break;
  }
  default:
    console.log("Usage: node examples/claude-sdk-demo.mjs [1-5]");
}
