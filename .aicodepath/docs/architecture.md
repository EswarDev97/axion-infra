# AICodePath Architecture

## Overview

AICodePath is a 3-layer AI-Driven Development Life Cycle (AIDLC) framework built on Claude Code.

---

## 3-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: Profile                                               │
│  (.claude/settings.json, config.json, feature flags)           │
│  Defines: hook registration, safety rules, feature toggles     │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  Layer 2: Workflow                                              │
│  (Skills, AIDLC phases, GICL quality loop)                     │
│  Defines: PRE-FLIGHT → INCEPTION → CONSTRUCTION → OPERATIONS   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  Layer 3: Skill                                                 │
│  (56 SKILL.md files, 28 agents, 39 hooks)                      │
│  Defines: Concrete actions, quality gates, tool constraints     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Map

| Component | Count | Location | Purpose |
|-----------|-------|----------|---------|
| Hooks | 22 | `.aicodepath/hooks/` | Claude Code lifecycle events |
| Skills | 56+ | `.aicodepath/skills/` | User-invocable workflow steps |
| Agents | 24 | `.aicodepath/agents/` | Specialist AI agents |
| Guidelines | 16 | `.aicodepath/guidelines/` | Quality rule files (JSON) |
| Libraries | 20+ | `.aicodepath/lib/` | Core logic (path-resolver, GICL, etc.) |
| DB Migrations | 18 | `.aicodepath/db/migrations/` | SQLite schema evolution |

---

## Hook Architecture

Hooks intercept Claude Code tool calls and session events:

```
SessionStart  →  session-start-hook.js, visual-memory-loader.js, session-auto-cleanup.js
UserPromptSubmit  →  pre-flight-check.js
PreToolUse (Write|Edit)  →  schema-context-hook.js, guideline-validator.js, duplication-checker.js, safety-guardrails.js
PreToolUse (Bash)  →  safety-guardrails.js, pre-commit-validator.js, ci-status-checker.js
PostToolUse (Write|Edit)  →  auto-artifact-creator.js, gicl-iteration-hook.js, post-tool-security-scan.js,
                              test-tampering-detector.js, plans-watcher.js, tdd-order-check.js,
                              auto-test-runner.js, construction-skill-suggester.js, document-skill-suggester.js
PostToolUseFailure  →  post-tool-failure-hook.js
Stop  →  response-stop-hook.js
PreCompact  →  pre-compact-hook.js
SessionEnd  →  session-end-hook.js
WorktreeRemove  →  worktree-lifecycle.js
Notification  →  notification-hook.js
PermissionRequest  →  permission-request-hook.js
```

---

## Data Architecture

### SQLite Database (42 tables)

Core tables:
- `session_state` — Workflow phase/stage/unit tracking
- `gicl_sessions` + `gicl_iterations` — Quality gate history
- `checkpoints` + `checkpoint_files` — Session recovery points
- `signals` — Cross-agent communication
- `fix_proposals` — Review findings requiring resolution
- `agent_inbox` — Cross-agent messages (swarm)
- `swarm_cost_tracking` — Agent team cost telemetry
- `reflexion_patterns` — Cross-session error learning (FTS5)

### File-based State
- `aicodepath-docs/session-events.jsonl` — Cross-session broadcast (session-broadcast.js)
- `aicodepath-docs/agent-inbox/` — JSONL per-agent message files
- `aicodepath-docs/pending-fix-proposals.jsonl` — Fix proposal queue
- `aicodepath-docs/aicodepath-state.md` — Human-readable phase state

---

## Quality Gate System (GICL)

```
gicl-iteration-hook.js (PostToolUse)
   │
   ├── collectScoreComponents()
   │     ├── tests (35%) — run test suite, parse pass/fail
   │     ├── guidelines (20%) — guideline-validator.js programmatic call
   │     ├── architecture (15%) — file placement checks
   │     ├── duplication (20%) — duplication-checker.js scan
   │     └── authenticity (10%) — anti-stub detection
   │
   ├── calculateScore() → weighted total (0–100)
   │
   ├── shouldContinue() — stop at score≥90, max iterations, regression, stall
   │
   └── effortScorer → if score<60 on iteration>1: recommend effortLevel:high
```

---

## Safety Architecture

PreToolUse safety rules (evaluated in order, short-circuit on first match):

| Rule | Tool | Pattern | Decision |
|------|------|---------|----------|
| R01 | Bash | `sudo ` | block |
| R02 | Write/Edit | `.git/`, `.env`, `id_rsa`, `*.pem`, `*.key` | block |
| R03 | Bash | Shell redirect to protected files | block |
| R04 | Write/Edit | Absolute path outside project root | warn |
| R05 | Bash | `rm -rf`, `rm -fr`, `rm --recursive` | warn |
| R06 | Bash | `git push --force` / `-f` | block (never bypassable) |

PostToolUse security patterns (warn-only):
- Env secrets in strings, `eval(req)`, template exec, innerHTML XSS, hardcoded credentials

---

## Memory Architecture

### In-Session (SQLite)
- Session state, GICL history, checkpoints, signals

### Cross-Session (Files)
- `session-events.jsonl` — broadcast events
- `agent-inbox/` — agent messages
- `aicodepath-docs/adr-log.md` — ADRs
- `aicodepath-docs/task/` — task status (per-sprint files resolved by `task-resolver.js`)
- `aicodepath-docs/knowledge.md` — lessons learned

### Persistent Learning
- `reflexion_patterns` DB table — error/resolution pairs, similarity search via FTS5

---

## See Also

- `codebase-map.md` — Full file inventory
- `docs/developer/` — Authoring guides for hooks, skills, agents
- `claude-code-official-spec.md` — Claude Code hook protocol spec
