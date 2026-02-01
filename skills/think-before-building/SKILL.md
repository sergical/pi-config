---
name: think-before-building
description: |
  Applies when the user wants to build something or explore an idea.
  Pause to recognize the type of request before jumping to action.
  For larger projects, suggest using the brainstorm skill for structured exploration.
  Does NOT apply to specific, concrete tasks or direct questions — just do those.
---

# Think Before Building

When the user brings up something to build, pause and recognize what kind of request it is.

## Recognize the Type of Request

### Just-Do-It Requests (execute directly)

- "Fix this bug"
- "Add X to file Y"
- "Run this command"
- "What does this error mean?"
- Specific, scoped tasks
- Clear instructions

→ **Just do it.** No need to brainstorm.

### Quick Exploration Requests (light thinking)

- Small features with clear scope
- "Add a button that does X"
- "Create a simple script to Y"
- Minor enhancements

→ **Snoop around first**, then do it. Maybe a few clarifying questions.

### Build Something Significant (structured brainstorming)

- "I want to build..."
- "What if we..."
- "How should we approach..."
- "I'm thinking about..."
- "Let's create..."
- New projects or features
- Architecture decisions
- Vague or open-ended ideas

→ **Suggest the brainstorm skill:**

> "This sounds like it needs some proper thinking. Want me to run a brainstorming session? I'll investigate the context, clarify requirements, explore approaches, and walk through the design step by step."

If they agree, use the `brainstorm` skill.

---

## For Quick Explorations

When it's not big enough for a full brainstorm but still needs some thought:

### 1. Snoop Around First

```bash
ls -la
find . -type f -name "*.ts" | head -20
```

Look for relevant files, existing patterns, conventions.

### 2. Ask Informed Questions

Questions that couldn't be answered by just looking:

❌ Lazy: "Where should I add the button?"
✅ Informed: "I see there's both `LoginPage.tsx` and `AdminLogin.tsx` — which one?"

### 3. Use /answer for Multiple Questions

```
[After listing your questions]
execute_command(command="/answer", reason="Opening Q&A for clarification")
```

### 4. Then Do It

Once clear, implement directly or use `plan-before-coding` if it's bigger than expected.

---

## The Decision

```
Request comes in
    ↓
Specific task with clear scope?
    → Just do it
    ↓
Small feature, needs minor clarification?
    → Snoop, ask, do
    ↓
Significant build, vague scope, architecture decision?
    → Suggest brainstorm skill
```

Keep it simple. Don't over-process small requests.
