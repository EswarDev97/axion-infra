# Features Reference

This document covers AICodePath's major features and how to use them.

---

## GICL — Governed Iterative Construction Loop

GICL is the quality gate system that runs after every file write. It scores code across 5 dimensions and iterates until score ≥ 90.

### Score Dimensions

| Dimension | Weight | What it measures |
|-----------|--------|-----------------|
| Tests | 35% | Test coverage, test existence, test quality |
| Guidelines | 20% | Compliance with all 16 guideline JSON files |
| Architecture | 15% | Layer separation, dependency direction |
| Duplication | 20% | Code similarity across files |
| Authenticity | 10% | No stubs/mocks in production code |

### GICL Modes

**Full mode** (active GICL session): Runs all 5 dimensions, records iterations to DB, enforces hard stop at score ≥ 90.

**Lite mode** (no active session): Runs guideline check only for trivial/simple files (≤ 100 LOC). Returns `additionalContext` feedback without blocking.

### Starting GICL

```
/aicodepath-gicl-start
```

Detects complexity (trivial/simple/moderate/complex/very_complex from LOC + function count), creates a DB session, and starts the loop.

### Stopping GICL

GICL stops automatically when:
- Score ≥ 90 (success)
- Max iterations reached (configurable)
- Score regression > 10 points (alert)
- Score stalled for 3 consecutive iterations

---

## Visual Memory

Generates and loads visual diagrams (ER, class, sequence, C4, flowchart) from your codebase.

### Generating Diagrams

```
/aicodepath-visual-memory --type er
/aicodepath-visual-memory --type class
/aicodepath-visual-memory --type all
```

Diagrams are saved to `aicodepath-docs/memory/` in Mermaid format.

### Auto-loading at Session Start

`visual-memory-loader.js` runs at SessionStart and writes relevant diagrams to `.claude/rules/schema-context.md` for Claude Code to auto-load as context.

---

## Schema Context Injection

Prevents hallucinated column/table names by injecting the real DB schema into Claude's context before any data-layer file is written.

**Triggered automatically on Write/Edit for files matching:**
- `*repository*`, `*model*`, `*entity*`, `*query*`, `*dao*`, `*mapper*`, `*prisma*`, `*migration*`, `*schema*`, `*controller*`

**Sources scanned:**
- SQL migrations (`CREATE TABLE` statements)
- Prisma schema files (`model` blocks)
- Drizzle schema files
- ER diagrams in `aicodepath-docs/memory/`
- `schema-design.md`

**Cache:** Results cached to `.claude/rules/schema-context.md` for 1 hour (fast path).

---

## Cost Tracking

Tracks Claude API token usage and USD cost per GICL iteration and session.

### Token Sources

Read from environment variables set by Claude Code:
- `CLAUDE_INPUT_TOKENS`
- `CLAUDE_OUTPUT_TOKENS`
- `CLAUDE_CACHE_READ_TOKENS`
- `CLAUDE_CACHE_WRITE_TOKENS`
- `CLAUDE_MODEL_ID`

### Pricing Tiers

| Tier | Models |
|------|--------|
| `opus_new` | claude-opus-4-6-* |
| `sonnet` | claude-sonnet-4-6-* |
| `haiku_new` | claude-haiku-4-5-* |

Cache reads = 10% of input rate; cache writes = 125% of input rate.

### Dashboard API

```
GET /api/cost/summary?period=daily|weekly|monthly
GET /api/cost/sessions?limit=N
GET /api/cost/iterations/:sessionId
```

---

## Checkpoint & Rollback

Saves session state (phase, quality gates, active unit, file snapshots) for recovery.

### Creating Checkpoints

```
/aicodepath-checkpoint          # Manual checkpoint
/aicodepath-checkpoint --list   # List all checkpoints
```

Auto-saved at phase transitions and after each GICL iteration.

### Rolling Back

```
/aicodepath-rewind              # Rewind to most recent checkpoint
/aicodepath-rewind <id>         # Rewind to specific checkpoint
```

Checkpoints stored in `aicodepath-docs/checkpoints/`. `latest.json` always points to the most recent.

---

## Reflexion Learning

Cross-session error pattern learning. When a mistake is made and resolved, the pattern is recorded and used to warn in future sessions.

**DB table:** `reflexion_patterns` (FTS5-indexed for fast similarity search)

**Automatic:** No manual steps. The system records failures and resolutions from GICL iterations.

**Manual:** `/aicodepath-learn` explicitly extracts lessons from the current session.

---

## Multi-Agent Swarm (Feature-Flagged)

