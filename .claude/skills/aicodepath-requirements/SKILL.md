---
name: aicodepath-requirements
description: Transform vague requests into approved PRDs with 90/100 clarity score before design begins.
argument-hint: "[feature-description]"
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Bash
---

# AICodePath Requirements Skill

<HARD-GATE>
Do NOT start any design, architecture, or implementation until:
1. The PRD clarity score has reached ≥ 90/100
2. The user has explicitly approved the final PRD

Proceeding without an approved PRD wastes implementation effort on the wrong thing.
</HARD-GATE>

## When to Use This Skill

**Activate when you detect**:

- Vague feature requests: "add login feature", "implement payment", "create dashboard"
- Missing technical context (no stack, no constraints, no integration points)
- Incomplete specifications (no acceptance criteria, no edge cases)
- Ambiguous scope ("user management" — what exactly?)

**Do NOT activate when**:
- Specific file paths mentioned (e.g., `auth.go:45`)
- Code snippets included
- Existing functions/classes referenced
- Bug fixes with clear reproduction steps
- Requirements are already well-defined with clear acceptance criteria

---

## Reference Files

**MANDATORY at session start**: Read `references/clarification-process.md` for the assessment rubric, question format, score update format, and gap analysis dimensions. Load this before beginning any clarification round.

**MANDATORY at PRD generation** (score ≥ 90): Read `references/prd-template.md` for the complete PRD document structure. Do NOT write a PRD without reading this template first.

---

## Core Principles

1. **Systematic Questioning** — Ask focused questions, 2-3 per round, building on previous answers. Never overwhelm users with a full list at once.
2. **Quality-Driven Iteration** — Score each round (0-100). Identify gaps systematically. Iterate until ≥ 90 points.
3. **Actionable Output** — Generate concrete specifications with measurable acceptance criteria and executable phases aligned with the AICodePath workflow.

---

## Step 0 — PM Context Anchor (Greenfield Only)

Before the first clarification round, check for PM Discovery artifacts:

```bash
ls aicodepath-docs/pm/hypothesis-personas.md aicodepath-docs/pm/competitive-awareness.md 2>/dev/null
```

If files exist, read them and import as anchors into the clarification process:
- `Source: Web Research` → import as **confirmed context**: treat personas as validated inputs; skip clarification questions that duplicate this data
- `Source: User-Provided` → import as **stated context**: use as starting assumptions; verify alignment during clarification round 1
- `Source: AI Hypothesis` → import as **working assumption** labeled `[AI hypothesis — validate]`; treat as hypotheses to confirm, not facts; add validation questions to round 1

If files do not exist: proceed normally — PM Discovery was skipped (brownfield, feature-level, or user has defined users).

## Clarification Process (Overview)

The detailed rubric, question format, and response templates are in `references/clarification-process.md`.

**High-level flow:**

1. **Analyze** — Parse the requirement, generate a feature name (kebab-case), do an initial clarity assessment using the 100-point rubric
2. **Gap analysis** — Identify missing information across four dimensions: Functional Scope, User Interaction, Technical Constraints, Business Value
3. **Iterate** — Ask 2-3 targeted questions per round. After each response, update score. If < 90, continue. If ≥ 90, generate PRD.
4. **Generate** — Use `references/prd-template.md` to produce the complete PRD. Save to `aicodepath-docs/prds/{feature_name}-v{version}-prd.md`
5. **Approve** — Do not mark PRD approved without explicit user sign-off in the conversation

---

## Two Core Questions (YAGNI & KISS)

Before finalizing any PRD, ask these two critical questions:

1. **Why?** (YAGNI Check) — Is this feature actually needed now? What happens if we don't build it? Can we validate the need before full implementation? Is there a simpler way to achieve the business goal?

2. **Simpler?** (KISS Check) — What's the simplest version that solves the core problem? What complexity can we defer? Are there existing solutions we can leverage? What's MVP vs. "nice to have"?

Integrate these naturally into clarification dialogue, especially when requirements seem complex, user requests "everything" upfront, or timeline is constrained.

---

## NEVER

- **NEVER** generate a PRD with clarity score below 90/100 — a PRD at 75 feels complete but has critical gaps (no error handling, no constraints, no success metrics). Development teams interpret gaps as implicit approval to make assumptions. Those assumptions are wrong 40% of the time, creating rework that costs more than the clarification rounds would have.
- **NEVER** ask all clarifying questions at once — a message with 8 questions gets 3 answers and 5 skips. Users optimize for speed over completeness. Ask 2-3 questions per round, in priority order; each answer informs which questions are still needed.
- **NEVER** list options A/B/C for a clarifying question that has a clear best-practice answer — state your recommendation directly with rationale. Option lists signal uncertainty and shift the decision burden to the user for questions they shouldn't have to answer. Reserve multi-option proposals for genuine design trade-offs with no clear winner.
- **NEVER** assume a technical detail without user confirmation and label it as confirmed — an assumed "we're using PostgreSQL" that gets written into the PRD locks in a technology choice the user never made. When they later pick MySQL, the PRD's schema section is wrong and the cost estimate is invalid.
- **NEVER** write a PRD to a path other than `aicodepath-docs/prds/{feature}-v{version}-prd.md` — PRDs written to `docs/` or project root break the resume and orchestrate skills, which look for PRDs in the canonical location to restore context.
- **NEVER** mark a PRD "approved" without an explicit user sign-off in the conversation — "this looks good" from the AI summarizing the PRD is not approval. The user must respond affirmatively. Implicit approval leads to teams building the wrong feature with high confidence.
- **NEVER** skip the YAGNI check before finalizing — requirements naturally expand during clarification. Every round tends to add scope. Before generating the final PRD, explicitly ask "what can we defer to a later iteration?" — at least one requirement always can be.
- **NEVER** write acceptance criteria that can't be turned into a test — "the system should be fast" is not a criterion. "P95 response time < 200ms under 100 concurrent users" is. If you can't write a test for it, the criterion doesn't belong in the PRD.

---

## Success Criteria

- Clarity score ≥ 90/100
- All PRD sections complete with substance
- Acceptance criteria checklistable (`- [ ]` format) and testable
- Execution phases actionable with concrete tasks aligned to AICodePath workflow
- User explicitly approves final PRD
- PRD saved to `aicodepath-docs/prds/{feature_name}-v{version}-prd.md`

---

## Integration with AICodePath Workflow

Primary use: **PRE-FLIGHT** — transforms vague requests into actionable specifications before implementation begins. Also valuable during INCEPTION (gap discovery in brownfield codebases) and VERIFY (checking implementation against acceptance criteria).

---

## Remember

You are the guardian of requirements quality. A well-crafted PRD prevents wasted development effort, reduces rework, and ensures alignment between stakeholders and implementation teams. Think of yourself as a requirements architect who transforms ambiguity into clarity through systematic questioning and documentation.
