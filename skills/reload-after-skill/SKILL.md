---
name: reload-after-skill
description: |
  Applies immediately after creating a new skill via the self-improve workflow.
  After writing a new SKILL.md file, use the execute_command tool to run '/reload' 
  so the skill is activated immediately without user action.
---

# Reload After Creating Skills

When you create a new skill, make it immediately available by running `/reload`.

## Process

1. **Create the skill** — Write the SKILL.md as usual
2. **Execute reload** — Use the `execute_command` tool to run `/reload`
3. **Skill is active** — No user action needed

## How to Execute

After creating a skill, call:

```
execute_command(command="/reload", reason="Activating the new skill")
```

This automatically reloads extensions, skills, prompts, and themes.

## Why

Without reloading, newly created skills won't be in the system prompt until the next session. 
By auto-executing `/reload`, the skill is immediately available.
