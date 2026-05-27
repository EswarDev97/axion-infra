---
name: aicodepath-learn
description: Extract learning signals and propose preference rules — distinguishes style preferences from one-off corrections.
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash
argument-hint: "[--auto] [--threshold=0.7]"
---

# AICodePath Learn

Extract durable preferences from the current session and propose rule updates. The expert value here is **signal quality** — Claude already knows how to list conversation corrections. The hard part is distinguishing what's worth remembering from what isn't.

---

## What Makes a Durable Signal (vs a False Signal)

Before proposing any rule, classify each candidate:

| Signal type | Example | Should become a rule? |
|-------------|---------|----------------------|
| **Durable preference** | "Always use `const` for module imports" | Yes — applies everywhere |
| **Context-specific correction** | "Use `const user = req.body` here" | No — local to this handler |
| **Factual clarification** | "This project uses Prisma, not raw SQL" | No — belongs in `knowledge.md`, not preferences |
| **Error correction** | "No, that column is `user_id`, not `userId`" | No — Claude misread the schema |
| **Temporary override** | "Skip tests for now, we'll add them later" | No — situational, not a preference |

**The false-signal trap**: When Claude gets something wrong about the codebase and the user corrects it, `aicodepath-learn` may misclassify the correction as a style preference. "No, that's a repository, not a service" is a factual correction — not "the user prefers repository pattern." Proposing it as a rule causes it to fire in unrelated contexts.

---

## Confidence Classification

Assign confidence before proposing each rule:

| Confidence | Evidence | Action |
|------------|----------|--------|
| **HIGH** (0.9+) | User stated explicitly and repeatedly, or corrected Claude for the same pattern 2+ times | Propose immediately; auto-apply with `--auto` |
| **MEDIUM** (0.7–0.89) | Single explicit correction with clear preference language ("I prefer", "always use") | Propose for manual approval |
| **LOW** (0.5–0.69) | Inferred from a correction without explicit preference statement | Flag as uncertain; user must approve consciously |
| **Too low** (<0.5) | Ambiguous; could be context-specific | Do not propose — log only |

---

## The Learn Process

### Step 1: Scan conversation for candidate signals

Look for:
- Explicit corrections ("No, use X not Y")
- Preference statements ("I always want", "I prefer", "I like to")
- Repeated corrections for the same pattern
- Code Claude wrote that the user rewrote with a different style

### Step 2: Classify each candidate

For each candidate, ask:
1. Is this about style/convention, or about a specific fact?
2. Does it apply to the whole codebase, or only this file/function?
3. Would applying this rule in a different context be correct or confusing?

Discard facts, local corrections, and situational overrides.

### Step 3: Propose rules for manual approval

```bash
/aicodepath-learn          # analyze and propose (requires approval)
/aicodepath-learn --auto   # auto-apply HIGH confidence rules only
/aicodepath-learn --threshold=0.9  # only surface very high confidence
```

Present each proposal with:
- The rule text
- The evidence it was derived from (quote the conversation moment)
- The confidence level and why
- Whether it would conflict with any existing rule

### Step 4: Apply approved rules

Write each approved rule to `rules[]` in `aicodepath-docs/preferences/project-preferences.json` (v2.0 schema):

```json
{
  "id": "<kebab-case-id>",
  "source": "learned",
  "title": "<human-readable label>",
  "rule": "<enforceable statement>",
  "applies_to": "<glob path or *>",
  "category": "<frontend|backend|database|devops|testing|workflow|framework>",
  "severity": "<derived from confidence — see table below>",
  "confidence": 0.85,
  "enabled": false,
  "expires_when": null,
  "source_note": "<quoted conversation moment and session date>",
  "created_at": "<current ISO 8601 timestamp>",
  "updated_at": "<current ISO 8601 timestamp>"
}
```

**Field derivation rules:**

| Confidence | `severity` | `enabled` on write |
|------------|-----------|-------------------|
| HIGH (0.90+) | `"error"` | `false` — still requires approval |
| MEDIUM (0.70–0.89) | `"warning"` | `false` |
| LOW (0.50–0.69) | `"info"` | `false` |

After writing each rule:
- Increment `statistics.totalRules` by 1
- Update file-level `updated_at` to current ISO 8601 timestamp

Rules with `enabled: false` appear as pending in `/aicodepath-preferences list` until the user explicitly approves them.

---

## NEVER

