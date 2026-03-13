/**
 * Claude Tool — Invoke Claude Code from within pi
 *
 * Registers a `claude` tool that delegates tasks to Claude Code via the
 * @anthropic-ai/claude-agent-sdk. Claude Code has web search, file access,
 * bash, code editing, and all built-in tools. Results stream back live.
 *
 * ## Streaming Overlay
 *
 * In interactive mode (ctx.hasUI), a non-capturing overlay panel streams
 * Claude Code's output in real-time on the right side of the terminal.
 * The overlay is passive — it doesn't steal keyboard focus, so the agent
 * and user can continue working. It auto-closes when the tool finishes.
 *
 * In headless mode (subagents), the overlay is skipped entirely.
 * The tool behavior is identical regardless of UI availability.
 *
 * ## Session Persistence
 *
 * Every invocation creates a persistent Claude Code session stored at:
 *   ~/.claude/projects/<encoded-cwd>/<session-id>.jsonl
 *
 * Sessions are indexed locally in .pi/claude-sessions.json (last 50) with
 * prompt, model, timestamp, cost, and turns for quick lookup.
 *
 * To resume a session, pass `resumeSessionId` with the session UUID.
 * This loads the conversation history and continues where it left off.
 * Useful for retrying cancelled runs or asking follow-up questions.
 *
 * From the CLI: `claude --resume <session-id>`
 *
 * The session ID is shown in the tool's live progress and final output,
 * and also available in the tool result details for other agents to use.
 *
 * ## Parallel Mode
 *
 * Pass `tasks: [{prompt, model?, outputFile?, ...}, ...]` to run up to 8 Claude
 * sessions concurrently (max 3 at a time). Each result is written to its
 * outputFile (auto-generated as .pi/claude-parallel-N.md if omitted).
 * A combined overlay panel shows all tasks' status in real time.
 * Returns a summary of output paths, costs, and turn counts.
 *
 * ## Concurrency
 *
 * Multiple claude tool calls can run in parallel. Each invocation has its
 * own isolated state (text buffer, tool tracking, abort controller).
 * No shared mutable state between calls. Only one overlay is shown at a
 * time — concurrent calls skip the overlay for the second+ invocations.
 */

import type { ExtensionAPI, Theme } from "@mariozechner/pi-coding-agent";
import { truncateHead, DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, formatSize } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { Text, truncateToWidth, visibleWidth, wrapTextWithAnsi } from "@mariozechner/pi-tui";
import type { TUI, Component } from "@mariozechner/pi-tui";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Lazy-loaded SDK query function. Resolved on first tool call to avoid
// failing at extension load time when node_modules hasn't been installed yet.
let _query: typeof import("@anthropic-ai/claude-agent-sdk").query | undefined;

async function getQuery() {
	if (_query) return _query;
	const extDir = dirname(fileURLToPath(import.meta.url));
	const nodeModulesDir = join(extDir, "node_modules", "@anthropic-ai", "claude-agent-sdk");
	if (!existsSync(nodeModulesDir)) {
		execSync("npm install --no-fund --no-audit", { cwd: extDir, stdio: "pipe" });
	}
	const sdk = await import("@anthropic-ai/claude-agent-sdk");
	_query = sdk.query;
	return _query;
}

// ── Helpers ──

function formatDuration(ms: number): string {
	const secs = Math.floor(ms / 1000);
	if (secs < 60) return `${secs}s`;
	const mins = Math.floor(secs / 60);
	const rem = secs % 60;
	return `${mins}m${rem.toString().padStart(2, "0")}s`;
}

function countTokensApprox(text: string): number {
	return Math.ceil(text.length / 4);
}

/** Compress ["WebFetch","WebFetch","WebFetch","Read","Read"] → "WebFetch×3 → Read×2" */
function compressToolChain(tools: string[]): string {
	if (tools.length === 0) return "";
	const groups: { name: string; count: number }[] = [];
	for (const tool of tools) {
		const last = groups[groups.length - 1];
		if (last && last.name === tool) {
			last.count++;
		} else {
			groups.push({ name: tool, count: 1 });
		}
	}
	return groups
		.map((g) => (g.count > 1 ? `${g.name}×${g.count}` : g.name))
		.join(" → ");
}

/** Append a session record to ~/.pi/history/<project>/claude-sessions.json */
function indexSession(cwd: string, record: {
	sessionId: string;
	prompt: string;
	model?: string;
	timestamp: string;
	elapsed: number;
	cost: number;
	turns: number;
}) {
	try {
		const project = basename(cwd);
		const dir = join(homedir(), ".pi", "history", project);
		mkdirSync(dir, { recursive: true });
		const file = join(dir, "claude-sessions.json");
		let sessions: any[] = [];
		try {
			sessions = JSON.parse(readFileSync(file, "utf-8"));
		} catch {}
		sessions.push(record);
		if (sessions.length > 50) sessions = sessions.slice(-50);
		writeFileSync(file, JSON.stringify(sessions, null, 2) + "\n");
	} catch {}
}

