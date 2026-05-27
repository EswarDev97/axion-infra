# Claude Code Agent Teams Workflow: Plan to Production

**Source**: https://claudefa.st/blog/guide/agents/agent-teams-workflow
**Fetched**: 2026-04-18
**Fidelity**: [SUMMARISED BY WEBFETCH — verify against source]

## Overview

Seven-step workflow for using Claude Code's agent teams feature to build production-ready
code reliably. Two phases: **planning** and **execution**.

## Planning Phase (Steps 1–3)

### Step 1: Brain Dump
Start with unstructured requirements in plain language.

> "Don't overthink the initial input. Write what you want in plain language."

### Step 2: Research and Q&A
Have Claude investigate your codebase and ask clarifying questions before planning.

> "The number one source of agent team failures isn't bad code. It's misalignment."

### Step 3: Structured Plan
Create a formal plan containing:
- Team members
- Task dependencies
- File ownership
- Acceptance criteria
- Validation commands

> This plan becomes "the single artifact that drives the entire agent team execution."

## Execution Phase (Steps 4–7)

### Step 4: Fresh Context
Start a new session using only the completed plan. Discard the planning conversation to
maximize available context.

### Step 5: Contract Chain Analysis
Analyze dependency graphs to identify what each completed task produces for downstream work.

> "No agent starts work until it has the contracts it depends on."

### Step 6: Wave Execution
Spawn agents in **dependency-ordered waves** with concrete interface contracts injected into
their prompts. Prevents teams from "independently guessing data shapes."

### Step 7: Validation
Run end-to-end testing against acceptance criteria. Request **evidence** rather than
confirmation of success.

## Key Insight

Workflow addresses two failure modes:

1. **Assumption drift** between components
2. **Missing end-to-end validation**

Establishing contracts between waves and requiring evidence-based validation produces
integrated code rather than disconnected components.
