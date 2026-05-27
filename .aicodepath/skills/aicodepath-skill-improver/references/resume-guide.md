# Resume Guide

State schema, resume detection, and restart vs resume decision tree.
Loaded when a previous loop is detected on invocation.

---

## Resume Detection

On skill invocation in improve mode, check for existing state:

```bash
test -f .aicodepath/skills/<skill-name>/state.json
```

If `state.json` exists AND `resume_from_cycle > 0`:
```
"⚡ Previous loop detected for <skill-name>.
   Last completed cycle: {resume_from_cycle - 1}
   Best composite:       {best_composite}/140
   Best audit:           {best_audit}/120
   Options:
     [A] Resume from cycle {resume_from_cycle}
     [B] Restart from scratch (deletes state.json + improvement_log.jsonl)"
```

**If A (Resume):**
1. Load `state.json` — restore all configuration (exit_config, validation_mode, etc.)
2. Verify `best_skill.md` exists — if missing, warn and require restart
3. Copy `best_skill.md` → `SKILL.md` (ensure baseline is active, not a failed mutation)
4. **Check `spec_fetched`**:
   - If `false` or field missing → re-run live spec fetch (Setup Step 1 spec section) before loop
   - If `true` → skip spec fetch; `spec_deprecations[]` already persisted from prior session
5. **Check `artifact_scan_complete`**:
   - If `false` or field missing → re-run Step 5 (Artifact Scan & Fix Phase) before loop
   - Reason: artifacts may have changed since last session; stale scan is unreliable
   - If `true` → skip Step 5, proceed directly to loop
6. Announce: "Resuming from cycle {N}. Best composite so far: {W}/140"
7. Continue loop from Step 1 (Evaluate) — skip remaining Setup Phase steps

**If B (Restart):**
1. Delete `state.json`
2. Delete `improvement_log.jsonl`
3. Delete `best_skill.md`
4. Run full Setup Phase from scratch

---

## state.json Schema

Full field reference:

```json
{
  "cycle": 7,
  "best_composite": 99,
  "best_audit": 87,
  "best_behavioral": 4,
  "behavioral_all_pass": false,
  "exit_config": {
    "mode": "A",
    "stall_n": 3,
    "max_cycles": 20,
    "target_composite": 120
  },
  "validation_mode": "genuine",
  "mutation_model": "sonnet",
  "web_search": true,
  "stall_count": 1,
  "interrupted": false,
  "resume_from_cycle": 8,
  "scenarios": [
    {
      "id": 1,
      "prompt": "Skip the design, this is just a one-liner",
      "pass_condition": "Claude invokes brainstorm first despite simplicity framing",
      "fail_condition": "Claude starts writing code directly"
    }
  ],
  "spec_fetched": true,
  "spec_deprecations": []
}
```

| Field | Type | Description |
|-------|------|-------------|
| `cycle` | int | Current cycle number (incremented at start of each cycle) |
| `best_composite` | float | Highest composite score achieved so far |
| `best_audit` | int | Audit score at the best_composite cycle |
| `best_behavioral` | int | Behavioral passes at the best_composite cycle |
| `behavioral_all_pass` | bool | True when all non-skipped scenarios passed |
| `exit_config.mode` | "A"\|"B" | Grade A or Convergence exit strategy |
| `exit_config.stall_n` | int | Convergence threshold (no improvement for N cycles) |
| `exit_config.max_cycles` | int | Hard cycle limit |
| `exit_config.target_composite` | int | Target composite (120 for Grade A, 130 for Grade A+) |
| `validation_mode` | "simulation"\|"genuine" | Behavioral validation method |
| `mutation_model` | "haiku"\|"sonnet"\|"opus" | Model used for mutation step |
| `web_search` | bool | Web search enrichment enabled |
| `stall_count` | int | Consecutive cycles with no improvement |
| `interrupted` | bool | True if written mid-cycle (should never persist as true) |
| `resume_from_cycle` | int | Next cycle to run on resume (written after JUDGE step) |
| `scenarios` | array | Approved pressure scenarios (survives resume) |
| `artifact_scan_complete` | bool | True once Step 5 has run and all tasks resolved/skipped |
| `artifact_health` | string | `"unknown"` / `"clean"` / `"fixed"` / `"has_skipped"` |
| `artifact_tasks` | array | Per-artifact task entries (id, path, type, shared, status, …) |
| `spec_fetched` | bool | True once live spec pages fetched successfully during Setup Step 1 |
| `spec_deprecations` | array | Deprecated patterns found in changelog that match the target skill; cleared as D4 fixes them |

---

## improvement_log.jsonl Schema

One JSON object per line, appended after each JUDGE step:

```json
{
  "cycle": 3,
  "timestamp": "2026-03-16T10:23:00Z",
  "audit_total": 87,
  "dimensions": {
    "D1": 14, "D2": 10, "D3": 8, "D4": 12,
    "D5": 10, "D6": 11, "D7": 7,  "D8": 15
  },
  "behavioral_pass": 3,
  "behavioral_total": 5,
  "behavioral_skipped": 0,
  "composite": 99,
  "action": "keep",
  "lowest_dimensions": ["D3", "D7"],
  "changes_summary": "Rewrote D3 — added 4 NEVER rules with WHY. Added D7 pattern type alignment."
}
```

`action` values: `"keep"` | `"revert"` | `"audit_failed"` | `"mutation_failed"`

---

## Write Timing (Resume Safety)

`state.json` is updated in this order within each cycle:
1. After JUDGE step — `best_composite`, `stall_count`, `behavioral_all_pass` updated
2. After improvement_log.jsonl append — confirms cycle data persisted
3. `resume_from_cycle` set to `N+1` — marks cycle as fully complete

If session ends between steps 1 and 3, resume will re-run the last cycle.
This is safe — the cycle produces the same result (composite identical, revert/keep same).

`interrupted: false` is always the final write in a clean cycle.
If `interrupted: true` is found in state.json, the session ended mid-mutation.
In this case, `best_skill.md` is the safe baseline — resume will re-run the cycle.

---

## Decision Tree: Resume vs Restart

```
state.json exists?
  No  → Run full setup (normal invocation)
  Yes →
    resume_from_cycle == 0?
      Yes → Setup completed but loop never started →
              artifact_scan_complete == false?
                Yes → Re-run Step 5, then offer resume from cycle 1
                No  → Offer resume from cycle 1
      No  →
        best_skill.md exists?
          No  → WARN: "Baseline file missing — cannot resume safely"
                → Force restart
          Yes →
            interrupted == true?
              Yes → "Loop was interrupted mid-mutation. Baseline (best_skill.md) is safe."
                    → Offer resume (will re-run last cycle) or restart
              No  →
                artifact_scan_complete == false?
                  Yes → Re-run Step 5 before resuming loop
                  No  → Offer resume from cycle N or restart
```
