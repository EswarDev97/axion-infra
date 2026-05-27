---
name: aicodepath-pause
description: Create handoff documents for seamless agent session transfers — quality scoring, staleness detection, and chaining.
version: 2.1.0
tags: [session-management, context-preservation, handoff, quality-control]
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Bash
argument-hint: "[task-slug]"
disable-model-invocation: false
---

# AICodePath Pause

Creates comprehensive handoff documents that enable fresh AI agents to seamlessly continue work with zero ambiguity. Solves the long-running agent context exhaustion problem with quality scoring and staleness detection.

## Features

- Quality Scoring: 0-100 scale with minimum threshold of 70 points
- Staleness Detection: FRESH/STALE status based on git commits and file changes
- Handoff Chaining: Link related handoffs for long-running projects
- Secret Detection: Prevents accidental exposure of API keys and credentials
- File Reference Validation: Ensures referenced files still exist

## Mode Selection

Determine which mode applies:

**Creating a handoff?** User wants to save current state, pause work, or context is getting full.
- Follow: CREATE Workflow below

**Resuming from a handoff?** User wants to continue previous work, load context, or mentions an existing handoff.
- Follow: RESUME Workflow below

**Proactive suggestion?** After substantial work (5+ file edits, complex debugging, major decisions), suggest:
> "We've made significant progress. Consider creating a handoff document to preserve this context for future sessions. Say 'create handoff' when ready."

## CREATE Workflow

**Before running create_handoff.py**: Gather AIDLC state from two sources:
1. Run `node .aicodepath/commands/phase-state.js status` → outputs `Current Phase: <value>` (e.g., CONSTRUCTION). Note: phase-state.js outputs only phase; it does NOT output active skill, next skill, or batch pointer.
2. Read the active task file in `aicodepath-docs/task/` → find first row with Status=TODO, note its Batch number, task title, and position.
3. Active skill and next skill come from the calling context (the skill that invoked /aicodepath-pause passes these explicitly).
Assemble all four fields before calling create_handoff.py (see Step 1 below).

### Step 1: Generate Scaffold

Run the smart scaffold script to create a pre-filled handoff document. Pass the four gathered fields as a JSON object using the flag shown below:

```bash
python3 .aicodepath/skills/aicodepath-pause/scripts/create_handoff.py [task-slug] \
  --aidlc-state '{"phase":"<phase>","last_skill":"<skill>","next_skill":"<next>","batch":<n>,"task":<n>,"task_title":"<title>","plan_file":"<path>"}'
```

**For continuation handoffs** (linking to previous work):
```bash
python3 .aicodepath/skills/aicodepath-pause/scripts/create_handoff.py "auth-part-2" --continues-from 2024-01-15-auth.md
```

The script will:
- Create `aicodepath-docs/handoffs/` directory if needed
- Generate timestamped filename
- Pre-fill: timestamp, project path, git branch, recent commits, modified files
- Add handoff chain links if continuing from previous
- Output file path for editing

**After running**: Verify the generated file contains `## AIDLC Workflow State` with no `[TODO]` in that section — if any remain, fill them before proceeding.

### Step 2: Complete the Handoff Document

Open the generated file and fill in all remaining `[TODO: ...]` sections. Prioritize these sections:

1. **Current State Summary** - What's happening right now
2. **Important Context** - Critical info the next agent MUST know
3. **Immediate Next Steps** - Clear, actionable first steps. **RULE: Item #1 MUST be a verbatim `/aicodepath-<skill>` invocation command** (e.g., `/aicodepath-gicl-start`), not a description of what to do. A fresh agent must be able to copy-paste item #1 directly.
4. **Decisions Made** - Choices with rationale (not just outcomes)

> MANDATORY — READ ENTIRE FILE before filling sections: [references/handoff-template.md](references/handoff-template.md) (~60 lines). Do NOT load this during RESUME Workflow.

Use the section order and field names from the template exactly — deviating from the structure breaks validate_handoff.py's section-matching regex.

### Step 3: Validate the Handoff

Run the validation script to check completeness and security:

```bash
python3 .aicodepath/skills/aicodepath-pause/scripts/validate_handoff.py <handoff-file>
```

The validator checks:
- [ ] No `[TODO: ...]` placeholders remaining
- [ ] Required sections present and populated
- [ ] No potential secrets detected (API keys, passwords, tokens)
- [ ] Referenced files exist
- [ ] Quality score (0-100)

**Do not finalize a handoff with secrets detected or score below 70.**

Quality Score Thresholds:
- 90+: Excellent - Ready for handoff
- 70-89: Good - Minor improvements suggested
- 50-69: Fair - Needs attention before handoff
- <50: Poor - Significant work needed

### Step 4: Confirm Handoff

Report to user:
- Handoff file location
- Validation score and any warnings
- Summary of captured context
- First action item for next session

## RESUME Workflow

### Step 1: Find Available Handoffs

List handoffs in the current project:

```bash
python3 .aicodepath/skills/aicodepath-pause/scripts/list_handoffs.py
```

This shows all handoffs with dates, titles, and completion status.

### Step 2: Check Staleness

Before loading, check how current the handoff is:

```bash
python3 .aicodepath/skills/aicodepath-pause/scripts/check_staleness.py <handoff-file>
```

Staleness levels:
- **FRESH**: Safe to resume - minimal changes since handoff
- **SLIGHTLY_STALE**: Review changes, then resume
- **STALE**: Verify context carefully before resuming
- **VERY_STALE**: Consider creating a fresh handoff

