---
name: plan-before-coding
description: |
  Applies after brainstorming or when starting a larger feature that needs a plan.
  Write the plan section-by-section with verification, then create bite-sized todos.
  Ends with execution options: same session or sub-agents with specific context.
---

# Plan Before Coding

Write a verified plan, create todos, then decide how to execute.

**Announce at start:** "Writing up the plan. I'll go section by section — let me know if anything needs adjustment."

---

## When This Applies

- After a `brainstorm` session (design is validated, ready to formalize)
- Building a new feature that needs structure
- Significant refactoring or multi-file changes

Does NOT apply to:
- Quick bug fixes
- Small tweaks
- Single-file changes
- Tasks already clear enough to just do

---

## The Flow

```
1. Check Location
    ↓
2. Write Plan (section by section, verify each)
    ↓
3. Create Todos (bite-sized tasks)
    ↓
4. Create Feature Branch
    ↓
5. Execute (same session or sub-agents)
```

---

## 1. Check Location

Before starting:

```
Current directory: {cwd}
```

- Is this the right project directory?
- Does a project exist here, or do we need to create one?

If unclear, ask.

---

## 2. Write the Plan

Create: `.pi/plans/YYYY-MM-DD-[plan-name].md`

### Section by Section with Verification

Don't dump the whole plan at once. Write each section, verify, then continue.

#### Section 1: Overview & Goals

```markdown
# [Plan Name]

**Date:** YYYY-MM-DD
**Status:** Draft
**Directory:** /path/to/project

## Overview

[What we're building and why — 2-3 sentences]

## Goals

- Goal 1
- Goal 2
- Goal 3
```

Then ask:
> "Here's the overview and goals. Does this capture what we're building?"

#### Section 2: Approach & Key Decisions

```markdown
## Approach

[High-level technical approach]

### Key Decisions

- Decision 1: [choice] — because [reason]
- Decision 2: [choice] — because [reason]
```

Then ask:
> "Here's the technical approach. Any concerns or changes?"

#### Section 3: Architecture / Structure

```markdown
### Architecture

[Structure, components, how pieces fit together]
```

Then ask:
> "Here's the structure. Does this look right?"

#### Section 4: Remaining Sections

```markdown
## Dependencies

- Libraries needed
- Tools required

## Risks & Open Questions

- Risk 1
- Open question 1
```

Then ask:
> "Anything to add before I create the todos?"

### Why Sectioned?

- Catches misalignment early
- Easier to adjust one section than rewrite everything
- User stays engaged instead of skimming a wall of text

---

## 3. Create Todos

After the plan is verified, break it into todos.

### Make Todos Bite-Sized

Each todo = **one focused action** (2-5 minutes).

❌ Too big: "Implement authentication system"

✅ Granular:
- "Create `src/auth/types.ts` with User and Session types"
- "Write failing test for `validateToken` function"  
- "Implement `validateToken` to make test pass"
- "Add token extraction from Authorization header"
- "Commit: 'Add JWT token validation'"

### Why Granular?

- Easier to track progress
- Clearer handoff to sub-agents
- Smaller commits, easier to review/revert
- Each todo completable in one focused session

### Creating Todos

```
todo(action: "create", title: "Task 1: [description]", tags: ["plan-name"], body: "...")
```

**Todo body includes:**
```markdown
Plan: .pi/plans/YYYY-MM-DD-plan-name.md

## Task
[What needs to be done]

## Files
- path/to/file.ts (create)
- path/to/other.ts (modify)

## Details
[Specific implementation notes]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Depends On
- Task X must be complete first (if applicable)
```

---

## 4. Create Feature Branch

Before any implementation starts, create a fresh feature branch:

```bash
# Check we're on main/master and it's clean
git status
git branch --show-current

# Create and switch to feature branch
git checkout -b feature/[short-descriptive-name]
```

Branch naming: `feature/add-person-form`, `fix/auth-token-expiry`, `refactor/api-handlers`

> "Created branch `feature/[name]`. Ready to start implementation."

---

## 5. Execute with Subagents (Default)

After todos are created and branch is ready, **default to subagent delegation**:

> "Plan and todos are ready, feature branch created. Kicking off the workers."

### Always Start with Scout

**Include scout as the first step** — it gathers codebase context that helps workers.

Workers will use:
1. Context from scout (`context.md` in chain directory)
2. The todo body (with detailed implementation notes)
3. The plan file (path included in task)

### Default: Subagent Chain

**For sequential todos (dependencies):**
```typescript
{ chain: [
  { agent: "scout", task: "Gather context for: [feature summary]" },
  { agent: "worker", task: "Implement TODO-xxxx: [title]. Plan: .pi/plans/YYYY-MM-DD-feature.md" },
  { agent: "worker", task: "Implement TODO-yyyy: [title]. Plan: .pi/plans/YYYY-MM-DD-feature.md" },
  { agent: "reviewer", task: "Review the implementation. Plan: .pi/plans/YYYY-MM-DD-feature.md" }
]}
```

**For independent todos (parallel):**
```typescript
{ chain: [
  { agent: "scout", task: "Gather context for: [feature summary]" },
  { parallel: [
    { agent: "worker", task: "Implement TODO-xxxx: [title]. Plan: .pi/plans/YYYY-MM-DD-feature.md" },
    { agent: "worker", task: "Implement TODO-yyyy: [title]. Plan: .pi/plans/YYYY-MM-DD-feature.md" }
  ]},
  { agent: "reviewer", task: "Review all changes. Plan: .pi/plans/YYYY-MM-DD-feature.md" }
]}
```

### What Gets Shared in Chain Directory

- `context.md` — Created by scout, available to all subsequent agents
- `progress.md` — Updated by workers as they complete tasks

The plan lives at `.pi/plans/...` — include the path in each worker/reviewer task.

### Alternative: Same Session

If the user prefers hands-on work:

> "Would you rather I work through these myself while you review?"

Then work through todos sequentially:
1. Claim the todo
2. Implement
3. Verify (use `verification-before-completion`)
4. Close the todo
5. Move to next

### Alternative: Later

Plan and todos are saved. Come back anytime with:
- `/todos` to see the visual manager
- `todo(action: "list")` to see what's open

**Default is subagent delegation** — only do same-session if user explicitly prefers it.

---

## Working with Todos During Implementation

### Claiming
```
todo(action: "claim", id: "TODO-xxxx")
```
Claim when you start working. Don't claim if sub-agents will pick it up.

### Progress Notes
```
todo(action: "append", id: "TODO-xxxx", body: "Implemented the validation logic...")
```

### Closing
```
todo(action: "update", id: "TODO-xxxx", status: "closed")
```

### Viewing
- `/todos` — visual todo manager
- `todo(action: "list")` — open and assigned
- `todo(action: "get", id: "TODO-xxxx")` — full details

---

## Summary

```
Brainstorm (validated design)
    ↓
Plan (section by section, verified)
    ↓
Todos (bite-sized tasks)
    ↓
Execute (same session OR sub-agents)
```
