---
name: brainstorm
description: |
  Structured brainstorming that always follows the full execution chain:
  investigate → clarify → explore → validate design → write plan → create todos 
  → create feature branch → execute with subagents. No shortcuts.
---

# Brainstorm

A structured brainstorming session for turning ideas into validated designs and executed code.

**Announce at start:** "Starting a brainstorming session. Let me investigate first, then we'll work through this step by step."

---

## ⚠️ MANDATORY: No Skipping Without Permission

**You MUST follow all phases.** Your judgment that something is "simple" or "straightforward" is NOT sufficient to skip steps.

The ONLY exception: The user explicitly says something like:
- "Skip the plan, just implement it"
- "Just do it quickly"
- "No need for the full process"

If the user hasn't said this, you follow the full flow. Period.

**Why this matters:** You will be tempted to rationalize. You'll think "this is just a small form" or "this is obvious, no plan needed." That's exactly when the process matters most — consistency builds trust, and "small" changes have a way of growing.

---

## The Flow

```
Phase 1: Investigate Context
    ↓
Phase 2: Clarify Requirements
    ↓
Phase 3: Explore Approaches
    ↓
Phase 4: Present & Validate Design
    ↓
Phase 5: Write Plan
    ↓
Phase 6: Create Todos
    ↓
Phase 7: Execute with Subagents
```

---

## 🛑 STOP — Before Writing Any Code

If you're about to edit or create source files, STOP and check:

1. ✅ Did you complete Phase 4 (design validation)?
2. ✅ Did you write a plan to `.pi/plans/`?
3. ✅ Did you create todos?

If any answer is NO and the user didn't explicitly skip → you're cutting corners. Go back.

---

## Phase 1: Investigate Context

Before asking questions, explore what exists:

```bash
# Get the lay of the land
ls -la
find . -type f -name "*.ts" | head -20  # or relevant extension
cat package.json 2>/dev/null | head -30  # or equivalent
```

**Look for:**
- File structure and conventions
- Related existing code
- Tech stack, dependencies
- Patterns already in use

**Why?** Come prepared with informed questions. If 30 seconds of snooping could answer it, don't ask.

❌ Lazy: "What framework are you using?"
✅ Informed: "I see you're using Next.js with the app router — should this be a server component?"

**After investigating, share what you found:**
> "Here's what I see in the codebase: [brief summary]. Now let me understand what you're looking to build."

---

## Phase 2: Clarify Requirements

Work through requirements **one topic at a time**:

### Topics to Cover

1. **Purpose** — What problem does this solve? Who's it for?
2. **Scope** — What's in? What's explicitly out?
3. **Constraints** — Performance, compatibility, timeline?
4. **Success criteria** — How do we know it's done?

### How to Ask

- Group related questions, use `/answer` for multiple questions
- Prefer multiple choice when possible (easier to answer)
- Don't overwhelm — if you have many questions, batch them logically

```
[After listing your questions]
execute_command(command="/answer", reason="Opening Q&A for requirements")
```

### Keep Going Until Clear

After each round of answers, either:
- Ask follow-up questions if something is still unclear
- Summarize your understanding and confirm: "So we're building X that does Y for Z. Right?"

**Don't move to Phase 3 until requirements are clear.**

---

## Phase 3: Explore Approaches

Once requirements are understood, propose 2-3 approaches:

> "A few ways we could approach this:
> 
> 1. **Simple approach** — [description]. 
>    - Pros: fast, easy
>    - Cons: less flexible
> 
> 2. **Flexible approach** — [description]. 
>    - Pros: extensible
>    - Cons: more setup
> 
> 3. **Hybrid** — [description]. 
>    - Pros: balanced
>    - Cons: moderate complexity
> 
> I'd lean toward #2 because [reason]. What do you think?"

### Key Principles

- **Lead with your recommendation** — don't make them guess
- **Be explicit about tradeoffs** — every choice has costs
- **YAGNI ruthlessly** — remove unnecessary complexity from all options
- **Ask for their take** — they might have context you don't

### After Alignment

Once they've chosen (or you've agreed on) an approach:
> "Got it, we'll go with [approach]. Let me walk you through the design."

---

## Phase 4: Present & Validate Design

Present the design **in sections**, validating each before moving on.

### Why Sectioned?

- A wall of text gets skimmed; sections get read
- Catches misalignment early
- Easier to course-correct than rewrite

### Section by Section

**Keep each section to 200-300 words.**

#### Section 1: Architecture Overview
Present high-level structure, then ask:
> "Does this architecture make sense for what we're building?"

#### Section 2: Components / Modules
Break down the pieces, then ask:
> "These are the main components. Anything missing or unnecessary?"

#### Section 3: Data Flow
How data moves through the system, then ask:
> "Does this flow make sense?"

#### Section 4: Error Handling & Edge Cases
How we handle failures, then ask:
> "Any edge cases I'm missing?"

