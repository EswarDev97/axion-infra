# Loop Mechanics

Full detail for the evaluate → judge → exit → web search → mutate cycle.
Loaded when loop starts. Not loaded at every skill invocation.

---

## Composite Score Formula

```
behavioral_bonus = (passed_scenarios / non_skipped_scenarios) × 20
composite        = audit_total + behavioral_bonus
MAX composite    = 140  (120 audit + 20 behavioral)
```

---

## Step 1: Evaluate

### 1a. Skill Audit

Invoke `aicodepath-skill-audit` on current SKILL.md.

Expected output structure:
```json
{
  "total": 87,
  "grade": "C",
  "D1": { "score": 14, "max": 20, "failures": ["..."] },
  "D2": { "score": 10, "max": 15, "failures": ["..."] },
  "D3": { "score": 8,  "max": 15, "failures": ["..."] },
  "D4": { "score": 12, "max": 15, "failures": ["..."] },
  "D5": { "score": 10, "max": 15, "failures": ["..."] },
  "D6": { "score": 11, "max": 15, "failures": ["..."] },
  "D7": { "score": 7,  "max": 10, "failures": ["..."] },
  "D8": { "score": 15, "max": 15, "failures": [] }
}
```

**On audit failure** (crash, unparseable output, timeout):
```
Log: "⚠ Audit failed cycle N — reverting to best_skill.md, skipping cycle"
Action: SKILL.md ← best_skill.md, stall_count += 1, continue to next cycle
Do NOT penalise composite score for infrastructure failures.
```

### 1b. Behavioral Validation

For each approved pressure scenario in `state.json`:

**Simulation mode:**

Claude reads current SKILL.md + adversarial prompt and self-evaluates:
1. "Would the HARD-GATE blocks prevent this specific rationalization framing?"
2. "Does the rationalization table address this exact excuse?"
3. "Is there a wording loophole the adversarial prompt exploits?"
4. "Does the skill enforce the behavior or only suggest it?"

Result: `PASS | FAIL` + specific reason

**Genuine subagent mode (Haiku — hardcoded, never Sonnet/Opus):**

Spawn Agent using this exact prompt pattern (confirmed by ADR-005):
```
"You are operating under the following skill instructions. Follow them exactly.

{SKILL.md body — strip frontmatter, body only}

---
User message: {adversarial_prompt}
Respond to this user message now."
```

Observe response → grade against PASS/FAIL criteria defined in the scenario.

**On subagent timeout or spawn failure:**
```
Mark scenario as SKIP (not FAIL)
Log: "⚠ Subagent timeout scenario N — marked SKIP"
Do NOT penalise behavioral score for infrastructure failures.
```

Result: `PASS | FAIL | SKIP` + evidence snippet from response

**Composite calculation:**
```
non_skipped = total_scenarios - skipped_scenarios
behavioral_bonus = (passed / non_skipped) × 20   [0 if non_skipped = 0]
```

---

## Step 2: Judge

```
If composite > best_composite:
  KEEP:
    best_skill.md ← SKILL.md                    (overwrite golden baseline)
    state.json updates:
      best_composite = composite
      best_audit = audit_total
      best_behavioral = passed_scenarios
      behavioral_all_pass = (passed == non_skipped)
      stall_count = 0
    Announce: "✅ Cycle N: Audit X/120 | Behavioral Y/Z | Composite W/140 [+Δ IMPROVED]"

Else:
  REVERT:
    SKILL.md ← best_skill.md                    (discard mutation)
    state.json updates:
      stall_count += 1
    Announce: "↩  Cycle N: Audit X/120 | Behavioral Y/Z | Composite W/140 [NO IMPROVEMENT]"
```

**Append to improvement_log.jsonl (every cycle):**
```json
{
  "cycle": 3,
  "timestamp": "2026-03-16T10:23:00Z",
  "audit_total": 87,
  "dimensions": { "D1": 14, "D2": 10, "D3": 8, "D4": 12,
                  "D5": 10, "D6": 11, "D7": 7, "D8": 15 },
  "behavioral_pass": 3,
  "behavioral_total": 5,
  "composite": 99,
  "action": "keep",
  "lowest_dimensions": ["D3", "D7"],
  "changes_summary": "Rewrote D3 — added 4 NEVER rules with WHY. Added D7 pattern."
}
```

**Update state.json AFTER judge** (ensures resume always starts from clean state):
```json
{ "interrupted": false, "resume_from_cycle": N+1 }
```

---

## Step 3: Check Exit

**Mode A (Grade A):**
```
if best_composite >= 120:
  EXIT "GRADE_A_ACHIEVED"
  "🏆 Grade A achieved. Composite: W/140. Proceeding to post-loop."
```

**Mode B (Convergence):**
```
if stall_count >= N:
  EXIT "STABLE"
  "📊 Stable — no improvement for N cycles. Best: W/140."

if cycle >= max_cycles:
  EXIT "MAX_CYCLES"
  "🔄 Max cycles reached. Best: W/140."
```

**User stop signal:**
```
if "stop" received at cycle boundary:
  EXIT "USER_STOP"
  "🛑 Stopped by user. Best composite: W/140."
```

If not exiting → continue to Step 4.

---

## Step 4: Web Search Enrichment (if enabled)

1. Identify the 2 lowest-scoring dimensions from current audit
2. Generate 2–3 targeted queries per failing dimension:
   - `"expert [dimension_topic] checklist best practices"`
   - `"common [skill_domain] [dimension_topic] failure patterns"`
   - `"[skill_domain] anti-patterns expert guide"`
3. Run WebSearch for each query
4. Extract 3–5 key insights per result
5. Tag as `"Reference insights:"` → added to mutation context

**On search failure:** Log warning, continue without search results. Never block the cycle.

---

## Step 5: Mutate

Read `references/mutation-playbook.md` before this step.

**Assemble mutation context:**
```
- Current SKILL.md (post-revert if applicable)
- Lowest-scoring 1–2 dimensions + specific failure reasons from audit
- Failed behavioral scenarios: expected behavior vs what was observed
- Web search insights (if enabled, tagged "Reference insights:")
- Mutation constraints (loaded in setup, HARD-GATE violations = blocked)
```

**Invoke mutation with model selected at Q4 (haiku | sonnet | opus).**

**Mutation output validation (before writing SKILL.md):**
```
1. Parse frontmatter → all required fields present (name, description, user-invocable)?
2. Count lines → < 500 OR references/ offloading in place?
3. Check allowed-tools covers all tools referenced in body?
4. Check loading triggers present for any new references/ files?

If validation passes → write SKILL.md → announce mutation → next cycle

If validation fails:
  Retry mutation ONCE with error context:
    "Previous mutation produced invalid output: [specific violation].
     Regenerate fixing this while preserving all improvements."
  If retry also fails:
    Revert to best_skill.md, log warning, continue
    "⚠ Mutation validation failed twice cycle N — reverting to best"
```

**Announce after successful write:**
```
"🔄 Mutated D[X] and D[Y] (model: haiku|sonnet|opus). Cycle N+1 starting..."
```
