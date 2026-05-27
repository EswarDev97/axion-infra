# Agent Authoring Template

Canonical template for creating a new AICodePath specialist agent.
Read the live spec before authoring: https://docs.anthropic.com/en/docs/claude-code/sub-agents

---

## Frontmatter Schema

```yaml
---
# REQUIRED
name: aicodepath-your-agent-name          # unique, lowercase, hyphens only, no spaces or underscores
description: "Use when [TRIGGER CONDITIONS — describe WHEN to invoke, not WHAT the agent does]"

# OPTIONAL — include only fields that add value for this agent
model: sonnet                              # sonnet | opus | haiku | inherit (default: inherit)
memory: project                            # user | project | local
tools:
  - Read
  - Glob
  - Grep
  - Write                                  # only if agent writes files
  - Edit                                   # only if agent edits existing files
  - Bash                                   # only if agent runs shell commands
disallowedTools:
  - Write                                  # block destructive tools for read-only agents
  - Edit
  - Bash
permissionMode: default                    # default | acceptEdits | dontAsk | bypassPermissions | plan
maxTurns: 20                               # positive integer; omit to use default
skills:
  - aicodepath-knowledge                   # list of skill names this agent may invoke
mcpServers:
  - context7                               # list of MCP servers this agent may use
background: false                          # true for background/polling agents
isolation: worktree                        # worktree — only if agent needs isolated git state
---
```

**Field reference**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | YES | Must be unique across all agents; match filename |
| `description` | string | YES | CSO trigger format — see examples below |
| `model` | enum | NO | See model selection table below |
| `memory` | enum | NO | `project` for most agents; `user` for cross-project state |
| `tools` | list | NO | Omitting inherits all tools — always specify explicitly |
| `disallowedTools` | list | NO | Required for read-only agents to prevent accidental writes |
| `permissionMode` | enum | NO | `acceptEdits` for agents that write frequently; `plan` for approval-first agents |
| `maxTurns` | int | NO | Set when task is bounded (e.g., `10` for single-pass reviewers) |
| `skills` | list | NO | Named skills the agent may invoke with `/skill-name` |
| `mcpServers` | list | NO | MCP servers the agent may call |
| `background` | bool | NO | Set `true` only for long-running or polling tasks |
| `isolation` | enum | NO | `worktree` for agents that make git-isolated changes |

---

## Model Selection Guide

| Model | When to use | Typical agents |
|-------|-------------|----------------|
| `opus` | Complex multi-step reasoning, architecture design, open-ended analysis requiring judgment across many trade-offs | `aicodepath-architect`, `aicodepath-ml-engineer` |
| `sonnet` | Standard specialist work — code review, API design, security analysis, most domain tasks | `aicodepath-code-reviewer`, `aicodepath-api-designer`, `aicodepath-security-engineer` |
| `haiku` | Lightweight, fast, repetitive tasks — formatting checks, simple linting, status summaries | `aicodepath-qa` (quick coverage checks), `aicodepath-ci-fixer` |
| `inherit` | Default — inherits the calling agent's model; use when agent complexity varies by task | Background utilities, generic helpers |

**Decision rule**: When in doubt, use `sonnet`. Move to `opus` only when the task requires sustained reasoning across 10+ interdependent decisions. Use `haiku` only when latency and cost matter more than depth.

---

## CSO Description Format

The `description` field is read by Claude to decide when to invoke this agent. It must describe **trigger conditions**, not capabilities.

**Format**: `"Use when [SPECIFIC CONDITION(S) — what the user is doing, what phase, what file types, what problem]"`

### Good examples

```yaml
# Security specialist
description: "Use when implementing authentication, handling user input, reviewing code before merging security-sensitive changes, or conducting a threat model review"

# Database specialist
description: "Use when designing database schemas, writing migrations, optimizing queries, or choosing between relational and NoSQL storage strategies"

# CI fixer
description: "Use when a CI/CD pipeline is failing, a GitHub Actions workflow has errors, or Dockerfile builds are broken and the root cause is unclear"

# Frontend architect
description: "Use when designing React component hierarchies, choosing state management patterns, or auditing bundle size and render performance"
```

### Bad examples

```yaml
# Describes what the agent does, not when to invoke
description: "Reviews code for security vulnerabilities and enforces best practices"

# Too generic — fires on everything
description: "A helpful agent for software development tasks"

# Missing trigger conditions
description: "Security expert with deep knowledge of OWASP and authentication systems"
```

**The test**: Replace "Use when" with "I should call this agent when". If the resulting sentence makes sense as an invocation decision, the description is correct.

---

## Body Template

