---
name: brainstorm
description: |
  Structured brainstorming that always follows the full execution chain:
  investigate → clarify → explore → validate design → write plan → create todos 
  → create feature branch → execute with subagents. No shortcuts.
---

# Brainstorm

A structured brainstorming session for turning ideas into validated designs.

**Announce at start:** "Starting a brainstorming session. Let me investigate first, then we'll work through this step by step."

---

## ⚠️ MANDATORY: No Skipping Without Permission

**You MUST follow all 7 phases.** Your judgment that something is "simple" or "straightforward" is NOT sufficient to skip steps.

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
Phase 4: Present & Validate Design (section by section)
    ↓
Phase 5: Write Plan & Create Todos (plan-before-coding)
    ↓
Phase 6: Create Feature Branch
    ↓
Phase 7: Execute (scout → workers → reviewer)
```

---

## 🛑 STOP — Before Writing Any Code

If you're about to edit or create source files, STOP and check:

1. ✅ Did you complete Phase 4 (design validation)?
2. ✅ Did you write a plan to `.pi/plans/`?
3. ✅ Did you create todos?
4. ✅ Did you create a feature branch?

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

## Phase 5: Write Plan & Create Todos

Once the design is validated:

> "Design is solid. Let me write up the plan."

Use the `plan-before-coding` skill to:
1. Write the plan to `.pi/plans/YYYY-MM-DD-feature.md` (section by section with verification)
2. Create bite-sized todos with implementation details

This happens **in the main session** so you can provide feedback and iterate.

---

## Phase 6: Create Feature Branch

Before any implementation:

```bash
git checkout -b feature/[short-descriptive-name]
```

> "Created branch `feature/[name]`. Ready to execute."

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

// After all todos complete, review
{ agent: "reviewer", task: "Review implementation. Plan: .pi/plans/YYYY-MM-DD-feature.md" }
```

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

This keeps the quality bar high without endless review cycles.

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

**The fix: Always run workers sequentially.** It's slightly slower but reliable:

```typescript
// Sequential - each completes before the next starts
{ agent: "worker", task: "Implement TODO-xxxx. Plan: ..." }
// verify, then:
{ agent: "worker", task: "Implement TODO-yyyy. Plan: ..." }
// verify, then:
{ agent: "worker", task: "Implement TODO-zzzz. Plan: ..." }
```

**When parallel IS safe:**
- Workers operate on completely separate git repos
- Workers don't commit (rare — most workers should commit their work)
- Read-only tasks (e.g., multiple scouts gathering info)

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