Parallel task execution using Claude Code Agent Teams.

**Requires:**
1. Feature flag enabled: `node .aicodepath/bin/aicodepath.js features enable swarm`
2. Env var: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`

### Orchestration Patterns

| Pattern | Use case |
|---------|----------|
| `parallel` | Independent tasks with no ordering requirements |
| `pipeline` | Sequential stages where each feeds the next |
| `swarm` | Many agents working on decomposed subtasks |
| `review` | One agent writes, others review |

### Starting a Swarm

```
/aicodepath-swarm
```

Skill selects the best pattern, forms the team, and coordinates via the swarm-lead agent.

---

## Token Cost Budgeting

Before implementing, estimate token cost based on task complexity:

| Complexity | Estimated output tokens |
|------------|------------------------|
| trivial | 200 |
| simple | 1,000 |
| moderate | 2,500 |
| complex | 6,000 |
| very_complex | 15,000 |

Used by `lib/pricing-calculator.js` `predictBudget(description, modelId)` to warn if a task is likely to be expensive.

---

## Dashboard

Real-time web interface for monitoring agent activity, GICL scores, and session state.

```bash
# Start dashboard
node .aicodepath/bin/aicodepath.js dashboard start

# Access
http://localhost:3899
```

### Keyboard Shortcuts

| Key | Panel |
|-----|-------|
| `M` | Monitor (agent activity) |
| `K` | Kanban (task board) |
| `G` | Graph (dependency) |
| `V` | Visual memory |
| `D` | Debug |
| `?` | Help |
| `Cmd/Ctrl+K` | Command palette |

---

## Conversation Search (Cross-Session)

Search across all Claude Code conversation history.

```
GET /api/search?q=<query>&regex=false&case=false
GET /api/search/suggestions?q=<prefix>
GET /api/search/stats
```

Uses FTS5 (BM25 ranking) with regex fallback. LIKE fallback when FTS5 unavailable.

---

## Safety Guardrails

Six declarative safety rules run automatically on every Bash command and Write/Edit tool call:

| Rule | Blocks / Warns | What |
|------|---------------|------|
| R01 | Block | `sudo` commands |
| R02 | Block | Writes to `.git/`, `.env`, `id_rsa`, `*.pem`, `*.key` |
| R03 | Block | Shell redirects to protected files |
| R04 | Warn | Absolute paths outside project root |
| R05 | Warn | `rm -rf`, `rm -fr`, `rm --recursive` |
| R06 | Block (always) | `git push --force` / `-f` (never bypassable) |

Configure in `config.json` under `safety`:
```json
{
  "safety": {
    "mode": "standard",
    "blockSudo": true,
    "blockForcePush": true,
    "blockDestructiveRm": true,
    "protectedPaths": [".env.production"]
  }
}
```

---

## Auto Mode Detection

`/aicodepath-work` automatically selects the right execution mode based on pending task count:

| Task count | Mode | What happens |
|-----------|------|-------------|
| 1 task | Solo | Direct TDD → implement → commit |
| 2-3 tasks | Parallel | Task tool with N workers, git worktree isolation |
| 4+ tasks | Swarm | Agent Teams orchestration with planner + critic |

Override with flags: `--solo`, `--parallel N`, `--swarm`

---

## Effort Scoring

Before each task, AICodePath scores complexity across 5 factors:

| Factor | Condition | Score |
|--------|-----------|-------|
| File count | ≥ 4 files | +1 |
| Critical directory | `core/`, `security/`, `hooks/`, `lib/` | +1 |
| Complexity keyword | "architecture", "migration", "security" in task | +1 |
| Failure history | Same task failed before in this session | +2 |
| Explicit marker | `[high-effort]` in task description | +3 |

**Score ≥ 3** → recommend `effortLevel: high`:

```bash
# Set effort level before starting a high-complexity task
export CLAUDE_CODE_EFFORT_LEVEL=high
# Or in settings.json: { "effortLevel": "high" }
# Or use the /model slider in Claude Code
```

---

## Structured Code Review

`/aicodepath-review` produces a 4-perspective review with A-D grading:

### Perspectives
- **Security**: SQL injection, XSS, hardcoded secrets, input validation, OWASP Top 10
- **Performance**: N+1 queries, memory leaks, unnecessary re-renders, large bundles
- **Quality**: Naming, test coverage, error handling, unused imports, `any` types
- **Accessibility**: ARIA attributes, keyboard navigation, color contrast

### Grading
| Grade | Severity | Decision |
|-------|----------|----------|
| A | No issues | APPROVE |
| B | Minor only | APPROVE with suggestions |
| C | Major or low-severity security | REQUEST_CHANGES |
| D | Critical | REQUEST_CHANGES (block) |

**Rule:** Security vulnerabilities → always `REQUEST_CHANGES`, even if minor.

### Depth levels
- `--depth light` — quick scan, high-confidence issues only
- `--depth standard` — default, thorough review
- `--depth strict` — exhaustive, pedantic mode

---

## Test Tampering Detection

Runs automatically on every test file write. Warns on 12 patterns:

- Test skips: `it.skip()`, `xtest()`, `@pytest.mark.skip`, `t.Skip()`
- Commented assertions: `// expect(`, `// assert`
- CI bypass: `continue-on-error: true`, `if: always()`
- Hardcoded values: `answers_for_tests =`, hardcoded returns labeled `// test`