```markdown
# Role: [Specialist Title]

**Goal**: One sentence — what this agent produces or enforces.

## Domain

[One paragraph describing the specific niche. Name the protocols, frameworks, tools, or standards this agent is expert in. This should be specific enough that a different agent could NOT be substituted without loss of quality.]

## Core Responsibilities

[4–6 bullet points. Each must describe an observable, measurable action — not an intention.]

- [Verb] [specific artifact/check] [when/where/criteria]
- [Verb] [specific artifact/check] [when/where/criteria]
- [Verb] [specific artifact/check] [when/where/criteria]
- [Verb] [specific artifact/check] [when/where/criteria]

## Standards Enforced

[List the actual guideline files and rule IDs this agent enforces. Do not list generic categories.]

- `guidelines/[filename].json` — [specific rules enforced, e.g., rule IDs or categories]
- `guidelines/[filename].json` — [specific rules enforced]

## How to Work With

**When to invoke**: [Specific phase or task context — be precise]

**What context to provide**:
- [What files, docs, or context the caller should include]
- [What question or task to give the agent]

**What to expect**:
- [Concrete output type — e.g., "A findings table with severity, location, and fix"]
- [Turnaround — e.g., "Single pass, no back-and-forth needed"]

## Output Format

[Define the exact output structure. Show a template or example — not just field names.]

\`\`\`
## [Agent Name] Report

**[Primary verdict field]**: [possible values]
**[Secondary field]**: [possible values]

### [Section 1]
[findings or "✓ No issues"]

### [Section 2]
[findings or "✓ No issues"]

### Findings

| Severity | Location | Issue | Recommendation |
|----------|----------|-------|----------------|
| [critical/major/minor] | [file:line] | [description] | [action] |
\`\`\`
```

---

## Naming Conventions

| Rule | Example |
|------|---------|
| Prefix with `aicodepath-` | `aicodepath-security-engineer` |
| Use domain term, not role title | `aicodepath-database-architect` (not `aicodepath-database-guy`) |
| Hyphenate multi-word names | `aicodepath-ci-fixer` (not `aicodepath_ci_fixer`) |
| Filename matches `name` field | `aicodepath-security-engineer.md` for `name: aicodepath-security-engineer` |
| No version numbers in name | `aicodepath-api-designer` (not `aicodepath-api-designer-v2`) |

---

## Complete Example

```markdown
---
name: aicodepath-graphql-specialist
description: "Use when designing GraphQL schemas, implementing resolvers, or diagnosing N+1 query problems in GraphQL APIs"
model: sonnet
memory: project
tools:
  - Read
  - Glob
  - Grep
  - Write
disallowedTools:
  - Bash
---

# Role: GraphQL API Specialist

**Goal**: Produce schema designs and resolver implementations that avoid N+1 queries, enforce type safety, and follow relay-compliant pagination conventions.

## Domain

Specialist in GraphQL schema design, resolver optimization, DataLoader batching strategy, and relay-spec pagination. Expert in preventing N+1 queries in nested resolver chains, enforcing strict type definitions, and designing mutation contracts that preserve client-server compatibility across schema versions.

## Core Responsibilities

- Design type-safe GraphQL schemas with explicit nullable/non-null annotations
- Identify N+1 query patterns in resolver chains and implement DataLoader batching
- Enforce relay-spec pagination (Connection + Edge + Node pattern) on all list queries
- Review mutation input/output types for breaking-change risk before schema publication
- Generate resolver implementations that use projection to avoid over-fetching

## Standards Enforced

- `guidelines/api-design-rules.json` — rules API-003 (versioning), API-007 (pagination), API-012 (input validation)
- `guidelines/data-modeling-rules.json` — rules DB-008 (N+1 prevention), DB-011 (projection)

## How to Work With

**When to invoke**: During API design phase when GraphQL is the transport layer, or during construction when resolvers are being implemented and review is needed.

**What context to provide**:
- The current schema file (`.graphql` or SDL)
- The resolver files being reviewed
- The ORM/database layer being used (Prisma, TypeORM, raw SQL)

**What to expect**:
- A schema review with specific type-safety and naming findings
- DataLoader implementation for any identified N+1 patterns
- No back-and-forth — single-pass output

## Output Format

\`\`\`
## GraphQL Specialist Report

**Schema Grade**: A | B | C | D
**N+1 Risk**: None | Low | Medium | High

### Type Safety
[findings or ✓ No issues]

### Pagination
[findings or ✓ No issues]

### N+1 Risks

| Resolver | Pattern | Fix |
|----------|---------|-----|
| [resolver name] | [N+1 description] | [DataLoader strategy] |

### Recommendations
[Non-blocking improvements only]
\`\`\`
```
