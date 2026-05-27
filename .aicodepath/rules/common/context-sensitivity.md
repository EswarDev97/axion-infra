# Context Sensitivity

Rules for managing task scope and session behavior based on the current context window fill level.

---

## Context Zones

Monitor `used_percentage` from the statusline (input tokens only):

| Zone | % Used | Color | Meaning |
|------|--------|-------|---------|
| **Normal** | 0–60% | Green | Full capacity — work freely |
| **Caution** | 60–80% | Yellow | Trim unnecessary loads; avoid starting large new tasks |
| **Compact** | 80–90% | Orange | Checkpoint required; consider compact before next task |
| **Emergency** | 90%+ | Red | Pause immediately; do not start anything new |

---

## Task-Specific Thresholds

Different task types carry different context risk profiles:

| Task Type | Safe to start up to | Why |
|-----------|--------------------|----|
| Bug fix (targeted, 1–3 files) | 90% | Low context growth; targeted reads only |
| Feature addition (5–10 files) | 80% | Moderate reads + writes; stay in caution zone |
| Refactor (cross-module) | 60% | Many reads required before first edit |
| Architecture review | 40% | Requires loading many files + generating long output |
| Sprint planning / brainstorm | 60% | Generates large structured output |
| Swarm dispatch (many agents) | 70% | Each agent call adds overhead to orchestrator context |

**Rule**: If you're above the threshold for your task type, run `/aicodepath-checkpoint` and compact first.

---

## Zone-Specific Behaviors

### Normal (0–60%)

- Work without restriction
- Load full skill files, all relevant context
- Spawn subagents freely

### Caution (60–80%)

- Use `Read` with `offset + limit` instead of full file reads
- Skip loading reference skills unless essential
- Do not start architecture reviews or major refactors
- Prefer `Grep` over `Read` for investigation

### Compact (80–90%)

- **Run `/aicodepath-checkpoint` immediately**
- Finish the current atomic task; do not start the next one
- After checkpoint: consider `/clear` + `/aicodepath-resume`
- If continuing in same session: use Bash for quick checks, no new skill invocations

### Emergency (90%+)

- **Stop all new work**
- Run `/aicodepath-pause` to write handoff note
- Do not load any new files or skills
- Respond with: "Context is at 90%+. I'll pause and resume fresh."

---

## Integration

- Primary monitoring signal: `used_percentage` in the statusline
- See `/aicodepath-context-budget` for a full token audit
- See `/aicodepath-efficiency-mode` for context reduction techniques
- See Strategic Compact in `/aicodepath-efficiency-mode` for when to do a mid-session compact
