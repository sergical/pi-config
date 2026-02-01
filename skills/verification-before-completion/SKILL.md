---
name: verification-before-completion
description: |
  Applies when about to claim work is complete, fixed, or passing.
  Before stating success, run the verification command and show the output.
  Evidence before assertions — no completion claims without fresh verification.
---

# Verification Before Completion

Never claim success without proving it in the same message.

## The Rule

Before saying any of these:
- "Done"
- "Tests pass"
- "Fixed"
- "Working now"
- "Should be good"

You MUST:
1. Run the actual verification command
2. Show the output
3. Confirm it matches the claim

## Common Verifications

| Claim | Requires |
|-------|----------|
| "Tests pass" | Run test command, show 0 failures |
| "Build succeeds" | Run build command, show exit 0 |
| "Linter clean" | Run linter, show 0 errors |
| "Bug fixed" | Reproduce original issue, show it's gone |
| "Script works" | Run the script, show expected output |

## Red Flags

Stop yourself if you're about to say:
- "Should work now"
- "That should fix it"
- "Tests should pass"
- "Probably works"

These are guesses, not verification. Run the command first.

## Example

❌ Bad:
> "I've fixed the bug by updating the regex. Should work now."

✅ Good:
> "I've updated the regex. Let me verify:"
> ```
> $ npm test
> PASS src/parser.test.ts
> Tests: 12 passed, 12 total
> ```
> "Tests pass — the fix works."
