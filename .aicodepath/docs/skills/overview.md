# Skills — Overview

AICodePath ships 95 skills. Skills are SKILL.md files in `.aicodepath/skills/<name>/SKILL.md`, symlinked into `.claude/skills/` during `aicodepath init`.

Invoke with `/skill-name` in Claude Code (e.g. `/aicodepath-brainstorm`).

---

## How Skills Work

1. User types `/skill-name` in Claude Code
2. Claude Code reads the SKILL.md content via the `Skill` tool
3. Claude follows the skill's instructions exactly (Rigid skills) or adapts principles to context (Flexible skills)

**Rigid skills** (follow exactly): `aicodepath-brainstorm`, `aicodepath-tdd`, `aicodepath-verify`, `aicodepath-confidence-check`

**Flexible skills** (adapt principles): `aicodepath-coding-standards`, `aicodepath-diagrams`

---

## All 93 Skills — Quick Reference

### Core Workflow Chain (invoke in order)

| Skill | Invocation | When |
|-------|-----------|------|
| `using-aicodepath` | Auto-injected | Session start — AIDLC rules and skill activation |
| `aicodepath-knowledge` | `/aicodepath-knowledge` | Session start — read planning/tasks/knowledge files |
| `aicodepath-brainstorm` | `/aicodepath-brainstorm` | Before any feature — design before code (HARD-GATE) |
| `aicodepath-write-plan` | `/aicodepath-write-plan` | After brainstorm approved — TDD-first plan |
| `aicodepath-confidence-check` | `/aicodepath-confidence-check` | Before implementation — 5-dimension confidence scoring |
| `aicodepath-tdd` | `/aicodepath-tdd` | Implementation — Red-Green-Refactor cycle |
| `aicodepath-gicl-start` | `/aicodepath-gicl-start` | Quality loop — iterate until score ≥ 90 |
| `aicodepath-verify` | `/aicodepath-verify` | Before claiming done — evidence required (HARD-GATE) |
| `aicodepath-checkpoint` | `/aicodepath-checkpoint` | Save state — after milestones |

### Planning & Design (PRE-FLIGHT / INCEPTION)

| Skill | Invocation | When |
|-------|-----------|------|
| `aicodepath-preflight` | `/aicodepath-preflight` | Session start — verify environment |
| `aicodepath-requirements` | `/aicodepath-requirements` | Feature start — PRD with clarity score |
| `aicodepath-classify-component` | `/aicodepath-classify-component` | Before brainstorm — classify component type |
| `aicodepath-c4-architecture` | `/aicodepath-c4-architecture` | Architecture diagrams (C4 model) |
| `aicodepath-diagrams` | `/aicodepath-diagrams` | Any visual diagram (ER, sequence, flow) |
| `aicodepath-mental-model` | `/aicodepath-mental-model` | Understand large diffs or brownfield code |
| `aicodepath-visual-memory` | `/aicodepath-visual-memory` | Generate/update codebase diagrams |
| `aicodepath-codebase-pattern-finder` | `/aicodepath-codebase-pattern-finder` | Find existing patterns in codebase |
| `aicodepath-research-mode` | `/aicodepath-research-mode` | Deep multi-hop research with evidence management |
| `aicodepath-codebase-onboarding` | `/aicodepath-codebase-onboarding` | First contact with unfamiliar codebase — structured exploration |
| `aicodepath-reverse-engineer` | `/aicodepath-reverse-engineer` | Brownfield INCEPTION — produce 11 RE documents |
| `aicodepath-write-design` | `/aicodepath-write-design` | After brainstorm approval — synthesize design conversation into document |
| `aicodepath-specify` | `/aicodepath-specify` | Generate structured feature specs from design/RE docs |
| `aicodepath-discover` | `/aicodepath-discover` | Auto-discover full platform ecosystem from a single repo |
| `aicodepath-brownfield-readiness` | `/aicodepath-brownfield-readiness` | Score existing codebase readiness for AI-assisted development |

### Implementation (CONSTRUCTION)