---

## TDD Order Enforcement

Warns when production code is written before any test file in the current session.

The TDD contract is simple: **red test first, then green implementation**.

---

## Fix Proposal System

When a review produces `REQUEST_CHANGES`, findings are saved as fix proposals:

```
aicodepath-docs/pending-fix-proposals.jsonl
```

Each proposal includes: severity, location, issue description, suggestion, `auto_fixable` flag.

After 3 consecutive GICL failures, proposals are automatically escalated to tasks in `tasks.md`.

---

## Release Automation

`/aicodepath-release patch|minor|major` automates the full release sequence:

1. Gather commits since last tag
2. Generate `CHANGELOG.md` entry (grouped by type)
3. Bump version in `package.json` and `VERSION`
4. Commit with message `chore: release vX.Y.Z`
5. Create annotated git tag
6. Create GitHub Release via `gh release create`

Use `--dry-run` to preview without applying.

---

## CI/CD Auto-Recovery

After a `git push`, `ci-status-checker.js` monitors GitHub Actions automatically.

For manual diagnosis, invoke the `aicodepath-ci-fixer` agent:

```
@aicodepath-ci-fixer
```

It runs `gh run view --log-failed`, categorizes the failure (build/test/lint/deploy/dependency/timeout), checks reflexion-learner for similar past failures, and proposes a fix.

---

## Cross-Session Broadcast

Sessions and agents communicate through a file-based event bus (no server required):

```
aicodepath-docs/session-events.jsonl
```

Standard event types: `session_started`, `task_completed`, `task_failed`, `checkpoint_created`, `phase_transition`, `swarm_started`, `ci_status`

Used by `lib/session-broadcast.js`. The `SessionStateManager` emits `phase_transition` events automatically when the workflow phase changes.

---

## Agent Inbox

For swarm mode, agents can message each other via `lib/agent-inbox.js`:

```javascript
const inbox = require('.aicodepath/lib/agent-inbox');
inbox.send('worker-1', 'reviewer', { type: 'review_request', content: taskId });
const messages = inbox.receive('reviewer', { unreadOnly: true });
```

Messages persist in `aicodepath-docs/agent-inbox/<agent-id>.jsonl`. Messages older than 48 hours are pruned at session start by `session-auto-cleanup.js`.

---

## Swarm Cost Tracking

`lib/swarm-cost-tracker.js` estimates and records token usage for agent team sessions:

| Pattern | Estimated multiplier |
|---------|---------------------|
| Swarm without Phase 0 discussion | ~4× base cost |
| Swarm with Phase 0 planner+critic | ~5.5× base cost |

Call `estimateSwarmCost({ workers: 3, hasDiscussion: true })` before starting a swarm to preview cost.

---

## SOLID Health Score

`/aicodepath-solid-principles` analyzes code against all 5 SOLID principles and produces a weighted health score (0–100, A–D grade).

### Invocation Modes

| Mode | Command | Use when |
|------|---------|----------|
| Interactive | `/aicodepath-solid-principles` | Specific class or file under review |
| Auto-scan | `/aicodepath-solid-principles --auto-scan` | Batch-check all modified files |
| Fix plan | `/aicodepath-solid-principles --fix-plan` | Generate a refactor task list |
| Review perspective | During `/aicodepath-review --depth standard` | Automatic 5th review perspective |
| Entropy scan | Step 3 of `/aicodepath-reducing-entropy` | Top 5 largest files |

### Score Dimensions

| Principle | Weight | What it detects |
|-----------|--------|----------------|
| SRP | 25% | God classes, mixed responsibilities |
| OCP | 20% | Switch/isinstance chains, hard-coded extension points |
| LSP | 20% | Broken subtype contracts |
| ISP | 15% | Fat interfaces, unused method implementations |
| DIP | 20% | Hardcoded dependencies, missing abstraction layers |

