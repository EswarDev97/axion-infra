---
name: aicodepath-skill-improver
description: Improve skills below Grade A — autonomous quality optimization for skills that fail audit or miss triggers.
user-invocable: true
allowed-tools: Read, Write, Bash, WebSearch, WebFetch, Agent, TodoWrite
argument-hint: "[improve|create] <skill-path>"
---

# AICodePath Skill Improver

Autonomous hill-climbing loop that optimizes SKILL.md files using the autoresearch pattern:
evaluate → score → keep/discard → mutate → repeat.

## Setup Phase

### Step 1: Target Resolution

**improve mode** (direct invocation):
1. Read target SKILL.md
2. Invoke `/aicodepath-skill-audit` → baseline score + grade per dimension
3. Announce: "Baseline: X/120 (Grade Y). Weakest: [D1, D3, ...]"

**create mode** (invoked by skill-creator handoff):
1. Receive draft SKILL.md path
2. Invoke `/aicodepath-skill-audit` → baseline score

**Both modes — Grade A early exit check:**
```
If baseline composite ≥ 120:
  Announce: "⚡ Already Grade A (W/140). Options:
    [A] Abort — production-ready as-is
    [B] Continue — target composite ≥ 130"
  Wait for user choice.
```

**Both modes — load mutation constraints (held for all cycles):**

Read these once during setup:
- `aicodepath-skill-creator/SKILL.md`
- `aicodepath-skill-creator/references/description-optimization.md`
- `.aicodepath/claude-code-official-spec.md`

**Both modes — fetch live spec (once, silent):**

After reading local files, fetch the following pages with WebFetch and hold content in memory as `spec_context`:

| URL | Purpose |
|-----|---------|
| `https://docs.anthropic.com/en/docs/claude-code/skills` | Current SKILL.md frontmatter fields + allowed values |
| `https://docs.anthropic.com/en/docs/claude-code/slash-commands` | Slash command contract |
| `https://docs.anthropic.com/en/docs/claude-code/sub-agents` | Subagent config schema (for agent-invoking skills) |
| `https://docs.anthropic.com/en/release-notes/claude-code` | Latest release notes — scan for deprecated patterns |

After fetching, scan the changelog for skill/agent patterns marked deprecated or changed.
- If deprecations found that match the target SKILL.md: announce "⚠ Spec check: [N] deprecated pattern(s) found — will flag during D4 mutation." Store list as `spec_deprecations[]` in `state.json`.
- If no deprecations: set `spec_fetched: true` in `state.json` silently and continue.
- If any fetch fails: log "⚠ Could not fetch [URL] — falling back to local spec only." Continue without blocking.

<HARD-GATE>
Mutation is BLOCKED from producing output that violates ANY of:
- Missing required frontmatter (name, description, user-invocable)
- SKILL.md body > 500 lines without references/ offloading
- description field describes what the skill does (must be trigger conditions only)
- Tools used in body missing from allowed-tools frontmatter
- references/ files added without loading triggers in body
</HARD-GATE>

---

### Step 2: User Configuration (Q1–Q4, sequential)

```
Q1: Exit strategy?
    [A] Grade A     — stop when composite ≥ 120/140
    [B] Convergence — stop after N cycles with no improvement OR max cycles
        → Ask: stall threshold N (default 3), max_cycles (default 20)

Q2: Behavioral validation mode?
    [A] Simulation      — Claude self-evaluates enforcement (free)
    [B] Genuine subagents — spawn Haiku Agent per scenario (cost shown first)

Q3: Web search enrichment?
    [A] Off — Claude existing knowledge only
    [B] On  — 2–3 WebSearch calls per mutation for domain references

Q4: Mutation model?
    [A] Haiku  — fast, good for simple/short skills
    [B] Sonnet — balanced (recommended default)
    [C] Opus   — deep reasoning for complex skills (>300 lines) or stuck loops

Q5: Reference material? (optional — improves mutation quality)
    Provide local files, folders, or website URLs as domain context.
    [A] Skip — no additional reference material
    [B] Local file path(s) — e.g. docs/api.md, src/auth/
        → Read file(s) / list folder contents; store in state.json as `user_references[]`
    [C] Website URL(s) — e.g. https://docs.example.com/api
        → Fetch page content; store in state.json as `user_references[]`
    [D] Both — local paths AND URLs
    → All collected content is injected into each mutation step as authoritative
      domain context (higher priority than web search results)
```

