# Agents — Overview

AICodePath ships 28 specialized AI agents. Each agent is a Claude Code native subagent defined in `.aicodepath/agents/<name>.md` with YAML frontmatter.

Agents are symlinked into `.claude/agents/` during `aicodepath init` so Claude Code discovers them.

---

## How Agents Are Invoked

**Automatic (hook-based):** `plan-role-activator.js` detects phase-start signals in user prompts and injects the best-fit agent role as additional context.

**Skill-based suggestion:** `gicl-iteration-hook.js` uses `hooks/lib/agent-suggester.js` to map guideline violations to specific agents. The DOMAIN_MAPPING (95 entries) bridges 74 guideline categories to 15 domains.

**Manual (skill-based):** Use `/aicodepath-swarm` or `/aicodepath-subagent-dev` to explicitly dispatch agents to tasks.

**Direct invocation:** Claude Code supports `@agent-name` syntax to address a specific agent.

---

## All 28 Agents — Quick Reference

| Agent | Domain | Model | Key Role |
|-------|--------|-------|----------|
| `aicodepath-architect` | Architecture | sonnet | High-level technical direction, system design, ADRs |
| `aicodepath-backend-architect` | Backend | sonnet | Service boundaries, API contracts, backend design |
| `aicodepath-frontend-architect` | Frontend | sonnet | Component hierarchy, state management, bundle optimization |
| `aicodepath-mobile-architect` | Mobile | sonnet | iOS/Android/cross-platform architecture |
| `aicodepath-devops-architect` | DevOps | sonnet | CI/CD pipelines, container orchestration, IaC |
| `aicodepath-api-designer` | API | sonnet | Versioned APIs, OpenAPI contracts, error handling |
| `aicodepath-database-architect` | Data | sonnet | Schema design, data modeling, integrity constraints |
| `aicodepath-code-reviewer` | Quality | sonnet | Bug review, logic errors, security, code smells |
| `aicodepath-test-engineer` | Quality | sonnet | Test strategy, test pyramid, coverage enforcement |
| `aicodepath-qa` | Quality | sonnet | Test-first development, 80% coverage gate |
| `aicodepath-security-engineer` | Security | sonnet | Threat modeling, auth code, OWASP compliance |
| `aicodepath-performance-engineer` | Performance | sonnet | DB queries, bottleneck analysis, caching, indexing |
| `aicodepath-refactoring-expert` | Quality | sonnet | Tech debt reduction, design patterns, DRY |
| `aicodepath-ml-engineer` | ML | sonnet | Production ML systems, MLOps, model serving |
| `aicodepath-data-scientist` | Data | opus | ML models, feature engineering, validation strategies |
| `aicodepath-ux-designer` | UX | sonnet | User research, wireframing, accessibility |
| `aicodepath-ui-designer` | UI | sonnet | Design systems, tokens, component guidelines |
| `aicodepath-compliance-auditor` | Compliance | sonnet | GDPR, SOC 2, HIPAA, PCI-DSS audit trails |
| `aicodepath-cost-optimizer` | FinOps | haiku | Cloud cost analysis, FinOps practices |
| `aicodepath-sre-engineer` | Reliability | sonnet | SLO/SLI frameworks, incident management |
| `aicodepath-technical-writer` | Documentation | haiku | Developer/operator/user documentation |
| `aicodepath-communication-coach` | Communication | opus | Technical writing clarity and communication |
| `aicodepath-swarm-lead` | Orchestration | sonnet | Multi-agent team coordination and delegation |
| `aicodepath-codebase-pattern-finder` | Analysis | haiku | Pattern discovery, brownfield analysis |
| `aicodepath-plan-critic` | Planning | sonnet | 5-criteria plan quality review (Clarity/Feasibility/Dependencies/Acceptance/Value); APPROVE/REQUEST_CHANGES |
| `aicodepath-plan-analyst` | Planning | sonnet | Plan scope analysis — effort estimation (XS–XL), risk scoring (1-5), dependency graph, wave planning |
| `aicodepath-error-recovery` | Debugging | sonnet | Semantic error diagnosis; 6-step recovery protocol; reflexion-learner integration; self-healing |
| `aicodepath-ci-fixer` | DevOps | sonnet | CI/CD failure diagnosis via `gh run` logs; auto-recovery for build, test, lint, deploy failures |

---

## Agent File Format

```markdown
---
name: aicodepath-<name>
description: "Use when [TRIGGER CONDITIONS]. Does [WHAT IT DOES]."
model: sonnet
memory: project
tools:
  - Read
  - Write
  - Glob
  - Grep
disallowedTools:
  - Bash
---

# Role: <Role Name>

**Goal**: [One sentence goal]

## Constraints
[What the agent can/cannot do]

## Instructions
[Step-by-step instructions]

## Related Resources
[Guideline files, workflow rules]
```

**`memory: project`** — agents retain project-specific memory across invocations.

**Tool restrictions:** Most architecture/design agents have `disallowedTools: [Bash]` to prevent them from running code — they design, they don't implement.

---

## New Agents — Invocation Guide

| Agent | When to invoke |
|-------|----------------|
| `aicodepath-plan-critic` | Before committing to a plan — catches vague DoD, circular deps, unfeasible scope |
| `aicodepath-plan-analyst` | During INCEPTION when estimating effort or risk for complex plans |
| `aicodepath-error-recovery` | When an error repeats across multiple GICL iterations without resolution |
| `aicodepath-ci-fixer` | When `gh run list` shows a CI failure after a push — diagnoses root cause |

---

## Agent-to-Domain Mapping (used by agent-suggester.js)

| Guideline Domain | Agent(s) Suggested |
|-----------------|-------------------|
| architecture | aicodepath-architect, aicodepath-backend-architect |
| frontend | aicodepath-frontend-architect |
| mobile | aicodepath-mobile-architect |
| security | aicodepath-security-engineer |
| performance | aicodepath-performance-engineer |
| testing | aicodepath-test-engineer, aicodepath-qa |
| devops | aicodepath-devops-architect |
| data | aicodepath-database-architect, aicodepath-data-scientist |
| ml | aicodepath-ml-engineer |
| compliance | aicodepath-compliance-auditor |
| ux | aicodepath-ux-designer, aicodepath-ui-designer |
| documentation | aicodepath-technical-writer |
| quality | aicodepath-code-reviewer, aicodepath-refactoring-expert |
| plan | aicodepath-plan-critic, aicodepath-plan-analyst |
| error | aicodepath-error-recovery |
| ci | aicodepath-ci-fixer |
| finops | aicodepath-cost-optimizer |

---

## Detailed Agent Documentation

- Architecture & infrastructure agents → `architecture-agents.md`
- Quality & security agents → `quality-agents.md`
- Specialist agents → `specialist-agents.md`
