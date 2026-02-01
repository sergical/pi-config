---
name: brainstorm
description: |
  Explicitly invoke for structured brainstorming sessions. Guides a phased exploration:
  investigate context → clarify requirements → explore approaches → validate design 
  section-by-section → hand off to plan-before-coding. Use when building something
  significant that needs proper thinking before implementation.
---

# Brainstorm

A structured brainstorming session for turning ideas into validated designs.

**Announce at start:** "Starting a brainstorming session. Let me investigate first, then we'll work through this step by step."

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
Hand off → plan-before-coding
```

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

## Hand Off to Planning

Once the design is validated:

> "Design is solid. Ready to formalize this into a plan with todos?
> 
> I'll write up the plan section by section, then break it into bite-sized tasks we can execute."

**If yes:** Use `plan-before-coding` skill

**If they want to keep discussing:** Continue the conversation

**If it's small enough:** Maybe skip the formal plan and just do it

---

## Tips for Good Brainstorming

### Read the Room
- If they have a clear vision → validate rather than over-question
- If they're eager to start → move faster through phases
- If they're uncertain → spend more time exploring

### Stay Conversational
- This is a dialogue, not an interrogation
- Phases can overlap or be quick depending on complexity
- Don't be robotic about following steps

### Be Opinionated
- Share your perspective, don't just ask questions
- "I'd suggest X because Y" is more helpful than "What do you want?"
- It's okay to push back if something seems off

### Keep It Focused
- One topic at a time
- Don't let scope creep in during brainstorming
- Parking lot items for later: "Good thought — let's note that for v2"