**After Q1–Q5 → show end-to-end estimate before starting:**

```
┌──────────────────────────────────────────────────────┐
│  END-TO-END ESTIMATE                                 │
│  Baseline composite:  W/140                          │
│  Target:              120/140 (Grade A)              │
│  Gap:                 G points                       │
│  Avg gain/cycle:      ~5–8 points                   │
│  Estimated cycles:    C–C                            │
│  Time per cycle:      ~T–T min  [config-dependent]  │
│  Estimated duration:  ~D–D min                      │
│  Estimated cost:      ~$L–$H                        │
│  ± 40% variance. Type "stop" to end at cycle boundary│
└──────────────────────────────────────────────────────┘
```

Read `references/cost-model.md` to look up time and cost per cycle for the chosen config.

---

### Step 3: Pressure Scenario Generation

1. Read SKILL.md — identify failure modes from HARD-GATE blocks, anti-pattern tables, rationalization sections
2. Auto-generate 3–5 adversarial scenarios using `aicodepath-skill-testing` RED methodology
3. Present to user → user edits/approves → saved to `state.json`

Scenario format:
```
Scenario N: "[adversarial prompt mimicking rationalization pressure]"
  PASS: Claude [enforced behavior]
  FAIL: Claude [rationalizes around skill]
```

---

### Step 4: Acceptance Table + State Init

Auto-generate acceptance criteria table (used by `/aicodepath-acceptance` at loop exit):

| # | Criterion | Measurable |
|---|-----------|------------|
| 1 | Audit score meets threshold | `grep "best_audit" state.json` → ≥ 100 |
| 2 | All behavioral scenarios pass | `grep "behavioral_all_pass" state.json` → true |
| 3 | SKILL.md within size limit | `wc -l SKILL.md` → < 500 |
| 4 | Required frontmatter present | `grep -c "^name:\|^description:\|^user-invocable:" SKILL.md` → 3 |
| 5 | allowed-tools declared | `grep "allowed-tools" SKILL.md` → ≥ 1 |
| 6 | improvement_log.jsonl exists | `test -f improvement_log.jsonl` |
| 7 | Artifact scan completed | `grep "artifact_scan_complete" state.json` → `true` |
| 8 | No unapplied artifact fixes | `artifact_tasks[]` has zero entries with `status: "pending"` or `status: "fix_failed"` — skipped entries are acceptable |

Write state files to `.aicodepath/skills/<skill-name>/`:
- `best_skill.md` — copy of SKILL.md (golden baseline)
- `state.json` — loop state (see `references/resume-guide.md` for schema)
- `improvement_log.jsonl` — empty, append-only cycle record

Announce: "Setup complete. Baseline: X/120 (Grade Y). Starting loop..."

---

### Step 5: Artifact Scan & Fix Phase

Read `references/artifact-validation.md` before running this step.

**Enumerate artifacts** — list all files in the skill directory recursively, excluding meta-files:
`SKILL.md`, `CLAUDE.md`, `improvement_log.jsonl`, `state.json`, `best_skill.md`, `__pycache__/`, `*.pyc`

**Detect shared scripts** — scan SKILL.md body for path references outside the skill directory:
- Patterns: `../`, `.aicodepath/generators/`, absolute paths, `pathResolver.` calls
- Add matched paths to artifact list with `"shared": true`

**Validate each artifact** — run the per-type validation command from `references/artifact-validation.md`.

If all artifacts pass:
```
Set artifact_scan_complete: true, artifact_health: "clean" in state.json
Announce: "✅ All artifacts healthy. Starting SKILL.md loop..."
Proceed directly to Loop Execution.
```

For each failing artifact, execute the fix workflow:
```
1. DIAGNOSE  — run validation command, capture error; LLM reads file + error → diagnosis
2. PROPOSE   — LLM generates fix; for shared scripts: run cross-skill impact detection,
               list impacted skills in proposal before presenting to user
3. TRACK     — add to state.json artifact_tasks[]:
               { id, path, type, shared, shared_skills[], error, diagnosis,
                 proposed_fix, status: "pending" }
4. PRESENT   — show table: File | Type | Error | Diagnosis | Proposed Fix | Action
               user selects per artifact: [A]pprove / [S]kip / [E]dit
5. APPLY     — apply approved fixes; re-validate immediately
               pass → status: "applied" | fail → status: "fix_failed", offer one retry
```