// ── Overlay State & Component ──

/** Shared mutable state between streaming loop and overlay component */
interface OverlayState {
	text: string;
	phase: "thinking" | "tools" | "responding";
	toolUses: string[];
	cost: number;
	startTime: number;
	sessionId: string;
	sessionModel: string;
	responseTokens: number;
	prompt: string;
}

/** Maximum lines of streaming output to show in the overlay */
const OVERLAY_MAX_LINES = 40;

/** Maximum concurrent Claude sessions in parallel mode */
const MAX_PARALLEL_CONCURRENT = 3;

/** Hard cap on tasks array length */
const MAX_PARALLEL_TASKS = 8;

async function mapWithConcurrencyLimit<TIn, TOut>(
	items: TIn[],
	concurrency: number,
	fn: (item: TIn, index: number) => Promise<TOut>,
): Promise<TOut[]> {
	if (items.length === 0) return [];
	const limit = Math.max(1, Math.min(concurrency, items.length));
	const results: TOut[] = new Array(items.length);
	let nextIndex = 0;
	const workers = Array.from({ length: limit }, async () => {
		while (true) {
			const current = nextIndex++;
			if (current >= items.length) return;
			results[current] = await fn(items[current], current);
		}
	});
	await Promise.all(workers);
	return results;
}

interface ParallelTaskState {
	prompt: string;
	phase: "pending" | "thinking" | "tools" | "responding" | "done" | "error";
	cost: number;
}

interface ParallelOverlayState {
	tasks: ParallelTaskState[];
	startTime: number;
}

class ParallelClaudePanel implements Component {
	constructor(
		private state: ParallelOverlayState,
		private theme: Theme,
	) {}

	render(width: number): string[] {
		const th = this.theme;
		const innerW = width - 4;
		if (innerW < 10) return [];

		const lines: string[] = [];
		const pad = (content: string) => {
			const vis = visibleWidth(content);
			const padding = Math.max(0, innerW - vis);
			return th.fg("border", "│") + " " + content + " ".repeat(padding) + " " + th.fg("border", "│");
		};

		// ── Top border ──
		const elapsed = formatDuration(Date.now() - this.state.startTime);
		const title = ` Claude Code ×${this.state.tasks.length}  ${elapsed} `;
		const titleStyled = th.fg("accent", title);
		const borderRemaining = Math.max(0, innerW - title.length);
		const left = Math.floor(borderRemaining / 2);
		const right = borderRemaining - left;
		lines.push(th.fg("border", "╭" + "─".repeat(left)) + titleStyled + th.fg("border", "─".repeat(right) + "╮"));

		// ── Summary line ──
		const done = this.state.tasks.filter((t) => t.phase === "done" || t.phase === "error").length;
		const totalCost = this.state.tasks.reduce((s, t) => s + t.cost, 0);
		let statusLine = th.fg("muted", `${done}/${this.state.tasks.length} done`);
		if (totalCost > 0) statusLine += th.fg("dim", `  $${totalCost.toFixed(4)} total`);
		lines.push(pad(statusLine));
		lines.push(th.fg("border", "├" + "─".repeat(innerW + 2) + "┤"));

		// ── Per-task rows ──
		for (let i = 0; i < this.state.tasks.length; i++) {
			const t = this.state.tasks[i];
			let icon: string;
			if (t.phase === "done") icon = th.fg("success", "✓");
			else if (t.phase === "error") icon = th.fg("error", "✗");
			else if (t.phase === "pending") icon = th.fg("dim", "○");
			else icon = th.fg("warning", "●");

			const phaseStr =
				t.phase === "thinking" ? "thinking"
				: t.phase === "tools" ? "working"
				: t.phase === "responding" ? "responding"
				: "";
			const costStr = t.cost > 0 ? `$${t.cost.toFixed(4)}` : "";
			const right = [phaseStr && th.fg("muted", phaseStr), costStr && th.fg("dim", costStr)]
				.filter(Boolean)
				.join("  ");

			const prefix = icon + " " + th.fg("dim", `[${i + 1}] `);
			const prefixW = visibleWidth(prefix);
			const rightW = visibleWidth(right);
			const available = innerW - prefixW - rightW - (right ? 2 : 0);
			const promptDisplay =
				t.prompt.length > available && available > 5
					? t.prompt.slice(0, available - 1) + "…"
					: t.prompt.slice(0, Math.max(0, available));
			const gap = Math.max(0, innerW - prefixW - visibleWidth(promptDisplay) - rightW);
			lines.push(pad(prefix + th.fg("toolOutput", promptDisplay) + " ".repeat(gap) + right));
		}

		lines.push(th.fg("border", "╰" + "─".repeat(innerW + 2) + "╯"));
		return lines;
	}

