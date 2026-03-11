# Pi Config

My personal [pi](https://github.com/badlogic/pi) configuration — agents, skills, extensions, and prompts that shape how pi works for me.

Based on [HazAT/pi-config](https://github.com/HazAT/pi-config), adapted for my workflow (Sentry, Next.js, TypeScript).

## Setup

### 1. Clone to `~/.pi/agent/`

```bash
# Back up existing auth if needed
cp ~/.pi/agent/auth.json /tmp/auth.json.bak 2>/dev/null

# Clone
git clone git@github.com:sergical/pi-config.git ~/.pi/agent

# Restore auth
cp /tmp/auth.json.bak ~/.pi/agent/auth.json 2>/dev/null
```

### 2. Run setup

```bash
cd ~/.pi/agent && ./setup.sh
```

This installs packages, creates `settings.json` (if missing), and prints auth instructions.

### 3. Restart pi

## Provider Routing (Anthropic / Bedrock)

Switch between Anthropic direct API and AWS Bedrock by editing `settings.json`:

```json
{
  "defaultProvider": "anthropic",
  "defaultModel": "claude-sonnet-4-6"
}
```

For Bedrock:
```json
{
  "defaultProvider": "amazon-bedrock"
}
```

Set AWS credentials via `AWS_PROFILE`, `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`, or IAM roles. See `settings.json.example` and `models.json.example` for all options.

Switch models mid-session with `/model`.

## Packages

| Package | Purpose |
|---------|---------|
| [pi-subagents](https://github.com/nicobailon/pi-subagents) | `subagent` tool for delegating tasks to scout, worker, reviewer, researcher agents |
| [pi-mcp-adapter](https://github.com/nicobailon/pi-mcp-adapter) | MCP server integration |
| [pi-smart-sessions](https://github.com/HazAT/pi-smart-sessions) | Auto-names sessions with AI-generated summaries |

---

## What's Included

### Agents

Specialized subagents for delegated workflows, powered by `pi-subagents`.

| Agent | Model | Purpose |
|-------|-------|---------|
| **scout** | Haiku | Fast codebase reconnaissance — gathers context without making changes |
| **worker** | Opus 4.6 | Implements tasks from todos, commits with polished messages, closes todos |
| **reviewer** | Sonnet 4.6 | Reviews code for quality and security using the shared review-rubric skill |
| **researcher** | Opus 4.6 → Claude Code | Deep research — web search, code analysis, technical exploration |

The brainstorm skill always runs **scout first → workers → reviewer** so workers start with a strong context baseline.

### Skills

Loaded on-demand when the context matches.

| Skill | When to Load |
|-------|-------------|
| **brainstorm** | Planning a new feature — full flow: investigate → clarify → explore → validate → plan → todos → execute |
| **code-simplifier** | Simplifying or cleaning up code |
| **commit** | Making git commits (mandatory for every commit) |
| **create-branch** | Creating a new git branch following Sentry conventions |
| **pr-writer** | Creating or updating pull requests following Sentry conventions |
| **iterate-pr** | Iterating on a PR until CI passes — automates fix-push-wait cycle |
| **frontend-design** | Building web components, pages, or apps |
| **presentation-creator** | Creating data-driven slide decks with React + Vite + Sentry branding |
| **github** | Working with GitHub via `gh` CLI |
| **review-rubric** | Shared review guidelines — used by both the `/review` extension and the reviewer agent |
| **security-review** | OWASP-style security code review with confidence-based reporting |
| **gha-security-review** | GitHub Actions workflow security review — exploitation-focused |
| **add-mcp-server** | Adding or configuring MCP servers (global or project-local) |
| **semantic-compression** | LLM-aware text compression for reducing token count |
| **system-prompts** | Writing system prompts, tool docs, and agent definitions with research-backed techniques |
| **learn-codebase** | Discovering project conventions and security concerns when entering unfamiliar codebases |
| **session-reader** | Reading and analyzing pi session JSONL files |

Additionally, these **global skills** (from `~/.agents/skills/`) are referenced in skill triggers:

| Skill | When to Load |
|-------|-------------|
| **sentry-cli** | Interacting with Sentry via CLI (issues, events, projects, orgs) |
| **find-bugs** | Reviewing changes, finding bugs, security review, or auditing code |
| **agent-browser** | Navigating websites, testing web UIs, taking screenshots, browser interactions |

### Extensions

| Extension | What it provides |
|-----------|------------------|
| **answer.ts** | `/answer` command + `Ctrl+.` — extracts questions from last message into interactive Q&A UI |
| **cost.ts** | `/cost` command — API cost summary across sessions and models |
| **execute-command.ts** | `execute_command` tool — lets the agent self-invoke `/answer`, `/reload`, etc. |
| **ghostty.ts** | Ghostty terminal title + progress bar integration |
| **review.ts** | `/review` + `/end-review` — code review for PRs, branches, commits, or uncommitted changes |
| **todos.ts** | `/todos` command + `todo` tool — file-based todo management with locking and TUI |

### AGENTS.md

[`AGENTS.md`](AGENTS.md) defines core principles (proactive mindset, keep it simple, read before edit, verify before done, etc.), agent delegation patterns, skill triggers, and commit strategy.

### MCP Servers

[`mcp.json`](mcp.json) configures MCP servers:
- **sentry** — Sentry MCP server for querying issues, events, and project data
- **vercel** — Vercel MCP server for deployments, projects, logs, and environment variables

---

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `/answer` | `Ctrl+.` | Extract questions into interactive Q&A |
| `/review` | — | Code review (PR, branch, commit, uncommitted) |
| `/end-review` | — | Complete review and return to original session |
| `/todos` | — | Visual todo manager |
| `/cost` | — | API cost summary |

## Tools

| Tool | Source | Description |
|------|--------|-------------|
| `execute_command` | this config | Self-invoke slash commands or send follow-up prompts |
| `todo` | this config | Manage file-based todos (list, create, update, claim, close) |
| `subagent` | pi-subagents | Delegate tasks to agents with chains and parallel execution |
| `subagent_status` | pi-subagents | Check async subagent run status |

---

## Architecture

This repo is designed to live at `~/.pi/agent/` — pi's agent configuration directory. No symlinks needed.

```
~/.pi/agent/              ← this repo
├── AGENTS.md             ← core agent instructions
├── mcp.json              ← MCP server config
├── agents/               ← subagent definitions (tracked in git)
├── skills/               ← on-demand skill instructions
├── extensions/           ← slash commands, tools, TUI integrations
├── setup.sh              ← automated setup script
├── settings.json.example ← template for settings
├── models.json.example   ← template for provider routing
├── settings.json         ← local settings (gitignored)
├── auth.json             ← API keys (gitignored)
└── sessions/             ← session data (gitignored)
```

## Differences from HazAT/pi-config

- **Architecture**: Repo lives at `~/.pi/agent/` directly — no symlinks or packages path needed
- **Provider routing**: Flexible Anthropic/Bedrock switching via `settings.json`
- **New skills**: `pr-writer`, `iterate-pr`, `create-branch`, `security-review`, `gha-security-review`, `presentation-creator` (from [getsentry/skills](https://github.com/getsentry/skills))
- **Vendored skills**: `semantic-compression`, `system-prompts` (from [oh-my-pi](https://github.com/can1357/oh-my-pi))
- **New agent**: `researcher` for deep research using Claude Code
- **Removed**: `context-filter` extension, `visual-tester` agent (replaced by global `agent-browser`)
- **Removed**: `tmux` skill, `dev-environment` skill, `manifest-merge-conflicts` skill
- **Added**: Skill triggers for `sentry-cli`, `find-bugs`, `agent-browser` (global skills)

## Credits

Based on [HazAT/pi-config](https://github.com/HazAT/pi-config) by Daniel Griesser.

Extensions from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff): `answer.ts`, `todos.ts`, `review.ts`

Skills from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff): `commit`, `github`

Skills from [getsentry/skills](https://github.com/getsentry/skills): `code-simplifier`, `pr-writer`, `iterate-pr`, `create-branch`, `security-review`, `gha-security-review`, `presentation-creator`

Skills from [oh-my-pi](https://github.com/can1357/oh-my-pi): `semantic-compression`, `system-prompts`

Patterns inspired by [obra/superpowers](https://github.com/obra/superpowers): `brainstorm` skill, core principles
