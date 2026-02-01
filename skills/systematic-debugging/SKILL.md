---
name: systematic-debugging
description: |
  Applies when encountering bugs, test failures, or unexpected behavior.
  Before attempting fixes, investigate to find the root cause.
  Prevents "shotgun debugging" — random fixes that waste time and create new bugs.
---

# Systematic Debugging

When something breaks, don't guess — investigate first.

## The Rule

**No fixes without understanding the root cause.**

If you haven't completed investigation, you shouldn't be proposing fixes.

## The Process

### 1. Observe

- **Read error messages carefully** — they often contain the answer
- **Read the full stack trace** — note file paths, line numbers
- **Reproduce consistently** — can you trigger it reliably?

### 2. Hypothesize

Based on evidence, form a hypothesis:
- "The error says X, which suggests Y"
- "This started after Z changed"
- "The stack trace points to this function"

### 3. Verify

Test your hypothesis before fixing:
- Add logging to confirm the flow
- Check variable values at key points
- Isolate the component

### 4. Fix

Only now, with understanding, implement the fix:
- Target the root cause, not the symptom
- Make the minimal change needed
- Verify the fix actually works (use `verification-before-completion`)

## Anti-Patterns

❌ **Shotgun debugging**: "Let me try changing this... nope. What about this... nope."

❌ **Symptom fixes**: Catching an exception to hide it instead of fixing why it's thrown.

❌ **Cargo culting**: "This fixed a similar issue once" without understanding why.

❌ **Assuming**: "It must be X" without evidence.

## When You're Stuck

If you've investigated and still don't understand:
1. State what you know
2. State what you've tried
3. State your best hypothesis
4. Ask the user for more context

Don't thrash — escalate with information.