| Skill | Invocation | When |
|-------|-----------|------|
| `aicodepath-tdd` | `/aicodepath-tdd` | Test-first implementation |
| `aicodepath-implement` | `/aicodepath-implement` | Full implementation after design approved |
| `aicodepath-test` | `/aicodepath-test` | Write comprehensive test suites |
| `aicodepath-debug` | `/aicodepath-debug` | Root cause analysis before any fix |
| `aicodepath-validate-guidelines` | `/aicodepath-validate-guidelines` | Validate code against guidelines |
| `aicodepath-analyze` | `/aicodepath-analyze` | Understand/audit/assess code |
| `aicodepath-git` | `/aicodepath-git` | Git operations beyond simple commits |
| `aicodepath-worktree` | `/aicodepath-worktree` | Isolated git worktree for implementation |
| `aicodepath-coding-standards` | Reference only | Naming conventions, import order (not user-invocable) |
| `aicodepath-frontend-design-review` | `/aicodepath-frontend-design-review` | Frontend design system compliance |
| `aicodepath-classify-component` | `/aicodepath-classify-component` | Classify + load design-phase guidelines |
| `aicodepath-search-first` | `/aicodepath-search-first` | Enforce ranked search before any new implementation |
| `aicodepath-benchmark` | `/aicodepath-benchmark` | Measure page/API/build/before-after performance |
| `aicodepath-ai-regression-testing` | `/aicodepath-ai-regression-testing` | Test AI-written code for 7 systematic blind spot patterns |
| `aicodepath-gap-analysis` | `/aicodepath-gap-analysis` | Compare specs vs code — find missing/incomplete features |
| `aicodepath-rules-distill` | `/aicodepath-rules-distill` | Codify recurring patterns into JSON guideline rules |
| `aicodepath-edd` | `/aicodepath-edd` | Define pass/fail eval criteria for AI/agent capabilities (EDD) |
| `aicodepath-harness-eval` | `/aicodepath-harness-eval` | Audit any agentic harness against Nate B. Jones' 12 production primitives; design new harness with Day One / Week One / Month One sequencing |

### Session Management

| Skill | Invocation | When |
|-------|-----------|------|
| `aicodepath-status` | `/aicodepath-status` | Check phase, quality gates, next action |
| `aicodepath-resume` | `/aicodepath-resume` | Resume from last checkpoint |
| `aicodepath-pause` | `/aicodepath-pause` | Create handoff document for session transfer |
| `aicodepath-rewind` | `/aicodepath-rewind` | Restore to previous checkpoint |
| `aicodepath-learn` | `/aicodepath-learn` | Extract lessons, update preferences |
| `aicodepath-knowledge` | `/aicodepath-knowledge` | Read/write planning.md, tasks.md, knowledge.md |
| `aicodepath-efficiency-mode` | `/aicodepath-efficiency-mode` | Token budgeting for large context windows |
| `aicodepath-orchestration-mode` | `/aicodepath-orchestration-mode` | Parallel tool execution for complex work |
| `aicodepath-preferences` | `/aicodepath-preferences` | View/approve/reject learned preferences |
| `aicodepath-context-budget` | `/aicodepath-context-budget` | Token audit across all AICodePath context sources |
| `aicodepath-cruise-control` | `/aicodepath-cruise-control` | Supervised unattended AIDLC execution — auto-advance with gate pauses |

### Team Orchestration

| Skill | Invocation | When |
|-------|-----------|------|
| `aicodepath-swarm` | `/aicodepath-swarm` | Multi-agent team coordination |
| `aicodepath-subagent-dev` | `/aicodepath-subagent-dev` | Dispatch tasks to subagents with two-stage review |
| `aicodepath-orchestrate` | `/aicodepath-orchestrate` | Execute approved plan with dependency-aware scheduling |
| `aicodepath-composite-worker` | `/aicodepath-composite-worker` | Unified TDD→Implement→Self-Review→Build→Commit cycle for a single task |
| `aicodepath-batch` | `/aicodepath-batch` | Process multiple repositories in parallel — ecosystem-wide analysis |
| `aicodepath-autonomous-loops` | Reference only | Taxonomy of 6 autonomous loop patterns with decision matrix (not user-invocable) |

### Implementation (CONSTRUCTION) — continued

| Skill | Invocation | When |
|-------|-----------|------|
| `aicodepath-work` | `/aicodepath-work` | Unified CONSTRUCTION entry point — auto-detects solo/parallel/swarm mode from task count |
| `aicodepath-review` | `/aicodepath-review` | Structured 4-perspective review (Security/Performance/Quality/Accessibility) with A-D grading |
| `aicodepath-release` | `/aicodepath-release` | Release automation — CHANGELOG, version bump, GitHub Release creation |

### Domain-Specific

