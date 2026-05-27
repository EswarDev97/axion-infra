# AICodePath Documentation Index

This directory is the canonical reference for the AICodePath framework. All documents are sized for AI agent consumption (< 500 lines each).

## Who Should Read What

| Persona | Start Here |
|---------|-----------|
| End user — first time | `../../../GETTING_STARTED.md` |
| End user — building features | `../../../QUICKSTART.md` |
| End user — deep reference | `../../../USER_GUIDE.md` → links to `user-guide/` |
| Contributor to AICodePath | `developer/README.md` |
| Looking up a specific hook | `hooks/overview.md` |
| Looking up a specific agent | `agents/overview.md` |
| Looking up a specific skill | `skills/overview.md` |
| Understanding guidelines | `guidelines/overview.md` |
| Feature flags | `feature-flags.md` |
| Claude Code v2.1.113 / Opus 4.7 reference | `claude/v1-114/README.md` |

---

## Directory Structure

```
docs/
├── README.md                    ← you are here
├── hooks/
│   ├── overview.md              # All 39 hooks, event map, exit codes
│   ├── session-lifecycle.md     # SessionStart, SessionEnd, PreCompact, Stop, Notification
│   ├── pretooluse.md            # schema-context, guideline-validator, duplication-checker, pre-commit-validator, permission-request
│   ├── posttooluse.md           # auto-artifact-creator, gicl-iteration, visual-memory-generator, skill-suggesters
│   └── userpromptsubmit.md      # pre-flight-check, plan-role-activator
├── agents/
│   ├── overview.md              # All 28 agents, invocation model
│   ├── architecture-agents.md   # architect, backend, frontend, mobile, devops, api-designer, database-architect
│   ├── quality-agents.md        # code-reviewer, test-engineer, qa, security-engineer, performance-engineer, refactoring-expert
│   └── specialist-agents.md     # ml-engineer, data-scientist, ux/ui-designer, compliance, cost-optimizer, sre, technical-writer, swarm-lead, codebase-pattern-finder
├── skills/
│   ├── overview.md              # All 95 skills, invocation model
│   ├── core-workflow.md         # 8-step AIDLC chain skills
│   ├── planning.md              # PRE-FLIGHT + INCEPTION skills
│   ├── implementation.md        # CONSTRUCTION skills (TDD, GICL, validation)
│   ├── session-management.md    # status, resume, pause, rewind, learn, efficiency-mode
│   ├── team-orchestration.md    # swarm, subagent-dev, orchestrate
│   └── domain-specific.md       # SQL, Celery, messaging, GCP, SOLID, skill-creator, etc.
├── guidelines/
│   ├── overview.md              # How guideline validation works, adding bypass comments
│   ├── code-quality.md          # coding-standards, linting-rules, type-design-rules
│   ├── architecture.md          # architecture-rules, api-design-rules
│   ├── data-security.md         # data-modeling-rules, database-operations-rules, security-rules
│   ├── testing-devops.md        # testing-standards, devops-rules, observability-rules
│   └── specialized.md           # ai-implementation-rules, mobile-design-rules, search-rules, writing-style-rules, project-preferences
├── feature-flags.md             # All 10 feature flags — enable/disable/configure
├── architecture.md              # 3-layer architecture, hook pipeline, GICL, DB schema, safety rules
├── multi-platform.md            # Claude Code primary; Cursor/OpenCode/Codex compatibility notes
├── content-generation.md        # What AICodePath generates; external tool suggestions
├── benchmarks/
│   └── README.md                # Skill effectiveness rubric, GICL score distribution, evidence scoring
├── developer/
│   ├── README.md                # Developer guide intro, critical rules
│   ├── hook-authoring.md        # How to write a new hook
│   ├── skill-authoring.md       # How to write a new skill
│   ├── agent-authoring.md       # How to write a new agent
│   └── guideline-authoring.md   # How to write guideline rules
├── user-guide/
│   ├── installation.md          # Full installation guide (install-v2.sh, init, verification)
│   ├── workflow.md              # AIDLC phases explained in depth
│   ├── features.md              # GICL, visual memory, dashboard, swarm, cost tracking, search
│   └── troubleshooting.md       # Common issues, FAQ
└── claude/
    └── v1-114/                  # Claude Code v2.1.113 / Opus 4.7 external reference pack
        ├── README.md                    # Index + provenance caveats (v1.114 ≠ real; v2.1.113 is current)
        ├── changelog.md                 # v2.1.108 – v2.1.113 (Anthropic official, VERBATIM)
        ├── opus-4-7-best-practices.md   # Effort levels, task budgets, 4.6→4.7 migration
        ├── settings-reference.md        # Full settings.json schema, env vars, 5-scope hierarchy
        ├── examples-templates.md        # 10 prompt templates (summary)
        ├── development/                 # 10 dev guides (auto-mode, channels, code-review, etc.)
        ├── performance/                 # 4 perf guides (speed, fast-mode, deep-thinking, efficiency)
        └── agents/                      # 14 agent guides (teams, patterns, validation chains)
```

---

## Key Facts (Current State)

| Component | Count |
|-----------|-------|
| Hooks | 39 (JS files); 42 registered commands across 12 event types |
| Agents | 28 |
| Skills | 95 |
| Guideline files | 29 |
| Feature flags | 10 |
| DB migrations | 6 (015-020); 001-014 consolidated into schema.sql |
| Dashboard port | 3899 |

---

## Quick Command Reference

```bash
# Initialize/repair AICodePath in a project
node .aicodepath/bin/aicodepath.js init

# Update AICodePath (cd into target project first, --source points to cloned aicodepath-tool)
cd ~/workspace/myproject
node .aicodepath/bin/aicodepath.js update --source ~/workspace/aicodepath-tool --dry-run
node .aicodepath/bin/aicodepath.js update --source ~/workspace/aicodepath-tool

# Start the dashboard
bash .aicodepath/scripts/start-dashboard.sh

# Run diagnostics
node .aicodepath/bin/aicodepath.js --help

# Manage feature flags
node .aicodepath/bin/aicodepath.js features list
node .aicodepath/bin/aicodepath.js features enable <name>
node .aicodepath/bin/aicodepath.js features disable <name>

# GICL session management
node .aicodepath/lib/gicl-session-manager.js active
node .aicodepath/lib/gicl-session-manager.js history

# Checkpoint management
node .aicodepath/bin/aicodepath.js checkpoint create --message "Before refactor"
node .aicodepath/bin/aicodepath.js checkpoint list
node .aicodepath/bin/aicodepath.js checkpoint show <id>

# Code graph (manual index)
python3 .aicodepath/generators/parsers/ast_parser.py --index [path]

# Validate project structure
bash .aicodepath/scripts/validate-structure.sh
```