The script checks:
- Time since handoff was created
- Git commits since handoff
- Files changed since handoff
- Branch divergence
- Missing referenced files

### Step 3: Load the Handoff

Read the relevant handoff document completely before taking any action.

If handoff is part of a chain (has "Continues from" link), also read the linked previous handoff for full context.

### Step 4: Verify Context

> MANDATORY — READ ENTIRE FILE: [references/resume-checklist.md](references/resume-checklist.md) (~30 lines). Do NOT load this during CREATE Workflow.

Follow the checklist:

1. Verify project directory and git branch match
2. Check if blockers have been resolved
3. Validate assumptions still hold
4. Review modified files for conflicts
5. Check environment state

### Step 5: Begin Work

Start with "Immediate Next Steps" item #1 from the handoff document.

Reference these sections as you work:
- "Critical Files" for important locations
- "Key Patterns Discovered" for conventions to follow
- "Potential Gotchas" to avoid known issues

### Step 6: Update or Chain Handoffs

As you work:
- Mark completed items in "Pending Work"
- Add new discoveries to relevant sections
- For long sessions: create a new handoff with `--continues-from` to chain them

## Handoff Chaining

For long-running projects, chain handoffs together to maintain context lineage:

```
handoff-1.md (initial work)
    ↓
handoff-2.md --continues-from handoff-1.md
    ↓
handoff-3.md --continues-from handoff-2.md
```

Each handoff in the chain:
- Links to its predecessor
- Can mark older handoffs as superseded
- Provides context breadcrumbs for new agents

When resuming from a chain, read the most recent handoff first, then reference predecessors as needed.

## Storage Location

Handoffs are stored in: `aicodepath-docs/handoffs/`

Naming convention: `YYYY-MM-DD-HHMMSS-[slug].md`

Example: `2024-01-15-143022-implementing-auth.md`

## Quality Scoring

The validation script assigns scores based on:
- TODOs remaining (-30 points): Indicates incomplete work
- Missing required sections (-10 each): Core context gaps
- Secrets detected (-20 points): Security risk
- Missing file references (-5 each, max -20): Stale references
- Missing recommended sections (-2 each): Completeness

Minimum acceptable score: 70/100

## Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Score below 70 despite filling all sections | `[TODO: ...]` placeholder still present in a non-obvious location | Run `grep -r "TODO:" <handoff-file>` — find and replace all remaining placeholders |
| `## AIDLC Workflow State` has no `[TODO]` but next agent picks wrong skill | `--aidlc-state` JSON was passed with wrong `next_skill` value | Re-run `create_handoff.py` with corrected JSON; or manually edit the section before validating |
| Staleness shows VERY_STALE immediately after creation | Branch has diverged or files changed between `create_handoff.py` and `check_staleness.py` | Recreate handoff after committing pending changes; staleness is computed from git state at validation time |
| validate_handoff.py reports "Important Context" missing despite H3 section being present | Section heading uses 4+ `#` characters | Change `#### Important Context` to `### Important Context` — validator accepts H1–H3 only |

## Resources

### scripts/

All scripts are located at `.aicodepath/skills/aicodepath-pause/scripts/` and must be run with `python3`.

| Script | Purpose |
|--------|---------|
| `create_handoff.py [slug] [--continues-from <file>]` | Generate new handoff with smart scaffolding |
| `list_handoffs.py [path]` | List available handoffs in a project |
| `validate_handoff.py <file>` | Check completeness, quality, and security |
| `check_staleness.py <file>` | Assess if handoff context is still current |

### references/

- [handoff-template.md](references/handoff-template.md) - Complete template structure with guidance
- [resume-checklist.md](references/resume-checklist.md) - Verification checklist for resuming agents

## NEVER

- **NEVER** finalize a handoff with a quality score below 70 — a score below 70 means required sections are missing or incomplete. A resuming agent given an incomplete handoff will spend the first 20-30 minutes reconstructing context that should have been captured, defeating the purpose of the handoff entirely.
- **NEVER** include API keys, credentials, or access tokens in the handoff document — handoffs live in `aicodepath-docs/handoffs/` which may be committed to version control or shared across team members. Even if you use environment variable names (e.g., `STRIPE_KEY`), never paste actual values. The validator checks for common secret patterns but is not exhaustive.
- **NEVER** write "Immediate Next Steps" without specifying which tool, file, or command to run first — "Continue with the auth feature" is not actionable for a fresh agent. The first item must be unambiguous: "Run `npm test` to verify the baseline, then open `src/auth/login.ts:45` where the session token logic is incomplete."
- **NEVER** resume from a VERY_STALE handoff without treating it as partial context only — a handoff that's days old with 15+ commits since may describe a codebase state that no longer exists. Read it for architectural intent and decisions made, but verify all file paths, function signatures, and test results before acting on the task list.
- **NEVER** skip the staleness check when resuming — the staleness check is what transforms a handoff from a document into a verified starting point. Skipping it and acting on outdated task lists creates duplicate work or reverts already-merged changes.
- **NEVER** load a handoff and immediately act on "Immediate Next Steps" without checking whether `## AIDLC Workflow State` is present — a handoff without this section was created before the structured state format was introduced and may have a wrong or missing skill invocation as item #1. Always check for the section first; if absent, ask the user which skill to invoke.
- **NEVER** skip `check_staleness.py` when resuming from the RESUME Workflow — the staleness check is what distinguishes a verified starting point from a guess. A handoff that's VERY_STALE may reference files that no longer exist or branches that have been merged and deleted; treating its task list as current creates duplicate or reverted work.
