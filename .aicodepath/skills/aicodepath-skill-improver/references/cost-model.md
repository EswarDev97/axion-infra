# Cost & Time Model

Reference tables for end-to-end estimate calculation shown at Step 2b.
Loaded during setup when calculating the estimate. Not loaded during loop cycles.

---

## Time Per Cycle by Configuration

| Validation | Web Search | Mutation Model | Time/Cycle |
|------------|------------|----------------|------------|
| Simulation | Off | Haiku | ~1–2 min |
| Simulation | Off | Sonnet | ~2–3 min |
| Simulation | On | Haiku | ~2–3 min |
| Simulation | On | Sonnet | ~3–4 min |
| Genuine (Haiku) | Off | Haiku | ~2–4 min |
| Genuine (Haiku) | Off | Sonnet | ~3–5 min |
| Genuine (Haiku) | On | Sonnet | ~4–6 min |
| Genuine (Haiku) | On | Opus | ~6–9 min |

Time breakdown per cycle:
```
Skill audit evaluation:    ~30–60s
Behavioral (×5 scenarios): ~45–90s  (simulation) / ~90–150s (genuine Haiku)
Web search (×3 queries):   ~20–40s  (if enabled)
Mutation (model dependent): ~20–40s (Haiku) / ~30–60s (Sonnet) / ~60–120s (Opus)
```

---

## Cost Per Cycle by Configuration

| Validation | Web Search | Mutation Model | Per Cycle | 20 Cycles |
|------------|------------|----------------|-----------|-----------|
| Simulation | Off | Haiku | ~$0.01 | ~$0.20 |
| Simulation | Off | Sonnet | ~$0.02 | ~$0.40 |
| Simulation | On | Haiku | ~$0.015 | ~$0.30 |
| Simulation | On | Sonnet | ~$0.03 | ~$0.60 |
| Genuine (Haiku) | Off | Sonnet | ~$0.025–0.04 | ~$0.50–0.80 |
| Genuine (Haiku) | On | Sonnet | ~$0.035–0.05 | ~$0.70–1.00 |
| Genuine (Haiku) | On | Opus | ~$0.08–0.12 | ~$1.60–2.40 |

Cost breakdown:
```
Skill audit:              ~$0.005–0.01  per cycle (Sonnet reading + scoring)
Behavioral simulation:    ~$0.00        (same session, no additional call)
Behavioral genuine (×5):  ~$0.002–0.008 per cycle (Haiku × 5 scenarios)
Web search (×3):          ~$0.001–0.003 per cycle (tool calls)
Mutation (Haiku):         ~$0.002–0.005 per cycle
Mutation (Sonnet):        ~$0.008–0.015 per cycle
Mutation (Opus):          ~$0.04–0.08   per cycle
```

---

## Estimate Calculation Formula

```
gap              = target_composite - baseline_composite
avg_gain         = 6.5  (midpoint of 5–8 points/cycle from convergence data)
estimated_cycles = max(ceil(gap / avg_gain), 3)   (minimum 3 cycles)

time_per_cycle   = lookup table above (use chosen config)
estimated_time   = estimated_cycles × time_per_cycle

cost_per_cycle   = lookup table above (use chosen config)
estimated_cost   = estimated_cycles × cost_per_cycle
```

Show as range using min and max from the time/cost table cells.
Apply ± 40% variance note — actual depends on skill complexity and starting quality.

---

## Cost Display Format

```
┌──────────────────────────────────────────────────────┐
│  END-TO-END ESTIMATE                                 │
│  Baseline composite:  {baseline}/140                 │
│  Target:              120/140 (Grade A)              │
│  Gap:                 {gap} points                   │
│  Avg gain/cycle:      ~5–8 points                   │
│  Estimated cycles:    {min_cycles}–{max_cycles}      │
│  Time per cycle:      ~{min_time}–{max_time} min     │
│  Estimated duration:  ~{min_dur}–{max_dur} min       │
│  Estimated cost:      ~${min_cost}–${max_cost}       │
│  ± 40% variance. Type "stop" to end at boundary.    │
└──────────────────────────────────────────────────────┘
```

For genuine subagent mode: show the cost breakdown table alongside before confirming.
