---
name: aicodepath-knowledge
description: Record phase transitions, architecture decisions, GICL sessions, and lessons in the knowledge base.
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Bash
argument-hint: "[planning|tasks|knowledge|init]"
---

# AICodePath Knowledge Management

## The Three Files

| File | Updated When | Contains |
|------|-------------|---------|
| `aicodepath-docs/adr-log.md` | INCEPTION phase, architecture decisions | ADRs, design rationale, key constraints |
| `aicodepath-docs/task/*-tasks.md` | CONSTRUCTION phase, task status changes | Current tasks, blockers, progress |
| `aicodepath-docs/knowledge.md` | GICL Learn phase, post-mortem, reflexion | Lessons, gotchas, patterns discovered |
| `aicodepath-docs/pm/*.md` (CONDITIONAL) | PM Discovery Gate during greenfield inception | User personas, competitive landscape; check `**Source:**` field and `**Generated:**` date — if >90 days old, re-prompt before using as design input |

**Additional artifact directories**: Design documents from `/aicodepath-write-design` live in `aicodepath-docs/design/` — check this directory when reviewing decisions and constraints alongside `adr-log.md`. Historical design/plan docs may also exist in `aicodepath-docs/plan/` (legacy location before ADR-006); check both when doing a full decision audit.

**adr-log.md is a constraint database, not a log.** Before any architectural decision — even small ones — check adr-log.md first. Previous ADRs often rule out your current approach without you knowing it.

## Before Writing to Any Knowledge File

Ask three questions:
1. **Which file does this belong in?** Decision + rationale → adr-log.md. Task status/blocker → tasks.md. Lesson/gotcha/pattern → knowledge.md. When uncertain, use the table below.
2. **Will this entry be findable by symptom?** "N+1 query in UserRepository loop caused 30s load times" is findable. "Fixed query performance" is not. Write the symptom, not just the fix.
3. **Does this entry include the specific trigger?** Git SHA, file:line, error message, or test name — concrete anchors that let you verify the entry matches the current situation.

> **MANDATORY — when writing to any knowledge file**: Read `references/file-formats.md` for exact format templates (~50 lines). Do NOT load during read-only session-start queries — only load when actively writing a new entry.

## Which File?

| Information type | File | Example |
|-----------------|------|---------|
| Why we chose approach X over Y | adr-log.md (ADR) | "Chose Kysely over Prisma because..." |
| Decision changed — old decision now wrong | adr-log.md (new ADR, Supersedes old) | ADR-4 supersedes ADR-2 |
| Task is blocked or completed | tasks.md | Status column update |
| Bug with reusable symptom | knowledge.md | Even if the fix was "obvious" |
| Gotcha / edge case / failure pattern | knowledge.md | "When X happens, Y breaks because Z" |
| "This lesson is basically in ADR-2 already" | knowledge.md (still write it) | Different file, different retrieval — ADRs aren't searched for lessons |

## When to Update Each File

### adr-log.md — After Architecture Decisions
```
Trigger: Design approved in /aicodepath-brainstorm
         Major technical decision made
         New constraint discovered
```

### tasks.md — After Task Status Changes
```
Trigger: New task started (/aicodepath-implement or /aicodepath-gicl-start)
         Task completed (/aicodepath-verify passes)
         Blocker discovered or resolved
```

Uses the **7-column format** `| Task | Agent | Content | DoD | Depends | Batch | Status |` written by `/aicodepath-write-plan`. Never change the column count or order — `plan-loader.js` uses fixed column indices (COL 0–6) and throws a format-mismatch error if the header doesn't match.

### knowledge.md — After Any Session With a Reusable Lesson
```
Trigger: GICL session completes (Learn phase)
         Bug fixed — any bug whose symptom could recur
         Reflexion pattern identified
         Gotcha discovered
         Architectural constraint revealed mid-implementation
```

**The retrieval model test**: knowledge.md has two modes — write-mode ("I know what I just fixed") and read-mode ("I see a symptom, is this in my notes?"). Most entries fail in read-mode because they were written for write-mode. Test each entry: can you recognize it in 3 seconds from the symptom alone, without knowing the fix? If not, rewrite the title and Context to lead with the observable symptom.

## Initialization — `aicodepath-knowledge init`

Creates all three files if they don't exist. For `tasks.md`, the required header is:

```markdown
# Tasks

| Task | Agent | Content | DoD | Depends | Batch | Status |
|------|-------|---------|-----|---------|-------|--------|
```

