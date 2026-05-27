---
name: aicodepath-reducing-entropy
description: |
  Manual-only skill for minimizing total codebase size during MAINTENANCE phase and brownfield refactoring.
  Only activate when explicitly requested by user. Measures success by final code amount, not effort.
  Bias toward deletion. Use when: (1) refactoring legacy code in MAINTENANCE phase, (2) brownfield cleanup,
  (3) evaluating whether to add features vs simplify existing code, (4) reducing technical debt through
  deletion, (5) user explicitly asks to "reduce entropy", "minimize code", or "simplify codebase".
  Core principle: "What does the codebase look like *after*?" - measure the end state, not the effort.
version: 2.1.0
tags: [maintenance, refactoring, brownfield, simplification, entropy-reduction]
phase: MAINTENANCE
type: workflow
dependencies:
  rules:
    - construction/code-generation.md
  guidelines:
    - coding-standards.json
    - architecture-rules.json
ensures_hooks:
  - pre: guideline-validator.js
  - post: gicl-iteration-hook.js
workflow:
  phase: operations
  stage: maintenance
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Bash
argument-hint: "[path]"
disable-model-invocation: false
---

# Reducing Entropy

More code begets more code. Entropy accumulates. This skill biases toward the smallest possible codebase.

**Core question:** "What does the codebase look like *after*?"

## Integration with AICodePath

This skill is designed for the **MAINTENANCE phase** of the AICodePath lifecycle, particularly when:

- Working with brownfield codebases that need simplification
- Refactoring legacy code where deletion is preferable to addition
- Evaluating technical debt reduction opportunities
- Deciding whether to add features or simplify existing functionality
- Cleaning up accumulated complexity over time

**Important**: This is a **manual-only** skill. It must be explicitly activated by the user. Do not apply automatically.

## Before You Begin

**Load at least one mindset from `references/`**

1. List the files in the reference directory
2. Read frontmatter descriptions to pick which applies
3. Load at least one
4. State which you loaded and its core principle

**Do not proceed until you've done this.**

## The Goal

The goal is **less total code in the final codebase** - not less code to write right now.

- Writing 50 lines that delete 200 lines = net win
- Keeping 14 functions to avoid writing 2 = net loss
- "No churn" is not a goal. Less code is the goal.

**Measure the end state, not the effort.**

## Three Questions

### 1. What's the smallest codebase that solves this?

Not "what's the smallest change" - what's the smallest *result*.

- Could this be 2 functions instead of 14?
- Could this be 0 functions (delete the feature)?
- What would we delete if we did this?

### 2. Does the proposed change result in less total code?

Count lines before and after. If after > before, reject it.

- "Better organized" but more code = more entropy
- "More flexible" but more code = more entropy
- "Cleaner separation" but more code = more entropy

### 3. What can we delete?

Every change is an opportunity to delete. Ask:

- What does this make obsolete?
- What was only needed because of what we're replacing?
- What's the maximum we could remove?

## Red Flags

- **"Keep what exists"** - Status quo bias. The question is total code, not churn.
- **"This adds flexibility"** - Flexibility for what? YAGNI.
- **"Better separation of concerns"** - More files/functions = more code. Separation isn't free.
- **"Type safety"** - Worth how many lines? Sometimes runtime checks in less code wins.
- **"Easier to understand"** - 14 things are not easier than 2 things.

## When This Doesn't Apply

- The codebase is already minimal for what it does
- You're in a framework with strong conventions (don't fight it)
- Regulatory/compliance requirements mandate certain structures
- Working in CONSTRUCTION phase where features must be added
- User wants to add functionality and accepts the code cost

## MAINTENANCE Phase Strategy

When working in MAINTENANCE phase with this skill:

1. **Audit before adding** - Before adding any feature, ask if existing code can be simplified instead
2. **Deletion opportunities** - Every bug fix is a chance to remove code
3. **Consolidation** - Look for duplicate or near-duplicate functionality to merge
4. **Feature removal** - Question whether features are still needed before maintaining them

## Brownfield Refactoring Approach

For brownfield codebases:

1. **Measure current state** - Count total lines, files, functions
2. **Identify high-entropy areas** - Where is complexity concentrated?
3. **SOLID scan** — Run `/aicodepath-solid-principles --auto-scan` on the top 5 largest files. SRP violations (large files with multiple responsibilities) and DIP violations (concrete coupling) are the highest-return entropy targets. Add findings to the entropy report.
4. **Plan deletions** - What can be removed entirely? (Prioritise files flagged as SOLID D/C)
5. **Consolidate** - What can be merged or simplified?
6. **Measure result** - Did total code decrease? By how much?

## Reference Mindsets

See `references/` for philosophical grounding on simplicity and deletion.

Available mindsets:
- `data-over-abstractions.md` - Generic data structures over custom types
- `design-is-taking-apart.md` - Separation through composition, not construction
- `expensive-to-add-later.md` - Know when YAGNI doesn't apply (PAGNI)
- `simplicity-vs-easy.md` - Choose simple (not intertwined) over easy (familiar)

To add new mindsets, see `adding-reference-mindsets.md`.

## Success Metrics

You've succeeded when:

- Total lines of code decreased
- Number of files decreased
- Number of functions/classes decreased
- Features work the same (or better) with less code
- You deleted more than you added

## Usage Example

```
User: "Apply reducing-entropy to the validation code"

Step 1: Load a mindset
- Read references/simplicity-vs-easy.md
- Core principle: Choose simple (not intertwined) over easy (familiar)

Step 2: Analyze current state
- 5 validation files, 14 validation functions, ~500 lines total
- Each form has its own validation schema and helper functions

Step 3: Apply the three questions
1. Smallest codebase? One validation function with data-driven rules
2. Result in less code? Proposed: 1 file, 2 functions, ~100 lines = -400 lines
3. What to delete? All 5 validation files, 12 of 14 functions

Step 4: Implement and measure
- Before: 500 lines
- After: 100 lines
- Net: -400 lines (80% reduction)
```

---

**Bias toward deletion. Measure the end state.**

## Attribution

Original skill by @joshuadavidthomas from [joshuadavidthomas/agent-skills](https://github.com/joshuadavidthomas/agent-skills) (MIT)

Adapted for AICodePath MAINTENANCE phase and brownfield refactoring contexts.