	invalidate(): void {}
}

/**
 * Non-capturing overlay panel that streams Claude Code output.
 * State is mutated externally by the streaming loop; the component
 * reads it on each render() call. No caching since content changes
 * on every update.
 */
class ClaudeStreamPanel implements Component {
	constructor(
		private state: OverlayState,
		private theme: Theme,
	) {}

	render(width: number): string[] {
		const th = this.theme;
		const innerW = width - 4; // 2 for border chars, 2 for padding
		if (innerW < 10) return [];

		const lines: string[] = [];

		const pad = (content: string) => {
			const vis = visibleWidth(content);
			const padding = Math.max(0, innerW - vis);
			return th.fg("border", "│") + " " + content + " ".repeat(padding) + " " + th.fg("border", "│");
		};

		// ── Top border with title ──
		const elapsed = formatDuration(Date.now() - this.state.startTime);
		const title = ` Claude Code ${elapsed} `;
		const titleStyled = th.fg("accent", title);
		const borderRemaining = Math.max(0, innerW - title.length);
		const leftBorder = Math.floor(borderRemaining / 2);
		const rightBorder = borderRemaining - leftBorder;
		lines.push(
			th.fg("border", "╭" + "─".repeat(leftBorder)) +
			titleStyled +
			th.fg("border", "─".repeat(rightBorder) + "╮")
		);

		// ── Status line ──
		let status = "";
		const phase = this.state.phase;
		if (phase === "thinking") {
			status += th.fg("warning", "● ") + th.fg("muted", "thinking…");
		} else if (phase === "tools") {
			status += th.fg("warning", "● ") + th.fg("muted", "working…");
		} else {
			status += th.fg("success", "● ") + th.fg("muted", "responding");
			if (this.state.responseTokens > 0) {
				status += th.fg("dim", ` ~${this.state.responseTokens} tokens`);
			}
		}
		if (this.state.cost > 0) {
			status += th.fg("dim", ` · $${this.state.cost.toFixed(4)}`);
		}
		lines.push(pad(status));

		// ── Tool chain ──
		if (this.state.toolUses.length > 0) {
			const chain = compressToolChain(this.state.toolUses);
			const toolLine = th.fg("dim", "tools: " + chain);
			for (const wl of wrapTextWithAnsi(toolLine, innerW)) {
				lines.push(pad(wl));
			}
		}

		// ── Separator ──
		lines.push(th.fg("border", "├" + "─".repeat(innerW + 2) + "┤"));

		// ── Streaming content (last N lines) ──
		const text = this.state.text;
		if (!text) {
			lines.push(pad(th.fg("dim", "Waiting for output…")));
		} else {
			// Wrap and take last N lines for auto-scrolling effect
			const rawLines = text.split("\n");
			const wrappedLines: string[] = [];
			for (const rl of rawLines) {
				if (rl === "") {
					wrappedLines.push("");
				} else {
					wrappedLines.push(...wrapTextWithAnsi(rl, innerW));
				}
			}

			const display = wrappedLines.slice(-OVERLAY_MAX_LINES);
			for (const dl of display) {
				lines.push(pad(truncateToWidth(dl, innerW)));
			}
		}

		// ── Bottom border ──
		lines.push(th.fg("border", "╰" + "─".repeat(innerW + 2) + "╯"));

		return lines;
	}

	invalidate(): void {
		// No cache to clear — we always render fresh from state
	}
}

// ── Concurrency guard: only one overlay at a time ──
let overlayActive = false;

