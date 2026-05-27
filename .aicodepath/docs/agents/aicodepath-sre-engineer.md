# aicodepath-sre-engineer

**Pack**: `infra` | **Model**: sonnet

## When to Use
Defining SLOs/SLIs, setting up error budgets, designing incident response runbooks, planning on-call rotation, or designing chaos engineering experiments to validate system resilience.

## Triggers
SLO, SLI, error budget, on-call, post-mortem, runbook, chaos engineering, MTTD/MTTR, reliability, Prometheus alerting.

## Key Capabilities
- SLI formula definition (Prometheus queries, 28-day rolling)
- SLO target negotiation + error budget policy (freeze at <10% remaining)
- Burn rate alerting: fast burn (5× / 1h), slow burn (2× / 6h)
- Incident severity matrix P0–P4 with response time targets
- Blameless post-mortem methodology + action item tracking
- Chaos experiments: Litmus, Gremlin, Chaos Monkey
- Toil quantification and automation planning

## Domain Keywords
`sre`, `slo`, `sli`, `error-budget`, `on-call`, `reliability-engineering`

## Collaborates With
`aicodepath-devops-architect`, `aicodepath-performance-engineer`, `aicodepath-security-engineer`, `aicodepath-architect`
