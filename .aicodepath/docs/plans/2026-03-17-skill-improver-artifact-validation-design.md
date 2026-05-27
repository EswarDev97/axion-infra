# Design: skill-improver Artifact Scan & Fix Phase

**Date:** 2026-03-17
**Status:** Approved
**Scope:** `aicodepath-skill-improver` SKILL.md + new `references/artifact-validation.md`

---

## Problem

`skill-improver` only evaluates and mutates `SKILL.md` (the behavioral/instruction layer). It never validates the artifacts a skill depends on — scripts, reference docs, agent definitions, templates, and shared generators. A skill can score Grade A on the audit while referencing broken Python scripts, missing reference files, or invalid YAML templates.

Specific gap: `aicodepath-diagrams` and `aicodepath-visual-memory` were improved to Grade A in a prior session, but the Python generator scripts in `.aicodepath/generators/` were never validated or verified.

---

## Design

### Architecture

New **Step 5: Artifact Scan & Fix Phase** inserted between Step 4 (Acceptance Table + State Init) and Loop Execution:

```
Step 1: Target Resolution
Step 2: User Configuration (Q1–Q5)
Step 3: Pressure Scenario Generation
Step 4: Acceptance Table + State Init
[NEW] Step 5: Artifact Scan & Fix Phase
─────────────────────────────────────────
Loop Execution (evaluate → judge → exit → mutate)
Post-Loop Steps
```

No changes to the loop itself. The fix phase is a one-time pre-loop gate.

---

### Artifact Discovery

Enumerate all files in the skill directory recursively. Exclude meta-files:
- `SKILL.md`, `CLAUDE.md`, `improvement_log.jsonl`, `state.json`, `best_skill.md`
- `__pycache__/`, `*.pyc`

**Shared script detection:** Scan SKILL.md body for path references outside the skill directory (patterns: `../generators/`, `.aicodepath/generators/`, absolute paths). These are added to the artifact list with `"shared": true`.

---

### Artifact Type Taxonomy & Validation

| Type | Files | Validation Command | Pass Condition |
|------|-------|--------------------|----------------|
| Python script | `*.py` | `python3 -m py_compile <file>` | exit 0 |
| JS/Node script | `*.js` | `node --check <file>` | exit 0 |
| Shell script | `*.sh` | `bash -n <file>` | exit 0 |
| Reference doc | `*.md` (non-agent) | exists + non-empty + has loading trigger in SKILL.md body | all true |
| Agent definition | `*.md` with YAML frontmatter | has `name`, `description`, `model` fields | all present |
| JSON config | `*.json` | `python3 -m json.tool <file>` | exit 0 |
| YAML template | `*.yaml`, `*.yml` | `python3 -c "import yaml; yaml.safe_load(open('<file>'))"` | exit 0 |
| Other templates | remaining files | exists + non-empty | all true |

Full validation commands offloaded to `references/artifact-validation.md`.

---

### Fix Workflow

For each artifact that fails validation:

```
1. DIAGNOSE  — run validation command, capture error output
              — LLM reads file + error → produces human-readable diagnosis

2. PROPOSE   — LLM generates the fix (rewrite, syntax correction, missing content, etc.)
              — For shared scripts: scan all skill directories for references to this path,
                list impacted skills in the proposal

3. TRACK     — add entry to state.json artifact_tasks[] with:
                { id, path, type, shared, shared_skills[], error, diagnosis,
                  proposed_fix, status: "pending" }

4. PRESENT   — show table to user:
                File | Type | Error | Diagnosis | Proposed Fix | Action
              — user approves (A), skips (S), or edits (E) per artifact
              — skipped artifacts stay as status: "skipped"

5. APPLY     — apply each approved fix
              — re-validate immediately after applying
              — pass → status: "applied"
              — fail → status: "fix_failed", offer retry

6. REPORT    — after all tasks resolved:
                "✅ N fixed | ⚠ N skipped | 🔗 N shared — also affects: [skill-X, skill-Y]"
              — announce: "Artifact phase complete. Starting SKILL.md loop..."
```

**Skipped artifacts** do not block the loop but appear as open items in the final acceptance gate.

---

### Shared Scripts — Fix Strategy

Fix shared scripts **in-place** (canonical location). Rationale: copying creates maintenance drift; fixing the source benefits all dependent skills.

After fixing a shared script:
1. Scan all skill directories for references to the same path
2. List impacted skills in the proposal (before user approves)
3. Emit impact report after applying: "also used by [skill-X] — run skill-improver on those to verify"

---

### State.json Extensions

```json
{
  "artifact_scan_complete": false,
  "artifact_health": "unknown|clean|has_issues|fixed|has_skipped",
  "artifact_tasks": [
    {
      "id": "artifact-001",
      "path": ".aicodepath/generators/er_diagram.py",
      "type": "python",
      "shared": true,
      "shared_skills": ["aicodepath-visual-memory"],
      "error": "SyntaxError: invalid syntax at line 47",
      "diagnosis": "...",
      "proposed_fix": "...",
      "status": "pending|approved|applied|skipped|fix_failed"
    }
  ]
}
```

---

### Acceptance Table Additions

Two new rows added to the acceptance table (Step 4):

| # | Criterion | Measurable |
|---|-----------|------------|
| 7 | Artifact scan completed | `grep "artifact_scan_complete" state.json` → `true` |
| 8 | No unapplied artifact fixes | `artifact_tasks[]` has zero entries with `status: "pending"` or `status: "fix_failed"` |

Skipped artifacts (`status: "skipped"`) do not fail acceptance — they surface as warnings in the final report.

---

### SKILL.md Changes

1. **New Step 5 block** (~30 lines) inserted between Step 4 and Loop Execution
2. **Loading trigger** for `references/artifact-validation.md` at Step 5 only
3. **Two new NEVER rules:**
   - NEVER fix a shared script without reporting which other skills reference it
   - NEVER mark artifact scan complete if any tasks remain `status: "pending"` or `status: "fix_failed"`
4. **Post-loop final report** gains one line: `Artifacts: N fixed | N skipped | N shared scripts affected`
5. **Resume path** (in `references/resume-guide.md`): if `artifact_scan_complete: false` on resume → re-run Step 5 from scratch

### New File

```
.aicodepath/skills/aicodepath-skill-improver/references/artifact-validation.md
```

Contains: full validation command table, artifact type taxonomy, shared-script detection patterns, fix templates per type.

---

## Files Changed

| File | Change |
|------|--------|
| `.aicodepath/skills/aicodepath-skill-improver/SKILL.md` | Add Step 5, 2 NEVER rules, final report line |
| `.aicodepath/skills/aicodepath-skill-improver/references/artifact-validation.md` | New — artifact taxonomy + validation commands |
| `.aicodepath/skills/aicodepath-skill-improver/references/resume-guide.md` | Add artifact_scan_complete: false resume branch |

---

## Success Criteria

- [ ] skill-improver Step 5 enumerates all artifacts in skill directory
- [ ] Shared scripts detected via SKILL.md body path scan
- [ ] Each artifact type validated with the correct command
- [ ] Failing artifacts diagnosed, proposed fixes presented to user before applying
- [ ] Shared script fixes include cross-skill impact report
- [ ] `state.json` tracks `artifact_tasks[]`, `artifact_scan_complete`, `artifact_health`
- [ ] Acceptance table has 2 new criteria (criteria 7 and 8)
- [ ] Skipped artifacts surface as warnings, not blockers
- [ ] `references/artifact-validation.md` offloads taxonomy detail
- [ ] Resume path handles `artifact_scan_complete: false` correctly