// ── Extension ──

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "claude",
		label: "Claude Code",
		description:
			`Spawn a separate Claude Code session. ONLY use when the user explicitly asks for it, or for genuinely ` +
			`complex multi-step investigations spanning many files that you cannot do yourself. ` +
			`You have read, edit, write, bash, and all other tools — use THOSE first. ` +
			`Do NOT delegate to Claude Code out of convenience or laziness. ` +
			`This tool is expensive, slow, and spins up a full separate session. ` +
			`If you can do the task with your own tools (read files, run commands, edit code, search the web), do it yourself. ` +
			`Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}. ` +
			`Set outputFile to write the result to a file instead of returning inline — saves tokens in your context. ` +
			`Set resumeSessionId to continue a previous session (e.g. after cancellation or for follow-up questions).`,

		promptGuidelines: [
			"Do NOT use claude as a lazy handoff — you have read, edit, write, bash, parallel_search, parallel_research, parallel_extract, and all other tools. Use those directly.",
			"Only invoke claude when: (1) the user explicitly requests it, OR (2) the task genuinely requires autonomous multi-step execution across dozens of files that would be impractical for you to do directly",
			"For web research, use parallel_search/parallel_research/parallel_extract — NOT claude",
			"For reading files, running commands, editing code, checking git status — use your own tools, NOT claude",
			"Claude is expensive and slow. Default to doing the work yourself. When in doubt, don't use claude.",
		],

		parameters: Type.Object({
			prompt: Type.Optional(Type.String({ description: "The task or question for Claude Code (single mode)" })),
			model: Type.Optional(
				Type.String({
					description: 'Model to use (default: "sonnet"). Examples: "sonnet", "opus", "haiku"',
				})
			),
			maxTurns: Type.Optional(
				Type.Number({
					description: "Maximum number of agentic turns (default: 30)",
				})
			),
			systemPrompt: Type.Optional(
				Type.String({
					description: "Additional system prompt instructions to append",
				})
			),
			outputFile: Type.Optional(
				Type.String({
					description:
						"Write result to this file instead of returning inline. " +
						"Saves tokens in your context. Use when the result is large or " +
						"will be consumed by a subagent later (e.g. '.pi/research.md').",
				})
			),
			resumeSessionId: Type.Optional(
				Type.String({
					description:
						"Resume a previous Claude Code session by its ID. " +
						"Loads the conversation history and continues where it left off. " +
						"The session ID is returned in details of every claude tool call. " +
						"Use this to retry cancelled runs or ask follow-up questions.",
				})
			),
			tasks: Type.Optional(
				Type.Array(
					Type.Object({
						prompt: Type.String({ description: "The task or question for this Claude Code instance" }),
						model: Type.Optional(Type.String({ description: 'Model to use (default: "sonnet")' })),
						maxTurns: Type.Optional(Type.Number({ description: "Maximum agentic turns (default: 30)" })),
						systemPrompt: Type.Optional(Type.String({ description: "Additional system prompt to append" })),
						outputFile: Type.Optional(
							Type.String({
								description:
									"File to write the result to. Auto-generated as .pi/claude-parallel-N.md if omitted.",
							})
						),
						resumeSessionId: Type.Optional(Type.String({ description: "Resume a previous session by ID" })),
					}),
					{
						description:
							`Run multiple Claude Code sessions in parallel (max ${MAX_PARALLEL_CONCURRENT} concurrent, max ${MAX_PARALLEL_TASKS} total). ` +
							"Each result is written to its outputFile. Returns a summary of all paths and costs.",
					}
				)
			),
		}),

		async execute(_toolCallId, params, signal, onUpdate, ctx) {
			// ── Parallel mode ──
			if (params.tasks && params.tasks.length > 0) {
				const tasks = params.tasks;

				if (tasks.length > MAX_PARALLEL_TASKS) {
					return {
						content: [
							{
								type: "text",
								text: `Too many parallel tasks (${tasks.length}). Max is ${MAX_PARALLEL_TASKS}.`,
							},
						],
						details: { mode: "parallel", tasks: [], totalCost: 0, elapsed: 0 },
					};
				}

				const parallelStartTime = Date.now();
				const now = Date.now();

				// Resolve output files (auto-generate if not specified)
				const resolvedTasks = tasks.map((t, i) => ({
					...t,
					outputFile: t.outputFile ?? `.pi/claude-parallel-${i + 1}-${now}.md`,
				}));

				// Overlay state (one per task)
				const overlayState: ParallelOverlayState = {
					tasks: resolvedTasks.map((t) => ({
						prompt: t.prompt.length > 55 ? t.prompt.slice(0, 55) + "…" : t.prompt,
						phase: "pending" as const,
						cost: 0,
					})),
					startTime: parallelStartTime,
				};

				// ── Parallel overlay (interactive, one at a time) ──
				const showOverlay = ctx.hasUI && !overlayActive;
				let overlayTui: TUI | null = null;
				let overlayCloseFn: (() => void) | null = null;
				let overlayPromise: Promise<void> | null = null;

				if (showOverlay) {
					overlayActive = true;
					overlayPromise = ctx.ui.custom<void>(
						(tui, theme, _kb, done) => {
							overlayTui = tui;
							overlayCloseFn = () => done();
							return new ParallelClaudePanel(overlayState, theme);
						},
						{
							overlay: true,
							overlayOptions: {
								nonCapturing: true,
								anchor: "right-center",
								width: "50%",
								minWidth: 40,
								maxHeight: "90%",
								margin: { right: 1, top: 1, bottom: 1 },
								visible: (termWidth) => termWidth >= 100,
							},
						},
					);
				}

				interface ParallelTaskResult {
					prompt: string;
					outputFile: string;
					cost: number;
					turns: number;
					elapsed: number;
					sessionId: string;
					sessionModel: string;
					toolUses: string[];
					success: boolean;
					error?: string;
				}

				const taskResults: ParallelTaskResult[] = resolvedTasks.map((t) => ({
					prompt: t.prompt,
					outputFile: t.outputFile!,
					cost: 0,
					turns: 0,
					elapsed: 0,
					sessionId: "",
					sessionModel: "",
					toolUses: [],
					success: false,
				}));

				const emitParallelUpdate = () => {
					if (!onUpdate) return;
					const running = taskResults.filter((r) => !r.success && !r.error).length;
					const done = taskResults.filter((r) => r.success || r.error).length;
					onUpdate({
						content: [
							{
								type: "text",
								text: `Parallel: ${done}/${taskResults.length} done, ${running} running…`,
							},
						],
						details: {
							mode: "parallel",
							tasks: taskResults.map((r) => ({ ...r })),
							totalCost: taskResults.reduce((s, r) => s + r.cost, 0),
							elapsed: Date.now() - parallelStartTime,
						},
					});
				};

				emitParallelUpdate();

				await mapWithConcurrencyLimit(resolvedTasks, MAX_PARALLEL_CONCURRENT, async (task, index) => {
					const taskStartTime = Date.now();
					const taskAbort = new AbortController();
					if (signal) signal.addEventListener("abort", () => taskAbort.abort());

					overlayState.tasks[index].phase = "thinking";
					overlayTui?.requestRender();

					const taskOptions: Record<string, any> = {
						abortController: taskAbort,
						cwd: ctx.cwd,
						maxTurns: task.maxTurns ?? 30,
						permissionMode: "bypassPermissions",
						persistSession: true,
						includePartialMessages: true,
					};
					if (task.model) taskOptions.model = task.model;
					if (task.systemPrompt) taskOptions.appendSystemPrompt = task.systemPrompt;
					if (task.resumeSessionId) taskOptions.resume = task.resumeSessionId;

					let fullText = "";
					let cost = 0;
					let turns = 0;
					let sessionId = "";
					let sessionModel = "";
					let toolUses: string[] = [];

					try {
						const queryFn = await getQuery();
						const conversation = queryFn({ prompt: task.prompt, options: taskOptions });

						for await (const message of conversation) {
							if (signal?.aborted) break;

							if (message.type === "system" && (message as any).subtype === "init") {
								sessionId = (message as any).session_id ?? "";
								sessionModel = (message as any).model ?? "";
								continue;
							}

							if (message.type === "stream_event") {
								const delta = (message as any).event?.delta;
								if (delta?.type === "text_delta" && delta.text) {
									fullText += delta.text;
									if (overlayState.tasks[index].phase !== "responding") {
										overlayState.tasks[index].phase = "responding";
										overlayTui?.requestRender();
									}
								}
								continue;
							}

							if (message.type === "assistant") {
								for (const block of (message as any).message?.content ?? []) {
									if (block.type === "tool_use") {
										toolUses.push(block.name);
										overlayState.tasks[index].phase = "tools";
										overlayTui?.requestRender();
									}
								}
							}

							if (message.type === "result") {
								cost = (message as any).total_cost_usd ?? 0;
								turns = (message as any).num_turns ?? 0;
								if (!sessionId) sessionId = (message as any).session_id ?? "";
								if (!fullText && (message as any).result) {
									fullText = (message as any).result;
								}
							}
						}

						// Write to outputFile
						const outPath = task.outputFile!.startsWith("/")
							? task.outputFile!
							: join(ctx.cwd, task.outputFile!);
						const outDir = join(outPath, "..");
						mkdirSync(outDir, { recursive: true });
						writeFileSync(outPath, fullText || "(no output)");

						taskResults[index] = {
							...taskResults[index],
							cost,
							turns,
							elapsed: Date.now() - taskStartTime,
							sessionId,
							sessionModel,
							toolUses,
							success: true,
						};

						overlayState.tasks[index].phase = "done";
						overlayState.tasks[index].cost = cost;
						overlayTui?.requestRender();

						if (sessionId) {
							indexSession(ctx.cwd, {
								sessionId,
								prompt: task.prompt.slice(0, 200),
								model: sessionModel || task.model,
								timestamp: new Date().toISOString(),
								elapsed: Date.now() - taskStartTime,
								cost,
								turns,
							});
						}
					} catch (err: any) {
						taskResults[index] = {
							...taskResults[index],
							elapsed: Date.now() - taskStartTime,
							cost,
							turns,
							sessionId,
							sessionModel,
							toolUses,
							success: false,
							error: err.message ?? "Unknown error",
						};
						overlayState.tasks[index].phase = "error";
						overlayState.tasks[index].cost = cost;
						overlayTui?.requestRender();
					}

					emitParallelUpdate();
				});

				// ── Close overlay ──
				if (showOverlay) {
					overlayCloseFn?.();
					if (overlayPromise) await overlayPromise;
					overlayActive = false;
				}

				const elapsed = Date.now() - parallelStartTime;
				const successCount = taskResults.filter((r) => r.success).length;
				const totalCost = taskResults.reduce((s, r) => s + r.cost, 0);

				const lines = [
					`Parallel: ${successCount}/${taskResults.length} succeeded  $${totalCost.toFixed(4)} total  ${formatDuration(elapsed)}`,
					"",
					...taskResults.map((r, i) => {
						const status = r.success ? "✓" : "✗";
						let line = `${status} [${i + 1}] ${r.outputFile}`;
						if (r.success) {
							line += `  ${r.turns} turns  $${r.cost.toFixed(4)}  ${formatDuration(r.elapsed)}`;
						} else {
							line += `  ERROR: ${r.error}`;
						}
						return line;
					}),
				];

				return {
					content: [{ type: "text", text: lines.join("\n") }],
					details: {
						mode: "parallel",
						tasks: taskResults,
						totalCost,
						elapsed,
					},
				};
			}

			// ── Single mode ──
			const { prompt, model, maxTurns, systemPrompt, outputFile, resumeSessionId } = params;

			if (!prompt) {
				return {
					content: [{ type: "text", text: "Error: either `prompt` (single mode) or `tasks` (parallel mode) is required." }],
					details: {},
					isError: true,
				};
			}

			const startTime = Date.now();

			const abortController = new AbortController();
			if (signal) {
				signal.addEventListener("abort", () => abortController.abort());
			}

			const options: Record<string, any> = {
				abortController,
				cwd: ctx.cwd,
				maxTurns: maxTurns ?? 30,
				permissionMode: "bypassPermissions",
				persistSession: true,
				includePartialMessages: true,
			};

			if (model) options.model = model;
			if (systemPrompt) options.appendSystemPrompt = systemPrompt;
			if (resumeSessionId) options.resume = resumeSessionId;

			let fullText = "";
			let cost = 0;
			let turns = 0;
			let sessionId = "";
			let sessionModel = "";
			let toolUses: string[] = [];
			let phase: "thinking" | "tools" | "responding" = "thinking";
			let responseText = "";

			// ── Overlay setup (interactive mode only, one at a time) ──
			const showOverlay = ctx.hasUI && !overlayActive;
			let overlayTui: TUI | null = null;
			let overlayCloseFn: (() => void) | null = null;
			let overlayPromise: Promise<void> | null = null;

			const overlayState: OverlayState = {
				text: "",
				phase: "thinking",
				toolUses: [],
				cost: 0,
				startTime,
				sessionId: "",
				sessionModel: "",
				responseTokens: 0,
				prompt: prompt.length > 80 ? prompt.slice(0, 80) + "…" : prompt,
			};

			if (showOverlay) {
				overlayActive = true;
				overlayPromise = ctx.ui.custom<void>(
					(tui, theme, _kb, done) => {
						overlayTui = tui;
						overlayCloseFn = () => done();
						return new ClaudeStreamPanel(overlayState, theme);
					},
					{
						overlay: true,
						overlayOptions: {
							nonCapturing: true,
							anchor: "right-center",
							width: "50%",
							minWidth: 40,
							maxHeight: "90%",
							margin: { right: 1, top: 1, bottom: 1 },
							visible: (termWidth) => termWidth >= 100,
						},
					},
				);
			}

			/** Sync overlay state from local vars and trigger re-render */
			function updateOverlay() {
				if (!showOverlay) return;
				overlayState.text = fullText;
				overlayState.phase = phase;
				overlayState.toolUses = [...toolUses];
				overlayState.cost = cost;
				overlayState.sessionId = sessionId;
				overlayState.sessionModel = sessionModel;
				overlayState.responseTokens = countTokensApprox(responseText);
				overlayTui?.requestRender();
			}

			function emitUpdate() {
				onUpdate?.({
					content: [{ type: "text", text: fullText }],
					details: {
						streaming: true,
						startTime,
						responseTokens: countTokensApprox(responseText),
						phase,
						toolUses: [...toolUses],
						cost,
						sessionId,
						sessionModel,
					},
				});
				updateOverlay();
			}

			emitUpdate();

			try {
				const queryFn = await getQuery();
				const conversation = queryFn({ prompt, options });

				for await (const message of conversation) {
					if (signal?.aborted) break;

					if (message.type === "system" && (message as any).subtype === "init") {
						sessionId = (message as any).session_id ?? "";
						sessionModel = (message as any).model ?? "";
						emitUpdate();
						continue;
					}

					if (message.type === "stream_event") {
						const delta = (message as any).event?.delta;
						if (delta?.type === "text_delta" && delta.text) {
							fullText += delta.text;
							responseText += delta.text;
							if (phase !== "responding") {
								phase = "responding";
							}
							emitUpdate();
						}
						continue;
					}

					if (message.type === "assistant") {
						for (const block of (message as any).message?.content ?? []) {
							if (block.type === "tool_use") {
								toolUses.push(block.name);
								phase = "tools";
								responseText = "";
								emitUpdate();
							}
						}
					}

					if (message.type === "result") {
						cost = (message as any).total_cost_usd ?? 0;
						turns = (message as any).num_turns ?? 0;
						if (!sessionId) sessionId = (message as any).session_id ?? "";
						if (!fullText && (message as any).result) {
							fullText = (message as any).result;
						}
					}
				}
			} catch (err: any) {
				// Close overlay before returning
				if (showOverlay) {
					overlayCloseFn?.();
					if (overlayPromise) await overlayPromise;
					overlayActive = false;
				}

				if (err.name === "AbortError" || signal?.aborted) {
					return {
						content: [{ type: "text", text: fullText || "(cancelled)" }],
						details: { cancelled: true, cost, elapsed: Date.now() - startTime, sessionId },
					};
				}
				return {
					content: [{ type: "text", text: `Error: ${err.message}` }],
					details: { error: err.message },
					isError: true,
				};
			}

			// ── Close overlay ──
			if (showOverlay) {
				overlayCloseFn?.();
				if (overlayPromise) await overlayPromise;
				overlayActive = false;
			}

			const elapsed = Date.now() - startTime;

			// Index the session for later lookup
			if (sessionId) {
				indexSession(ctx.cwd, {
					sessionId,
					prompt: prompt.slice(0, 200),
					model: sessionModel || model,
					timestamp: new Date().toISOString(),
					elapsed,
					cost,
					turns,
				});
			}

			if (!fullText.trim()) {
				return {
					content: [{ type: "text", text: "(no response from Claude Code)" }],
					details: { cost, turns, elapsed, sessionId },
				};
			}

			const totalTokens = countTokensApprox(fullText);

			// Always write output to a file — use explicit outputFile or auto-generate one
			const resolvedOutputFile = outputFile ?? `.pi/claude-${sessionId || Date.now()}.md`;
			try {
				const outPath = resolvedOutputFile.startsWith("/")
					? resolvedOutputFile
					: join(ctx.cwd, resolvedOutputFile);
				const outDir = join(outPath, "..");
				mkdirSync(outDir, { recursive: true });
				writeFileSync(outPath, fullText);
			} catch {
				// If file write fails, we still return the output inline below
			}

			const truncation = truncateHead(fullText, {
				maxLines: DEFAULT_MAX_LINES,
				maxBytes: DEFAULT_MAX_BYTES,
			});

			let resultText = truncation.content;
			if (truncation.truncated) {
				resultText += `\n\n[Output truncated: ${truncation.outputLines} of ${truncation.totalLines} lines (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)})]`;
			}

			// When outputFile was explicitly provided, return summary instead of inline text
			if (outputFile) {
				const summary =
					`Result written to ${outputFile} (~${totalTokens} tokens, ${formatSize(Buffer.byteLength(fullText))}).\n` +
					`Session: ${sessionId}`;

				return {
					content: [{ type: "text", text: summary }],
					details: {
						cost,
						turns,
						sessionId,
						sessionModel,
						elapsed,
						tokens: totalTokens,
						toolUses,
						outputFile,
						outputFileExplicit: true,
					},
				};
			}

			return {
				content: [{ type: "text", text: resultText }],
				details: {
					cost,
					turns,
					sessionId,
					sessionModel,
					elapsed,
					tokens: totalTokens,
					toolUses,
					outputFile: resolvedOutputFile,
					truncated: truncation.truncated,
				},
			};
		},

		renderCall(args, theme) {
			let text = theme.fg("toolTitle", theme.bold("claude "));

			if (args.tasks && args.tasks.length > 0) {
				text += theme.fg("accent", `parallel (${args.tasks.length} tasks)`);
				for (const t of args.tasks.slice(0, 3)) {
					const preview = t.prompt.length > 60 ? t.prompt.slice(0, 60) + "…" : t.prompt;
					text += "\n  " + theme.fg("dim", `"${preview}"`);
					if (t.outputFile) text += theme.fg("dim", ` → ${t.outputFile}`);
				}
				if (args.tasks.length > 3) text += `\n  ${theme.fg("muted", `… +${args.tasks.length - 3} more`)}`;
				return new Text(text, 0, 0);
			}

			if (args.resumeSessionId) {
				text += theme.fg("warning", "resume ");
				text += theme.fg("dim", args.resumeSessionId.slice(0, 8) + "… ");
			}
			const prompt = args.prompt?.length > 100 ? args.prompt.slice(0, 100) + "…" : args.prompt;
			text += theme.fg("accent", `"${prompt}"`);
			if (args.model) text += theme.fg("dim", ` model=${args.model}`);
			if (args.maxTurns) text += theme.fg("dim", ` maxTurns=${args.maxTurns}`);
			return new Text(text, 0, 0);
		},

		renderResult(result, { expanded, isPartial }, theme) {
			const details = result.details as any;

			// ── Parallel result ──
			if (details?.mode === "parallel" && !isPartial) {
				const tasks = (details.tasks ?? []) as any[];
				const successCount = tasks.filter((t: any) => t.success).length;
				const failCount = tasks.filter((t: any) => t.error).length;
				const totalCost = details.totalCost ?? 0;
				const elapsed = details.elapsed ?? 0;

				const icon =
					failCount > 0
						? theme.fg("warning", "◐")
						: theme.fg("success", "✓");
				let header =
					icon +
					" " +
					theme.fg("toolTitle", theme.bold("claude parallel ")) +
					theme.fg("accent", `${successCount}/${tasks.length} tasks`) +
					theme.fg("dim", `  $${totalCost.toFixed(4)}  ${formatDuration(elapsed)}`);

				for (const t of tasks) {
					const tIcon = t.success ? theme.fg("success", "✓") : theme.fg("error", "✗");
					header += "\n  " + tIcon + " " + theme.fg("accent", t.outputFile ?? "(no file)");
					if (t.success) {
						header +=
							theme.fg("dim", `  ${t.turns} turns  $${t.cost.toFixed(4)}  ${formatDuration(t.elapsed)}`);
					} else if (t.error) {
						header += theme.fg("error", `  ${t.error}`);
					}
				}

				return new Text(header, 0, 0);
			}

			// ── Live progress while streaming ──
			if (isPartial) {
				const elapsed = details?.startTime ? formatDuration(Date.now() - details.startTime) : "…";
				const responseTokens = details?.responseTokens ?? 0;
				const tools = (details?.toolUses ?? []) as string[];
				const cost = details?.cost ?? 0;
				const sid = details?.sessionId ?? "";
				const phase = details?.phase ?? "thinking";

				let status = theme.fg("warning", "⟳ Claude Code");
				status += theme.fg("dim", ` ${elapsed}`);
				if (cost > 0) status += theme.fg("dim", ` $${cost.toFixed(4)}`);

				if (phase === "responding" && responseTokens > 0) {
					status += theme.fg("dim", ` ~${responseTokens} tokens`);
				}

				if (phase === "thinking") {
					status += theme.fg("dim", " thinking…");
				} else if (phase === "tools") {
					status += theme.fg("dim", " working…");
				}

				if (tools.length > 0) {
					status += "\n" + theme.fg("dim", `  tools: ${compressToolChain(tools)}`);
				}

				if (sid) {
					status += "\n" + theme.fg("dim", `  session: ${sid}`);
				}

				return new Text(status, 0, 0);
			}

			// ── Final result ──
			if (details?.error) {
				return new Text(theme.fg("error", `Error: ${details.error}`), 0, 0);
			}

			if (details?.cancelled) {
				let text = theme.fg("warning", "Cancelled");
				if (details.sessionId) text += theme.fg("dim", ` session: ${details.sessionId}`);
				return new Text(text, 0, 0);
			}

			let header = theme.fg("success", "✓ Claude Code");
			if (details?.elapsed) header += theme.fg("dim", ` ${formatDuration(details.elapsed)}`);
			if (details?.tokens) header += theme.fg("dim", ` ~${details.tokens} tokens`);
			if (details?.cost) header += theme.fg("dim", ` $${details.cost.toFixed(4)}`);
			if (details?.turns) header += theme.fg("dim", ` ${details.turns} turns`);
			if (details?.truncated) header += theme.fg("warning", " (truncated)");

			if (details?.toolUses?.length > 0) {
				header += "\n" + theme.fg("dim", `  tools: ${compressToolChain(details.toolUses)}`);
			}

			if (details?.outputFile) {
				header += "\n" + theme.fg("accent", `  → ${details.outputFile}`);
			}

			if (details?.sessionId) {
				header += "\n" + theme.fg("dim", `  session: ${details.sessionId}`);
			}

			// When the caller explicitly set outputFile, the content is a short summary — just show header
			if (details?.outputFileExplicit) {
				return new Text(header, 0, 0);
			}

			if (!expanded) {
				const firstLine = result.content[0]?.type === "text" ? result.content[0].text.split("\n")[0] : "";
				const preview = firstLine.length > 120 ? firstLine.slice(0, 120) + "…" : firstLine;
				header += "\n" + theme.fg("dim", preview);
				return new Text(header, 0, 0);
			}

			const content = result.content[0]?.type === "text" ? result.content[0].text : "";
			return new Text(header + "\n" + content, 0, 0);
		},
	});
}
