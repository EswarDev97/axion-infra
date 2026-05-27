---
name: aicodepath-write-design
description: Synthesize brainstorm into a structured design document — captures decisions, rationale, constraints, and alternatives.
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep
argument-hint: "<topic or brainstorm session reference>"
---

# AICodePath Design Document Synthesis

Turn an approved brainstorm conversation into a structured, comprehensive design document. This skill captures the **why** behind decisions — not just the **what**.

```
/aicodepath-brainstorm          <- conversation: explore, question, propose, approve
/aicodepath-write-design        <- THIS SKILL: synthesize into structured document
/aicodepath-classify-component  <- classify component types
/aicodepath-write-plan          <- implementation tasks
```

<HARD-GATE>
Do NOT run this skill without a verifiably approved brainstorm. "Approved" means ONE of:
1. A brainstorm transcript at `aicodepath-docs/temp/*-brainstorm-session.md` contains the line `## Status: APPROVED` — verify this with Glob + Read before proceeding
2. The current conversation contains an explicit user approval message (e.g. "approved", "go ahead", "looks good") that you can quote verbatim — quote it before proceeding

Informal consensus, verbal agreement, or "I'll approve it retroactively" do NOT satisfy this gate. If neither condition is met, redirect to `/aicodepath-brainstorm` first — even under time pressure.
</HARD-GATE>

---

## Why This Skill Exists

The brainstorm skill is a **conversation** skill — it explores, questions, proposes, and reaches consensus through interactive dialogue. Writing the design document is a **synthesis** skill — it reads the full conversation, extracts decisions, and produces structured output.

When both are done in one step, the synthesis gets minimal attention. The conversation has already reached consensus, so Claude rushes through the document. This causes design documents to lose:
- Exploration findings (what we learned about the codebase)
- Decision rationale (why we chose A over B)
- Constraints discovered (backward compat requirements, unexpected file structures)
- Alternatives considered (what we rejected and why)

Future sessions reading the design doc get the "what" but not the "why."

---

## Process

### Step 1 — Gather Inputs

Read these sources (in order of priority):

1. **Brainstorm session transcript** — check `aicodepath-docs/temp/*-brainstorm-session.md` for the most recent transcript matching the topic
2. **Conversation context** — the current conversation history from the brainstorm
3. **Existing codebase state** — files that were explored during brainstorm (grep for file paths mentioned in the conversation)

If no transcript exists and the brainstorm happened in the current conversation, work from conversation context directly.

### Step 2 — Extract and Organize

Walk through the brainstorm conversation chronologically and extract:

| Extract | What to look for |
|---------|-----------------|
| Root causes / triggers | "The problem is...", "This broke because...", incident references |
| Exploration findings | Agent search results, file reads, "I found that...", "The codebase has..." |
| Constraints | "We can't change X because...", backward compat, existing patterns to follow |
| Decisions | "Let's go with...", user approvals, "Yes, that approach" |
| Alternatives rejected | "Instead of X, we'll do Y because...", "Option A vs Option B" |
| Risks identified | "What if...", "The risk is...", spike candidates |
| Files impacted | Every file path mentioned as create/modify/delete |

### Step 3 — Conflict Check Then Write

**Before writing, check for existing design documents:**

```bash
# Glob for any prior design doc matching the topic
aicodepath-docs/design/*<topic>*design*.md
aicodepath-docs/plan/*<topic>*design*.md
```

If a match is found:
- Surface it explicitly: "Found existing design doc: `<filename>`. This conflicts with the new synthesis."
- Require the user to choose ONE before writing:
  - `[A] Supersede` — rename old file to `<filename>-retired.md`, create fresh dated doc
  - `[B] Version` — create new file as `YYYY-MM-DD-<topic>-design-v2.md` (preserves old)
  - `[C] Update in place` — overwrite old file (only if old doc is a direct predecessor)
- Do NOT write anything until user chooses.

If no conflict: proceed to write.

**Output file**: `aicodepath-docs/design/YYYY-MM-DD-<topic>-design.md`

Use today's date. The topic should be kebab-case derived from the brainstorm subject (e.g. "StackShift Integration" → `stackshift-integration`).

---

