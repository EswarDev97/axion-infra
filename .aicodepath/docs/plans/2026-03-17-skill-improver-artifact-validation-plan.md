# Implementation Plan: skill-improver Artifact Scan & Fix Phase

**Goal**: Add a pre-loop artifact validation and fix phase to `aicodepath-skill-improver` so it evaluates all skill artifacts (scripts, references, templates, shared generators) — not just `SKILL.md`.
**Design doc**: `.aicodepath/docs/plans/2026-03-17-skill-improver-artifact-validation-design.md`
**Estimated tasks**: 6
**Tech stack**: Markdown (SKILL.md authoring), Bash (validation commands), JSON (state.json schema)

## Architecture Notes

- New Step 5 inserted between Step 4 (Acceptance Table + State Init) and Loop Execution
- Artifacts enumerated per-skill-dir, excluding meta-files; shared scripts detected via SKILL.md body path scan
- Fix workflow: diagnose → propose → track in state.json → user approval → apply → re-validate
- Shared scripts fixed in-place with cross-skill impact report
- Skipped artifacts surface as warnings in acceptance gate, not hard blockers
- All taxonomy detail offloaded to `references/artifact-validation.md` (loaded on-demand at Step 5 only)

## Tasks

| Task | Content | DoD | Depends | Status |
|------|---------|-----|---------|--------|
| 1. Create `references/artifact-validation.md` | New file at `.aicodepath/skills/aicodepath-skill-improver/references/artifact-validation.md`. Contains: 7-type artifact taxonomy table (py/js/sh/md/json/yaml/other), exact validation commands per type, shared-script detection patterns (regex for `../generators/`, `.aicodepath/generators/`, absolute paths), fix template per type | `grep -c "python3 -m py_compile\|node --check\|bash -n" references/artifact-validation.md` → ≥ 3; file has all 7 type rows | — | TODO |
| 2. Update `references/resume-guide.md` | Add `artifact_scan_complete: false` resume branch to Decision Tree section. Add 3 new fields to state.json schema table: `artifact_scan_complete` (bool), `artifact_health` (string), `artifact_tasks` (array). Add resume branch: if `artifact_scan_complete: false` → re-run Step 5 from scratch | `grep "artifact_scan_complete" references/resume-guide.md` exits 0 | 1 | TODO |
| 3. Add Step 5 to `SKILL.md` | Insert `### Step 5: Artifact Scan & Fix Phase` block between Step 4 and `## Loop Execution`. Block covers: enumerate artifacts excluding meta-files, detect shared scripts, run per-type validation, diagnose→propose→track→present→apply fix workflow, emit post-phase summary, loading trigger for `references/artifact-validation.md` | `grep "Step 5" SKILL.md` exits 0; `grep "artifact-validation.md" SKILL.md` exits 0 | 1 | TODO |
| 4. Add acceptance criteria 7 & 8 to `SKILL.md` | In acceptance table (Step 4 section), add two rows: criterion 7 (`artifact_scan_complete` → true) and criterion 8 (no `pending`/`fix_failed` in `artifact_tasks[]`) | `grep "artifact_scan_complete\|fix_failed" SKILL.md \| wc -l` → ≥ 2 | 3 | TODO |
| 5. Add 2 NEVER rules to `SKILL.md` | In `## NEVER` section append: (a) NEVER fix a shared script without listing which other skills reference it; (b) NEVER set `artifact_scan_complete: true` while any `artifact_tasks[]` has `status: "pending"` or `"fix_failed"` | `grep -c "shared script\|artifact_scan_complete.*true" SKILL.md` → ≥ 2 | 3 | TODO |
| 6. Update final report format in `SKILL.md` | In `## Post-Loop Steps` final report block, add line: `Artifacts: N fixed \| N skipped \| N shared scripts affected` | `grep "Artifacts:" SKILL.md` exits 0 | 3 | TODO |
