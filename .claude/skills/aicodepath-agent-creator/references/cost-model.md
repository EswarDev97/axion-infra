# Cost & Time Model

Reference tables for end-to-end estimate calculation shown at the start of a hill-climbing session.
Loaded during setup when calculating the estimate. Not loaded during loop cycles.

---

## Time Per Cycle by Configuration

Agents are simpler than skills (50–100 lines vs 100–500 for skills), so cycles are faster.

| Validation | Web Search | Mutation Model | Time/Cycle |
|------------|------------|----------------|------------|
| Simulation | Off | Haiku | ~0.5–1 min |
| Simulation | Off | Sonnet | ~1–2 min |
| Simulation | On | Haiku | ~1–2 min |
| Simulation | On | Sonnet | ~2–3 min |
| Genuine (Haiku) | Off | Haiku | ~1–2 min |
| Genuine (Haiku) | Off | Sonnet | ~2–3 min |
| Genuine (Haiku) | On | Sonnet | ~3–4 min |
| Genuine (Haiku) | On | Opus | ~4–6 min |

Time breakdown per cycle:
```
Agent audit evaluation:       ~15–30s
Behavioral (×3 scenarios):    ~30–60s  (simulation) / ~60–120s (genuine Haiku)
Web search (×2 queries):      ~15–25s  (if enabled)
Mutation (model dependent):   ~15–30s  (Haiku) / ~20–40s (Sonnet) / ~40–80s (Opus)
```

Note: Behavioral validation for agents uses "delegation accuracy" — did the agent correctly route the task to the right specialist or output format? This is simpler than skill rationalization resistance testing.

---

## Cost Per Cycle by Configuration

| Validation | Web Search | Mutation Model | Per Cycle | 10 Cycles |
|------------|------------|----------------|-----------|-----------|
| Simulation | Off | Haiku | ~$0.005 | ~$0.05 |
| Simulation | Off | Sonnet | ~$0.01 | ~$0.10 |
| Simulation | On | Haiku | ~$0.008 | ~$0.08 |
| Simulation | On | Sonnet | ~$0.015 | ~$0.15 |
| Genuine (Haiku) | Off | Sonnet | ~$0.015–0.025 | ~$0.15–0.25 |
| Genuine (Haiku) | On | Sonnet | ~$0.020–0.030 | ~$0.20–0.30 |
| Genuine (Haiku) | On | Opus | ~$0.050–0.080 | ~$0.50–0.80 |

Cost breakdown:
```
Agent audit:                  ~$0.003–0.006 per cycle (Sonnet reading + scoring)
Behavioral simulation:        ~$0.000        (same session, no additional call)
Behavioral genuine (×3):      ~$0.001–0.004  per cycle (Haiku × 3 scenarios)
Web search (×2):              ~$0.001–0.002  per cycle (tool calls)
Mutation (Haiku):             ~$0.001–0.003  per cycle
Mutation (Sonnet):            ~$0.005–0.010  per cycle
Mutation (Opus):              ~$0.025–0.050  per cycle
```

---

## Estimate Calculation Formula

```
gap              = target_composite - baseline_composite
avg_gain         = 10  (midpoint of 8–12 points/cycle — agents converge faster than skills)
estimated_cycles = max(ceil(gap / avg_gain), 2)   (minimum 2 cycles)

time_per_cycle   = lookup table above (use chosen config)
estimated_time   = estimated_cycles × time_per_cycle

cost_per_cycle   = lookup table above (use chosen config)
estimated_cost   = estimated_cycles × cost_per_cycle
```

**Agent-specific convergence data**:
- Agents are 50–100 lines — mutations are faster to generate and validate
- Expected cycles to Grade A (90+): **3–7** (vs 5–15 for skills)
- Avg gain per cycle: **~8–12 points** (vs 5–8 for skills)
- Most agents converge in 3–5 cycles when starting from Grade C (70–79)
- D4 (Integration) is often a one-time fix, not iterative — adjust estimates when D4 is the only gap

Show as range using min and max from the time/cost table cells.
Apply ± 30% variance note — agents are more predictable than skills (lower variance).

---

## Cost Display Format

```
┌──────────────────────────────────────────────────────┐
│  END-TO-END ESTIMATE                                 │
│  Baseline composite:  {baseline}/100                 │
│  Target:              90/100 (Grade A)               │
│  Gap:                 {gap} points                   │
│  Avg gain/cycle:      ~8–12 points                  │
│  Estimated cycles:    {min_cycles}–{max_cycles}      │
│  Time per cycle:      ~{min_time}–{max_time} min     │
│  Estimated duration:  ~{min_dur}–{max_dur} min       │
│  Estimated cost:      ~${min_cost}–${max_cost}       │
│  ± 30% variance. Type "stop" to end at boundary.    │
└──────────────────────────────────────────────────────┘
```

For genuine subagent mode: show the cost breakdown table alongside before confirming.

---

## D4 Integration Note

D4 (Integration Completeness) is a registration task, not a content task. When D4 is the only low-scoring dimension:
- No mutation cycle needed — it is a one-time fix
- Run the registration checklist directly (see `registration-checklist.md`)
- After completing registration, re-score D4 manually (no loop needed)
- This saves 3–5 cycles when the agent body is already high quality

Adjusted estimate when D4 is excluded from gap:
```
integration_gap  = D4_target (15) - D4_current
content_gap      = total_gap - integration_gap
content_cycles   = max(ceil(content_gap / avg_gain), 1)
total_cycles     = content_cycles + 1  (one cycle for registration verification)
```
