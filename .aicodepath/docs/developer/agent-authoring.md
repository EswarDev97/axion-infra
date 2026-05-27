# Agent Authoring Guide

Agents are specialized Claude instances with focused domain expertise and a constrained tool set. They are invoked by AICodePath hooks (agent-suggester) or directly by skills.

---

## File Structure

```
.aicodepath/agents/<agent-name>.md
```

All agent files use Claude Code native frontmatter format.

---

## Frontmatter Schema

```markdown
---
name: my-agent
description: Use when <trigger condition> — <domain expertise>. Triggered by: "<keyword>".
model: claude-sonnet-4-6
tools: [Read, Write, Bash, Edit, Glob, Grep]
---
```

**Required fields:**
- `name` — must be unique; used by `agent-registry.js` for lookup
- `description` — trigger condition format (same CSO pattern as skills)
- `model` — Claude model ID; default `claude-sonnet-4-6`
- `tools` — list of tools this agent is allowed to use

**Optional fields:**
- `temperature` — sampling temperature (default: 1). No runtime effect on Opus 4.7 interactive sessions (effort slider replaces sampling params) — retained for non-interactive/SDK paths and older model targets.
- `plugin_pack` — distribution pack for this agent; required for audit D4 compliance. Valid values: `core` | `lang` | `infra` | `quality` | `data-ai` | `design` | `planning` | `specialists` | `null`. Use `null` for standalone agents not distributed in any pack. If non-null, the agent must also appear in `packs/<pack>/plugin.json` and the pack must be listed in `.aicodepath/.claude-plugin/marketplace.json`.

---

## Description Format (CSO Pattern)

Same as skills — "Use when..." format:

```
✅ Use when designing database schemas, data models, or writing migrations — provides PostgreSQL/NoSQL expertise
✅ Use when security vulnerabilities or auth flows need review — OWASP Top 10 specialist
✅ Use when frontend components need design review — accessibility and design system expertise

❌ Database architecture specialist for schema design
❌ The security agent handles all security concerns
```

---

## Agent Body Structure

```markdown
---
name: my-agent
description: Use when <trigger> — <expertise>.
model: claude-sonnet-4-6
tools: [Read, Write, Bash]
---

# [Agent Name]

## Domain
[One paragraph describing the agent's specialty]

## Core Responsibilities
- Responsibility 1
- Responsibility 2

## Standards Enforced
- Standard 1 (from which guideline file)
- Standard 2

## How to Work With This Agent
[When to invoke, what context to provide, what to expect]

## Output Format
[What this agent produces — code, review comments, diagrams, etc.]
```

---

## Creating a New Agent

```bash
# 1. Create agent file with Claude Code native frontmatter
cat > .aicodepath/agents/my-agent.md << 'EOF'
---
name: my-agent
description: Use when <trigger> — <expertise>. Triggered by: "keyword".
model: claude-sonnet-4-6
tools: [Read, Write, Bash, Edit, Glob, Grep]
---

# My Agent

## Domain
[Specialty description]

## Core Responsibilities
- ...

## Standards Enforced
- ...
EOF

# 2. Re-run init to create symlink in .claude/agents/
node .aicodepath/bin/aicodepath.js init

# 3. Verify registration
node .aicodepath/bin/aicodepath.js agent list
```

---

## Agent Registry Integration

The `agent-registry.js` loads all agents from `.aicodepath/agents/`. To ensure your agent is found by the auto-suggester:

1. **Name uniqueness:** The `name` frontmatter field must be unique across all agents.

2. **Domain mapping:** Add your agent's domain to `DOMAIN_MAPPING` in `hooks/lib/agent-suggester.js` (95 entries mapping guideline categories → agent names). If your agent handles violations in a specific guideline category, add the mapping:

```javascript
// In agent-suggester.js DOMAIN_MAPPING:
'your-guideline-category': 'your-agent-name',
```

3. **Violation type mapping:** If your agent responds to specific violation types, add to `VIOLATION_TYPE_MAPPING` (15 entries):

```javascript
// In agent-suggester.js VIOLATION_TYPE_MAPPING:
'your-violation-type': 'your-agent-name',
```

---

## Agent vs Skill

| | Agent | Skill |
|-|-------|-------|
| Invoked by | Hooks (auto-suggest) or skills | User (slash command) or skill chain |
| State | Fresh context each invocation | Operates in main conversation |
| Tools | Constrained subset | As declared in frontmatter |
| Primary use | Domain-specific execution | Workflow orchestration |
| File location | `.aicodepath/agents/` | `.aicodepath/skills/<name>/SKILL.md` |

---

## Symlink Management

Init creates symlinks from `.claude/agents/` → `.aicodepath/agents/`:

```
.claude/agents/my-agent.md → .aicodepath/agents/my-agent.md
```

The `.aicodepath/agents/` directory is the single source of truth.

---

## Model Selection

| Scenario | Recommended Model |
|----------|-----------------|
| Complex reasoning (architecture, security) | `claude-opus-4-6` |
| Standard implementation and review | `claude-sonnet-4-6` |
| Fast, lightweight checks | `claude-haiku-4-5-20251001` |

Default: `claude-sonnet-4-6` for all agents unless specific capability needs require otherwise.

> **Opus 4.7 CHANGELOG notes:**
> - **v2.1.111** — `effortLevel: "xhigh"` replaces `temperature`/`top_p`/`top_k` for interactive reasoning control. Agent `temperature` frontmatter has no runtime effect in interactive mode.
> - **v2.1.108** — `ENABLE_PROMPT_CACHING_1H` extends prompt cache TTL to 1 hour, reducing token costs for long agent sessions.

---

## Existing Agents (24 total)

See `.aicodepath/docs/agents/` for full details:
- `architecture-agents.md` — architect, backend, frontend, mobile, devops, api-designer, database-architect
- `quality-agents.md` — code-reviewer, test-engineer, qa, security-engineer, performance-engineer, refactoring-expert
- `specialist-agents.md` — ml-engineer, data-scientist, ux-ui-designer, compliance, cost-optimizer, sre, technical-writer, communication-coach, swarm-lead, codebase-pattern-finder

---

## ArtifactWriter Integration

When an agent or skill creates a durable artifact (design doc, plan, etc.), wrap the `ArtifactWriter.createArtifact()` call with a **dual re-entry guard** to prevent the `auto-artifact-creator` PostToolUse hook from duplicating the row:

```js
process.env.ACP_SUPPRESS_AUTO_ARTIFACT = '1';  // Guard 1: hook checks this env var
try {
  const writer = new ArtifactWriter();
  writer.createArtifact(
    'plan',                               // artifact_type
    'Topic — Implementation Plan',        // title
    '',                                    // content (file-backed)
    'aicodepath-docs/plan/YYYY-MM-DD-...', // file_path
    crNumber,                              // cr_number from session-state
    'inception',                           // phase
    'plan',                                // stage
    null,                                  // unit (sprint-scoped)
    { source: 'artifact-writer', status: 'active' }  // Guard 2: hook also checks metadata.source
  );
  writer.close();
} finally {
  delete process.env.ACP_SUPPRESS_AUTO_ARTIFACT;
}
```

Both guards are required — the env var is the primary bypass, and the `metadata.source` tag is the secondary check. Omitting either can cause duplicate artifact rows.