**Grade thresholds:** A ≥ 90 · B ≥ 80 · C ≥ 70 · D < 70

---

## Post-Commit Learn Hook

After every `git commit`, `post-commit-hook.js` fires automatically and displays:

```
📝 Commit recorded. Run `/aicodepath-learn` now to capture session preferences before context is lost.
```

This ensures the `/aicodepath-learn` skill is invoked while the session is fresh — preventing lessons from being silently lost between sessions.

---

## Interconnection Diagram

`/aicodepath-interconnection-diagram` produces an interactive standalone HTML visualization of all AICodePath components and their relationships.

```
/aicodepath-interconnection-diagram
```

Output: `aicodepath-docs/memory/aicodepath-interconnection-diagram.html`

The diagram groups components by type (skills, hooks, agents, lib, guidelines) and draws relationship edges (calls, triggers, reads, validates). Built on the kit in `.aicodepath/skills/aicodepath-interconnection-diagram/kit/`.

**Routing:** When asked to "show all AICodePath components" or "draw a component map", `aicodepath-diagrams` automatically routes to this skill instead of generating a Mermaid diagram.

---

## Preferences v2.0

Learned coding preferences use a structured schema stored in `aicodepath-docs/preferences/project-preferences.json`.

### Managing preferences

```
/aicodepath-preferences list         # Show all pending + approved rules
/aicodepath-preferences approve <id> # Approve a learned rule
/aicodepath-preferences reject <id>  # Reject a proposed rule
```

### Learning from sessions

```
/aicodepath-learn     # Analyze session for durable signals; propose rules
```

Rules are created with `enabled: false` (pending approval). They graduate to active after explicit approval via `/aicodepath-preferences`.

**Graduation to guideline:** A rule approved and never overridden across 10+ sessions can be added to the appropriate `.aicodepath/guidelines/*.json` file for automatic enforcement at the PreToolUse hook level.

---

## Authoring Lifecycle — Agents & Hooks

Four skills provide a quality ratchet for AICodePath's own agents and hooks, mirroring the proven skill lifecycle pipeline.

### Agent Authoring

```
/aicodepath-agent-creator create my-agent      # Create a new agent
/aicodepath-agent-creator improve my-agent     # Hill-climb to Grade A
/aicodepath-agent-audit my-agent               # Score a single agent
/aicodepath-agent-audit all                    # Batch-audit all agents
```

**agent-creator** guides through a structured interview (domain, tools, model, advanced features), drafts the agent.md with the canonical 5-section body, registers it in DOMAIN_MAPPING + agent-taxonomy.md, then optionally runs an autonomous hill-climbing improve loop that targets the lowest-scoring dimensions from the agent-audit rubric.

**agent-audit** scores across 6 dimensions (100 pts total): Spec Compliance, Domain Expertise, Tool Appropriateness, Integration Completeness, Description Trigger Accuracy, Prompting Quality. Grades: A=90+ / B=80-89 / C=70-79 / D=60-69 / F=<60.

### Hook Authoring

```
/aicodepath-hook-creator create my-hook        # Create a new hook
/aicodepath-hook-creator improve my-hook       # Hill-climb to Grade A
/aicodepath-hook-audit my-hook                 # Score a single hook
/aicodepath-hook-audit all                     # Batch-audit all hooks
```

**hook-creator** guides through a structured interview (event type, handler type, matcher, blocking behavior), generates compliant hook code from the canonical template, produces a persistent test file at `.aicodepath/__tests__/hook-<name>.test.js` (minimum 4 test cases), registers in hooks.json, then optionally hill-climbs using functional + static validation.

**hook-audit** scores across 6 dimensions (100 pts total): Protocol Compliance, Error Resilience, Library Compliance, Output Field Validity, Registration & Integration, Code Quality. Uses functional validation (pipe sample inputs), static grep patterns, and registration file checks.

### Three-Tier Source Priority

All 4 skills fetch the live Anthropic docs first (authoritative), diff against local authoring docs (AICodePath conventions), and fall back to the offline spec snapshot only if the fetch fails. This ensures new frontmatter fields and deprecated patterns are always current.

---

## Statusline

Real-time Claude Code terminal statusline showing workflow phase, context %, and GICL score.

```
/aicodepath-statusline
```

Shows: `[CONSTRUCTION] ctx:45% gicl:87 unit:auth-service`

**Note:** Statusline commands run in `sh` (POSIX), not `bash`. No bash-specific syntax allowed.
