# Pi Config

My personal [pi](https://github.com/badlogic/pi) configuration — skills, extensions, and soul that shape how pi works for me.

## Setup

Choose your setup method based on how you want to use this config.

### Option A: Package Installation (Recommended)

Install as a pi package — best for using the config without modifying it.

```bash
# 1. Install pi-subagents (required for agent delegation)
pi install npm:pi-subagents

# 2. Install this config
pi install git:github.com/HazAT/pi-config

# 3. Symlink agents and skills for subagent discovery
#    (pi-subagents looks in ~/.pi/agent/ for these)

# Find where pi installed the package
PI_CONFIG_DIR="$HOME/.pi/agent/git/github.com/HazAT/pi-config"

# Symlink agents
mkdir -p ~/.pi/agent/agents
for agent in "$PI_CONFIG_DIR"/agents/*.md; do
  ln -sf "$agent" ~/.pi/agent/agents/
done

# Symlink skills
mkdir -p ~/.pi/agent/skills
for skill in "$PI_CONFIG_DIR"/skills/*/; do
  ln -sf "$skill" ~/.pi/agent/skills/
done

echo "Setup complete! Restart pi to load the new config."
```

### Option B: Local Development

Clone the repo locally — best for customizing or contributing.

```bash
# 1. Clone the repo
git clone https://github.com/HazAT/pi-config.git ~/Projects/pi-config
cd ~/Projects/pi-config

# 2. Install pi-subagents
pi install npm:pi-subagents

# 3. Tell pi to use this local directory as a package
#    Add to ~/.pi/agent/settings.json under "packages":
#    "/Users/YOUR_USERNAME/Projects/pi-config"

# 4. Symlink agents for subagent discovery
mkdir -p ~/.pi/agent/agents
for agent in agents/*.md; do
  ln -sf "$(pwd)/$agent" ~/.pi/agent/agents/
done

# 5. Symlink skills for subagent discovery
mkdir -p ~/.pi/agent/skills
for skill in skills/*/; do
  ln -sf "$(pwd)/$skill" ~/.pi/agent/skills/
done

echo "Setup complete! Restart pi to load the new config."
```

### Why Symlinks?

Pi loads extensions and skills from packages automatically, but **pi-subagents** runs agents as separate processes that look for resources in standard locations:

| Resource | Subagent lookup path |
|----------|---------------------|
| Agents | `~/.pi/agent/agents/{name}.md` |
| Skills | `~/.pi/agent/skills/{name}/SKILL.md` |

The symlinks bridge the gap between where pi-config lives and where subagents look.

### Verify Setup

```bash
# Check agents are linked
ls -la ~/.pi/agent/agents/
# Should show: scout.md, planner.md, worker.md, reviewer.md

# Check skills are linked  
ls ~/.pi/agent/skills/
# Should show: commit, plan-before-coding, test-as-you-build, etc.

# Test the chain
pi
> Ask pi to run: subagent({ agent: "scout", task: "Say hello" })
```

## Update

```bash
pi update
```

After updating, re-run the symlink commands if new agents or skills were added.

## Soul

The **SOUL.md** defines who Pi is — identity, values, and approach. It's prepended to the system prompt on every turn.

Pi is a **proactive, highly skilled software engineer** who:
- Explores before asking
- Thinks before building
- Plans before coding
- Learns continuously

See [SOUL.md](SOUL.md) for the full definition.

## Agents

Specialized subagents for delegated workflows. Requires `pi-subagents` package.

| Agent | Model | Purpose |
|-------|-------|---------|
| **scout** | Haiku | Fast codebase reconnaissance — gathers context without changes |
| **planner** | Opus | Creates detailed plans and bite-sized todos from context |
| **worker** | Opus | Implements tasks from todos, maintains progress |
| **reviewer** | Opus | Reviews code for quality, security, and correctness |

### Chain Pattern

The default workflow chains agents together:

```
scout → planner → worker(s) → reviewer
```

- **scout** outputs `context.md` (codebase overview, patterns, gotchas)
- **planner** reads context, outputs `plan.md` and creates todos
- **worker** claims todos, implements, maintains `progress.md`
- **reviewer** reads everything, outputs `review.md` with findings

### Example Usage

```typescript
// Full feature implementation
{ chain: [
  { agent: "scout", task: "Gather context for: add user authentication" },
  { agent: "planner" },
  { agent: "worker" },
  { agent: "reviewer" }
]}

// Parallel workers for independent tasks
{ chain: [
  { agent: "scout", task: "Gather context" },
  { agent: "planner" },
  { parallel: [
    { agent: "worker", task: "Implement TODO-xxxx" },
    { agent: "worker", task: "Implement TODO-yyyy" }
  ]},
  { agent: "reviewer" }
]}
```

See [Setup](#setup) for installation and symlink instructions.

## Skills

| Skill | What it does |
|-------|--------------|
| **brainstorm** | Structured brainstorming: investigate → requirements → approaches → validate design → plan |
| **think-before-building** | Light gatekeeper — recognize request type, suggest brainstorm for bigger things |
| **plan-before-coding** | Write plans section-by-section, create bite-sized todos, choose execution method |
| **self-improve** | Learn new behaviors from natural language — "Hey pi, remember that..." |
| **auto-memory** | Automatically remember facts about environment, projects, and gotchas |
| **thoughtful-questions** | Ask meaningful questions, use `/answer` for multiple via `execute_command` |
| **try-before-asking** | Try running commands instead of asking if tools are installed |
| **reload-after-skill** | After creating a skill, auto-run `/reload` via `execute_command` |
| **test-as-you-build** | Verify work as you go with lightweight tests |
| **systematic-debugging** | Find root cause before fixing — no shotgun debugging |
| **verification-before-completion** | Run verification commands before claiming "done" |
| **commit** | Create conventional commits with proper format |
| **github** | Interact with GitHub using `gh` CLI |
| **web-browser** | Remote control Chrome via CDP for web interactions |
| **tmux** | Remote control tmux sessions for interactive CLIs |
| **frontend-design** | Design and implement distinctive frontend interfaces |

## Extensions

| Extension | What it does |
|-----------|--------------|
| **soul.ts** | Loads SOUL.md and prepends it to the system prompt |
| **memory.ts** | Persistent memory system — global (`~/.pi/memory.md`) and per-project (`.pi/memory.md`) |
| **execute-command.ts** | Tool to self-invoke slash commands like `/answer`, `/reload` |
| **answer.ts** | `/answer` command + `Ctrl+.` — extracts questions from last message into interactive Q&A UI |
| **todos.ts** | `/todos` command — file-based todo management in `.pi/todos/` with locking, assignments, and TUI |
| **review.ts** | `/review` command — code review for PRs, branches, commits, or uncommitted changes |
| **files.ts** | `/files` command + `Ctrl+Shift+O` — browse files with git status, reveal, diff, edit |

## Setup Notes

### web-browser skill

Requires Chrome/Chromium and Node.js. Install dependencies:
```bash
cd skills/web-browser/scripts && npm install
```

### tmux skill

Requires tmux (Linux/macOS). Works out of the box.

## Credits

Skills and extensions from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff):
- `answer.ts`, `todos.ts`, `review.ts`, `files.ts` (extensions)
- `commit`, `github`, `web-browser`, `tmux` (skills)

Skill patterns inspired by [obra/superpowers](https://github.com/obra/superpowers):
- `brainstorm`, `systematic-debugging`, `verification-before-completion`
