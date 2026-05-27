---
name: aicodepath-confidence-check
description: Self-assess confidence across 5 dimensions before implementing — prevents wrong-direction work.
user-invocable: true
allowed-tools: Bash, Read, Glob, Grep
argument-hint: "<feature or bug to implement>"
---

# AICodePath Confidence Check

<HARD-GATE>
Do NOT write implementation code until confidence score is assessed.
LOW confidence (<70%) = STOP and research more before coding.
Skipping this check is how wrong-direction work happens.
</HARD-GATE>

## Why This Exists

The most expensive mistake is implementing the wrong solution confidently.
This check forces evidence-gathering BEFORE implementation, saving far more tokens
than it costs.

## The Five Confidence Dimensions

Score yourself honestly on each. Partial = 0. Only full = points.

### 1. No Duplicates — 25 pts

**Question**: Did you search for an existing implementation?

```
Grep for: function names, class names, similar concepts
Glob for: files that might already solve this
Read: similar files before writing new ones
```

- [ ] Searched codebase with Grep/Glob
- [ ] Read 2-3 similar existing files
- [ ] Confirmed no existing solution solves this already
- Evidence: _(paste grep command + result or "found X at file:line")_

### 2. Architecture Compliant — 25 pts

**Question**: Does your approach match existing project patterns?

```
Check: How are similar features structured?
Check: What patterns does this codebase use? (hooks? classes? functional?)
Check: Where should this code live per DEVELOPER-GUIDE.md?
```

- [ ] Found 2+ examples of similar patterns in codebase
- [ ] Confirmed approach matches those patterns
- [ ] Verified correct file location per project structure rules
- Evidence: _(paste file paths of matching examples)_

### 3. Official Docs Verified — 20 pts

**Question**: Did you read the actual documentation?

```
Use: context7 MCP if available (resolve-library-id → query-docs)
Use: WebSearch for official API/library docs
Use: WebFetch to read specific doc pages
```

- [ ] Found and read official docs for APIs/libraries being used
- [ ] Confirmed method signatures, parameters, return values
- [ ] No assumptions about behavior — all verified from docs
- Evidence: _(paste doc URL or key fact verified)_

### 4. OSS Reference Found — 15 pts

**Question**: Is there a battle-tested open source example?

```
Search: GitHub, Stack Overflow, official examples
Look for: production implementations doing the same thing
Verify: the reference uses the same library version
```

- [ ] Found real-world reference implementation
- [ ] Reference uses same stack/version
- [ ] Approach adapted from (not copied from) reference
- Evidence: _(paste URL or key insight from reference)_

### 5. Root Cause Identified — 15 pts

**Question**: Do you understand WHY the problem exists?

```
For bugs: trace the full call stack, identify the exact failure point
For features: understand what gap this fills in the current system
For refactors: understand what architectural issue is being resolved
```

- [ ] Can state the root cause in one sentence
- [ ] Root cause verified (not assumed) from reading actual code
- [ ] Fix/implementation addresses root cause, not symptoms
- Evidence: _(state root cause explicitly)_

## Scoring

| Score | Level  | Action |
|-------|--------|--------|
| ≥ 90% | HIGH   | ✅ PROCEED — implement the approved plan |
| 70–89% | MEDIUM | ⚠️ ALTERNATIVES — propose 2+ approaches, let user decide |
| < 70% | LOW    | 🛑 STOP — research more before writing any code |

## Self-Assessment Format

```
## Confidence Check: [feature/bug name]

| Check            | Points | Evidence |
|------------------|--------|---------|
| No Duplicates    |  /25   | [paste] |
| Architecture     |  /25   | [paste] |
| Docs Verified    |  /20   | [paste] |
| OSS Reference    |  /15   | [paste] |
| Root Cause       |  /15   | [paste] |
| **TOTAL**        |  /100  |         |

**Level**: HIGH / MEDIUM / LOW
**Action**: PROCEED / ALTERNATIVES / STOP
```

## Red Flags — STOP

- Starting to write code before filling out the checklist
- Scoring yourself HIGH when any item has no evidence
- "I know how this works" — that's not evidence
- Skipping the docs step because "it's standard"
- Giving yourself partial credit — only full = points

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "I've done this before" | Past experience ≠ current codebase patterns |
| "It's obvious how to do this" | Obvious to whom? Check the docs. |
| "No need to search, I'll write fresh" | Duplicating code that already exists |
| "The architecture is fine" | "Fine" requires evidence, not intuition |
| "I'll check docs if it doesn't work" | Check docs BEFORE to avoid wasted iteration |
| "70% is good enough" | 70% means ALTERNATIVES, not immediate code |

## Integration

```
Confidence ≥ 70% → proceed to /aicodepath-tdd
Confidence < 70%  → more research (loop back through checklist)
MEDIUM (70-89%)   → present alternatives to user BEFORE picking one
```

**Chain**: `/aicodepath-brainstorm` → `/aicodepath-confidence-check` → `/aicodepath-tdd`

## NEVER

- **NEVER** self-score a dimension without pasting evidence — "I know how this works" is not evidence for any of the five dimensions. The format requires an evidence string in the table because the act of writing it forces confirmation that you actually verified the fact, not that you believe it.
- **NEVER** give partial credit to a dimension — the scoring is binary by design. Partial credit on "Architecture Compliant" because you found one example (not two) inflates the total into the proceed zone when the right answer is MEDIUM or STOP. Only full evidence earns the points.
- **NEVER** proceed unilaterally at MEDIUM confidence (70-89%) — MEDIUM means the approach is uncertain enough that presenting 2+ alternatives to the user is required. Picking one direction at 70-89% confidence without user input is exactly the wrong-direction risk this check was designed to prevent.
- **NEVER** skip the OSS Reference dimension because "this is internal code" — the OSS Reference step surfaces the established pattern for the problem class in the ecosystem, not just an identical solution. Even a private feature benefits from understanding how the problem is solved in open-source equivalents, because it reveals edge cases your internal requirements may have missed.
