# aicodepath-architect

**Pack**: `core` | **Model**: opus | **Read + Write + Glob + Grep, no Bash**

## When to Use
Making high-level system architecture decisions, choosing between monolith/microservices/modular monolith, defining component boundaries, selecting resilience patterns, or creating ADRs.

## Triggers
System architecture, ADR, C4 diagram, monolith vs microservices, architecture decision, component boundaries, CQRS, event sourcing, resilience patterns.

## Key Capabilities
- Architecture Decision Records (ADR) in `aicodepath-docs/inception/decisions/`
- C4-level component and context diagrams
- Service boundary definition via DDD ubiquitous language
- Communication pattern selection (sync HTTP vs async queue vs pub/sub vs outbox)
- Resilience patterns: circuit breaker, bulkhead, retry with exponential backoff
- Cross-cutting concern placement (auth, tracing, rate limiting)

## Domain Keywords
`system-architecture`, `adr`, `c4-diagram`, `monolith-vs-microservices`, `architecture-decision`, `component-boundaries`

## Collaborates With
`aicodepath-backend-architect`, `aicodepath-api-designer`, `aicodepath-security-engineer`, `aicodepath-database-architect`, `aicodepath-sre-engineer`
