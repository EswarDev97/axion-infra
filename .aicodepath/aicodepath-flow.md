# AICodePath System Flow

**Version:** v2.5.1 (2026-02-27)

---

## Overview

AICodePath uses Claude Code's hook system to intercept lifecycle events, inject context, validate code quality, and enforce the AIDLC workflow. The core components are:

- **22 hooks** — intercept Claude Code lifecycle events
- **70 skills** — user-invocable workflow instructions
- **24 agents** — specialist AI roles activated by domain
- **16 guideline files** — JSON quality rules evaluated on every write
- **SQLite DB** — persistent state, sessions, artifacts, costs

---

## 1. Session Start Flow

```
Developer opens Claude Code
        ↓
SessionStart event fires
        ↓
session-start-hook.js
  → Read using-aicodepath/SKILL.md
  → Check latest.json checkpoint (< 24hrs?)
  → Return hookSpecificOutput.additionalContext
        ↓
visual-memory-loader.js
  → Load ER/class diagrams from aicodepath-docs/memory/
  → Write to .claude/rules/schema-context.md
        ↓
Claude receives context injected
```

**Outputs:** `using-aicodepath` skill content in context; recent checkpoint summary if available.

---

## 2. User Prompt Flow

```
User types a message
        ↓
UserPromptSubmit event fires
        ↓
pre-flight-check.js
  → Validate environment (DB, settings.json, node_modules)
  → Return warnings if environment incomplete
        ↓
plan-role-activator.js
  → Detect phase signals in prompt (regex patterns)
  → Look up best-fit agent for current context
  → Inject agent role as additionalContext
        ↓
Claude sees: agent role + prompt
```

---

## 3. Write/Edit Flow (PreToolUse)

```
Claude attempts Write or Edit
        ↓
PreToolUse Write|Edit fires (3 hooks in order)
        ↓
1. schema-context-hook.js
   → Detect if file is data-layer (repository, model, entity, etc.)
   → Fast path: read .claude/rules/schema-context.md if fresh (< 1hr)
   → Discovery: scan migrations/Prisma/Drizzle for CREATE TABLE / model
   → Inject actual schema as additionalContext
        ↓
2. guideline-validator.js
   → Load 15 guideline JSON files (async parallel)
   → Filter rules by file extension + component type
   → Evaluate each rule (pattern, file_pattern, authenticity check)
   → Severity aggregation:
       error → exit 2 (block write)
       warning → exit 1 (warn, allow)
       info → exit 0 (show, allow)
        ↓
3. duplication-checker.js
   → Compare file content to existing code
   → SQL-aware: boilerplate pattern filtering for .sql files
   → > 40% similarity → exit 1 (warn)
        ↓
Write proceeds (unless exit 2)
```

---

## 4. Post-Write Flow (PostToolUse)

```
Write/Edit completes
        ↓
PostToolUse Write|Edit fires (in order)
        ↓
1. auto-artifact-creator.js
   → Create artifact DB record for the written file
   (MUST be first — gicl-iteration-hook queries these records)
        ↓
2. gicl-iteration-hook.js
   → Check if feature flag 'gicl' is enabled
   → Full mode (active GICL session):
       Run all 5 scoring dimensions
       Record iteration to DB
       Check shouldContinue() → stop at score ≥ 90
   → Lite mode (no active session):
       Trivial/simple files (≤ 100 LOC): guideline check only
       Return additionalContext feedback
        ↓
3. visual-memory-generator.js
   → Detect diagram-worthy files (models, schemas, flows)
   → Generate Mermaid diagram
   → Save to aicodepath-docs/memory/
        ↓
4-6. Skill suggesters (exit 0 always — recommendations only)
   construction-skill-suggester.js
   document-skill-suggester.js
   monorepo-skill-suggester.js
```

---

## 5. GICL Scoring Flow

```
gicl-iteration-hook.js → collectScoreComponents()
        ↓
┌─────────────────────────────────────────────┐
│  Tests (35%)      — test file exists?       │
│  Guidelines (20%) — guideline-validator.js  │
│  Architecture (15%)— layer separation       │
│  Duplication (20%) — similarity scan        │
│  Authenticity (10%)— no stubs/mocks         │
└─────────────────────────────────────────────┘
        ↓
Weighted score calculated
        ↓
shouldContinue():
  score ≥ 90 → COMPLETE
  max iterations → STOP
  regression > 10pts → ALERT
  stalled 3 iters → STOP
        ↓
Iteration recorded to DB (with cost data)
WebSocket event emitted to dashboard
```

---

## 6. Agent Activation Flow

```
Guideline violation detected
        ↓
agent-suggester.js
  → Normalize violation category (CATEGORY_NORMALIZATION, 50+ entries)
  → Look up DOMAIN_MAPPING (95 entries) → agent domain
  → Load agent from registry (singleton cache)
  → findByName() with aicodepath- prefix fallback
        ↓
Suggested agent appears in Claude's context
```

---

## 7. Feature Flag Flow

```
Any component checks isEnabled('feature-name')
        ↓
FeatureFlags.isEnabled()
  1. CLI override (in-memory) → highest priority
  2. config.json → features.flags
  3. Environment variable
  4. Compile-time default
        ↓
Boolean result
```

---

## 8. Cost Tracking Flow

```
gicl-iteration-hook.js post-GICL
        ↓
pricing-calculator.js
  → Read CLAUDE_INPUT_TOKENS, CLAUDE_OUTPUT_TOKENS,
    CLAUDE_CACHE_READ_TOKENS, CLAUDE_CACHE_WRITE_TOKENS,
    CLAUDE_MODEL_ID from env
  → classifyModel(modelId) → pricing tier
  → calculateCost(usage, modelId) → USD
        ↓
gicl-session-manager.recordIteration() → DB
gicl-session-manager accumulates session totals
        ↓
WebSocket emitCostUpdate() → dashboard
```

---

## 9. Settings Generation Flow

```
node .aicodepath/bin/aicodepath.js init
        ↓
settings-generator.js
  → Read hooks/hooks.json (template with ${CLAUDE_PLUGIN_ROOT})
  → Resolve CLAUDE_PLUGIN_ROOT → absolute path to .aicodepath/
  → Write .claude/settings.json with absolute hook paths
  → Create .claude/skills/ symlinks → .aicodepath/skills/
  → Create .claude/agents/ symlinks → .aicodepath/agents/
  → Generate .mcp.json from config.json MCP entries
```