- **NEVER** propose a rule derived from a factual correction about the codebase — "use Prisma not raw SQL" is a fact, not a style preference. Facts belong in `aicodepath-docs/knowledge.md`.
- **NEVER** propose a rule that contains a specific file path, variable name, or column reference — these are context-bound and will misfire when the codebase evolves.
- **NEVER** use `--auto` for LOW or MEDIUM confidence signals — these require human judgment because the evidence is ambiguous.
- **NEVER** propose more than 5 rules from a single session — signal quality degrades rapidly as the list grows, and users stop reviewing carefully after the third item, causing low-quality rules to slip through.
- **NEVER** treat a user saying "for now, skip tests" as a "skip tests" preference — temporal overrides are not durable preferences.
- **NEVER** propose a rule that directly contradicts an existing guideline rule in `.aicodepath/guidelines/` — preferences operate below guidelines in the hierarchy. If a preference contradicts a guideline, the guideline wins and the preference should not be created.

---

## Evaluation Verdicts

Before saving any learned rule, assign one of four verdicts:

### Verdict 1: SAVE

The signal is a genuine, durable style preference that applies broadly.

**Criteria**:
- User stated it explicitly ("I always want...", "I prefer...")
- Applies to multiple files/contexts (not just one function)
- Confidence ≥ 0.7
- Does not conflict with existing guidelines

**Action**: Write to `project-preferences.json` with `enabled: false` (pending approval).

### Verdict 2: IMPROVE THEN SAVE

The signal is valid but the rule formulation needs refinement before it's useful.

**Criteria**:
- User's correction implies a preference, but the exact scope is unclear
- Rule as-drafted would fire too broadly or too narrowly
- Confidence ≥ 0.5 but the `applies_to` glob needs tightening

**Action**: Refine the rule text and `applies_to` scope. Present the improved version to the user before saving. Never save a rough draft.

### Verdict 3: ABSORB INTO [X]

The signal is valid but belongs in an existing resource, not a new preference rule.

**Criteria**:
- Information is factual (belongs in `knowledge.md`)
- Information is architectural (belongs in `adr-log.md`)
- Information duplicates an existing guideline rule (update severity/message instead)
- Information belongs in a CLAUDE.md instruction

**Action**: Update the target resource `[X]` instead of creating a new preference. Document what was updated and why.

| Signal Type | Absorb Into |
|-------------|-------------|
| Factual project knowledge | `aicodepath-docs/knowledge.md` |
| Architectural decisions | `aicodepath-docs/adr-log.md` |
| Existing guideline refinement | `.aicodepath/guidelines/*.json` |
| Tool/env configuration | CLAUDE.md or `.env` |

### Verdict 4: DROP

The signal is not worth persisting — it's noise, not signal.

**Criteria**:
- One-time correction about a specific variable/file
- Temporary override ("skip tests for now")
- Factual error correction ("that column is `user_id` not `userId`")
- Confidence < 0.5
- Context-specific instruction that doesn't generalize

**Action**: Do not save. Log the decision silently. Do not ask the user about dropped signals — they add noise to the review flow.

### Verdict Decision Table

| Evidence | Applies broadly? | Confidence | Verdict |
|----------|-----------------|------------|---------|
| "I always want X" | Yes | HIGH | **SAVE** |
| "I prefer X" (first time) | Yes | MEDIUM | **SAVE** |
| "No, use X here" | Unclear | MEDIUM | **IMPROVE THEN SAVE** |
| "This project uses Prisma" | N/A — factual | N/A | **ABSORB** into knowledge.md |
| "That column is user_id" | No — one file | LOW | **DROP** |
| "Skip tests for now" | No — temporal | LOW | **DROP** |

### Session-End Trigger

At session end, automatically scan the conversation for unprocessed signals:

1. Scan for corrections, preference statements, and repeated patterns
2. Assign verdicts to each candidate
3. Present SAVE and IMPROVE THEN SAVE verdicts to the user (max 5)
4. Apply ABSORB verdicts silently (update target resources)
5. DROP the rest without presenting

**Timing**: Invoke this automatically before `/aicodepath-checkpoint` at session end. The checkpoint should capture any rules saved during the learn phase.

---

## When a Preference Graduates to a Guideline

A rule that has been approved and never manually overridden across 10+ sessions is ready to graduate:

1. Export the preference
2. Add it to the appropriate `.aicodepath/guidelines/*.json` file as a formal rule
3. Remove it from preferences (now enforced at the PreToolUse hook level)

---

## See Also

- `/aicodepath-preferences` — Review and manage all current rules
- `aicodepath-docs/knowledge.md` — For factual project knowledge (not preferences)