| Skill | Invocation | When |
|-------|-----------|------|
| `sql-query-optimization` | `/sql-query-optimization` | Slow queries, N+1, missing indexes |
| `celery-worker` | `/celery-worker` | Celery background task configuration |
| `messaging` | `/messaging` | Message queues, event-driven architecture |
| `aicodepath-solid-principles` | `/aicodepath-solid-principles` | SOLID principles review |
| `aicodepath-git-monorepo-config` | `/aicodepath-git-monorepo-config` | Git monorepo setup |
| `aicodepath-gcp-monorepo-deploy` | `/aicodepath-gcp-monorepo-deploy` | GCP deployment for monorepos |
| `aicodepath-dependency-updater` | `/aicodepath-dependency-updater` | Safe dependency updates |
| `aicodepath-web-quality` | `/aicodepath-web-quality` | Web quality audit (performance, a11y, CWV, SEO) |
| `aicodepath-pm` | `/aicodepath-pm` | Product management — PRD, OKR, roadmap, sprint, personas |
| `aicodepath-vapt` | `/aicodepath-vapt` | VAPT audit (OWASP Top 10, PCI DSS, HIPAA, GDPR) |
| `aicodepath-android` | `/aicodepath-android` | Android apps with Kotlin + Jetpack Compose |
| `aicodepath-model-training` | `/aicodepath-model-training` | Autonomous ML experiment loop — modify → train → evaluate → keep/discard → repeat |
| `aicodepath-mcp-builder` | `/aicodepath-mcp-builder` | Build or improve MCP servers (TypeScript or Python) with accuracy-driven hill-climbing |
| `aicodepath-cost-aware-llm` | `/aicodepath-cost-aware-llm` | LLM API cost management — model routing, token budgets, prompt caching |
| `aicodepath-pytorch-patterns` | Reference only | PyTorch training patterns reference (loaded by model-training, not user-invocable) |

### Authoring Lifecycle (Agents & Hooks)

| Skill | Invocation | When |
|-------|-----------|------|
| `aicodepath-agent-creator` | `/aicodepath-agent-creator` | Create or improve an agent — interview, draft, register, hill-climb |
| `aicodepath-agent-audit` | `/aicodepath-agent-audit` | Score agent quality across 6 dimensions (100 pts) — single or batch |
| `aicodepath-hook-creator` | `/aicodepath-hook-creator` | Create or improve a hook — interview, generate code, test, register |
| `aicodepath-hook-audit` | `/aicodepath-hook-audit` | Score hook quality across 6 dimensions (100 pts) — single or batch |

### Utilities & Framework Management

| Skill | Invocation | When |
|-------|-----------|------|
| `aicodepath-init` | `/aicodepath-init` | Initialize/repair AICodePath environment |
| `aicodepath-diagnostics` | `/aicodepath-diagnostics` | Health check — hooks, skills, DB, MCP |
| `aicodepath-help` | `/aicodepath-help` | Contextual help and skill lookup |
| `aicodepath-statusline` | `/aicodepath-statusline` | Configure terminal statusline |
| `aicodepath-naming-analyzer` | `/aicodepath-naming-analyzer` | Analyze/fix naming issues |
| `aicodepath-reducing-entropy` | `/aicodepath-reducing-entropy` | Reduce codebase complexity (manual-only) |
| `aicodepath-readme-crafter` | `/aicodepath-readme-crafter` | Generate audience-appropriate READMEs |
| `aicodepath-command-creator` | `/aicodepath-command-creator` | Create new AICodePath slash commands |
| `aicodepath-skill-creator` | `/aicodepath-skill-creator` | Create/improve skills |
| `aicodepath-skill-audit` | `/aicodepath-skill-audit` | 8-dimension skill quality scoring |
| `aicodepath-skill-testing` | `/aicodepath-skill-testing` | TDD for skill development |
| `aicodepath-skill-improver` | `/aicodepath-skill-improver` | Autonomous hill-climbing improvement for skills scoring below Grade A |
| `aicodepath-acceptance` | `/aicodepath-acceptance` | Sprint acceptance criteria verification — reads tasks.md, checks all DoD |
| `aicodepath-interconnection-diagram` | `/aicodepath-interconnection-diagram` | Generate interactive HTML component map of the full AICodePath framework |

---

## Detailed Skill Documentation

- Core workflow chain → `core-workflow.md`
- Planning & design skills → `planning.md`
- Implementation skills → `implementation.md`
- Session management skills → `session-management.md`
- Team orchestration skills → `team-orchestration.md`
- Domain-specific & utility skills → `domain-specific.md`
- Brownfield readiness → `aicodepath-brownfield-readiness.md`
- New skills (v2.6+) → `new-skills.md`
