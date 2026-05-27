---
name: aicodepath-cruise-control
description: >
  Use when executing the AIDLC workflow in supervised unattended mode — auto-advances through minor steps while pausing at major gates (design approval, confidence check, verification). Triggered by: "cruise control", "unattended mode", "auto-advance", "run through phases automatically".
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent, Skill, TaskCreate, TaskUpdate, TaskGet, TaskList, TodoWrite
argument-hint: "[--scope P0|P0+P1|all] [--pause-at design|confidence|verify|all] [--clarify defer|prompt|skip]"
---

# AICodePath Cruise Control

Supervised unattended execution mode that auto-advances through minor AIDLC steps while pausing at major quality gates.

## Philosophy

Cruise control is **supervised, not unsupervised**. It respects AICodePath's discipline by:
- **Pausing at major gates**: Design approval, confidence check, verification
- **Auto-advancing through minor steps**: Knowledge loading, classification, worktree setup
- **Never skipping quality**: GICL loop still runs, tests still required

<HARD-GATE>
Cruise control does NOT bypass any HARD-GATE. The following gates ALWAYS pause for user input regardless of configuration:
1. Design approval (brainstorm output) — untested designs compound errors across all subsequent steps
2. Confidence check result if < 70% — low confidence with auto-advance produces confident-looking wrong code
3. Verification before claiming done — "it works" without evidence is the #1 source of false completion
4. Any `[NEEDS CLARIFICATION]` item — assumptions made in cruise control are invisible to the user
</HARD-GATE>

## Before You Start — Three Questions

1. **Is the design already approved?** Cruise control shines on re-implementation or well-specced features. If design is unknown, manual mode surfaces better questions.
2. **Are requirements stable?** Frequent `[NEEDS CLARIFICATION]` pauses defeat the purpose. Resolve ambiguities via `/aicodepath-requirements` first.
3. **What's the risk profile?** Security features, data migrations, and public API changes need manual review at every step. Cruise control is for internal, low-risk, well-understood work.

## Configuration

| Flag | Options | Default | Purpose |
|------|---------|---------|---------|
| `--scope` | P0 / P0+P1 / all | P0+P1 | Which priority features to process |
| `--pause-at` | design / confidence / verify / all | all | Where to pause (safest: all) |
| `--clarify` | prompt / defer / skip | prompt | How to handle ambiguities |

## Execution Flow — Auto vs Pause

| Step | Skill Invoked | Mode | Pause Condition |
|------|--------------|------|-----------------|
| 1 | `/aicodepath-knowledge` | AUTO | — |
| 2 | `/aicodepath-requirements` | AUTO | Only if spec exists |
| 3 | `/aicodepath-brainstorm` | PAUSE | New design needed; AUTO skip if design doc exists |
| 4 | `/aicodepath-classify-component` | AUTO | — |
| 5 | `/aicodepath-write-plan` | AUTO | — |
| 6 | `/aicodepath-confidence-check` | CONDITIONAL | PAUSE if score < 70%; AUTO if ≥ 70% |
| 7 | `/aicodepath-worktree` | AUTO | — |
| 8 | `/aicodepath-tdd` | AUTO | — |
| 9 | `/aicodepath-gicl-start` | CONDITIONAL | PAUSE if score < 70 after 3 iterations |
| 10 | `/aicodepath-review` | CONDITIONAL | PAUSE if grade C or D; AUTO if A or B |
| 11 | `/aicodepath-verify` | PAUSE | Always — non-negotiable |
| 12 | `/aicodepath-learn` | AUTO | — |
| 13 | `/aicodepath-checkpoint` | AUTO | — |

## Safety Mechanisms

1. **Repeated failure stop**: Same step fails 3 times → pause and report
2. **GICL regression**: Quality score drops > 10 points → pause
3. **Context budget**: Usage exceeds 80% → invoke `/aicodepath-context-budget`, pause and checkpoint
4. **Error escalation**: Unhandled error → pause immediately
5. **Scope creep**: If `/aicodepath-review` detects scope creep → pause

## Progress Reporting

After each task completes or pauses:
```
| # | Task | Status | Paused At | Duration |
|---|------|--------|-----------|----------|
| 1 | F001 | DONE | verify (approved) | 12m |
| 2 | F002 | IN PROGRESS | — | 5m |
```

## NEVER

- **NEVER auto-advance past verification** — `/aicodepath-verify` always pauses. "Should work" in cruise control is invisible to the user and creates false completion. The user MUST see evidence.
- **NEVER auto-advance when confidence < 70%** — low confidence means the model isn't sure what to build. Auto-advancing produces plausible-looking wrong code that passes superficial GICL checks.
- **NEVER skip GICL quality loop** — cruise control removes *pauses*, not *quality gates*. Every TDD cycle still runs GICL. Score ≥ 90 is still required.
- **NEVER use cruise control on security-critical features** — auth flows, data encryption, access control, and payment processing require human judgment at every design decision. Auto-advance hides the decisions.
- **NEVER assume "defer" means "skip"** — deferred clarifications are tracked and must be resolved before sprint acceptance. Deferred ≠ ignored.
- **NEVER continue after context budget warning** — if `/aicodepath-context-budget` reports > 80% usage, checkpoint immediately. Running out of context mid-cruise-control loses all in-progress state.

## When NOT to Use

| Situation | Why Manual Is Better |
|-----------|---------------------|
| First time in codebase | Need to learn conventions — auto-advance skips discovery |
| Security-critical features | Design decisions need human judgment at each step |
| Major architecture changes | Wrong design auto-implemented is expensive to undo |
| Vague requirements | Too many clarification pauses defeat the purpose |
| Multi-team coordination | Other teams need to review intermediate artifacts |