Any other column structure will cause `plan-loader.js` to return 0 units when the orchestrate loader runs.

## Update Rules

- **Append only** — never delete old entries (history matters)
- **Link to commits** — reference git SHA when relevant; future sessions need to know if the context has changed since the entry was written
- When `adr-log.md` has >10 ADRs, add a single-line "Constraints Summary" at the top: one line per ADR listing the constraint it implies. This prevents scanning 10 full ADRs to answer "what's blocked?"

## Integration with AIDLC Phases

```
PRE-FLIGHT     → Read all three files to restore context
INCEPTION      → Write to adr-log.md after design approved
CONSTRUCTION   → Write to tasks.md on status changes
GICL Learn     → Write to knowledge.md after each session
OPERATIONS     → Write to knowledge.md after debugging/deploy
```

## Troubleshooting

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| `orchestrate load` reports 0 units | tasks.md header has wrong column count or names | Verify header is exactly `\| Task \| Agent \| Content \| DoD \| Depends \| Batch \| Status \|` — plan-loader.js checks `cells.length >= 7` and column 0/1 names |
| ADR decision not visible at session start | Lesson added to existing ADR instead of new entry in knowledge.md | Move to knowledge.md; ADRs are not searched for lessons at session start |
| knowledge.md entry doesn't surface for current symptom | Entry written fix-first, not symptom-first | Rewrite title and Context to lead with the observable error/condition |
| Conflicting ADRs in adr-log.md | Old ADR modified instead of superseded | Add new ADR with `**Supersedes**: ADR-N`; annotate old entry with `**Superseded by**: ADR-N` |
| tasks.md updated but loader still finds old format | tasks.md written outside write-plan skill using old column format | Rewrite tasks.md header to 7-column format; run `orchestrate load --clear` |

## Fallback

If `tasks.md` already has a non-7-column format used by another tool: keep the existing file, create `aicodepath-docs/orchestrate-tasks.md` with the 7-column format, then pass `--tasks-path aicodepath-docs/orchestrate-tasks.md` to `orchestrate load`.

## NEVER

- **NEVER** write task state into `knowledge.md` — "task X is in progress" belongs in `tasks.md`. Mixing task status with lessons makes both files harder to scan at session start. The rule: `knowledge.md` contains things that remain true after the task is done; `tasks.md` contains things that change as tasks progress.
- **NEVER** delete or overwrite old ADR entries in `adr-log.md` when a decision changes — instead, add a new ADR with `**Supersedes**: ADR-N` in the header AND annotate the superseded ADR with `**Superseded by**: ADR-N`. The history of why a decision was made is as valuable as the decision itself.
- **NEVER** write a `knowledge.md` entry without a specific Context and Example — "fixed performance issue" is useless at session start because it contains no searchable symptom. The entry format requires Context + Lesson + Example. Without these three, the entry won't jog the right memory.
- **NEVER** skip reading all three files at session start to "save tokens" — the cost is 3 Read calls (~30 seconds). The cost of skipping is re-investigating decisions Claude already recorded and sometimes making contradictory architectural choices in the same session.
- **NEVER** use `aicodepath-docs/pm/*.md` artifacts older than 90 days as design input without re-prompting — PM context decays as markets shift; a 90-day-old competitive landscape may have missed a new entrant that changes the differentiation strategy. Check `**Generated:**` date before loading.
- **NEVER** skip a `knowledge.md` entry because "the fix was obvious" — the entry's value is its symptom (what broke, when, under what conditions), not the fix. An obvious fix to a subtle trigger will recur. Document the trigger.
- **NEVER** add a lesson to an existing ADR in `adr-log.md` — ADRs capture decisions; `knowledge.md` captures lessons. They serve different retrieval needs: ADRs are checked before decisions; knowledge.md is checked when something breaks or recurs. Mixing them degrades both.
- **NEVER** write `tasks.md` with fewer or more than 7 columns — `plan-loader.js` requires exactly `| Task | Agent | Content | DoD | Depends | Batch | Status |` and uses hardcoded column indices (COL 0–6); a wrong column count causes the loader to silently return 0 units, making `orchestrate load` appear to succeed with nothing staged.

## Reference Files

| File | Load when |
|------|-----------|
| `references/file-formats.md` | When writing a new entry — exact templates for ADR, knowledge.md, and tasks.md formats (~50 lines) |