## 8 Mandatory Sections

Every design document MUST contain these sections. If a section has no content, write "None identified" rather than omitting it — the absence of risk is itself a finding worth recording.

### Section 1: Header

```markdown
# <Topic> — Design Document

**Date**: YYYY-MM-DD
**Status**: DESIGN APPROVED
**Trigger**: <What initiated this work — incident, feature request, tech debt>
**Scope**: <What areas of the system are affected>
```

### Section 2: Problem Statement

What breaks if this doesn't exist, and for whom. Not "we want X" but "without X, Y happens to Z."

Include:
- Root cause analysis (if triggered by an incident)
- Who is affected and how
- What the current workaround is (if any)

### Section 3: Exploration Findings

What we learned about the codebase during the brainstorm. This section captures the results of agent searches, file reads, and pattern discovery that would otherwise disappear after the conversation.

Structure as a table:

```markdown
| Finding | Source | Impact on Design |
|---------|--------|-----------------|
| File X is a router, not a workflow engine | Read .aicodepath/rules/core-workflow.md | Cannot add logic here; need a new file |
| Existing parser uses tree-sitter | Grep for tree-sitter imports | Can reuse existing infrastructure |
```

### Section 4: Constraints Discovered

Things found during exploration that shaped or limited design decisions. These are not requirements from the user — they are realities discovered in the code.

