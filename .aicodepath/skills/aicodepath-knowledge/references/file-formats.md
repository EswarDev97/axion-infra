# Knowledge File Format Templates

Loaded when writing a new entry to any of the three knowledge files.
Do NOT load during read-only session-start queries — only needed when actively writing.

---

## adr-log.md — ADR Format

```markdown
## ADR-{N}: {Title}
**Date**: {date}
**Status**: Accepted
**Context**: Why this decision was needed
**Decision**: What was decided
**Consequences**: What this means for future work
```

When superseding: write a new ADR with `**Supersedes**: ADR-N` AND add `**Superseded by**: ADR-N` to the old entry. Bi-directional links let you navigate decision history in both directions.

---

## knowledge.md — Lesson Format

```markdown
## {Category}: {Title — lead with the observable symptom}
**Discovered**: {date}
**Context**: {what situation revealed this — name the specific trigger}
**Lesson**: {concise takeaway}
**Example**: {file:line or code snippet}
```

**Retrieval test**: read your entry title cold — can you recognize the symptom in 3 seconds without knowing the fix? If not, rewrite to lead with the observable symptom, not the solution.

---

## tasks.md — 7-Column Format

```markdown
# Tasks

| Task | Agent | Content | DoD | Depends | Batch | Status |
|------|-------|---------|-----|---------|-------|--------|
| Add JWT generation | aicodepath-backend-architect | Implement `generateToken(payload)` in `src/auth/jwt.ts` | `npm test src/auth/jwt` exits 0 | — | 1 | TODO |
```

Column contract (hardcoded in `plan-loader.js` COL 0–6):
- **Task** (0): short name — also the unit name in the orchestrate DB
- **Agent** (1): specialist agent slug, or `—` for docs/config tasks
- **Content** (2): what to implement (exact file path + action)
- **DoD** (3): measurable done-when (exact command + expected output)
- **Depends** (4): task name(s) this depends on, comma-separated, or `—`
- **Batch** (5): wave number from plan-analyst (1 = no deps)
- **Status** (6): `TODO` | `IN_PROGRESS` | `done`/`complete`/`✅` (done variants skip on load)

**NEVER add or remove columns** — `plan-loader.js` uses fixed column indices and silently returns 0 units if the header doesn't match exactly.
