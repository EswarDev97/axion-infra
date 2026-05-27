# Spike Task Guide

Load this file when a task touches unfamiliar technology, unknown APIs, or has uncertain effort.

---

## When to Generate a Spike

Auto-generate a spike task BEFORE the implementation task when ANY of these are true:

| Indicator | Example |
|---|---|
| First time using a library or external API | "We've never used Stripe webhooks before" |
| Requires data format unknown before runtime | "Shape of external API response unclear" |
| Involves concurrency, distributed systems, or cryptographic operations | "First RabbitMQ consumer in this codebase" |
| Estimated effort is uncertain (could be 30 min or 3 days) | "Not sure how complex the OAuth handshake is" |
| Depends on third-party behavior not yet tested | "Assuming the vendor returns ISO dates — not confirmed" |

Rule of thumb: if you'd write "should work" in the implementation task, there's a spike hiding there.

---

## Spike Task Format (5-column tasks.md row)

```markdown
| [SPIKE] Investigate <topic> | Read <source>; write minimal proof-of-concept; document key unknowns resolved | PoC works with sample payload; decision documented in aicodepath-docs/adr-log.md | — | TODO |
```

In the plan document (plan.md) detailed task format:

```markdown
### Task N: [SPIKE] Investigate <topic>

**Why**: Unknowns in this area would invalidate the following implementation task if not resolved first.
**Agent**: — (research work, any agent)

**Steps**:
1. Read: <authoritative source — docs URL, source file, or spec>
2. Write minimal proof-of-concept: `spikes/<topic>.ts` (or `.py`)
3. Document decision in `aicodepath-docs/adr-log.md`: proceed / use-alternative / needs-more-research
4. If proceed: confirm the implementation task unblocked and proceed to Task N+1

**Done when**: Decision documented in adr-log.md; key unknowns resolved; Task N+1 unblocked.
```

---

## Spike Rules

| Rule | Reason |
|---|---|
| Time-box to 2 hours max | Spikes are about resolving unknowns, not building solutions — open-ended spikes become stealth features |
| Output MUST be a documented decision | "I looked at it" is not a spike output — the decision (`proceed/use-alternative/needs-more-research`) must be in writing |
| Implementation task is BLOCKED until spike is DONE | Starting implementation before unknowns are resolved produces code that may need to be completely rewritten |
| If spike reveals high risk → escalate, don't push through | A spike that returns `needs-more-research` is a valid outcome — it prevents a sprint full of blocked tasks |

---

## High-Risk Spike Indicators

Flag these as spikes automatically — no judgment call needed:

- Any task that calls an external API not already used in this codebase
- Any task that adds a new database engine, queue, or cache layer
- Any task that involves auth token handling, cryptographic operations, or key management
- Any task where the DoD references a behavior that hasn't been directly observed yet
