# Pi Config

My personal [pi](https://github.com/badlogic/pi) configuration — skills and extensions that make pi work the way I like.

## Installation

```bash
pi install git:github.com/HazAT/pi-config
```

## Update

```bash
pi update
```

## Skills

| Skill | Description |
|-------|-------------|
| `auto-memory` | Automatically remember facts about environment, project, gotchas |
| `plan-before-coding` | For larger projects: check location, brainstorm, write detailed plan with tasks |
| `reload-after-skill` | After creating a skill, prefill `/reload` so it's instantly active |
| `self-improve` | Learn new behaviors from natural language ("Hey pi, remember that...") |
| `test-as-you-build` | Verify work as you go with lightweight tests |
| `think-before-building` | Explore the codebase and brainstorm before jumping to implementation |
| `thoughtful-questions` | Ask one question at a time, only meaningful ones |
| `try-before-asking` | Try running commands instead of asking if tools are installed |

## Extensions

| Extension | Description |
|-----------|-------------|
| `memory.ts` | Persistent memory system — global (`~/.pi/memory.md`) and project (`.pi/memory.md`) |
| `prefill-editor.ts` | Tool to prefill the editor with text (used by reload-after-skill) |

## What's Included

- **Skills** teach pi new behaviors and workflows
- **Extensions** add tools and capabilities (memory system, editor prefill)

## What's NOT Included

These are machine-specific and excluded via `.gitignore`:
- `auth.json` — API keys
- `sessions/` — conversation history
- `~/.pi/memory.md` — your personal memory file (created locally)
