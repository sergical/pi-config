/**
 * tmux-status - Shows running tmux sessions in the pi status bar.
 *
 * Polls the pi tmux socket directory for active sessions and displays
 * them in the footer. Updates every 5 seconds.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { execSync } from "node:child_process";

const POLL_INTERVAL = 5000;
const STATUS_KEY = "tmux";

function getSocketDir(): string {
	return process.env.PI_TMUX_SOCKET_DIR || `${process.env.TMPDIR || "/tmp"}/pi-tmux-sockets`;
}

interface TmuxSession {
	name: string;
	windows: number;
	created: string;
}

function getSessions(): TmuxSession[] {
	const socketDir = getSocketDir();
	try {
		const files = execSync(`ls "${socketDir}" 2>/dev/null`, { encoding: "utf-8" }).trim();
		if (!files) return [];

		const sessions: TmuxSession[] = [];
		for (const socketFile of files.split("\n")) {
			const socketPath = `${socketDir}/${socketFile}`;
			try {
				const output = execSync(
					`tmux -S "${socketPath}" list-sessions -F "#{session_name}|#{session_windows}|#{session_created}" 2>/dev/null`,
					{ encoding: "utf-8", timeout: 2000 },
				).trim();
				if (!output) continue;

				for (const line of output.split("\n")) {
					const [name, windows, created] = line.split("|");
					if (name) {
						sessions.push({
							name,
							windows: parseInt(windows || "1"),
							created: created || "",
						});
					}
				}
			} catch {
				// Socket exists but tmux server is dead — ignore
			}
		}
		return sessions;
	} catch {
		return [];
	}
}

function formatStatus(sessions: TmuxSession[]): string | undefined {
	if (sessions.length === 0) return undefined;
	const names = sessions.map((s) => `${s.name} (ptmux ${s.name})`).join(" | ");
	return `📺 ${names}`;
}

export default function (pi: ExtensionAPI) {
	let timer: ReturnType<typeof setInterval> | undefined;

	function update(ctx: { ui: { setStatus: (key: string, value: string | undefined) => void } }) {
		const sessions = getSessions();
		ctx.ui.setStatus(STATUS_KEY, formatStatus(sessions));
	}

	pi.on("session_start", async (_event, ctx) => {
		update(ctx);
		timer = setInterval(() => update(ctx), POLL_INTERVAL);
	});

	pi.on("session_shutdown", async () => {
		if (timer) {
			clearInterval(timer);
			timer = undefined;
		}
	});
}
