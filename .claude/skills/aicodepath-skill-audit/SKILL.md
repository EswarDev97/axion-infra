---
name: aicodepath-skill-audit
description: Score any SKILL.md across 8 dimensions (120 pts) — letter grade, knowledge delta ratio, and ranked improvements.
version: 1.1.0
author: AICodePath Team
tags:
  - skill-evaluation
  - quality-assessment
  - knowledge-delta
  - skill-improvement
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash
argument-hint: "[skill-name or path]"
---

# AICodePath Skill Audit

Evaluate AICodePath Skills against best practices using multi-dimensional scoring.

**MANDATORY**: Before scoring any dimension, read the full rubric:
[`references/rubric.md`](references/rubric.md) — contains scoring criteria, examples, and failure patterns for all 8 dimensions.

---

## Core Philosophy

### What is a Skill?

A Skill is NOT a tutorial. A Skill is a **knowledge externalization mechanism** — a hot-swappable expert brain loaded at invocation time.

**The Core Formula**:
> **Good Skill = Expert-only Knowledge − What Claude Already Knows**

Value is measured by **knowledge delta** — the gap between what the Skill provides and what Claude already knows.

### Three Types of Knowledge

When evaluating, mentally tag each section:

| Type | Definition | Treatment |
|------|------------|-----------|
| **[E] Expert** | Claude genuinely doesn't know this | Must keep — this is the Skill's value |
| **[A] Activation** | Claude knows but may not think of | Keep if brief — reminder only |
| **[R] Redundant** | Claude definitely knows this | Delete — wastes tokens |

**Target ratio**: >70% Expert, <20% Activation, <10% Redundant

---

## Evaluation Dimensions (120 points total)

| # | Dimension | Max | Focus |
|---|-----------|-----|-------|
| D1 | Knowledge Delta | 20 | Does every paragraph earn its tokens? |
| D2 | Mindset + Procedures | 15 | Thinking frameworks + non-obvious domain steps |
| D3 | Anti-Pattern Quality | 15 | Specific NEVER list with WHY |
| D4 | Specification Compliance | 15 | Description quality (WHAT + WHEN + KEYWORDS) |
| D5 | Progressive Disclosure | 15 | Content layering, loading triggers |
| D6 | Freedom Calibration | 15 | Constraint level matched to task fragility |
| D7 | Pattern Recognition | 10 | Mindset / Navigation / Philosophy / Process / Tool |
| D8 | Practical Usability | 15 | Decision trees, fallbacks, edge cases |

**READ `references/rubric.md` for full scoring criteria before grading any dimension.**

---

## Evaluation Protocol

### Step 1: First Pass — Knowledge Delta Scan

Read SKILL.md completely. For each section ask: *"Does Claude already know this?"*

Tag sections [E], [A], or [R]. Calculate rough ratio.

### Step 2: Structure Analysis

```
[ ] Check frontmatter validity (name ≤64 chars, description completeness)
[ ] Count total lines in SKILL.md
[ ] List all reference files and their sizes
[ ] Identify the design pattern: Mindset / Navigation / Philosophy / Process / Tool
[ ] Check for loading triggers (if references/ exists)
```

### Step 3: Score Each Dimension

For each of the 8 dimensions (use `references/rubric.md` for criteria):
1. Find specific evidence — quote the relevant lines
2. Assign score with one-line justification
3. Note specific improvement if score < 80% of max

### Step 4: Calculate Total & Grade

```
Total = D1 + D2 + D3 + D4 + D5 + D6 + D7 + D8  (max 120)
```

| Grade | Points | Meaning |
|-------|--------|---------|
| A | 108+ (90%+) | Production-ready expert Skill |
| B | 96-107 (80-89%) | Good — minor improvements needed |
| C | 84-95 (70-79%) | Adequate — clear improvement path |
| D | 72-83 (60-69%) | Below average — significant issues |
| F | <72 (<60%) | Needs fundamental redesign |

### Step 5: Generate Report

```markdown
# Skill Evaluation Report: [Skill Name]

## Summary
- **Total Score**: X/120 (X%)
- **Grade**: [A/B/C/D/F]
- **Pattern**: [Mindset/Navigation/Philosophy/Process/Tool]
- **Knowledge Ratio**: E:A:R = X:Y:Z
- **Verdict**: [One sentence assessment]

## Dimension Scores

| Dimension | Score | Max | Notes |
|-----------|-------|-----|-------|
| D1: Knowledge Delta | X | 20 | |
| D2: Mindset + Procedures | X | 15 | |
| D3: Anti-Pattern Quality | X | 15 | |
| D4: Specification Compliance | X | 15 | |
| D5: Progressive Disclosure | X | 15 | |
| D6: Freedom Calibration | X | 15 | |
| D7: Pattern Recognition | X | 10 | |
| D8: Practical Usability | X | 15 | |

## Critical Issues
[Must-fix problems that significantly impact effectiveness]

## Top 3 Improvements
1. [Highest impact improvement with specific guidance]
2. [Second priority]
3. [Third priority]

## Detailed Analysis
[For each dimension scoring below 80%: what's missing, specific examples, concrete suggestions]
```

### Step 6: Description Optimization (if D4 < 12)

If the description scored below 12/15, recommend running the aicodepath-skill-creator's description optimizer to fix triggering accuracy:

```bash
# From the aicodepath-skill-creator directory
python -m scripts.run_loop \
  --eval-set <skill-dir>/evals/trigger-evals.json \
  --skill-path <skill-dir> \
  --model claude-sonnet-4-6 \
  --max-iterations 5
```

This runs 20 should-trigger / should-not-trigger queries and iteratively improves the description field. See the `aicodepath-skill-creator` skill for full setup.

---

## NEVER Do When Evaluating

- Give high scores because it "looks professional" or is well-formatted
- Let length impress you — a 43-line Skill can outperform a 500-line Skill
- Forgive explaining basics with "but it provides helpful context"
- Overlook a missing NEVER list — that's a significant gap in D3
- Assume all procedures are valuable — distinguish domain-specific from generic
- Undervalue the description — poor description means the skill never gets used
- Put "when to use" findings only in the body — Agent only sees description before loading

---

## Audit Scope

- **Single skill**: `Read` the SKILL.md, grade all 8 dimensions
- **All skills in a project**: `Glob` for `**/SKILL.md`, grade each, rank by total score
- **Batch summary**: produce a table of all skills sorted by grade with top issue per skill

---

## Wiring Check (non-scored)

After completing the scored audit, verify skill wiring completeness. These checks are not included in the score — they are binary pass/fail gates.

| Check | Command | Expected |
|-------|---------|----------|
| using-aicodepath trigger entry | `grep -c "<skill-name>" .aicodepath/skills/using-aicodepath/SKILL.md` | ≥1 |
| classify-component taxonomy row (domain-specific only) | `grep -c "<skill-name>" .aicodepath/skills/aicodepath-classify-component/references/agent-taxonomy.md` | ≥1 (if domain-specific) |
| classify-component Recommended Skills entry (domain-specific only) | grep for skill name in classify-component SKILL.md | ≥1 (if domain-specific) |

Report: "Wiring: PASS" (all applicable checks pass) or "Wiring: FAIL — missing: [list]".

Note: Generic/cross-cutting skills (like `aicodepath-help`, `aicodepath-status`) only need the using-aicodepath entry. Domain-specific skills (like `aicodepath-android`, `aicodepath-fluent-design`) need all three.