Examples:
- Backward compatibility requirements (existing JSON schema consumed by external tools)
- Performance constraints (hook must complete in <50ms)
- Platform limitations (Windows doesn't support symlinks natively)

### Section 5: Decision Log

Each significant design decision in ADR-lite format:

```markdown
| Decision | Options Considered | Rationale |
|----------|-------------------|-----------|
| Parser in Python, not Node.js | Python vs Node.js | Tree-sitter bindings are more mature in Python; co-locates with existing parsers |
| Trigger on git commit, not every edit | Per-edit vs per-commit | Graph represents committed state; per-edit is too noisy |
```

Every decision must trace back to a root cause, constraint, or exploration finding. If a decision can't be traced, it's either missing rationale (add it) or gold-plating (remove it).

### Section 6: Design Specification

The actual "what to build" — components, interfaces, data structures, API contracts. This is the section that would have been written anyway. The preceding sections provide the context that makes this section understandable.

Include:
- Component descriptions with file paths
- Data structures / schemas
- API contracts (if applicable)
- Integration points with existing code

### Section 7: Risk Assessment

What could go wrong, what assumptions need validation, and what spikes are recommended.

```markdown
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| tree-sitter-language-pack doesn't cover all 14 languages | Medium | High — parser fails on unsupported languages | Spike: verify coverage before implementation |
```

### Section 8: Acceptance Criteria

A 3-column table mapping each acceptance criterion to its machine-verifiable check. This table is read by `/aicodepath-acceptance` at sprint close and by `/aicodepath-write-plan` Step 0 to confirm the design is complete before planning begins.

```markdown
| Criterion | Verification | Pass |
|-----------|-------------|------|
| <what must be true when the feature is complete> | <exact bash command, grep, or test output that proves it> | [ ] |
| <criterion 2> | <verification 2> | [ ] |
| <criterion 3> | <verification 3> | [ ] |
```

**Rules**:
- At least 3 criteria required — one per major component in Section 6
- Every `Verification` must be a runnable command or an exact grep pattern
- "LGTM" or "looks good" is NOT a valid verification
- Leave `Pass` checkboxes as `[ ]` — they are checked off by `/aicodepath-acceptance`

---

### Appendix: Files Impact Summary

```markdown
### New files:
- `path/to/new-file.ext` — purpose

### Modified files:
- `path/to/existing-file.ext` — what changes and why

### Unchanged (referenced but not modified):
- `path/to/reference.ext` — why it's relevant but not changing
```

---

## Quality Standard

**Traceability rule**: Every design decision in Section 6 (Specification) must trace back to either:
- A root cause from Section 2 (Problem Statement)
- A constraint from Section 4 (Constraints)
- An exploration finding from Section 3 (Findings)

If a decision can't be traced, it's either:
- Missing rationale → add it to the Decision Log
- Gold-plating → remove it from the spec

### Self-Check Before Saving

Before writing the file, verify:

- [ ] All 8 sections present (none omitted, Section 8 has ≥3 criteria)
- [ ] Problem statement describes impact, not just desire
- [ ] Exploration findings cite specific files/paths, not vague references
- [ ] Every design decision has at least one alternative considered
- [ ] Risk assessment has at least one entry (or explicit "None identified")
- [ ] Files impact summary matches what the design actually proposes

<HARD-GATE>
Do NOT commit this design document without a populated Section 8 Acceptance Criteria table.
A design document without Section 8 blocks `/aicodepath-write-plan` (Step 0 gate) from generating the implementation plan.

Verify before committing:
```bash
grep "Section 8" aicodepath-docs/design/<your-doc>.md
```
If the grep returns no match, add Section 8 before committing.
</HARD-GATE>

### Step 3b — Persist Artifact Row (ArtifactWriter)

After the design file is written but **before** the commit, record the artifact in the `artifacts` table so downstream skills (`/aicodepath-write-plan`, `/aicodepath-acceptance`, `sprint-history.listSprints`) can link to it.

Read the `cr_number` from session-state (seeded by `/aicodepath-brainstorm` per T8). If no CR is present, `ArtifactWriter` falls back to the `CR-LEGACY` sentinel.

```js
const { SessionStateManager } = require('./lib/session-state-manager');
const ArtifactWriter = require('./lib/artifact-writer');

const crNumber = new SessionStateManager().getState('cr_number') || null;

// Wrap the call so the PostToolUse auto-artifact-creator hook does NOT re-enter
// and create a duplicate row. Two guards (belt and braces, per T2):
//   1. ACP_SUPPRESS_AUTO_ARTIFACT=1 env var — bypasses the hook entirely
//   2. metadata.source = 'artifact-writer' — hook also short-circuits on this tag
process.env.ACP_SUPPRESS_AUTO_ARTIFACT = '1';
try {
  const writer = new ArtifactWriter();
  writer.createArtifact(
    'design',                                 // artifact_type
    '<topic> — Design Document',              // title
    '',                                       // content (file-backed)
    'aicodepath-docs/design/YYYY-MM-DD-<topic>-design.md',
    crNumber,                                 // cr_number (may be null → CR-LEGACY)
    'inception',                              // phase = 'inception'
    'design',                                 // stage = 'design'
    null,                                     // unit (design is sprint-scoped, not unit-scoped)
    { source: 'artifact-writer', status: 'active' }
  );
  writer.close();
} finally {
  delete process.env.ACP_SUPPRESS_AUTO_ARTIFACT;
}
```

Store the returned `artifactId` in session-state under `design_artifact_id` so `/aicodepath-write-plan` can create the `derived_from` link in T11:

```js
new SessionStateManager().setState('design_artifact_id', artifactId);
```

### Step 4 — Commit

```bash
git add aicodepath-docs/design/YYYY-MM-DD-<topic>-design.md
git commit -m "docs: <topic> design document"
```

---

## NEVER

- **NEVER** write a design document without a preceding brainstorm — the brainstorm conversation is the raw material. Without it, the design doc is speculation, not synthesis.
- **NEVER** omit the Exploration Findings section because "nothing was explored" — if no codebase exploration happened during brainstorm, that itself is a red flag. Design without exploration produces designs that don't fit the codebase.
- **NEVER** write a Decision Log entry without alternatives considered — "We decided X" without "instead of Y because Z" is not a decision record, it's a statement. The value is in the reasoning, not the conclusion.
- **NEVER** include a design decision in Section 6 that can't be traced to Sections 2-4 — untraceable decisions are either missing context (add it) or scope creep (remove it).
- **NEVER** skip the Files Impact Summary — the plan writer needs this to create accurate tasks. Missing file paths cause tasks that reference wrong locations.
- **NEVER** skip the commit step (Step 4) regardless of how the team manages versioning externally — Confluence, SharePoint, Notion, or any external tool does NOT substitute for the `aicodepath-docs/design/` artifact record. External tools are not visible to future sessions, plan writers, or the checkpoint system. This skill is not complete until `git commit` has been executed and the file is recorded in git history.