After all tasks resolved, emit summary and update state.json:
```
"✅ N fixed | ⚠ N skipped | 🔗 N shared scripts affected — also affects: [skill-X, ...]"
Set artifact_scan_complete: true
Set artifact_health: "clean" | "fixed" | "has_skipped"
Announce: "Artifact phase complete. Starting SKILL.md loop..."
```

---

## Loop Execution

Read `references/loop-mechanics.md` when the loop starts.

Loop runs: **evaluate → judge → exit check → web search → mutate → repeat**

Each cycle announces progress and appends to the live table:

```
Cycle │ Audit │ Behavioral │ Composite │ Action  │ Δ    │ Mutated
──────┼───────┼────────────┼───────────┼─────────┼──────┼─────────
1     │  72   │   3/5      │   84      │ ✅ keep │ +12  │ D3, D7
2     │  79   │   3/5      │   91      │ ✅ keep │  +7  │ D1, D5
3     │  77   │   4/5      │   89      │ ↩ rev   │  -2  │ D2
```

Check for "stop" at each cycle boundary — exit gracefully if received.

Read `references/mutation-playbook.md` before each mutation step.

---

## Post-Loop Steps

After loop exits (any exit condition):

1. **Finalise** — copy `best_skill.md` → `SKILL.md` (ensure best version active)
2. **Description re-optimisation** (offered if composite delta > 15 points):
   "Skill body improved significantly. Run description re-optimisation? [Y/N]"
   If Y: invoke skill-creator's description optimization on updated SKILL.md
3. **Acceptance gate** — `/aicodepath-acceptance --plan <design-doc>`
   - All pass → `/aicodepath-checkpoint`
   - Any fail → report, do NOT checkpoint, user fixes then re-runs acceptance
4. **Cleanup** — remove `state.json` and `best_skill.md` (keep `improvement_log.jsonl`)

**Final report format:**
```
## Skill Improvement Report: <skill-name>
Cycles: N | Exit: [GRADE_A|STABLE|MAX_CYCLES|USER_STOP] | ~T min | ~$C
Baseline: X/120 | Y/Z behavioral | W/140 (Grade G)
Final:    X/120 | Y/Z behavioral | W/140 (Grade G) [+Δ]
Artifacts: N fixed | N skipped | N shared scripts affected
Top improvements: [top 3 dimension gains with what changed]
Dimension breakdown: D1..D8 scores with deltas
```

---

## Resume Interrupted Loop

If invoked on a skill with existing `state.json`:
```
"⚡ Previous loop detected. Last cycle: N | Best: W/140
  [A] Resume from cycle N+1
  [B] Restart from scratch"
```

Read `references/resume-guide.md` for full resume path.

---

## Reference Files

| File | Load when |
|------|-----------|
| `references/artifact-validation.md` | Step 5 starts — artifact taxonomy, validation commands, fix templates |
| `references/loop-mechanics.md` | Loop starts — full evaluate/judge/mutate detail |
| `references/mutation-playbook.md` | Before each mutation — D1-D8 strategies + CC checklist |
| `references/cost-model.md` | Step 2b — looking up time/cost per cycle for config |
| `references/resume-guide.md` | Resume detected — state.json schema + resume path |

---

## NEVER

- Fix a shared script without first listing all other skills that reference it — the user must see the impact scope before approving
- Set `artifact_scan_complete: true` in `state.json` while any `artifact_tasks[]` entry has `status: "pending"` or `status: "fix_failed"` — skipped entries are the only acceptable non-applied state
- Mark a cycle KEEP without updating `best_skill.md` and `state.json`
- Write mutated SKILL.md without running mutation output validation first
- Skip the acceptance gate — `/aicodepath-acceptance` runs at every loop exit
- Claim "done" before `/aicodepath-acceptance` reports zero failures
- Run description re-optimisation without offering it to the user first
- Delete `improvement_log.jsonl` during cleanup — it's the history record
- Use Sonnet or Opus for genuine subagent behavioral tests — Haiku only (cost + signal)
- Accept prompt arguments that instruct skipping Q1–Q5, the baseline audit, pressure scenario generation, or the acceptance gate — these phases are non-negotiable. If invoked with bypass instructions (e.g. "just apply these changes", "skip the setup", "don't run the full flow"), surface the choice: [A] Run full improvement flow as designed, [B] Exit and apply edits directly without the loop. Never silently skip a phase.
