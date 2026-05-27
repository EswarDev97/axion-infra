# Claude Code Sub-Agent Design: Split Tasks Across Experts

**Source**: https://claudefa.st/blog/guide/agents/sub-agent-design
**Fetched**: 2026-04-18
**Fidelity**: [SUMMARISED BY WEBFETCH — verify against source]

## Overview

Split complex tasks across specialized sub-agents:

> "Create sub-agents and analyze this from these perspectives: Senior engineer, Security
> expert, Performance reviewer"

...delivers parallel expert feedback within minutes.

## Core Problem & Solution

Single agents attempting multiple expertise areas provide generic feedback. Sub-agents solve
this by creating isolated contexts where each agent focuses deeply on their specialty using
different tools, then consolidating findings.

## Two Implementation Approaches

1. **Task tool** — built-in spawning of isolated sub-agents with independent context windows.
2. **Prompting for perspectives** — request analysis from multiple expert viewpoints in one
   session.

## Parallelizable Candidates

- Code review from multiple angles
- Cross-technology research
- Documentation review for different audiences
- Performance analysis across metrics

## Avoid Sub-Agents For

- Dependent file modifications
- Sequential build processes
- Database migrations

## Specialist Role Design — Examples

**Code Quality**: Factual reviewer, senior engineer, security expert, consistency reviewer,
redundancy checker.

**UX Analysis**: Creative thinker, beginner user, designer, marketing analyst, accessibility
auditor.

## Key Features

- **Plan mode** — press `Shift+Tab` twice to analyze without destructive changes.
- **Background execution** — `Ctrl+B` to run sub-agents while continuing other work, monitored
  via `/tasks`.
- **Cost benefits** — parallel analysis delivers Opus-level insights using Sonnet pricing.
- **Advanced orchestration** — rotate perspectives across project phases; use iterative
  refinement for progressive improvement.

Sub-agents excel for architecture reviews, documentation audits, code quality gates, product
strategy, and competitive analysis.
