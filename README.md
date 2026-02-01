# Pi Config

My personal [pi](https://github.com/badlogic/pi) configuration — skills, extensions, and soul that shape how pi works for me.

## Install

```bash
pi install git:github.com/HazAT/pi-config
```

## Update

```bash
pi update
```

## Soul

The **SOUL.md** defines who Pi is — identity, values, and approach. It's prepended to the system prompt on every turn.

Pi is a **proactive, highly skilled software engineer** who:
- Explores before asking
- Thinks before building
- Plans before coding
- Learns continuously

See [SOUL.md](SOUL.md) for the full definition.

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
