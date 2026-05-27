# Cost & Time Model — Hook Hill-Climbing

Reference tables for end-to-end estimate calculation.
Loaded during setup when calculating the estimate. Not loaded during loop cycles.

---

## Hook-Specific Context

Hooks are code, not markdown. This changes the cost model in three important ways:

1. **Validation is functional, not behavioral.** A hook either exits with the right code or it doesn't. There is no "scenario simulation" equivalent — validation is a pipe test.
2. **Determinism.** Code changes are more predictable than skill rewrites. Gains are more consistent per cycle.
3. **Expected cycles to Grade A: 3–8.** Lower than skills (which take 8–15) because code has fewer ambiguous quality dimensions.

---

## Validation Modes

| Mode | Description | When to Use |
|------|-------------|-------------|
| **Dry-run** | Generate candidate hook, run syntax check (`node -c`), verify output schema against spec | Fast iteration: exploring structural fixes (D1, D4, D5) |
| **Live test** | Pipe actual inputs through the hook process, check exit codes and stdout JSON | Required for D2 (resilience), D3 (library compliance), D6 (code quality) |

**Dry-run sufficiency:** Dry-run is sufficient for D4 (output field validity) and D5 (registration checks) because these are static analysis tasks. For D1, D2, D3, D6, live test is required to catch runtime behavior.

---

## Time Per Cycle by Configuration

| Validation Mode | Web Search | Mutation Model | Time/Cycle |
|-----------------|------------|----------------|------------|
| Dry-run | Off | Haiku | ~1–2 min |
| Dry-run | Off | Sonnet | ~1–3 min |
| Dry-run | On | Haiku | ~2–3 min |
| Dry-run | On | Sonnet | ~2–4 min |
| Live test | Off | Haiku | ~2–4 min |
| Live test | Off | Sonnet | ~3–5 min |
| Live test | On | Sonnet | ~4–6 min |
| Live test | On | Opus | ~5–8 min |

Time breakdown per cycle:
```
Audit (6-dimension scoring):  ~20–40s
Dry-run syntax + schema:       ~10–20s  (dry-run) / ~30–60s (live test, ×4 inputs)
Web search (×2 queries):       ~15–30s  (if enabled — spec lookup or grep pattern)
Mutation (model dependent):    ~20–40s  (Haiku) / ~30–60s (Sonnet) / ~60–90s (Opus)
```

---

## Cost Per Cycle by Configuration

| Validation Mode | Web Search | Mutation Model | Per Cycle | 10 Cycles |
|-----------------|------------|----------------|-----------|-----------|
| Dry-run | Off | Haiku | ~$0.005 | ~$0.05 |
| Dry-run | Off | Sonnet | ~$0.01 | ~$0.10 |
| Dry-run | On | Haiku | ~$0.008 | ~$0.08 |
| Dry-run | On | Sonnet | ~$0.015 | ~$0.15 |
| Live test | Off | Sonnet | ~$0.015–0.025 | ~$0.15–0.25 |
| Live test | On | Sonnet | ~$0.02–0.03 | ~$0.20–0.30 |
| Live test | On | Opus | ~$0.05–0.08 | ~$0.50–0.80 |

Cost breakdown:
```
Hook audit (6 dimensions):    ~$0.003–0.008  per cycle (Sonnet reading + scoring)
Dry-run validation:            ~$0.000        (local process, no API call)
Live test (×4 inputs):         ~$0.000        (local process, no API call)
Web search (×2):               ~$0.001–0.003  per cycle (tool calls)
Mutation (Haiku):              ~$0.002–0.004  per cycle
Mutation (Sonnet):             ~$0.007–0.012  per cycle
Mutation (Opus):               ~$0.035–0.060  per cycle
```

---

## Estimate Calculation Formula

```
gap              = target_composite - baseline_composite
avg_gain         = 10  (midpoint of 8–12 points/cycle — hooks more deterministic than skills)
estimated_cycles = max(ceil(gap / avg_gain), 3)   (minimum 3 cycles)

time_per_cycle   = lookup table above (use chosen config)
estimated_time   = estimated_cycles × time_per_cycle

cost_per_cycle   = lookup table above (use chosen config)
estimated_cost   = estimated_cycles × cost_per_cycle
```

Show as range using min and max from the time/cost table cells.
Apply ± 30% variance note (hooks are more predictable than skills — tighter range).

---

## Cost Display Format

```
┌──────────────────────────────────────────────────────┐
│  END-TO-END ESTIMATE (Hook Improvement)              │
│  Baseline composite:  {baseline}/100                 │
│  Target:              90/100 (Grade A)               │
│  Gap:                 {gap} points                   │
│  Avg gain/cycle:      ~8–12 points                   │
│  Estimated cycles:    {min_cycles}–{max_cycles}      │
│  Validation mode:     {dry-run | live test}          │
│  Time per cycle:      ~{min_time}–{max_time} min     │
│  Estimated duration:  ~{min_dur}–{max_dur} min       │
│  Estimated cost:      ~${min_cost}–${max_cost}       │
│  ± 30% variance. Type "stop" to end at boundary.    │
└──────────────────────────────────────────────────────┘
```

---

## Choosing Validation Mode

**Use dry-run when:**
- Hook scoring ≤ 70 — structural problems dominate, live test not yet needed
- Primary issues are D4 (output fields) or D5 (registration) — static checks sufficient
- Fast iteration is more important than catching runtime edge cases

**Switch to live test when:**
- Hook scores ≥ 70 — structural fixes done, now hunting runtime issues
- D2 (error resilience) or D3 (library compliance) is the primary weak dimension
- Functional validation command from audit-rubric.md failed

**Recommended default:** Start with dry-run for the first 2–3 cycles. Switch to live test once baseline composite exceeds 65.

---

## When to Use Web Search

Enable web search when:
- The hook event type's spec fields may have changed (use: `https://docs.anthropic.com/en/docs/claude-code/hooks`)
- You need to verify a grep pattern is correct for a Node.js version
- The Claude Code changelog may have deprecated a pattern the hook uses

Disable web search when:
- Iterating on D6 (code quality) — purely structural, no spec lookup needed
- Iterating on D2 (error resilience) — patterns are stable and well-known
- Cost is a constraint and spec hasn't changed recently
