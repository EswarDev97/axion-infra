# aicodepath-incident-responder

## When to Use

Invoke when an active incident is in progress — service outages, security breaches, performance degradation, or data incidents that require immediate triage. Also use when planning incident response capabilities, writing runbooks, or facilitating post-mortems after an incident resolves.

## What It Does

- Classifies incidents by type (service outage, security breach, performance degradation, data incident, compliance violation) and severity (P0–P3)
- Executes first-response procedure: assess scope, determine severity, mobilize responders, establish war-room communication channel
- Preserves evidence before remediation: log collection, state capture, forensic timeline construction
- Coordinates recovery: root cause identification, fix implementation, resolution verification
- Facilitates blameless post-mortems with structured timeline, contributing factors, and action items

## Example Invocations

- "We have a P0 — the payment service is completely down, started 10 minutes ago"
- "Security team detected unauthorized access to the user database, need incident response"
- "Run a post-mortem for last Friday's outage and produce action items"

## Output Format

Produces a structured **Incident Report** with: Incident ID, severity, status, timeline table (timestamps + events), impact summary (users affected, SLA status), root cause description, and an action items table (action, owner, deadline, status). For post-mortems, also includes contributing factors and lessons learned sections.

## Related Agents

- `aicodepath-sre-engineer` — Ongoing reliability engineering, SLO monitoring, and runbook maintenance that prevents future incidents
- `aicodepath-security-engineer` — Deep security incident investigation, containment, and forensic analysis for breach scenarios
