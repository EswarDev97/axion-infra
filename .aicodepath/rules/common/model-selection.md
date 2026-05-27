# Model Selection Heuristics

## Routing Table

| Task Type | Recommended Model | Rationale |
|-----------|-------------------|-----------|
| Documentation, codemap, classification, boilerplate | haiku | Simple content, 3x cost savings |
| Code review, build fix, implementation, refactoring | sonnet | Balance of quality and cost |
| Architecture decisions, complex reasoning, multi-file invariants, root-cause analysis | opus | Highest capability needed |

## Escalation Rule

Start with the cheapest sufficient model. Escalate ONLY when the lower tier
fails with a clear reasoning gap -- not just slower output. Never escalate
for speed alone.

Escalation signal: the model produces incorrect logic, misses cross-file
dependencies, or cannot hold the full problem in context.

## Extended Thinking

Use extended thinking for architectural decisions and root-cause analysis.
Set a budget cap to avoid unbounded thinking on simple tasks:

- Simple tasks: no extended thinking needed.
- Moderate tasks: cap at a reasonable budget.
- Complex tasks: allow full thinking budget but review cost after.

## Cost Visibility

The cost-tracker hook logs per-session token usage and costs. Review the
`session_costs` table periodically to identify patterns:

- Tasks that consistently exceed budget may need decomposition.
- Tasks routed to opus that could run on sonnet indicate over-escalation.
- Aggregate trends help calibrate the routing table over time.