#### Section 5: Testing Approach
How we'll verify it works, then ask:
> "Does this testing approach give you confidence?"

**Not every project needs all sections** — use judgment based on complexity.

### Incorporating Feedback

If they suggest changes:
1. Acknowledge the feedback
2. Update your understanding
3. Re-present that section if needed
4. Continue to next section

---

## Phase 5: Write Plan

Once the design is validated:

> "Design is solid. Let me write up the plan."

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

---

## Phase 6: Create Todos

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

## Phase 7: Execute with Subagents

**Use simple, sequential subagent calls** — not chains. Chains are fragile; if any step fails, everything stops. Instead, call subagents one at a time with explicit context.

### The Pattern

1. **Run worker for each todo** — one at a time, waiting for completion
2. **Check results** — verify files were created/modified correctly
3. **Handle failures** — if a worker fails, diagnose and retry or fix manually
4. **Run reviewer last** — only after all todos are complete

### Example

```typescript
// First todo
{ agent: "worker", task: "Implement TODO-xxxx. Plan: .pi/plans/YYYY-MM-DD-feature.md" }

// Check result, then second todo
{ agent: "worker", task: "Implement TODO-yyyy. Plan: .pi/plans/YYYY-MM-DD-feature.md" }

// After all todos complete, review the worker commits
// Note the commit SHA before workers start, then pass the range to the reviewer
{ agent: "reviewer", task: "Review the commits since <sha-before-workers>. Plan: .pi/plans/YYYY-MM-DD-feature.md" }
```

**Important:** Before dispatching workers, capture the current HEAD so you can tell the reviewer exactly what to review:
```bash
git rev-parse HEAD  # Save this — pass it to the reviewer as the "before" point
```
Then tell the reviewer: `"Review commits since <that-sha>."`

### Handling Reviewer Findings

When the reviewer returns with issues, **act on the important ones**:

1. **Triage the findings:**
   - **P1 (Critical)** — Must fix: bugs, security issues, broken functionality
   - **P2 (Important)** — Should fix: poor UX, missing error handling, accessibility
   - **P3 (Nice to have)** — Skip unless quick: style nits, minor improvements

2. **Create todos for P1s and important P2s:**
   ```typescript
   todo({ action: "create", title: "Fix: [issue from reviewer]", body: "..." })
   ```

3. **Kick off workers to fix them:**
   ```typescript
   { agent: "worker", task: "Fix TODO-xxxx (from review). Plan: .pi/plans/..." }
   ```

4. **Don't re-review minor fixes** — only run reviewer again if fixes were substantial

### ⚠️ MANDATORY: Always Run Reviewer

**After all workers complete, you MUST run the reviewer.** No exceptions. Don't get distracted by worker output or results — the workflow is not complete until the reviewer has run.

```typescript
// This is NOT optional. Always end with:
{ agent: "reviewer", task: "Review commits since <sha-before-workers>. Plan: .pi/plans/YYYY-MM-DD-feature.md" }
```

Pass the commit SHA you captured before workers started so the reviewer knows exactly which commits to `git diff`.

### Why Not Chains?

- Chains fail silently or cryptically when any step errors
- No opportunity to inspect intermediate results
- Can't adapt if something goes wrong
- Manual sequential calls give you control and visibility

### ⚠️ Avoid Parallel Workers in Git Repos

**Do NOT use parallel workers when they share a git repository.**

Even if todos are "independent" (different files), workers that commit to the same repo will conflict:
- Worker A commits → succeeds
- Worker B tries to commit → fails (repo state changed)
- Worker C tries to commit → fails

**The fix: Always run workers sequentially.** It's slightly slower but reliable.

**When parallel IS safe:**
- Workers operate on completely separate git repos
- Workers don't commit (rare — most workers should commit their work)
- Read-only tasks (e.g., multiple scouts gathering info)

### Alternative: Same Session

If the user prefers hands-on work:

> "Would you rather I work through these myself while you review?"

Then work through todos sequentially:
1. Claim the todo
2. Implement
3. Verify
4. Close the todo
5. Move to next

### 🛑 STOP — Before Reporting Completion

Check:
1. ✅ All worker todos are closed?
2. ✅ **Reviewer has run?** ← If no, run it now
3. ✅ Reviewer findings triaged and addressed?

**Do NOT tell the user the work is done until all three are true.**

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

## Tips for Good Brainstorming

### Read the Room
- If they have a clear vision → validate rather than over-question
- If they're eager to start → move faster through phases (but still hit all phases)
- If they're uncertain → spend more time exploring

### Stay Conversational
- This is a dialogue, not an interrogation
- Phases can be quick depending on complexity, but don't skip them
- Don't be robotic about following steps

### Be Opinionated
- Share your perspective, don't just ask questions
- "I'd suggest X because Y" is more helpful than "What do you want?"
- It's okay to push back if something seems off

### Keep It Focused
- One topic at a time
- Don't let scope creep in during brainstorming
- Parking lot items for later: "Good thought — let's note that for v2"
