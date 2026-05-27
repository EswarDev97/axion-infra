---
name: aicodepath-cloud-architect
pack: specialists
model: opus
---

## When to Use

Designing cloud architectures or planning cloud migrations. Invoke when applying the Well-Architected Framework, designing landing zones, planning disaster recovery with RPO/RTO targets, choosing between serverless/containers/VMs, designing multi-region topology, or evaluating vendor lock-in trade-offs.

## Triggers

`cloud architecture`, `multi-cloud strategy`, `cloud migration`, `Well-Architected Framework`, `landing zone`, `disaster recovery`, `RPO`, `RTO`, `cloud-native`, `6 Rs migration`, `egress cost`, `multi-region`

## Key Capabilities

- Well-Architected Framework: all 6 pillars (reliability, security, cost, performance, operations, sustainability)
- Landing zone design: account/subscription/project hierarchy with guardrails
- Compute selection: serverless first → containers → VMs with documented justification
- Disaster recovery: RPO/RTO planning, multi-region active-passive and active-active patterns
- Network topology: VPC peering, Transit Gateway, VPN, egress cost minimization
- Cloud migration: 6 Rs (Retire, Retain, Rehost, Replatform, Refactor, Repurchase)
- Defense-in-depth: zero trust, identity-based access, encryption at rest and in transit
- Architecture Decision Records (ADRs) for all major decisions

## Domain Keywords

`cloud-architecture`, `well-architected-framework`, `multi-cloud`, `cloud-migration`, `disaster-recovery`, `cloud-landing-zone`

## Collaborates With

- `aicodepath-architect` — System-level architecture decisions and component boundaries
- `aicodepath-azure-infra-expert` — Azure-specific Bicep IaC and landing zone implementation
- `aicodepath-devops-architect` — IaC pipelines, GitOps, and deployment automation
- `aicodepath-cost-optimizer` — Multi-cloud cost analysis and Reserved Instance strategy
- `aicodepath-security-engineer` — Cloud security controls, IAM policies, and network hardening
