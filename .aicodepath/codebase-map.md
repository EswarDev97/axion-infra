# AICodePath Codebase Architecture Map

> Last Updated: 2026-03-31 (v2.13.0)
> Scope: `/aicodepath-tool/.aicodepath/` — the entire AICodePath framework

---

## 1. Directory Taxonomy

Root: `.aicodepath/`

| Directory | Files | Purpose |
|-----------|-------|---------|
| `agents/` | 31 | Claude Code native agent files (YAML frontmatter + MD body) — symlinked from `.claude/agents/` |
| `bin/` | 1 | CLI entry point (`aicodepath.js`) |
| `commands/` | 8 | CLI subcommand handlers: agent, context, dashboard, features, generate, init, phase-state, update |
| `config/` | 2 | Runtime configuration (context-management, writing-style-rules) |
| `db/` | 5 | `schema.sql` (consolidated base, migrations 001-014) + migrations 015-018 |
| `docs/` | 40+ | All documentation — organized by topic for AI agent consumption (< 500 lines each) |
| `docs/agents/` | 32 | Agent reference: overview, architecture-agents, quality-agents, specialist-agents + 28 individual agent docs |
| `docs/developer/` | 5 | Developer guides: README, hook-authoring, skill-authoring, agent-authoring, guideline-authoring |
| `docs/guidelines/` | 6 | Guideline reference: overview, code-quality, architecture, data-security, testing-devops, specialized |
| `docs/hooks/` | 5 | Hook reference: overview, session-lifecycle, pretooluse, posttooluse, userpromptsubmit |
| `docs/skills/` | 7 | Skill reference: overview, core-workflow, planning, implementation, session-management, team-orchestration, domain-specific |
| `docs/user-guide/` | 4 | User guides: installation, workflow, features, troubleshooting |
| `generators/` | ~21+ | Python diagram generators (ER, class, C4, flowchart) + FastMCP graph server |
| `generators/parsers/` | 9 | Python code parsers + graph engine (AST, SQL, TypeScript, SQLAlchemy, Alembic, Dump, language types, graph_engine) |
| `guidelines/` | 16 | JSON validation rule files (200+ rules total) |
| `hooks/` | 39 | Claude Code lifecycle hooks (PreToolUse, PostToolUse, SessionStart, UserPromptSubmit, WorktreeRemove, etc.) |
| `hooks/checkpoint-guard-hook.js` | — | PreToolUse Write hook — blocks checkpoint writes when uncommitted changes exist in active worktree |
| `hooks/lib/` | 11 | Hook utilities: agent-suggester, ws-emitter, exit-codes, validation-recorder, etc. |
| `lib/` | 60+ | Core JS libraries: path-resolver, settings-generator, feature-flags, platform-utils, pricing-calculator, gicl-session-manager, gicl-score-calculator, reflexion-learner, confidence-checker, conversation-searcher, tiered-watcher, session-cache, incremental-session-parser, preference-validator, plan-loader, terminal-*, swarm-*, adapters/ |
| `lib/adapters/` | 3 | Multi-AI adapter system: base-adapter, claude-code-adapter, adapter-manager |
| `lib/provider-detector.js` | — | Iterates adapter list, returns first whose detect() matches input data |
| `lib/providers/anthropic-adapter.js` | — | Normalizes Anthropic API JSON shape to canonical statusline schema |
| `lib/providers/zai-adapter.js` | — | Normalizes z.ai API JSON shape; returns null for rate_limits and cost_usd |
| `lib/__tests__/` | 20+ | Library unit tests (better-sqlite3 `:memory:` DB) |
| `rules/` | varies | Workflow rule markdown files |
| `rules/core/` | 6 | Phase-specific workflows: preamble, pre-flight, inception, construction, operations, adaptive-routing |
| `rules/common/` | 20 | Cross-phase workflow rules |
| `rules/construction/` | 25 | Construction-phase rules |
| `rules/inception/` | 6 | Inception-phase rules |
| `rules/operations/` | 2 | Operations-phase rules |
| `scripts/` | 36 | Utility scripts: init-knowledge-base.sh, install-git-hooks.sh, validate-structure.sh, etc. |
| `skills/` | 95 | Skill directories (each with SKILL.md + Claude Code frontmatter) — symlinked from `.claude/skills/` |
| `skills/aicodepath-commit/` | SKILL.md | Batch boundary commit gate — 8-step flow, swarm mode rules, updates Branch Lifecycle + active-worktree.json |
| `skills/aicodepath-write-design/` | SKILL.md | Design document synthesis — 7 mandatory sections capturing exploration findings, decision rationale, constraints |
| `skills/aicodepath-agent-creator/` | SKILL.md + 5 refs | Agent lifecycle creator: create + improve modes, hill-climbing loop, live spec fetch, registry integration |
| `skills/aicodepath-agent-creator/references/audit-rubric.md` | — | 6-dimension agent scoring rubric (100pts) |
| `skills/aicodepath-agent-creator/references/agent-template.md` | — | Canonical agent frontmatter schema (12 fields) + 5-section body template |
| `skills/aicodepath-agent-creator/references/registration-checklist.md` | — | 3-step registration: DOMAIN_MAPPING, VIOLATION_TYPE_MAPPING, agent-taxonomy.md |
| `skills/aicodepath-agent-creator/references/mutation-strategies.md` | — | D1-D6 rewrite strategies for agent hill-climbing |
| `skills/aicodepath-agent-creator/references/cost-model.md` | — | Time/cost per cycle for agent improvement (3-7 cycles) |
| `skills/aicodepath-agent-audit/` | SKILL.md | Agent quality scorer: 6 dimensions, single + batch modes, letter grade A-F |
| `skills/aicodepath-hook-creator/` | SKILL.md + 7 refs | Hook lifecycle creator: create + improve modes, hill-climbing, persistent test generation |
| `skills/aicodepath-hook-creator/references/audit-rubric.md` | — | 6-dimension hook scoring rubric (100pts) |
| `skills/aicodepath-hook-creator/references/hook-template.js` | — | Canonical hook structure: execute()+main()+fail-open, annotated |
| `skills/aicodepath-hook-creator/references/event-type-reference.md` | — | All 20+ hook event types with I/O schemas, deprecated patterns |
| `skills/aicodepath-hook-creator/references/registration-checklist.md` | — | 4 handler types, ordering rules, feature flag guard pattern |
| `skills/aicodepath-hook-creator/references/mutation-strategies.md` | — | D1-D6 strategies, code mutation constraints |
| `skills/aicodepath-hook-creator/references/test-template.js` | — | runHook() helper + 4 required test case templates |
| `skills/aicodepath-hook-creator/references/cost-model.md` | — | Time/cost per cycle for hook improvement (3-8 cycles) |
| `skills/aicodepath-hook-audit/` | SKILL.md | Hook quality scorer: 6 dimensions, functional+static+registration validation, single + batch modes |
| `skills/aicodepath-model-training/` | SKILL.md + 4 refs | Autonomous ML experiment loop (Karpathy autoresearch pattern): Intake→Loop→Report; PyTorch+CUDA only; configurable metric/threshold/allowlist; git-based keep/discard; GCP VM setup |
| `skills/aicodepath-model-training/references/scaffold-contract.md` | — | prepare.py ↔ train.py interface contract: mandatory output format, seed requirements, checkpoint protocol, VRAM budget guidelines |
| `skills/aicodepath-model-training/references/strategy-skeleton.md` | — | strategy.md generation guide with task-specific research directions (LLM, image, tabular, time-series, detection) |
| `skills/aicodepath-model-training/references/analysis-template.md` | — | Phase 3 report template: improvement history, failure analysis, inference test, cost summary |
| `skills/aicodepath-model-training/references/gcp-vm-setup.md` | — | GCP GPU tier selection, VM creation commands, SSH, cost safety, spot VM guidance |
| `skills/aicodepath-mcp-builder/` | SKILL.md + 4 refs + 3 scripts | MCP server builder: PRE-FLIGHT→CONSTRUCTION→OPERATIONS→EVALUATION→CLIMB LOOP; autoresearch accuracy loop |
| `skills/aicodepath-mcp-builder/references/mcp_best_practices.md` | — | Universal MCP naming, pagination, transport selection, security standards |
| `skills/aicodepath-mcp-builder/references/node_mcp_server.md` | — | TypeScript/Zod MCP implementation patterns and complete examples |
| `skills/aicodepath-mcp-builder/references/python_mcp_server.md` | — | Python/FastMCP/Pydantic MCP implementation patterns and examples |
| `skills/aicodepath-mcp-builder/references/evaluation.md` | — | Evaluation QA creation guide, XML format, running harness |
| `skills/aicodepath-mcp-builder/scripts/evaluation.py` | — | Evaluation harness: stdio/sse/http transport, accuracy scoring, per-question report |
| `skills/aicodepath-mcp-builder/scripts/connections.py` | — | MCP transport connection helpers for evaluation runner |
| `skills/aicodepath-mcp-builder/scripts/requirements.txt` | — | Python dependencies: anthropic, mcp |
| `skills/aicodepath-vapt/` | SKILL.md + 7 refs | VAPT compliance skill: OWASP Top 10, PCI DSS v4.0, HIPAA 164.312, GDPR Art.25, ISO 27001:2022 A.8, NIST 800-53 Rev5, SOX ITGCs — 9-check engine, GICL 6th dimension, evidence report generation |
| `skills/aicodepath-brownfield-readiness/` | SKILL.md | AI-Readiness scorer: delegates to SOLID/VAPT/onboarding specialists, produces scored report (3 dimensions) and optional remediation roadmap |
| `skills/aicodepath-web-quality/` | — | Web quality auditing: performance, Core Web Vitals (LCP/INP/CLS), WCAG 2.2 accessibility, SEO, security/best-practices, full multi-dimension audit |
| `skills/aicodepath-webapp-testing/` | — | Functional browser testing via MCP Playwright (primary) or Python Playwright (fallback); reconnaissance-then-action pattern; server lifecycle via with_server.py |
| `skills/aicodepath-webapp-testing/scripts/with_server.py` | — | Starts one or more servers, waits for port readiness, runs a command, then cleans up |
| `skills/aicodepath-webapp-testing/examples/` | — | Python Playwright examples: element_discovery, console_logging, static_html_automation |
| `skills/aicodepath-pm/` | — | 65 PM skills across 8 domains: discovery, strategy, execution, market research, data analytics, GTM, marketing/growth, PM toolkit |
| `skills/aicodepath-pm/references/pm-artifact-schema.md` | — | Schema for PM Discovery Gate artifacts (hypothesis-personas.md, competitive-awareness.md): required frontmatter, Source values, 90-day staleness rule |
| `skills/aicodepath-android/` | — | SOTA 2025 Android development: Kotlin 2.x, Compose, MVVM, Hilt, Room, type-safe navigation, Baseline Profiles, adaptive UI, edge-to-edge, predictive back |
| `skills/aicodepath-prompt-engg/` | SKILL.md + 10 refs | Generic LLM prompt engineering: symptom-based framework selection (TIDD-EC/RISEN/CO-STAR/Self-Refine/CAI/CoT/RPEF), 8-step workflow, troubleshooting table, HARD-GATE validation — Grade A 109/120 |
| `skills/aicodepath-prompt-engg/references/frameworks/tidd-ec.md` | — | TIDD-EC template (generic): component definitions, gap-by-symptom table, layering guide |
| `skills/aicodepath-prompt-engg/references/frameworks/risen.md` | — | RISEN framework for multi-step analysis sequences |
| `skills/aicodepath-prompt-engg/references/frameworks/co-star.md` | — | CO-STAR framework for persona/domain expertise reinforcement |
| `skills/aicodepath-prompt-engg/references/frameworks/self-refine.md` | — | Self-Refine framework for iterative prompt improvement |
| `skills/aicodepath-prompt-engg/references/frameworks/cai-critique-revise.md` | — | CAI Critique-Revise for schema compliance failures |
| `skills/aicodepath-prompt-engg/references/frameworks/chain-of-thought.md` | — | Chain of Thought for complex reasoning chains; scratchpad pattern |
| `skills/aicodepath-prompt-engg/references/frameworks/rpef.md` | — | RPEF (Role·Parameters·Examples·Format) for cross-provider consistency audits |
| `skills/aicodepath-prompt-engg/references/examples/vehicle-valuation/` | 3 files | Vehicle valuation domain bundle: output-schema.md, attribute-risk-table.md, tidd-ec-template.md |
| `skills/aicodepath-pytorch-patterns/` | SKILL.md | PyTorch reference skill: device-agnostic code, reproducibility, mixed precision, gradient checkpointing, DataLoader best practices, anti-patterns — Sprint 2 Batch 1 |
| `skills/aicodepath-cost-aware-llm/` | SKILL.md | LLM cost management: model routing by complexity, token budget enforcement, cost tracking; references pricing-calculator.js — Sprint 2 Batch 1 |
| `skills/aicodepath-ai-regression-testing/` | SKILL.md | 7 AI blind spot regression patterns, sandbox testing, deterministic judges, scope creep detection — Sprint 2 Batch 1 |
| `skills/aicodepath-edd/` | SKILL.md | Eval-Driven Development (EDD): capability vs regression evals, 3 grader types (LLM/heuristic/human), pass@k metrics, GICL integration — Sprint 2 Batch 1 (renamed from aicodepath-eval-harness v2.12.0) |
| `skills/aicodepath-harness-eval/` | SKILL.md + 3 scripts + 4 refs + evals | Agentic harness auditor: 12 Nate B. Jones production primitives, Design + Evaluate modes (4 scopes), deterministic evidence scripts, golden fixture drift analysis (4 drift cases + 4 invariants), `--pin-baseline` CLI, Claude Code v2.1.88 source map — v2.12.0 |
| `skills/aicodepath-agent-eval/` | SKILL.md | AI agent benchmarking: YAML task definitions, worktree isolation, judge types, metrics, 3+ trials, multi-agent comparison — Sprint 2 Batch 1 |
| `skills/aicodepath-search-first/` | SKILL.md | Ranked search strategy before implementing: codebase → Context7 → package registry → WebSearch; ≥80% match gate — Sprint 2 Batch 2 |
| `skills/aicodepath-rules-distill/` | SKILL.md | Pattern→guideline automation: detect from GICL feedback/knowledge.md/code review, JSON/MD output, false-positive testing — Sprint 2 Batch 2 |
| `skills/aicodepath-context-budget/` | SKILL.md | Context window token audit: budget categories, warning thresholds (60/80/90%), references used_percentage — Sprint 2 Batch 2 |
| `skills/aicodepath-claude-md-improver/` | SKILL.md + 3 refs | CLAUDE.md audit and revise skill: audit mode (5-phase quality assessment A-F across 6 criteria, diff-format proposals) + revise mode (session-end learning capture); AICodePath-aware (assesses root CLAUDE.md, .aicodepath/CLAUDE.md, DEVELOPER-GUIDE.md) |
| `skills/aicodepath-claude-md-improver/references/quality-criteria.md` | — | 6-dimension scoring rubric (100pts): commands/workflows, architecture clarity, non-obvious patterns, conciseness, currency, actionability; AICodePath-specific checks per file; red flags list |
| `skills/aicodepath-claude-md-improver/references/templates.md` | — | CLAUDE.md templates by project type: minimal, comprehensive, monorepo, package/module, AICodePath project root, AICodePath internal .aicodepath/CLAUDE.md |
| `skills/aicodepath-claude-md-improver/references/update-guidelines.md` | — | What to add vs. not add; diff format for updates; AICodePath routing table (which file gets which addition); validation checklist |
| `guidelines/typescript-security-rules.json` | — | TypeScript security rules: no-any-cast, no-eval, no-innerHTML, no-sql-injection, no-hardcoded-secrets; file_patterns: *.ts/*.tsx — Sprint 3 Batch 1 |
| `guidelines/typescript-lint-rules.json` | — | TypeScript lint rules: no-console-log, explicit-return-type, no-non-null-assertion, prefer-const; file_patterns: *.ts/*.tsx — Sprint 3 Batch 1 |
| `guidelines/python-security-rules.json` | — | Python security rules: no-eval-exec, no-shell-true, no-pickle-untrusted, no-hardcoded-secrets; file_patterns: *.py — Sprint 3 Batch 1 |
| `guidelines/python-lint-rules.json` | — | Python lint rules: no-print, type-hints, no-mutable-default, no-bare-except; file_patterns: *.py — Sprint 3 Batch 1 |
| `guidelines/go-security-rules.json` | — | Go security rules: no-sql-injection, no-unsafe, err-not-checked, no-hardcoded-secrets; file_patterns: *.go — Sprint 3 Batch 1 |
| `guidelines/go-lint-rules.json` | — | Go lint rules: no-println, error-wrapping, no-init-func; file_patterns: *.go — Sprint 3 Batch 1 |
| `guidelines/rust-security-rules.json` | — | Rust security rules: no-unsafe-unjustified, no-unwrap-production, no-hardcoded-secrets; file_patterns: *.rs — Sprint 3 Batch 1 |
| `guidelines/rust-lint-rules.json` | — | Rust lint rules: no-dbg, no-todo, prefer-iter; file_patterns: *.rs — Sprint 3 Batch 1 |
| `guidelines/java-security-rules.json` | — | Java security rules: no-sql-injection, no-field-injection, no-hardcoded-secrets, no-system-exit; file_patterns: *.java — Sprint 3 Batch 1 |
| `guidelines/java-lint-rules.json` | — | Java lint rules: no-sysout, no-raw-types, prefer-final; file_patterns: *.java — Sprint 3 Batch 1 |
| `guidelines/kotlin-security-rules.json` | — | Kotlin security rules: no-sql-injection, no-runblocking-prod, no-hardcoded-secrets; file_patterns: *.kt/*.kts — Sprint 3 Batch 1 |
| `guidelines/kotlin-lint-rules.json` | — | Kotlin lint rules: no-println, no-force-unwrap, prefer-val; file_patterns: *.kt — Sprint 3 Batch 1 |
| `rules/construction/typescript-patterns.md` | — | TypeScript construction patterns: discriminated unions, async, module patterns, React patterns, error handling — Sprint 3 Batch 1 |
| `rules/construction/typescript-testing.md` | — | TypeScript testing: Vitest/Jest, mocking, type testing with expectTypeOf, RTL, coverage — Sprint 3 Batch 1 |
| `rules/construction/typescript-hooks.md` | — | TypeScript hook automation: tsc --noEmit, biome/prettier, console.log advisory — Sprint 3 Batch 1 |
| `rules/construction/python-patterns.md` | — | Python construction patterns: PEP 8, type hints, async/await, context managers, dataclasses, Protocol — Sprint 3 Batch 1 |
| `rules/construction/python-testing.md` | — | Python testing: pytest fixtures, parametrize, mocking, conftest, pytest-cov, async tests — Sprint 3 Batch 1 |
| `rules/construction/python-hooks.md` | — | Python hook automation: ruff format, mypy, ruff check; CI mode commands — Sprint 3 Batch 1 |
| `rules/construction/go-patterns.md` | — | Go construction patterns: error handling, goroutine/channel, interface design, context propagation — Sprint 3 Batch 1 |
| `rules/construction/go-testing.md` | — | Go testing: table-driven tests, httptest, benchmarks, testify, gomock — Sprint 3 Batch 1 |
| `rules/construction/go-hooks.md` | — | Go hook automation: gofmt/goimports, go vet, staticcheck, golangci-lint — Sprint 3 Batch 1 |
| `rules/construction/rust-patterns.md` | — | Rust construction patterns: ownership, thiserror/anyhow, traits, builder, newtype, async tokio — Sprint 3 Batch 1 |
| `rules/construction/rust-testing.md` | — | Rust testing: #[cfg(test)], cargo test, proptest, criterion, mockall — Sprint 3 Batch 1 |
| `rules/construction/rust-hooks.md` | — | Rust hook automation: cargo fmt, cargo clippy -D warnings, cargo check; CI mode — Sprint 3 Batch 1 |
| `rules/construction/java-patterns.md` | — | Java construction patterns: Spring Boot layers, JPA/Hibernate, Stream API, Optional, records, sealed interfaces — Sprint 3 Batch 1 |
| `rules/construction/java-testing.md` | — | Java testing: JUnit 5, Mockito, @WebMvcTest slices, TestContainers, AssertJ — Sprint 3 Batch 1 |
| `rules/construction/java-hooks.md` | — | Java hook automation: spotlessApply, gradle check; Spotless Google Java Format, PMD/Checkstyle — Sprint 3 Batch 1 |
| `rules/construction/kotlin-patterns.md` | — | Kotlin construction patterns: coroutines, sealed classes, scope functions, DSL, extension functions, null safety — Sprint 3 Batch 1 |
| `rules/construction/kotlin-testing.md` | — | Kotlin testing: JUnit 5, MockK, kotlinx-coroutines-test, Turbine for Flow — Sprint 3 Batch 1 |
| `rules/construction/kotlin-hooks.md` | — | Kotlin hook automation: ktlintFormat, detekt; CI mode commands — Sprint 3 Batch 1 |
| `skills/aicodepath-autonomous-loops/` | SKILL.md | Reference taxonomy of 6 autonomous loop patterns (sequential/REPL/continuous-PR/parallel-wave/de-sloppify/DAG), decision matrix, pattern-to-skill mapping, race condition avoidance — Sprint 3 Batch 2 |
| `skills/aicodepath-codebase-onboarding/` | SKILL.md | Structured brownfield exploration: stack detection, entry point ID, key flow tracing, convention cataloging, gotcha inventory; outputs onboarding-guide.md — Sprint 3 Batch 2 |
| `skills/aicodepath-benchmark/` | SKILL.md | Performance benchmarking: 4 modes (page/API/build/before-after), measurement tools per stack, standard output table with delta/verdict, baseline storage — Sprint 3 Batch 2 |
| `skills/aicodepath-reverse-engineer/` | SKILL.md | Structured 11-document reverse engineering: functional-spec, data-architecture, integration-points, configuration-reference, operations-guide, technical-debt, observability, visual-design, test-docs, business-context, decision-rationale; dual-path (greenfield/brownfield), commit-hash pinning, incremental refresh — StackShift integration |
| `skills/aicodepath-discover/` | SKILL.md | Ecosystem discovery: 10 signal types (scoped packages, Docker Compose, env vars, API calls, shared DBs, CI/CD triggers, workspace configs, message queues, infra refs, language deps); confidence scoring (CONFIRMED/HIGH/MEDIUM/LOW); Mermaid dependency graph — StackShift integration |
| `skills/aicodepath-specify/` | SKILL.md | Structured spec generation: .specify/ directory with constitution.md + feature specs (F001-FNNN); status markers (COMPLETE/PARTIAL/MISSING/STUB); priority assignment (P0-P3); feeds into gap-analysis and write-plan — StackShift integration |
| `skills/aicodepath-gap-analysis/` | SKILL.md | Spec-vs-code comparison: per-feature completion scoring, [NEEDS CLARIFICATION] markers, prioritized gap report with quick-wins/strategic/low-priority; implementation roadmap generation — StackShift integration |
| `skills/aicodepath-cruise-control/` | SKILL.md | Supervised unattended AIDLC execution: auto-advances minor steps (knowledge, classify, worktree, TDD, GICL, learn, checkpoint); pauses at major gates (design approval, confidence <70%, verification, clarifications); scope/pause/clarify config — StackShift integration |
| `skills/aicodepath-batch/` | SKILL.md | Multi-repo parallel processing: spawns one Agent per repo via swarm infrastructure; operations (analyze/reverse-engineer/specify/gap-analysis); batch report with cross-repo synthesis; monorepo mode — StackShift integration |
| `hooks/spec-sync-validator.js` | — | PreToolUse Bash hook: intercepts git push, validates spec/design docs updated alongside code changes; feature-flagged via spec_sync (default: true/block); configurable mode (block/warn); fails open on errors — StackShift integration |
| `rules/common/parallel-execution.md` | — | When to parallelize (independent reads/analysis/subagent tasks), when NOT to (shared files/deps/migrations), race condition avoidance, cost note — Sprint 3 Batch 3 |
| `rules/common/context-sensitivity.md` | — | Context zones (0-60% normal, 60-80% caution, 80-90% compact, 90%+ emergency), task-specific thresholds, zone-specific behaviors — Sprint 3 Batch 3 |
| `rules/common/lessons-learned.md` | — | Lesson extraction triggers (GICL/verify/post-commit), what TO capture (conventions/quirks/workarounds), what NOT to capture, knowledge.md entry format — Sprint 3 Batch 3 |
| `guidelines/ai-regression-patterns.json` | — | Advisory (info-only) guidelines for test files: sandbox-parity-check, error-cleanup-verification, optimistic-rollback-reminder; file_patterns: *.test.*, *.spec.* — Sprint 3 Batch 3 |
| `rules/construction/language-hook-automation.md` | — | Per-language format/typecheck/lint command reference (TypeScript/Python/Go/Rust/Java/Kotlin), config detection, future promotion path note — Sprint 3 Batch 3 |
| `skills/aicodepath-fluent-design/` | SKILL.md + 10 refs + 18 examples + 1 script | Fluent UI v9 integration skill: Compatibility Gate, 7 Core Principles, 5-file component pattern, Griffel CSS-in-JS, FluentProvider setup, Field ARIA auto-wiring, motion system, accessibility conformance, scaffold script — Fluent 2 integration sprint |
| `skills/aicodepath-fluent-design/references/` | 10 .md files | design-tokens, component-architecture, web-components (46), mobile-components (iOS 12 + Android 5), motion-system, forms-and-validation, ux-patterns, accessibility, conformance-testing |
| `skills/aicodepath-fluent-design/examples/` | 18 .tsx files | button-component (5-file pattern), accordion, tabs (horizontal/vertical/overflow), data-grid (basic/sortable/selectable), dialog-drawer (confirmation/form/overlay/inline), menu-popover (submenu/popover/tooltip), tree (basic/flat/actions), provider-setup, custom-theme, field-validation, presence-motion, conformance-test |
| `skills/aicodepath-fluent-design/scripts/scaffold_fluent_component.py` | — | Generates 7-file Fluent v9 component scaffold: types + hook + styles + render + orchestrator + index + test; Usage: `python3 scaffold_fluent_component.py ComponentName --path ./src/components` |
| `skills/aicodepath-web-design-intelligence/` | SKILL.md + 11 refs + 8 style scaffolds + 3 scripts + 16 data CSVs + 16 stack CSVs | SOTA web design intelligence skill: generates tailored design systems (style + 10-role hex palette + typography + motion/react animations + anti-patterns) from product descriptions. 84 visual styles, 160 color palettes, 73 typography pairings, 34 landing patterns, 161 reasoning rules, 99 UX guidelines. BM25 Python search engine. Defers to fluent-design when Fluent UI detected. MIT-derived from sota-web-design + ui-ux-pro-max-skill by nextlevelbuilder |
| `skills/aicodepath-web-design-intelligence/references/styles/` | 8 .md files | Per-style build scaffolds: 5 full-depth (glassmorphism, neumorphism, neubrutalism, claymorphism, skeuomorphism) + 3 light (bento-grid, dark-mode-premium, minimalism) |
| `skills/aicodepath-web-design-intelligence/scripts/` | 3 .py files | BM25 search engine: search.py (CLI entry, 11 domains, 16 stacks), core.py (ranking), design_system.py (161 reasoning rules processor) |
| `guidelines/fluent-design-rules.json` | — | 6 Fluent 2 compliance rules: no-hardcoded-hex (error), no-global-token-import (error), fluent-provider-required (warning), jsx-pragma-required (error), no-get-slots (error), no-inline-styles (warning); file_patterns: *.tsx/*.ts/*.styles.ts — Fluent 2 integration sprint |
| `templates/` | varies | Core setup templates + dashboard |
| `templates/dashboard/` | ~40 | React/Vite dashboard app (API server port 3888, UI port 3899) |
| `templates/dashboard/src/components/` | includes | Terminal/, CostMetrics.tsx, ConversationsPanel/, ConversationSearch/ |
| `__tests__/` | 25+ | Top-level integration/unit tests (legacy custom-runner format — run with `node <file>`) |
| `hooks/__tests__/` | 9 | Jest-format hook/lib tests — run with `npm test` from `.aicodepath/` |
| `logs/` | — | Winston structured log output |
| `node_modules/` | — | npm dependencies |

Runtime artifact directories (outside `.aicodepath/`, in project root `aicodepath-docs/`):

| Directory | Files | Purpose |
|-----------|-------|---------|
| `aicodepath-docs/design/` | varies | Design document output dir (ADR-006: structured design docs from `/aicodepath-write-design`) |
| `aicodepath-docs/plan/` | varies | Implementation plan output dir (ADR-006: per-sprint plan files from `/aicodepath-write-plan`) |
| `aicodepath-docs/task/` | varies | Per-sprint task file dir (ADR-006: machine-readable task snapshots from `/aicodepath-write-plan`) |

Top-level files in `.aicodepath/`:
- `config.json` — master configuration: dashboard port 3899, feature flags, MCP entries
- `plugin.json` — Claude Code plugin manifest
- `hooks.json` → `hooks/hooks.json` — canonical hook template (settings-generator reads this)
- `CLAUDE.md` — internal developer reference (rewritten v2.5.1)
- `DEVELOPER-GUIDE.md` — contributor quick reference (rewritten v2.5.1)
- `aicodepath-flow.md` — system flow documentation (rewritten v2.5.1)
- `system-diagrams.md` — Mermaid architecture diagrams (rewritten v2.5.1)
- `codebase-map.md` — this file
- `claude-code-official-spec.md` — authoritative Claude Code hook spec reference

---

## 2. v2.5.1 Documentation Overhaul (2026-03-07)

**Scope:** Full documentation rewrite across all personas (user, developer, AI agent).

### New Documentation Structure

All docs reorganized into `.aicodepath/docs/` with files < 500 lines each for AI agent consumption:

| Directory | Files | Covers |
|-----------|-------|--------|
| `docs/hooks/` | 5 files | All 22 hooks by event type, protocol, utilities |
| `docs/agents/` | 32 files | All 29 agents — 4 grouped domain files + 28 individual agent docs |
| `docs/skills/` | 7 files | All 70 skills by category |
| `docs/guidelines/` | 6 files | All 16 guideline files with rule tables |
| `docs/developer/` | 5 files | Hook/skill/agent/guideline authoring guides |
| `docs/user-guide/` | 4 files | Installation, workflow, features, troubleshooting |
| `docs/feature-flags.md` | 1 file | All 10 feature flags with details |
| `docs/README.md` | 1 file | Master index with persona routing |

### Rewrites

| File | Change |
|------|--------|
| `.aicodepath/CLAUDE.md` | Converted from outdated template to accurate internal dev reference |
| `.aicodepath/DEVELOPER-GUIDE.md` | Condensed to quick reference, links to docs/developer/ |
| `.aicodepath/aicodepath-flow.md` | Rewritten with accurate v2.5.1 system flows |
| `.aicodepath/system-diagrams.md` | Rewritten with accurate Mermaid diagrams |
| `CLAUDE.md` (root) | Updated project instructions for Claude |
| `CONTRIBUTING.md` | Updated contributor guide |
| `README.md` | Concise overview, links to docs |
| `QUICKSTART.md` | Updated, merged GETTING_STARTED_VISUAL.md content |
| `GETTING_STARTED.md` | Updated beginner guide |
| `USER_GUIDE.md` | Rewritten as index linking to user-guide/ files |

### Deleted

- `GETTING_STARTED_VISUAL.md` — content merged into `QUICKSTART.md`

---

## 3. v2.6.0 — claude-code-harness Feature Integration (2026-03-13)

**Scope:** ~90 features from reverse-engineering claude-code-harness (v3.9.0) integrated into AICodePath.

### Phase 1: Safety & Guardrails

| New File | Purpose |
|----------|---------|
| `hooks/safety-guardrails.js` | PreToolUse Bash/Write/Edit: R01-R06 declarative safety rules (sudo block, protected paths, rm-rf warn, force-push block) |
| `hooks/post-tool-security-scan.js` | PostToolUse Write/Edit: 5 security anti-pattern warnings (S01-S05: eval injection, XSS, command injection, hardcoded credentials) |
| `hooks/test-tampering-detector.js` | PostToolUse Write/Edit: 12 test tampering patterns (T01-T12: test skips, commented assertions, hardcoded values, CI bypass) |
| `lib/platform-utils.js` | Cross-platform OS helpers; `findExecutable(name)` (which/where), `findPython()` (python3→python with AICODEPATH_PYTHON override) |
| `lib/privacy-filter.js` | Filters credentials from text before memory/log storage; `filterCredentials()`, `isCredentialFile()`, `sanitize()` |
| `__tests__/safety-guardrails.test.js` | 27 tests covering all R01-R06 rules, short-circuit, fallback, tool filtering |
| `__tests__/checkpoint-guard-hook.test.js` | 5 tests: clean/dirty worktree, no active-worktree.json fallback, non-checkpoint path passthrough, file count in reason |
| `__tests__/phase0-baseline.test.js` | 4 tests: script exists+executable, produces JSON at `aicodepath-docs/temp/phase0-baseline.json` with numeric `artifacts`/`links`/`units` keys (Opus 4.7 sprint Batch 1 Task 1) |
| `__tests__/auto-artifact-creator-recursion.test.js` | 3 tests: re-entry guard for `auto-artifact-creator.js` — (a) `ACP_SUPPRESS_AUTO_ARTIFACT=1` env var suppresses insert, (b) `params.metadata.source==='artifact-writer'` suppresses insert, (c) control case confirms normal payload still creates artifact (Opus 4.7 sprint Batch 1 Task 2) |
| `__tests__/migration-runner-privilege.test.js` | 4 tests: primary migration runner (`commands/init-db.js`) exists, uses `PRAGMA foreign_keys=ON`, wraps `applySqlFile` in `BEGIN IMMEDIATE` transactions, and privilege report at `aicodepath-docs/temp/phase0-privilege-report.md` has a Verdict section (Opus 4.7 sprint Batch 1 Task 3) |
| `scripts/phase0-baseline.sh` | Phase 0 diagnostic baseline: counts rows in `artifacts`/`links`/`units` tables from runtime DB and writes JSON snapshot; Opus 4.7 Alignment sprint Batch 1 Task 1 |

**Modified:**
- `lib/config-validator.js` — Added `safety` and `gitOperations` schema sections with enum validation
- `hooks/hooks.json` — Registered 3 new hooks (safety-guardrails on Bash, post-tool-security-scan + test-tampering-detector on Write/Edit PostToolUse)

### Phase 2: Auto Mode Detection & Effort Scoring

| New File | Purpose |
|----------|---------|
| `lib/auto-mode-detector.js` | Detects execution mode (solo/parallel/swarm) from pending task count; `detectMode()`, `countPendingTasks()`, `formatModeResult()`; MODE_THRESHOLDS: SOLO_MAX=1, PARALLEL_MAX=3 |
| `lib/effort-scorer.js` | 5-factor effort scoring; `calculateEffort()` returns `{score, level, symbol, factors, shouldHighEffort}`; threshold=3; `buildEffortGuidance(level, score)` injects Claude Code effort recommendation (low/medium/high) |
| `skills/aicodepath-work/SKILL.md` | Unified CONSTRUCTION entry point; auto-mode detection + effort scoring; solo/parallel/swarm execution flows; failure escalation after 3 consecutive failures |
| `__tests__/auto-mode-detector.test.js` | 30 tests covering task counting (checkbox+table), threshold detection, overrides, parallelCount, formatModeResult |
| `__tests__/effort-scorer.test.js` | 44 tests covering all 5 scoring factors, threshold behavior, level symbols, buildEffortGuidance, HIGH_EFFORT_MARKER (with [ultrathink] legacy alias) |
| `__tests__/pm-gate-behavioral.test.js` | 6 behavioral scenarios for PM Discovery Gate via @anthropic-ai/sdk Messages API (Haiku); covers three-path routing (A/B/C), skip conditions (defined users, feature-level), source-aware citation |
| `__tests__/pm-gate-spike-notes.md` | T0a spike findings: node CLI + @anthropic-ai/sdk confirmed as behavioral test format; Candidate A/B evaluation; T7 DoD update |

### Phase 3: Structured Review System

| New File | Purpose |
|----------|---------|
| `lib/scope-creep-detector.js` | Detects scope creep by comparing tasks.md vs planning.md; `detectScopeCreep()`, `formatReport()`; word-overlap similarity + impact/risk quadrant analysis |
| `lib/fix-proposal-manager.js` | Manages review findings as fix proposals (JSONL); `createProposal()`, `listProposals()`, `updateStatus()`, `recordFailure()`; auto-escalation after 3 consecutive failures |
| `skills/aicodepath-review/SKILL.md` | Structured review skill: code/plan/scope modes; A-D grading; APPROVE/REQUEST_CHANGES; fix proposal flow; depth levels (light/standard/strict) |
| `templates/output-styles/review-output.md` | Standardized output format template for code/plan/scope reviews with grade definitions and severity definitions |
| `db/migrations/016_fix_proposals.sql` | fix_proposals table: id, original_task_id, severity, location, issue, suggestion, auto_fixable, status, failure_category, consecutive_failures |

**Modified:**
- `agents/aicodepath-code-reviewer.md` — Updated with 4-perspective review (Security/Performance/Quality/Accessibility), A-D grading rubric, APPROVE/REQUEST_CHANGES logic, plan review mode, fix proposal flow, review depth levels

### Phase 4: Plans & Task Management Hooks

| New File | Purpose |
|----------|---------|
| `hooks/plans-watcher.js` | PostToolUse Write/Edit: detects changes to tasks.md/planning.md; emits task status snapshot (TODO/WIP/DONE/BLOCKED counts + progress %) as additionalContext |
| `hooks/tdd-order-check.js` | PostToolUse Write/Edit: tracks file writes in-session; warns when production code is written before a test file (TDD violation, warn-only) |
| `hooks/auto-test-runner.js` | PostToolUse Write/Edit: opt-in feature flag `auto_test_runner`; detects npm/pytest/go test command; runs tests asynchronously after source file writes |

**Modified:**
- `hooks/hooks.json` — Added plans-watcher, tdd-order-check, auto-test-runner to PostToolUse Write|Edit matcher
- `skills/aicodepath-write-plan/SKILL.md` — Added 5-column tasks.md format with machine-readable status markers (TODO/WIP/DONE/BLOCKED), DoD validation rules, and spike generation section

### Phase 5: Release & CI/CD

| New File | Purpose |
|----------|---------|
| `skills/aicodepath-release/SKILL.md` | Full release automation: CHANGELOG generation, semantic versioning, git tag, GitHub Release via `gh release create`; dry-run mode |
| `agents/aicodepath-ci-fixer.md` | CI/CD failure recovery agent: reads `gh run view --log-failed`, classifies failures (build/test/lint/dep/deploy/timeout/flaky), proposes/applies targeted fixes |
| `hooks/ci-status-checker.js` | PostToolUse Bash: async CI monitoring after git push; polls `gh run list`; opt-in via `ci_status_checker` feature flag |

**New GitHub Workflows:**
- `.github/workflows/validate-plugin.yml` — Runs validate-structure.sh + all __tests__/*.test.js + hooks.json validity + hook file existence checks on PR
- `.github/workflows/release.yml` — On tag push: runs tests + validates + extracts CHANGELOG section + creates GitHub Release via github-script

**Modified:**
- `templates/claude-settings.json.template` — Added all Phase 1-5 hooks (safety-guardrails on Bash+Write/Edit, ci-status-checker on Bash, post-tool-security-scan + test-tampering-detector + plans-watcher + tdd-order-check + auto-test-runner on PostToolUse Write|Edit); settings.json now has 25 resolved hook paths

### Phase 6: Agent Teams & Session Enhancements

| New File | Purpose |
|----------|---------|
| `lib/swarm-cost-tracker.js` | Estimates and tracks swarm session token costs; `estimateSwarmCost()` with multiplier table (4x no-discussion, 5.5x with Phase 0); `recordWorkerUsage()`, `formatCostSummary()` |
| `lib/agent-inbox.js` | File-based cross-agent message passing (JSONL per recipient); `send()`, `broadcast()`, `receive()`, `markRead()`; priority ordering (urgent/high/normal/low) |
| `lib/session-broadcast.js` | File-based cross-session event bus (single JSONL); `emit()`, `readEvents()`, `emitTaskCompleted()`, `emitTaskFailed()`, `emitCheckpoint()`; enables multi-session coordination |
| `db/migrations/017_agent_inbox.sql` | agent_inbox table: id, from_agent, to_agent, message_type, content, priority, data, read, session_id |
| `db/migrations/018_swarm_cost_tracking.sql` | swarm_cost_tracking table: session_id, worker_id, role, input_tokens, output_tokens, cost_usd, model_id, task_id, phase |

**Modified:**
- `skills/aicodepath-swarm/SKILL.md` — Added Phase 0: Planning Discussion (Planner+Critic pre-swarm validation), cost tracking section with multiplier reference table, agent-inbox and session-broadcast integration examples

### Phase 7: Remaining Features (Partial Overlaps + Low-Value)

| New File | Purpose |
|----------|---------|
| `agents/aicodepath-plan-critic.md` | Plan quality reviewer; 5-criteria evaluation (Clarity/Feasibility/Dependencies/Acceptance/Value); APPROVE/REQUEST_CHANGES verdict; spike detection; read-only |
| `agents/aicodepath-plan-analyst.md` | Plan scope analyst; effort estimation (XS/S/M/L/XL), risk scoring (1-5), dependency graph, wave planning; read-only |
| `agents/aicodepath-error-recovery.md` | Semantic error diagnosis; 6-step protocol; reflexion-learner integration; self-healing patterns table; resolution recording |
| `lib/agent-trace-logger.js` | JSONL audit trail for agent operations (`aicodepath-docs/agent-trace.jsonl`); `trace()`, `startTimer()`, `readTrace(filter)`, `getStats()`; 14 OPERATION_TYPES |
| `skills/aicodepath-composite-worker/SKILL.md` | Unified TDD→Implement→Review→Build→Commit cycle for a single task; used by parallel mode and swarm workers |
| `scripts/migrate-plans-v1-to-v2.js` | Migrates tasks.md from 3-column (v1) to 5-column format (v2) with DoD and Status columns; creates .v1.bak backup |
| `templates/template-registry.json` | Registry of all framework templates with id, name, path, description, category |
| `VERSION` | Single-file version tracking at project root (current: 2.6.0) |
| `hooks/session-auto-cleanup.js` | SessionStart hook (startup/resume only); closes stale GICL sessions (>24h), expires old fix proposals (>7d), prunes agent-inbox messages (>48h); returns additionalContext summary |
| `hooks/worktree-lifecycle.js` | WorktreeCreate (opt-in) + WorktreeRemove (registered by default); create: git worktree + metadata file + trace; remove: clean agent-inbox + trace + broadcast |
| `templates/claude-settings.json.template` — WorktreeRemove + session-auto-cleanup | Registered in SessionStart (session-auto-cleanup) and WorktreeRemove hooks |
| `docs/architecture.md` | 3-layer architecture doc (Profile→Workflow→Skill); hook pipeline, safety rules table, GICL component map, DB schema summary, memory architecture |
| `docs/multi-platform.md` | Platform compatibility notes (Claude Code primary; Cursor/OpenCode/Codex adaptation guidance) |
| `docs/content-generation.md` | Note: no built-in content generation pipelines; external tool suggestions; what AICodePath does generate |
| `docs/benchmarks/README.md` | Benchmark rubrics: skill effectiveness (8 dimensions), GICL score distribution, hook latency targets, evidence scoring (static+executed) |

**Modified:**
- `lib/effort-scorer.js` — Replaced `ultrathink` keyword injection with Claude Code effort level system (`low`/`medium`/`high`); `shouldHighEffort` replaces `shouldUltrathink`; `buildEffortGuidance(level, score)` replaces `buildUltrathinkPrefix()`; `[ultrathink]` accepted as legacy alias for `[high-effort]`
- `lib/auto-workflow-router.js` — Added `EXCLUSION_KEYWORDS` map, `shouldExcludeRoute(message, skill)`, `filterExcludedRoutes(candidates, message)` to prevent false skill matches
- `hooks/gicl-iteration-hook.js` — Integrated effort scoring; calculates effort from file + session description; injects `buildEffortGuidance()` result as `hookSpecificOutput.additionalContext` when level is medium or high
- `skills/aicodepath-work/SKILL.md` — Updated effort scoring section to reference Claude Code effort levels; replaced ultrathink references with `effortLevel` settings
- `skills/aicodepath-brainstorm/SKILL.md` — Added Design Self-Review section (5-criteria evaluation before committing; spike flagging; plan-critic agent reference)
- `__tests__/effort-scorer.test.js` — Updated to 44 tests for new API (`shouldHighEffort`, `buildEffortGuidance`, `HIGH_EFFORT_MARKER`)
- `lib/session-state-manager.js` — Emits `phase_transition` broadcast event via session-broadcast.js when CURRENT_PHASE key is updated
- `hooks/hooks.json` — Registered `session-auto-cleanup.js` (SessionStart) and `worktree-lifecycle.js` (WorktreeRemove)

### Phase 8: Generic Update/Deployment Mechanism

| New File | Purpose |
|----------|---------|
| `scripts/update-aicodepath.sh` | Core update script; rsync-based (`--no-delete`); pre-update diff check with interactive confirmation; timestamped backup; DB migrations; `aicodepath init` regeneration; `--dry-run` support |
| `commands/update.js` | CLI bridge for update command; derives sourceRoot from `__dirname`; spawns update-aicodepath.sh with inherited stdio; `ErrorHandler.wrapCLICommand` pattern |

**Modified:**
- `bin/aicodepath.js` — Added `update [target-path]` command with `--source` and `--dry-run` options
- `scripts/install-v2.sh` — Added `.framework-manifest.json` generation after npm install (records all framework-owned files + version)
- `.aicodepath/version` — Updated `2.0.0` → `2.6.0`
- `.aicodepath/package.json` — Updated `"version"` → `"2.6.0"`

**Usage:**
```bash
node .aicodepath/bin/aicodepath.js update ~/workspace/advisorAICopilot
node .aicodepath/bin/aicodepath.js update ~/workspace/advisorAICopilot --dry-run
```

---

## 3. v2.5.0 Behavioral Layer + Quality Infrastructure (2026-02-26)

> **Implementation Date**: 2026-02-26
> **Features**: Phase 2 (Superpowers/SuperClaude behavioral layer), Phase 3 (commands + agents + MCP), Phase 4 (quality infrastructure), dogfooding session with 4 workflow findings fixed
> **Commits**: a0a28b6 (11 gap fixes), c47d70c (Phase 2), 5d6f35f (Phase 3), 7a9c0ff (Phase 4), f2b4201 (tests + reflexion + dead hooks), 8018e06 (budget forecast), 1027314 (F2+F4 fixes), 78fefeb (F1 fix)
> **Dead Hooks Deleted**: 20 unregistered hook files removed from `.aicodepath/hooks/`
> **New Skills**: 21 new user-invocable skills across Phases 2–4
> **New Tests**: 3 new test suites; pricing-calculator extended from 16 to 46 tests

### Phase 2 — Behavioral Layer (Superpowers/SuperClaude Port)

Key improvements ported from Superpowers and SuperClaude frameworks:

| Change | File | Description |
|--------|------|-------------|
| Session-start hook rewrite | `hooks/session-start-hook.js` | Outputs valid `systemMessage` + `continue` fields (removed `appendToSystemPrompt`) |
| 12+ new skills | `skills/aicodepath-*/SKILL.md` | Behavioral skills: debug, tdd, verify, brainstorm, write-plan, subagent-dev, worktree, pause, learn, knowledge, skill-audit, skill-testing |
| CSO agent descriptions | `agents/*.md` | Descriptions now trigger-conditions only (not workflow summaries) |
| Context7 integration | Rules + agents | Context7 pattern for up-to-date library docs |
| Skill description discipline | Multiple | Fixed all skill descriptions to use trigger-condition format |

**New Skills (Phase 2–4)**:

| Skill | Invocation | Purpose |
|-------|-----------|---------|
| `aicodepath-debug` | `/aicodepath-debug` | Systematic root-cause analysis with reflexion memory lookup (Step 0) |
| `aicodepath-tdd` | `/aicodepath-tdd` | Red-Green-Refactor cycle enforcement |
| `aicodepath-verify` | `/aicodepath-verify` | Iron-law verification before any completion claim |
| `aicodepath-brainstorm` | `/aicodepath-brainstorm` | Design-before-code with 2–3 options, incremental approval |
| `aicodepath-write-plan` | `/aicodepath-write-plan` | TDD-first implementation plans from approved designs |
| `aicodepath-subagent-dev` | `/aicodepath-subagent-dev` | Parallel subagent dispatching with two-stage review |
| `aicodepath-worktree` | `/aicodepath-worktree` | Git worktree isolation before significant implementations |
| `aicodepath-pause` | `/aicodepath-pause` | Session handoff docs with quality scoring (min 70) |
| `aicodepath-learn` | `/aicodepath-learn` | Learning signal extraction and rule update proposals |
| `aicodepath-knowledge` | `/aicodepath-knowledge` | Update tasks.md and knowledge.md during CONSTRUCTION |
| `aicodepath-skill-audit` | `/aicodepath-skill-audit` | 8-dimension skill quality assessment (120-point scoring) |
| `aicodepath-skill-testing` | `/aicodepath-skill-testing` | Skill validation methodology |
| `aicodepath-confidence-check` | `/aicodepath-confidence-check` | Pre-claim confidence calibration |
| `aicodepath-mental-model` | `/aicodepath-mental-model` | Ordered change explanation for onboarding/review |
| `aicodepath-orchestration-mode` | `/aicodepath-orchestration-mode` | Subagent team orchestration mode |
| `aicodepath-efficiency-mode` | `/aicodepath-efficiency-mode` | Token-efficient response mode |
| `aicodepath-research-mode` | `/aicodepath-research-mode` | Research-focused exploration mode |
| `using-aicodepath` | auto-injected | AIDLC workflow rules injected at session start |

### Phase 4 — Quality Infrastructure

#### New Library: `lib/reflexion-learner.js`

Cross-session error pattern learning via SQLite. Records low-score GICL violations as persistent patterns; `findSimilar()` retrieves relevant hints for the debug skill's Step 0.

| Export | Purpose |
|--------|---------|
| `ReflexionLearner` | Class with `recordFailure()`, `recordResolution()`, `findSimilar()`, `markHelpful()`, `formatHints()`, `getStats()` |
| Constructor | `new ReflexionLearner(dbPath, projectRoot)` |

**DB Table** (`015_reflexion_patterns.sql`): `reflexion_patterns` with `error_type`, `description`, `failure_reason`, `occurrence_count`, `helpful_count`, `is_resolved`, `resolution`.

#### New Library: `lib/confidence-checker.js`

Pre-claim confidence calibration — checks for red-flag phrases ("should work", "I think", "probably") before completion claims.

#### Extended: `lib/pricing-calculator.js`

Added to existing `calculateCost()` / `classifyModel()` in v2.4.0:

| New Export | Purpose |
|-----------|---------|
| `COMPLEXITY_BUDGETS` | Token budget constants per complexity tier (trivial→very_complex) |
| `classifyTaskComplexity(description)` | Heuristic complexity detection from task description text |
| `predictBudget(complexity)` | Returns `{outputTokens, estimatedCostUsd}` for a complexity tier |
| `checkBudget(usedTokens, complexity)` | Returns status string ("On track", "Approaching", "Over budget") |
| `buildBudgetLine(complexity, modelId)` | Formats `💰 Budget: <complexity> — ~N output tokens (~$X.XXXX)` line |

#### GICL Lite Mode Budget Integration

`hooks/gicl-iteration-hook.js` `runLiteMode()` now prepends a `buildBudgetLine()` header to every GICL lite context report. Reads `CLAUDE_MODEL_ID` env var for tier-accurate cost estimates.

#### Reflexion Integration in GICL Hook

When GICL session completes with `final < 70`, up to 5 top violations are recorded to `reflexion_patterns` table via `ReflexionLearner`. This enables the debug skill's Step 0 to surface relevant past failures when investigating similar errors.

### New Test Suites

| File | Tests | What's Covered |
|------|-------|----------------|
| `__tests__/reflexion-learner.test.js` | 18 passing | Table creation, recordFailure (4), recordResolution, findSimilar (4), markHelpful (2), formatHints (3), getStats (2) |
| `__tests__/confidence-checker.test.js` | 11 passing | Red-flag detection, confidence levels, phrase analysis |
| `__tests__/suggester-lock.test.js` | 7 passing | Single-writer apply, 4-concurrent-writers no-truncation, lock contention, crash recovery (stale PID), 4-surface coverage, same-file JSON merge, DOMAIN_MAPPING key-collision append |
| `__tests__/pricing-calculator.test.js` | 46 passing (was 16) | All model tiers, cache costs, version extraction, formatting + **classifyTaskComplexity** (13), **predictBudget** (6), **checkBudget** (7), **buildBudgetLine** (4) |

### Dogfooding Session — 4 Workflow Findings Fixed

| Finding | Root Cause | Fix | Commit |
|---------|-----------|-----|--------|
| F1: Preflight blocks in dev repo | `validate-environment.sh` required installed plugins, but dev repo uses local SKILL.md files | Added `DEV_MODE` detection via `.aicodepath/DEVELOPER-GUIDE.md`; plugins shown as "available as local skill" with exit 0 | `78fefeb` |
| F2: Brainstorm writes to gitignored path | Skill used `aicodepath-docs/plan/` (gitignored runtime dir) | Changed to `.aicodepath/docs/plans/` (tracked) | `1027314` |
| F3: Root `docs/` gitignore caught `.aicodepath/docs/` | Git pattern `docs/` matches any depth | Added `!.aicodepath/docs/` exception to `.gitignore` | `c9c1320` |
| F4: Session manager tests missing cost columns | Test schema not updated after migration 012 (9 cost columns) | Added all 9 cost columns to in-memory test setup SQL | `1027314` |

### Modified Files

| File | Change |
|------|--------|
| `hooks/gicl-iteration-hook.js` | Reflexion integration on low-score completion; `buildBudgetLine()` in `runLiteMode()` |
| `lib/pricing-calculator.js` | Added `buildBudgetLine()`, `COMPLEXITY_BUDGETS`, `classifyTaskComplexity()`, `predictBudget()`, `checkBudget()` |
| `skills/aicodepath-debug/SKILL.md` | Added Step 0: Check Reflexion Memory (node -e query before Phase 1) |
| `skills/aicodepath-brainstorm/SKILL.md` | Fixed design doc path: `aicodepath-docs/plan/` → `.aicodepath/docs/plans/` |
| `scripts/validate-environment.sh` | Dev mode auto-detection; plugins demoted to informational in dev repos |
| `__tests__/gicl-session-manager.test.js` | Added 9 migration-012 cost columns to test schema; 4 failures → 13/13 passing |
| `.gitignore` (root) | Added `!.aicodepath/docs/` exception; replaced `aicodepath-docs` dir-ignore with specific file-type patterns |

---

## 3. v2.4.0 P1 Quick Wins: Cost Tracking & Feature Flags

> **Implementation Date**: 2026-02-19
> **Features**: Token usage/cost tracking ported from sidecar Go TUI + centralized feature flag system
> **Files Created**: 8 new files
> **Files Modified**: 9 existing files

### New Library Modules

| File | Purpose | Lines | Key Exports |
|------|---------|-------|-------------|
| `lib/pricing-calculator.js` | Pure-logic Claude API cost calculator | 200+ | `calculateCost()`, `classifyModel()`, `extractVersion()`, `formatCost()`, `MODEL_TIERS`; **v2.5.0 added**: `COMPLEXITY_BUDGETS`, `classifyTaskComplexity()`, `predictBudget()`, `checkBudget()`, `buildBudgetLine()` |
| `lib/feature-flags.js` | Three-tier feature flag manager (CLI > config > env > default) | 250 | `FeatureFlags`, `getInstance()`, `isEnabled()`, `KNOWN_FEATURES` |

### New API Route

| File | Purpose | Endpoints |
|------|---------|-----------|
| `api/routes/cost.js` | Cost data for dashboard | `GET /api/cost/summary`, `/sessions`, `/iterations/:id` |

### New Dashboard Component

| File | Purpose |
|------|---------|
| `templates/dashboard/src/components/CostMetrics.tsx` | Period-based cost/token display with real-time WS updates |

### New CLI Command

| File | Purpose |
|------|---------|
| `commands/features.js` | `features list|enable|disable|info` — manage feature flags via config.json |

### New Database Migration

| File | Tables/Columns |
|------|---------------|
| `db/migrations/012_gicl_cost_tracking.sql` | Adds `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_write_tokens`, `model_id`, `cost_usd` to `gicl_iterations`; adds `total_cost_usd`, `total_input_tokens`, `total_output_tokens` to `gicl_sessions`; creates `cost_summary` table |

### New Test Suites

| File | Tests | Coverage |
|------|-------|----------|
| `__tests__/pricing-calculator.test.js` | 46 passing (extended in v2.5.0, was 16) | All model tiers, cache costs, version extraction, formatting, classifyTaskComplexity, predictBudget, checkBudget, buildBudgetLine |
| `__tests__/feature-flags.test.js` | 10 passing | All priority tiers, persistence, list/info API, env var backward compat |

### Modified Files

| File | Change |
|------|--------|
| `lib/gicl-session-manager.js` | `recordIteration()` stores 6 cost columns, accumulates session totals |
| `hooks/gicl-iteration-hook.js` | Extracts `CLAUDE_*` token env vars, calculates cost per iteration; `isEnabled('gicl')` replaces env var check |
| `hooks/lib/ws-emitter.js` | Added `emitCostUpdate()` |
| `lib/websocket-server.js` | Added `emitCostUpdate()` to emitMethods |
| `templates/dashboard/src/hooks/useWebSocket.ts` | Added `cost_update` case |
| `api/server.js` | Mounted `/api/cost` routes |
| `config.json` | Added `features.flags` object (10 boolean flags) |
| `bin/aicodepath.js` | Registered `features` CLI command |
| `lib/swarm-availability-checker.js` | `isAgentTeamsAvailable()` now uses `isEnabled('swarm')` |

### Pricing Tiers

| Tier | Models | Input $/M | Output $/M |
|------|--------|-----------|------------|
| `opus_new` | Opus 4.5+ | $5.00 | $25.00 |
| `opus_old` | Opus 3/4/4.1 | $15.00 | $75.00 |
| `sonnet` | All Sonnet | $3.00 | $15.00 |
| `haiku_new` | Haiku 4.5+ | $1.00 | $5.00 |
| `haiku_35` | Haiku 3.5 | $0.80 | $4.00 |
| `haiku_old` | Haiku 3 | $0.25 | $1.25 |
| `default` | Unknown | $3.00 | $15.00 |

Cache: reads = 10% of input rate, writes = 125% of input rate.

---

## 4. v2.3.0 Swarm Orchestration Implementation

> **Implementation Date**: 2026-02-08
> **Feature**: Multi-agent team coordination using Claude Code Agent Teams
> **Files Created**: 10 new files (lib modules, skill, agent, hooks, migrations, tests)
> **Files Modified**: 10 existing files (WebSocket, dashboard, config, hooks registration)

### New Library Modules

| File | Purpose | Lines | Key Classes/Functions |
|------|---------|-------|----------------------|
| `lib/swarm-availability-checker.js` | Feature gate for Agent Teams (env var check) | 80+ | `getSwarmStatus()`, `isAgentTeamsAvailable()` |
| `lib/swarm-team-composer.js` | Intelligent team assembly by phase + task context | 350+ | `SwarmTeamComposer`, `composeTeam()`, `buildSpawnPrompt()` |
| `lib/swarm-bridge.js` | SQLite DAG ↔ Claude Code task file synchronization | 500+ | `SwarmBridge`, `syncUnitsToTasks()`, `syncTasksToUnits()`, `startSyncLoop()` |

### New Test Suites

| File | Purpose | Tests | Coverage |
|------|---------|-------|----------|
| `__tests__/swarm-team-composer.test.js` | Team composition logic validation | 30 passing | Phase selection, agent scoring, team size limits |
| `__tests__/swarm-bridge.test.js` | Sync bridge functionality | 14 passing | Unit conversion, dependency translation, polling |

### New Skill & Agent

| File | Purpose | Type |
|------|---------|------|
| `skills/aicodepath-swarm/SKILL.md` | Primary user-invocable skill for team orchestration | Skill (450 lines) |
| `agents/aicodepath-swarm-lead.md` | Team lead agent with delegation persona | Agent (80+ lines) |

### New Database Migration

| File | Purpose | Tables | Schema |
|------|---------|--------|--------|
| `db/migrations/006_swarm_teams.sql` | Team tracking infrastructure | 3 tables | `swarm_teams`, `swarm_team_members`, `swarm_task_mapping` |

### New Hooks

| File | Purpose | Trigger |
|------|---------|---------|
| `hooks/teammate-idle-hook.js` | Reassign idle teammates to pending tasks | TeammateIdle |
| `hooks/task-completed-hook.js` | Validate quality gates before task completion | TaskCompleted |

### Modified Files

| File | Change | Scope |
|------|--------|-------|
| `lib/websocket-server.js` | Add 3 team event emitters | 30 lines |
| `hooks/lib/ws-emitter.js` | Mirror team WebSocket methods | 20 lines |
| `lib/agent-registry.js` | Add `getTeamComposition()` method | 30 lines |
| `hooks/subagent-lifecycle-hook.js` | Team context awareness | 25 lines |
| `config.json` | Add `features.swarm` block | 15 lines |
| `hooks/hooks.json` | Register 2 new hooks | 20 lines |
| `templates/dashboard/src/hooks/useWebSocket.ts` | `SwarmTeam` interface + 3 event handlers | 60 lines |
| `templates/dashboard/src/components/AgentMissionControl/OrchestratorStatus.tsx` | Team name/pattern display | 20 lines |
| `codebase-map.md` | Document all new files | Docs |
| `CLAUDE.md` | Reference swarm skill and patterns | Docs |

### Database Schema (Migration 006)

```sql
-- Team definitions
CREATE TABLE swarm_teams (
  team_name TEXT PRIMARY KEY,
  pattern TEXT,           -- parallel|pipeline|swarm|review
  phase TEXT,            -- PRE-FLIGHT|INCEPTION|CONSTRUCTION|OPERATIONS
  status TEXT,           -- active|disbanded
  created_at DATETIME,
  disbanded_at DATETIME
);

-- Team member assignments
CREATE TABLE swarm_team_members (
  team_name TEXT,
  agent_name TEXT,
  role TEXT,             -- lead|specialist|researcher
  task_count INTEGER,
  PRIMARY KEY (team_name, agent_name)
);

-- Maps DB units to task files
CREATE TABLE swarm_task_mapping (
  unit_id TEXT PRIMARY KEY,
  task_file_id TEXT,
  status TEXT,           -- pending|in-progress|completed|failed
  synced_at DATETIME
);
```

### Team Composition by Phase

| Phase | Pattern | Team Members (max 5) | Use Case |
|-------|---------|----------------------|----------|
| PRE-FLIGHT | Research | architect, devops-architect (2) | Environment validation |
| INCEPTION | Pipeline | architect→api-designer→database-architect→security-engineer (4) | Sequential architecture |
| CONSTRUCTION | Parallel | backend-architect, frontend-architect, test-engineer, database-architect, security-engineer (5) | Parallel feature work |
| OPERATIONS | Research+Impl | sre-engineer, devops-architect, performance-engineer (3) | Incident + optimization |

### WebSocket Events

**New Event Types**:
```javascript
{
  type: 'team_formation',
  data: { teamName, pattern, phase, members: [{agent, role}, ...] }
}

{
  type: 'team_update',
  data: { teamName, status, progress: {pending, inProgress, completed, failed} }
}

{
  type: 'team_member_status',
  data: { teamName, agent, status: 'spawning|active|idle|shutdown', taskCount }
}
```

### Key Features

1. **4 Orchestration Patterns**
   - Parallel Specialists: Independent agents on separate units
   - Pipeline: Sequential handoff with blockedBy dependencies
   - Swarm: Self-organizing agents claiming from task pool
   - Research+Implementation: Two-phase approach

2. **Real-Time Synchronization**
   - 5-second polling loop keeps DB and task files in sync
   - Bidirectional sync: units ↔ task files
   - Automatic DAG-to-blockedBy dependency translation

3. **Intelligent Team Composition**
   - Phase-aware defaults (PRE-FLIGHT → OPERATIONS)
   - Task-context scoring for agent selection
   - Max 5 teammates for cost control

4. **Autonomous Member Management**
   - Idle detection and reassignment via hook
   - Quality gate validation on completion
   - Graceful shutdown with final sync

5. **Feature Gate with Fallback**
   - `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` environment variable
   - Automatic fallback to `/aicodepath-orchestrate`
   - Clear user messaging

---

## 5. v2.3.1 GICL Orchestrator & Validator Improvements

> **Implementation Date**: 2026-02-10
> **Feature**: Governed Iterative Construction Loop with session management, quality scoring, and comprehensive validation fixes
> **Files Created**: 6 new files (3 libraries, 1 skill, 1 hook, 1 migration + tests)
> **Files Modified**: 3 existing files (validators, agent-suggester)
> **Total New Lines**: 2,500+ across all files
> **Test Coverage**: 46 new unit tests

### New Library Modules (GICL Core)

| File | Purpose | Key Classes/Functions | Lines |
|------|---------|----------------------|-------|
| `lib/gicl-session-manager.js` | Session lifecycle CRUD with CLI interface | `GICLSessionManager`, `create()`, `active()`, `get()`, `complete()`, `history()` | 520+ |
| `lib/gicl-score-calculator.js` | Weighted scoring algorithm and complexity detection | `calculateScore()`, `detectComplexity()`, `collectScoreComponents()`, `shouldContinue()` | 380+ |
| `hooks/gicl-iteration-hook.js` | PostToolUse hook integration with DB session lookup | Iteration tracking, score recording, WebSocket events, hard stop logic | 450+ |

### New Skill

| File | Purpose | Type | Invocation |
|------|---------|------|-----------|
| `skills/aicodepath-gicl-start/SKILL.md` | User-invocable skill to create and start GICL sessions | Skill | `/aicodepath-gicl-start <file-or-feature>` |

### New Database Migration

| File | Purpose | Tables | Schema |
|------|---------|--------|--------|
| `db/migrations/009_gicl_sessions.sql` | GICL session and iteration tracking | `gicl_sessions`, `gicl_iterations` | Session metadata, per-iteration scores, complexity, status |

### New Test Suites

| File | Purpose | Test Count | Coverage |
|------|---------|-----------|----------|
| `__tests__/gicl-session-manager.test.js` | Session manager CRUD and lifecycle | 13 tests | Create, read, complete, history, stale session cleanup |
| `__tests__/gicl-score-calculator.test.js` | Score calculation and complexity detection | 25 tests | Component collection, weighting, complexity levels, stop conditions |
| `__tests__/gicl-iteration-hook.test.js` | Hook integration and iteration tracking | 8 tests | Handler validation, score recording, event emission, DB operations |

### Database Schema (Migration 009)

```sql
-- Session tracking
CREATE TABLE gicl_sessions (
  session_id TEXT PRIMARY KEY,
  target_file TEXT,                    -- File being improved
  target_feature TEXT,                 -- Or feature description
  complexity TEXT,                     -- trivial|simple|moderate|complex|very_complex
  status TEXT,                         -- active|completed|blocked
  stop_reason TEXT,                    -- score_target|max_iterations|regression|stalled|manual
  score_history TEXT,                  -- JSON array of scores per iteration
  final_score FLOAT,
  iteration_count INTEGER,
  created_at DATETIME,
  completed_at DATETIME
);

-- Per-iteration metrics
CREATE TABLE gicl_iterations (
  iteration_id TEXT PRIMARY KEY,
  session_id TEXT,
  iteration_num INTEGER,
  tests_score FLOAT,                   -- 35% weight
  guidelines_score FLOAT,              -- 20% weight
  architecture_score FLOAT,            -- 15% weight
  duplication_score FLOAT,             -- 20% weight
  authenticity_score FLOAT,            -- 10% weight
  composite_score FLOAT,               -- Weighted total
  score_delta FLOAT,                   -- Change from previous
  changes_made TEXT,                   -- JSON summary
  suggested_agents TEXT,               -- JSON array
  recorded_at DATETIME
);
```

### Complexity Detection Algorithm

GICL auto-detects complexity from code metrics:

```javascript
function detectComplexity(metrics) {
  const { lines, functionCount, cyclomatic } = metrics;

  if (lines < 50 && functionCount < 5)
    return 'trivial';
  if (lines < 200 && functionCount < 15)
    return 'simple';
  if (lines < 500 && functionCount < 30)
    return 'moderate';
  if (lines < 1000 && functionCount < 50)
    return 'complex';
  return 'very_complex';
}
```

| Complexity | LOC Range | Function Count | Iterations | Use Case |
|------------|-----------|-----------------|-----------|----------|
| **Trivial** | < 50 | < 5 | 5-10 | Single small file or utility |
| **Simple** | 50-200 | 5-15 | 10-15 | Small feature or refactor |
| **Moderate** | 200-500 | 15-30 | 15-20 | Medium feature |
| **Complex** | 500-1000 | 30-50 | 20-30 | Large feature |
| **Very Complex** | > 1000 | > 50 | 25+ | Platform feature |

### Weighted Scoring Formula

```
Quality Score =
  (tests_score × 0.35) +          # Test passing, coverage
  (guidelines_score × 0.20) +     # Code style, maintainability
  (architecture_score × 0.15) +   # Design patterns, modularity
  (duplication_score × 0.20) +    # Code reuse, DRY principle
  (authenticity_score × 0.10)     # Original logic vs boilerplate
```

**Score Interpretation**:
- 80-100: Excellent (ship ready)
- 70-79: Good (minor improvements)
- 60-69: Fair (needs work)
- 50-59: Poor (major issues)
- < 50: Critical (restart recommended)

### Hard Stop Logic

GICL automatically stops iterations when:

```
STOP if: (score >= 90 AND requirements_met)
STOP if: (iterations >= max_configured)
STOP if: (score_delta < -10)  -- Regression detected
STOP if: (stalled_count >= 3)  -- No progress for 3 iterations
```

### WebSocket Events (3 New Types)

```javascript
// Session starts
{ type: 'gicl_session_start', data: { sessionId, target, complexity } }

// Per-iteration completion
{ type: 'gicl_iteration_complete', data: { sessionId, iterNum, score, delta } }

// Session ends
{ type: 'gicl_session_complete', data: { sessionId, finalScore, reason } }
```

### Modified Files

| File | Changes | Lines |
|------|---------|-------|
| `hooks/lib/guideline-validator.js` | Fixed CHECK_HANDLER fallthrough, added file_patterns array support | 25 modifications |
| `hooks/lib/duplication-checker.js` | SQL-aware fallback with boilerplate pattern filtering | 40 lines |
| `hooks/lib/agent-suggester.js` | Expanded DOMAIN_MAPPING (54→95), VIOLATION_TYPE_MAPPING (11→15) | 80 lines |

### Validator Improvements Details

**CHECK_HANDLER Fallthrough Fix**:
- Before: Rules with missing handlers fell through to pattern matching → false positives
- After: Rules with undefined handlers skip entirely → no false positives
- Impact: Restored `no-hallucinated-columns` and `validate-file-type` to error severity safely

**File Pattern Support**:
- Added support for `file_patterns` (plural array) alongside `file_pattern` (singular string)
- Glob-to-regex conversion for accurate file matching
- Enables flexible multi-file rule specification

**Duplication Checker Enhancements**:
- 12 SQL DDL boilerplate patterns filtered
- Higher minimum line length (50 chars) for SQL files
- Prevents false positives in migrations

### Agent Suggester Expansion

**DOMAIN_MAPPING** (54 → 95 entries):
- Frontend: React, Vue, Angular, TypeScript, CSS, responsive, accessibility
- Mobile: iOS, Android, React Native, Flutter, Swift, Kotlin
- UI/UX: design, UI component, wireframe, mockup, prototype
- New coverage for modern tech stacks

**VIOLATION_TYPE_MAPPING** (11 → 15 entries):
- Frontend-specific: layout, styling, responsive design
- Mobile-specific: platform code, device orientation
- Accessibility: WCAG, screen reader support
- Compliance: security audit, data protection, regulatory

### Session Manager CLI Interface

```bash
# Create new session
node .aicodepath/lib/gicl-session-manager.js create \
  --target-file src/app.js \
  --complexity moderate \
  --description "Refactor authentication logic"

# List active sessions
node .aicodepath/lib/gicl-session-manager.js active

# Get session details
node .aicodepath/lib/gicl-session-manager.js get <session-id>

# View history
node .aicodepath/lib/gicl-session-manager.js history --limit 20

# Complete session
node .aicodepath/lib/gicl-session-manager.js complete <session-id> manual_stop
```

### Key Features

1. **Session Persistence** - Save/load session state across Claude Code restarts
2. **Auto-Complexity Detection** - Intelligent effort estimation from code metrics
3. **Weighted Quality Scoring** - 5 components (tests, guidelines, architecture, duplication, authenticity)
4. **Hard Stop Logic** - Auto-complete at score target, max iterations, regression, or stall
5. **Agent Suggestions** - Domain-aware agent recommendation based on violations
6. **WebSocket Integration** - Real-time session progress on dashboard
7. **Lazy DB Init** - Initialize database only when needed
8. **Stale Session Cleanup** - Auto-close sessions inactive >24 hours

---

## 6. v2.3.2 Schema Hallucination Prevention

> **Implementation Date**: 2026-02-15
> **Feature**: Prevent Claude from hallucinating DB column/table names when writing data-layer code
> **Files Created**: 2 new files (1 hook, 1 test suite)
> **Files Modified**: 4 existing files (hooks.json, visual-memory-loader, 2 construction rules)
> **Test Coverage**: 43 unit tests

### Root Cause

Three failures caused Claude to hallucinate schema details:

1. `visual-memory-loader.js` returned `appendToSystemPrompt` — a field that does NOT exist in the Claude Code hook spec. ER diagrams were generated but never injected into context.
2. No PreToolUse hook injected schema context when writing data-layer files (repositories, models, entities).
3. Construction rules didn't enforce reading actual schema files before code generation.

### New Hook: `schema-context-hook.js`

| File | Event | Trigger | Blocking | Purpose |
|------|-------|---------|----------|---------|
| `hooks/schema-context-hook.js` | PreToolUse | Write/Edit | No | Inject actual DB schema via `hookSpecificOutput.additionalContext` |

**Logic Flow**:
1. Check if target `file_path` matches data-layer patterns (15 directory + 10 filename patterns)
2. **Fast Path**: Read cached `.claude/rules/schema-context.md` if fresh (< 1 hour)
3. **Discovery Path**: Scan project for schema sources:
   - AICodePath ER diagrams (`aicodepath-docs/memory/global/er/*.md`)
   - Schema designs (`aicodepath-docs/construction/*/database-design/schema-design.md`)
   - SQL migrations (`**/migrations/*.sql`)
   - Prisma schemas (`**/schema.prisma`)
   - Drizzle schemas (`**/drizzle/schema.ts`, `**/db/schema.ts`)
   - Raw SQL (`**/schema.sql`, `**/init.sql`)
4. Parse discovered sources (SQL `CREATE TABLE`, Prisma `model`, Drizzle `pgTable`)
5. Persist to `.claude/rules/schema-context.md` with path-specific YAML frontmatter
6. Return `hookSpecificOutput.additionalContext` for immediate use

**Data-Layer File Detection Patterns**:
- Directories: `repositories/`, `models/`, `entities/`, `queries/`, `dao/`, `mappers/`, `controllers/`, `prisma/`, `drizzle/`, `migrations/`
- Filenames: `.repository.`, `.model.`, `.entity.`, `.query.`, `.dao.`, `.mapper.`, `.schema.`, `.prisma`, `.sql`

**Exported Functions** (for testing):
`isDataLayerFile()`, `parseSQL()`, `parsePrisma()`, `buildSchemaContext()`, `persistSchemaContext()`, `formatTablesAsContext()`, `extractSchemaSection()`, `extractDrizzleTables()`

### Modified: `visual-memory-loader.js`

**Before**: Returned `appendToSystemPrompt` (non-functional Claude Code field) with ER diagram content.

**After**:
- Removed all `appendToSystemPrompt` returns
- Added `writeSchemaContextRule()` — writes ER diagrams to `.claude/rules/schema-context.md` with path-specific YAML frontmatter targeting data-layer files
- Claude Code natively auto-loads this file when editing matching paths
- Returns `systemMessage` for user feedback

### Modified: `hooks.json`

Added `schema-context-hook.js` as **first** hook in PreToolUse `Write|Edit` matcher (before `guideline-validator.js`), ensuring schema context is available before validation runs.

### Modified: Construction Rules

| File | Change |
|------|--------|
| `rules/construction/code-generation.md` | Added **Step 4.5: Schema Verification (MANDATORY)** — requires reading actual schema files before writing data-layer code |
| `rules/construction/database-design.md` | Added **Step 2.5: Persist Schema Context** — after schema design, persist to `.claude/rules/schema-context.md` |

### Test Suite

| File | Tests | Coverage |
|------|-------|----------|
| `__tests__/schema-context-hook.test.js` | 43 tests | Data-layer detection (21), SQL parsing (7), Prisma parsing (4), format/extract (5), hook integration (4), edge cases (2) |

### `.claude/rules/schema-context.md` Format

```markdown
---
paths:
  - "src/**/repositories/**"
  - "src/**/models/**"
  - "src/**/entities/**"
  - "src/**/queries/**"
  - "**/*.repository.*"
  - "**/*.model.*"
  - "**/*.entity.*"
  - "**/*.prisma"
  - "**/migrations/**"
---

# Database Schema Reference

IMPORTANT: When writing data-layer code, you MUST use ONLY the tables and
columns defined below. Do NOT invent or assume column names.

## Table Definitions
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PK |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
...
```

---

## 7. Enhancement Blueprint Changes (S1-S8, M1-M6)

> **S1-S8 Implementation Date**: 2026-02-05
> **M1-M6 Implementation Date**: 2026-02-06
> **Version**: v2.2 (S1-S8) + Phase 6 Medium-Term Enhancements (M1-M6)
> **Scope**: AICodePath Enhancement Blueprint - 8 short-term + 6 medium-term architectural improvements

### S1: Hook Registration System

**Problem**: Manual hook registration in `.claude/settings.json` prone to path errors and configuration drift.

**Solution**: Automated `.claude/settings.json` generation with absolute paths.

**Implementation**:
- **New File**: `.aicodepath/lib/settings-generator.js`
  - `generateClaudeSettings()` function creates complete settings file
  - Resolves all hook paths to absolute locations
  - Generates hook matchers for each phase (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse)
- **Updated**: `.aicodepath/commands/init.js`
  - Now calls `settings-generator.js` during project initialization
  - Eliminates manual configuration steps
- **Configuration Output**: `.claude/settings.json` with structure:
  ```json
  {
    "hooks": {
      "sessionStart": [{"command": "/absolute/path/.aicodepath/hooks/session-start-hook.js"}],
      "userPromptSubmit": [{"command": "..."}],
      "preToolUse": [{"command": "...", "matcher": "..."}],
      "postToolUse": [{"command": "...", "matcher": "..."}]
    }
  }
  ```

**Benefits**:
- Zero configuration errors from typos or relative paths
- Consistent hook registration across projects
- Automated hook discovery and registration

---

### M1: Plugin Packaging for Claude Code

**Problem**: AICodePath not packaged as a Claude Code plugin, requiring manual installation and configuration.

**Solution**: Created plugin manifest and hooks registry following Claude Code Plugin SDK conventions.

**Implementation**:
- **New File**: `.aicodepath/plugin.json` (40 lines)
  - Claude Code plugin manifest with metadata
  - References to skills, agents, and hooks
  - Version and compatibility information
- **New File**: `.aicodepath/hooks/hooks.json` (200+ lines)
  - Comprehensive hook registry with 17 hook definitions
  - Uses `${CLAUDE_PLUGIN_ROOT}/` paths for portability
  - Structured by lifecycle (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse)
  - Includes matchers for file-type-specific hooks

**Benefits**:
- One-command installation via Claude Code plugin system
- Automatic hook registration without manual configuration
- Better compatibility with Claude Code ecosystem
- Easier distribution and version management

---

### M2: Checkpoint Recovery System

**Problem**: No mechanism to save/restore intermediate workflow states, leading to lost work on crashes or context issues.

**Solution**: Comprehensive checkpoint management system with save/load/list/prune capabilities.

**Implementation**:
- **New File**: `.aicodepath/lib/checkpoint-manager.js` (450+ lines)
  - Core checkpoint module with save/load/list/prune functions
  - Checkpoint metadata: timestamp, phase, stage, unit, artifacts, validation status
  - File-based storage in `aicodepath-docs/checkpoints/`
  - Automatic pruning of old checkpoints (configurable retention)
- **New File**: `.aicodepath/lib/__tests__/checkpoint-manager.test.js` (120 lines)
  - Comprehensive test suite for checkpoint operations
  - Tests for save, load, list, prune, error handling
- **New File**: `.aicodepath/docs/M2-checkpoint-recovery-system.md`
  - Full documentation of checkpoint system design
  - API reference and usage examples
- **New File**: `.aicodepath/docs/checkpoint-quick-reference.md`
  - Quick reference guide for checkpoint operations
  - Common scenarios and troubleshooting
- **New File**: `.aicodepath/M2-IMPLEMENTATION-SUMMARY.md`
  - Implementation summary and testing results

**Benefits**:
- Recover from crashes or context window issues
- Save work-in-progress states for later resumption
- Time-travel debugging capabilities
- Automatic cleanup of stale checkpoints

---

### M3: Phase State Machine

**Problem**: Workflow phase transitions were manual and error-prone, lacking validation and automatic progression logic.

**Solution**: Formal state machine with defined transitions, entry/exit gates, and validation rules.

**Implementation**:
- **New File**: `.aicodepath/lib/phase-state-machine.js` (592 lines)
  - Complete state machine implementation
  - Phase definitions: pre-flight, inception, construction, operations, maintenance, closure
  - Transition validation and guards
  - Entry/exit gate enforcement
- **New File**: `.aicodepath/commands/phase-state.js` (446 lines)
  - CLI tool for phase management: `npx aicodepath phase-state`
  - Commands: current, transition, history, validate, force
  - Interactive prompts for guided transitions
- **New File**: `.aicodepath/lib/PHASE-STATE-MACHINE-README.md` (582 lines)
  - Complete usage guide and API reference
  - Phase definitions and transition rules
  - CLI command examples
- **New File**: `.aicodepath/lib/phase-state-machine-diagram.md` (364 lines)
  - Visual state machine diagrams
  - Flow charts for phase transitions
  - Decision trees for guards
- **New File**: `.aicodepath/lib/__test_state_machine.js` (130 lines)
  - Unit tests for state machine logic
- **New File**: `.aicodepath/lib/__test_session_integration.js` (137 lines)
  - Integration tests with session management
- **New File**: `.aicodepath/M3-PHASE-STATE-MACHINE-IMPLEMENTATION.md`
  - Implementation documentation and design decisions

**Benefits**:
- Prevents invalid phase transitions
- Enforces quality gates before progression
- Clear audit trail of workflow progression
- Automated phase transition suggestions

---

### M4: MCP Configuration Generation

**Problem**: Manual `.mcp.json` creation was error-prone and inconsistent with `config.json` settings.

**Solution**: Automated transformation from `config.json` to `.mcp.json` with validation.

**Implementation**:
- **New File**: `.aicodepath/lib/mcp-config-generator.js` (240 lines)
  - Transform `config.json` to `.mcp.json` format
  - MCP server configuration mapping
  - Validation and schema checking
  - Support for custom MCP servers
- **New File**: `.aicodepath/lib/__tests__/mcp-config-generator.test.js` (230 lines)
  - Comprehensive test suite for config generation
  - Tests for transformation, validation, edge cases
- **New File**: `.aicodepath/lib/examples/mcp-config-examples.js` (115 lines)
  - Usage examples for common MCP configurations
  - Code samples for custom transformations
- **New File**: `.aicodepath/docs/mcp-config-generation.md` (350 lines)
  - Full documentation of MCP config system
  - Mapping rules and customization options
- **New File**: `.aicodepath/docs/mcp-quick-reference.md` (230 lines)
  - Quick reference for MCP configuration
  - Common patterns and troubleshooting
- **New File**: `.aicodepath/M4-IMPLEMENTATION-SUMMARY.md`
  - Implementation summary and examples

**Benefits**:
- Single source of truth in `config.json`
- Automatic `.mcp.json` generation during init
- Reduced configuration errors
- Easier MCP server management

---

### M5: Hook Service Facade (HookContext)

**Problem**: Hooks accessed services directly, leading to initialization overhead and coupling.

**Solution**: Unified `HookContext` facade with lazy initialization and shared service instances.

**Implementation**:
- **New File**: `.aicodepath/lib/hook-context.js` (301 lines)
  - `HookContext` class with lazy-loaded services
  - Services: database, logger, pathResolver, validator, artifactWriter, visualMemory, checkpointManager, phaseStateMachine
  - Shared instances across hooks to reduce overhead
  - Graceful error handling and fallbacks
- **New File**: `.aicodepath/test-hook-context.js` (64 lines)
  - Test suite for HookContext functionality
- **New File**: `.aicodepath/HOOK-CONTEXT-GUIDE.md`
  - Developer guide for using HookContext in hooks
  - Migration guide from direct service access
- **New File**: `.aicodepath/M5-IMPLEMENTATION-SUMMARY.md`
  - Implementation summary and benefits
- **New File**: `.aicodepath/M5-COMPLETE-OVERVIEW.md`
  - Complete overview of HookContext architecture

**Benefits**:
- Reduced hook initialization time
- Shared service instances reduce memory usage
- Easier testing with mockable facade
- Consistent service access patterns

---

### M6: Session Resumption System

**Problem**: No automatic detection or resumption of previous workflow sessions after interruptions.

**Solution**: Auto-detect incomplete sessions and offer intelligent resumption options.

**Implementation**:
- **New File**: `.aicodepath/lib/session-resumption.js` (523 lines)
  - Detect interrupted sessions automatically
  - Analyze session state and suggest resumption actions
  - Integration with checkpoint system
  - Smart context restoration
- **New File**: `.aicodepath/lib/test-session-resumption.js`
  - Test suite for session detection and resumption

**Benefits**:
- Automatic session recovery after crashes
- No manual session state reconstruction
- Intelligent suggestions for next actions
- Seamless workflow continuity

---

### S2: Skill Frontmatter Migration

**Problem**: Skills lacked Claude Code-native metadata for IDE integration and discovery.

**Solution**: Migrated all 23 SKILL.md files to Claude Code frontmatter format.

**Implementation**:
- **Files Updated**: All `.aicodepath/skills/*/SKILL.md` files
- **New Frontmatter Fields**:
  ```yaml
  ---
  user-invocable: true
  allowed-tools:
    - Read
    - Grep
    - Bash
    - WebSearch
  argument-hint: "Specify action: analyze, propose, apply"
  ---
  ```
- **Skills Updated**: 23 total including:
  - `aicodepath-learn`, `aicodepath-help`, `aicodepath-status`
  - `aicodepath-preferences`, `aicodepath-resume`, `aicodepath-pause`
  - `aicodepath-init`, `aicodepath-preflight`, `aicodepath-diagnostics`
  - All architecture, development, quality, and documentation skills

**Benefits**:
- Better IDE autocomplete and skill discovery
- Tool usage validation and restrictions
- Clearer argument documentation for users

---

### S3: Symlink Skill Manager

**Problem**: Claude Code expects skills in `.claude/skills/` but single source of truth is `.aicodepath/skills/`.

**Solution**: Per-file symlink strategy managed by dedicated utility.

**Implementation**:
- **New File**: `.aicodepath/lib/symlink-manager.js`
  - `setupSkillSymlinks()` creates individual symlinks for each SKILL.md
  - `cleanupBrokenSymlinks()` removes stale links
  - Per-file strategy (not directory-level) for granular control
- **Updated**: `.aicodepath/commands/init.js`
  - Calls `symlink-manager.setupSkillSymlinks()` during initialization
- **Symlink Structure**:
  ```
  .claude/skills/
    ├── aicodepath-learn.md -> ../../.aicodepath/skills/aicodepath-learn/SKILL.md
    ├── aicodepath-help.md -> ../../.aicodepath/skills/aicodepath-help/SKILL.md
    └── ... (24 total symlinks)
  ```

**Benefits**:
- Single source of truth in `.aicodepath/skills/`
- Satisfies Claude Code's `.claude/` requirement
- Automatic cleanup of broken links

---

### S4: Native Agent Migration

**Problem**: Agent roles in `skills/roles/` didn't match Claude Code's native agent structure.

**Solution**: Migrated 24 agents to `.aicodepath/agents/` with Claude Code frontmatter.

**Implementation**:
- **New Directory**: `.aicodepath/agents/`
- **Files Migrated**: 24 agent files from `.aicodepath/skills/roles/*.md`
  - `architect.md`, `api-designer.md`, `backend-architect.md`
  - `code-reviewer.md`, `security-engineer.md`, `performance-engineer.md`
  - `devops-architect.md`, `sre-engineer.md`, `cost-optimizer.md`
  - `data-scientist.md`, `ml-engineer.md`, `ui-designer.md`, `ux-designer.md`
  - And 11 more specialized roles
- **Frontmatter Format**:
  ```yaml
  ---
  name: architect
  category: architecture
  capabilities:
    - system-design
    - scalability
    - design-patterns
  triggers:
    - architecture review
    - system design
  priority: high
  context-budget: 12000-15000
  ---
  ```
- **Updated**: `.aicodepath/lib/agent-loader.js`
  - Now reads from `.aicodepath/agents/` FIRST
  - Falls back to `.aicodepath/skills/roles/` for backward compatibility
- **Symlink Integration**:
  - `symlink-manager.setupAgentSymlinks()` creates `.claude/agents/` links
  - Structure: `.claude/agents/architect.md -> ../../.aicodepath/agents/architect.md`

**Benefits**:
- Native Claude Code agent support
- Better IDE integration for agent discovery
- Maintains backward compatibility with existing projects

---

### S5: Centralized Database Paths

**Problem**: Database path `aicodepath-docs/aicodepath.db` hardcoded across 17+ files.

**Solution**: Centralized `getDbPath()` function in `path-resolver.js` with environment variable override.

**Implementation**:
- **Updated**: `.aicodepath/lib/path-resolver.js`
  - Added `getDbPath()` function:
    ```javascript
    function getDbPath() {
      // Check environment variable first
      if (process.env.AICODEPATH_DB_PATH) {
        return path.resolve(process.env.AICODEPATH_DB_PATH);
      }
      // Default to project-specific location
      const projectRoot = findProjectRoot();
      return path.join(projectRoot, 'aicodepath-docs', 'aicodepath.db');
    }
    ```
- **Files Updated**: 17 total across hooks and libs
  - **Hooks**: `session-start-hook.js`, `auto-artifact-creator.js`, `gicl-iteration-hook.js`, `visual-memory-generator.js`, `visual-memory-loader.js`, `visual-memory-sync.js`, `pre-commit-validator.js`, `architecture-validator.js`, `data-validator.js`, `duplication-checker.js`, `devops-validator.js`, `iac-validator.js`, `ci-lint-hook.js`
  - **Hook libs**: `implementation-verifier.js`, `requirements-parser.js`
  - **Scripts**: `backfill-artifacts.js`, `backfill-visual-memory-db.js`

**Environment Variable**:
```bash
export AICODEPATH_DB_PATH=/custom/path/to/database.db
```

**Benefits**:
- Single source of truth for database location
- Enables per-project or per-environment DB configuration
- Easier testing with isolated databases
- Reduced maintenance burden

---

### S6: Core Workflow Split

**Problem**: Monolithic `core-workflow.md` (56KB) caused context bloat and poor LLM performance.

**Solution**: Split into 6 phase-specific rule files with adaptive loading.

**Implementation**:
- **New Directory**: `.aicodepath/rules/core/`
- **New Files** (6 total):
  1. **`preamble.md`** (8.2KB)
     - Core principles applicable to all phases
     - Pattern library and common practices
     - Imported by all phase rules

  2. **`pre-flight.md`** (10.8KB)
     - Project initialization and environment setup
     - Plugin validation and MCP server checks
     - Database and structure verification

  3. **`inception.md`** (15.9KB)
     - Requirements analysis and user story creation
     - Workspace detection (greenfield vs brownfield)
     - Design document preparation

  4. **`construction.md`** (21.7KB)
     - GICL iterative implementation loop
     - Code generation and quality gates
     - Test-driven development workflow

  5. **`operations.md`** (9.4KB)
     - Deployment procedures and monitoring
     - Production readiness checks
     - Incident response and rollback

  6. **`adaptive-routing.md`** (6.8KB)
     - Phase transition detection logic
     - Routing decisions based on project state
     - Context optimization strategies

- **Updated**: `.aicodepath/hooks/session-start-hook.js`
  - Detects current workflow phase from database
  - Loads `preamble.md` + current phase rule + `adaptive-routing.md`
  - Phase detection logic:
    ```javascript
    const phase = getCurrentPhase(db); // pre-flight | inception | construction | operations
    const rules = [
      fs.readFileSync(path.join(rulesCore, 'preamble.md'), 'utf8'),
      fs.readFileSync(path.join(rulesCore, `${phase}.md`), 'utf8'),
      fs.readFileSync(path.join(rulesCore, 'adaptive-routing.md'), 'utf8')
    ].join('\n\n---\n\n');
    ```

**Context Reduction**:
| Phase | Rule Size | Context Savings vs 56KB Monolith |
|-------|-----------|----------------------------------|
| Pre-flight | 25.8KB | 54% reduction |
| Inception | 30.9KB | 45% reduction |
| Construction | 36.7KB | 34% reduction |
| Operations | 24.2KB | 57% reduction |

**Benefits**:
- Dramatic context window optimization (34-57% reduction per phase)
- Faster LLM inference with focused rules
- Better phase-specific guidance
- Easier maintenance and updates to individual phases

---

### S7: GICL Enabled by Default

**Problem**: Git-Integrated Context Learning (GICL) was opt-in, reducing adoption and effectiveness.

**Solution**: Changed GICL to enabled by default with opt-out mechanism.

**Implementation**:
- **Updated**: `.aicodepath/hooks/gicl-iteration-hook.js`
  - Changed logic from checking `AICODEPATH_GICL_ENABLED=true` to `AICODEPATH_GICL_DISABLED !== 'true'`
  - Default behavior: GICL runs on every Write/Edit operation
  - Opt-out: Set environment variable to disable
    ```javascript
    if (process.env.AICODEPATH_GICL_DISABLED === 'true') {
      logger.info('GICL iteration skipped (disabled via environment variable)');
      return;
    }
    ```

**Opt-Out Configuration**:
```bash
# Disable GICL for current session
export AICODEPATH_GICL_DISABLED=true

# Or in .env file
AICODEPATH_GICL_DISABLED=true
```

**Benefits**:
- Automatic context preservation in git workflow
- Better requirement tracking out-of-the-box
- Improved code quality from continuous verification
- Users can still opt-out when needed (e.g., rapid prototyping)

---

### S8: Structured Error Logging

**Problem**: Inconsistent logging with `console.error`, `console.warn`, `console.log` across hooks.

**Solution**: Migrated all hooks to structured `logger` module with severity levels.

**Implementation**:
- **Files Updated**: 25+ hook files
  - All validators: `guideline-validator.js`, `api-validator.js`, `architecture-validator.js`, `data-validator.js`, `duplication-checker.js`, `devops-validator.js`, `iac-validator.js`
  - All suggesters: `inception-skill-suggester.js`, `construction-skill-suggester.js`, `maintenance-skill-suggester.js`, `document-skill-suggester.js`
  - Core hooks: `session-start-hook.js`, `pre-flight-check.js`, `auto-artifact-creator.js`, `gicl-iteration-hook.js`, `visual-memory-generator.js`, `visual-memory-loader.js`, `visual-memory-sync.js`
  - Additional: `pre-commit-validator.js`, `validate-mcp-memory.js`, `validate-plan-output.js`, `ci-lint-hook.js`, `phase-entry-validator.js`, `run-tests.js`, `damage-control.js`

- **Migration Pattern**:
  ```javascript
  // OLD (unstructured)
  console.error(`[hook-name] Error: ${message}`);
  console.warn(`[hook-name] Warning: ${message}`);
  console.log(`[hook-name] Info: ${message}`);

  // NEW (structured)
  const logger = require('../lib/logger');
  logger.error('Error occurred', { hook: 'hook-name', error: err });
  logger.warn('Warning condition', { hook: 'hook-name', details });
  logger.info('Operation completed', { hook: 'hook-name', result });
  ```

- **Logger Configuration**: `.aicodepath/lib/logger.js`
  - Winston-based structured logging
  - Multiple transports: Console + File
  - Severity levels: error, warn, info, debug
  - Metadata support for structured data
  - Log rotation and archiving

**Benefits**:
- Consistent log formatting across all hooks
- Better debugging with structured metadata
- Easier log parsing and analysis
- Support for log aggregation tools
- Improved error tracking and monitoring

---

### S9: Multi-Tab Terminal Integration

**Problem**: Developers need to run commands and view output without leaving the dashboard.

**Solution**: Embedded terminal functionality using xterm.js with multi-tab support and WebSocket-based PTY management.

**Implementation**:
- **New File**: `.aicodepath/lib/terminal-session-manager.js` (420+ lines)
  - PTY (pseudo-terminal) session management using node-pty
  - Session lifecycle: create, attach, write, resize, close
  - Security controls: command blocking, path validation, sandbox mode
  - Automatic cleanup of idle sessions
  - Singleton manager with configurable options
- **New File**: `.aicodepath/lib/terminal-websocket-handler.js` (230+ lines)
  - WebSocket handler for terminal communication
  - Message routing: create, input, resize, close, list, stats
  - Auto-reconnection with exponential backoff
  - Integration with main API server
- **New File**: `.aicodepath/lib/terminal-sandbox.js` (370+ lines)
  - Security validation for terminal commands
  - Three security levels: permissive, restricted, strict
  - Command whitelist/blacklist management
  - Path validation and environment filtering
  - Audit logging for all commands
- **New File**: `.aicodepath/lib/__tests__/terminal-session-manager.test.js` (380+ lines)
  - Comprehensive test suite for terminal manager
  - Tests for session lifecycle, security, sandbox
  - Mock-free integration testing patterns
- **New Directory**: `.aicodepath/templates/dashboard/src/components/Terminal/`
  - `Terminal.tsx`: xterm.js-based terminal component (280+ lines)
    - Lazy loading of xterm.js dependencies
    - WebSocket communication with auto-reconnect
    - Connection status overlay (connecting, connected, disconnected, error)
    - Tokyo Night theme matching dashboard design
    - ANSI title extraction for dynamic tab names
  - `TerminalTabs.tsx`: Multi-tab container (220+ lines)
    - Tab management: add, close, switch
    - Maximize/restore functionality
    - Per-tab dirty state tracking
    - Keyboard shortcuts (Ctrl+`, Escape)
    - Status bar with session count
  - `index.ts`: Component exports
- **Updated**: `.aicodepath/api/server.js`
  - Integrated terminal WebSocket handler
  - Graceful shutdown includes terminal manager cleanup
  - Terminal endpoint logging on startup
- **Updated**: `.aicodepath/package.json`
  - Added `node-pty` as optional dependency
- **Updated**: `.aicodepath/templates/dashboard/package.json`
  - Added `@xterm/xterm` and `@xterm/addon-fit` dependencies
- **Updated**: `.aicodepath/templates/dashboard/src/components/index.ts`
  - Export Terminal, TerminalTabs, useTerminalShortcuts

**WebSocket Protocol**:
```javascript
// Client -> Server
{ type: 'terminal_create', cols: 80, rows: 24, cwd: '/path' }
{ type: 'terminal_input', data: 'base64-encoded-input' }
{ type: 'terminal_resize', cols: 120, rows: 40 }
{ type: 'terminal_close' }
{ type: 'ping' }

// Server -> Client
{ type: 'terminal_connected', sessionId, timestamp }
{ type: 'terminal_ready', sessionId, cols, rows, cwd }
{ type: 'terminal_output', sessionId, data: 'base64-encoded' }
{ type: 'terminal_exit', sessionId, exitCode, signal }
{ type: 'terminal_error', error: 'message' }
{ type: 'terminal_sessions', sessions: [...] }
{ type: 'terminal_stats', stats: {...} }
```

**Security Features**:
- Default blocked commands: `rm -rf /`, `dd if=`, `mkfs`, `shutdown`, `reboot`
- Path validation: restricted to project directory
- Environment filtering: removes sensitive vars (API keys, tokens)
- Optional whitelist mode: only allow specific commands
- Network access control: can disable curl/wget
- Audit logging: all commands logged with context

**Usage**:
```tsx
import { TerminalTabs, useTerminalShortcuts } from './components/Terminal';

function Dashboard() {
  const { isVisible, toggleTerminal } = useTerminalShortcuts();

  return (
    <>
      <DashboardContent />
      <TerminalTabs
        isVisible={isVisible}
        onClose={toggleTerminal}
        projectPath="/path/to/project"
        maxTabs={5}
      />
    </>
  );
}
```

**Benefits**:
- Run commands without leaving dashboard
- Multiple terminal sessions in tabs
- Secure sandboxing options
- Auto-reconnection on disconnect
- Full ANSI color and cursor support
- Responsive design with maximize/restore

**Dependencies**:
- `node-pty` (optional, for PTY creation)
- `@xterm/xterm` (frontend terminal emulator)
- `@xterm/addon-fit` (auto-resize addon)

---

---

## Phase 6: Medium-Term Enhancements (M1-M6)

> **Implementation Date**: 2026-02-06
> **Version**: Phase 6 Enhancements
> **Scope**: Plugin packaging, checkpoint recovery, phase state machine, MCP config generation, hook service facade, session resumption

### Enhancement Summary

**M1: Plugin Packaging**
- Claude Code plugin manifest (`plugin.json`)
- Comprehensive hooks registry (`hooks/hooks.json`)
- Portable path system with `${CLAUDE_PLUGIN_ROOT}/`
- Enables one-command installation

**M2: Checkpoint Recovery System**
- Save/load workflow states (`checkpoint-manager.js`)
- Automatic pruning of old checkpoints
- File-based storage in `aicodepath-docs/checkpoints/`
- Comprehensive test suite

**M3: Phase State Machine**
- Formal state machine with transitions (`phase-state-machine.js`)
- CLI tool for phase management (`phase-state.js`)
- Entry/exit gates and validation rules
- Complete documentation with diagrams

**M4: MCP Configuration Generation**
- Automated `.mcp.json` generation (`mcp-config-generator.js`)
- Transform from `config.json` to MCP format
- Validation and schema checking
- Usage examples and documentation

**M5: Hook Service Facade (HookContext)**
- Unified service access facade (`hook-context.js`)
- Lazy initialization of services
- Shared instances reduce memory usage
- Developer guide for migration

**M6: Session Resumption**
- Auto-detect interrupted sessions (`session-resumption.js`)
- Intelligent resumption suggestions
- Integration with checkpoint system
- Seamless workflow continuity

### New Files by Enhancement

| Enhancement | New Files | Total LOC |
|-------------|-----------|-----------|
| M1: Plugin Packaging | 2 | 240+ |
| M2: Checkpoint Recovery | 5 | 950+ |
| M3: Phase State Machine | 7 | 1,860+ |
| M4: MCP Config Generation | 5 | 1,165+ |
| M5: Hook Service Facade | 5 | 430+ |
| M6: Session Resumption | 2 | 600+ |
| S9: Terminal Integration | 7 | 1,900+ |
| **TOTAL** | **33** | **7,145+** |

### File Organization

```
.aicodepath/
├── plugin.json                                    (M1 - 40 lines)
├── hooks/
│   └── hooks.json                                (M1 - 200+ lines)
├── lib/
│   ├── checkpoint-manager.js                     (M2 - 450+ lines)
│   ├── phase-state-machine.js                    (M3 - 592 lines)
│   ├── mcp-config-generator.js                   (M4 - 240 lines)
│   ├── hook-context.js                           (M5 - 301 lines)
│   ├── session-resumption.js                     (M6 - 523 lines)
│   ├── terminal-session-manager.js               (S9 - 420+ lines)
│   ├── terminal-websocket-handler.js             (S9 - 230+ lines)
│   ├── terminal-sandbox.js                       (S9 - 370+ lines)
│   ├── __tests__/
│   │   ├── checkpoint-manager.test.js            (M2 - 120 lines)
│   │   ├── mcp-config-generator.test.js          (M4 - 230 lines)
│   │   └── terminal-session-manager.test.js      (S9 - 380+ lines)
│   ├── examples/
│   │   └── mcp-config-examples.js                (M4 - 115 lines)
│   ├── PHASE-STATE-MACHINE-README.md             (M3 - 582 lines)
│   ├── phase-state-machine-diagram.md            (M3 - 364 lines)
│   ├── __test_state_machine.js                   (M3 - 130 lines)
│   ├── __test_session_integration.js             (M3 - 137 lines)
│   └── test-session-resumption.js                (M6)
├── commands/
│   └── phase-state.js                            (M3 - 446 lines)
├── templates/dashboard/src/components/Terminal/
│   ├── Terminal.tsx                              (S9 - 280+ lines)
│   ├── TerminalTabs.tsx                          (S9 - 220+ lines)
│   └── index.ts                                  (S9 - 10 lines)
├── docs/
│   ├── M2-checkpoint-recovery-system.md          (M2)
│   ├── checkpoint-quick-reference.md             (M2)
│   ├── mcp-config-generation.md                  (M4 - 350 lines)
│   └── mcp-quick-reference.md                    (M4 - 230 lines)
├── api/
│   ├── server.js                                 (UPDATED - Terminal WebSocket + 7 route mounts)
│   ├── routes/
│   │   ├── db-helpers.js                         (NEW - Shared DB connection & query helpers)
│   │   ├── overview.js                           (NEW - GET / dashboard overview)
│   │   ├── workflow.js                           (NEW - GET / workflow_state data)
│   │   ├── agents.js                             (NEW - GET / agent_status data)
│   │   ├── monitoring.js                         (NEW - Validations, artifacts, session history)
│   │   ├── code-analysis.js                      (NEW - Code entities & relations with JOINs)
│   │   ├── visual-memory.js                      (NEW - Memory CRUD with own DB conn)
│   │   └── schedules.js                          (NEW - Schedule CRUD with JSON persistence)
├── M2-IMPLEMENTATION-SUMMARY.md                  (M2)
├── M3-PHASE-STATE-MACHINE-IMPLEMENTATION.md      (M3)
├── M4-IMPLEMENTATION-SUMMARY.md                  (M4)
├── M5-IMPLEMENTATION-SUMMARY.md                  (M5)
├── M5-COMPLETE-OVERVIEW.md                       (M5)
├── HOOK-CONTEXT-GUIDE.md                         (M5)
└── test-hook-context.js                          (M5 - 64 lines)
```

---

### Architecture Changes Summary

**Data Flow Improvements**:
```
User runs: npx aicodepath init
    |
    v
commands/init.js
    ├─> settings-generator.js → generates .claude/settings.json (S1)
    ├─> symlink-manager.js → creates .claude/skills/ symlinks (S3)
    ├─> symlink-manager.js → creates .claude/agents/ symlinks (S4)
    ├─> env-generator.js → generates .env.aicodepath (Env Config)
    └─> mcp-config-generator.js → generates .mcp.json (M4)

Claude Code session starts
    |
    v
session-start-hook.js
    ├─> Detects current phase from database (S6)
    ├─> Loads preamble.md + current phase rule (S6)
    ├─> Uses getDbPath() for database access (S5)
    ├─> Checks for incomplete sessions (M6)
    ├─> Suggests session resumption if needed (M6)
    └─> Logs via structured logger (S8)

Code write operation
    |
    v
gicl-iteration-hook.js
    ├─> Enabled by default (S7)
    ├─> Uses getDbPath() for database access (S5)
    ├─> Can use HookContext facade for service access (M5)
    ├─> Logs via structured logger (S8)
    └─> Opt-out check: AICODEPATH_GICL_DISABLED

Phase transition requested
    |
    v
npx aicodepath phase-state transition <target-phase>
    ├─> phase-state-machine validates transition (M3)
    ├─> Checks entry/exit gates
    ├─> Creates checkpoint before transition (M2)
    ├─> Updates workflow_state table
    └─> Logs phase change history
```

**Configuration Changes**:
| Component | Old Behavior | New Behavior (S1-S8) | Phase 6 (M1-M6) |
|-----------|--------------|----------------------|-----------------|
| Hook Registration | Manual `.claude/settings.json` editing | Auto-generated via `settings-generator.js` | Plugin manifest with hooks registry (M1) |
| Skill Location | `.aicodepath/skills/` only | Per-file symlinks in `.claude/skills/` | -- |
| Agent Location | `.aicodepath/skills/roles/` | Migrated to `.aicodepath/agents/` | -- |
| Database Path | Hardcoded in 17+ files | Centralized `getDbPath()` with env override | -- |
| Workflow Rules | Monolithic 56KB file | 6 phase-specific files (25-37KB each) | -- |
| GICL Status | Opt-in (disabled by default) | Opt-out (enabled by default) | -- |
| Logging | Unstructured `console.*` | Structured `logger.*` with metadata | -- |
| State Recovery | Manual session reconstruction | -- | Automatic checkpoint save/load (M2) |
| Phase Management | Manual phase tracking | -- | Formal state machine with validation (M3) |
| MCP Configuration | Manual `.mcp.json` creation | -- | Auto-generated from `config.json` (M4) |
| Hook Service Access | Direct service imports | -- | Unified HookContext facade (M5) |
| Session Continuity | Manual resume after crashes | -- | Auto-detect and suggest resumption (M6) |

**Backward Compatibility**:
- Agent loader still supports `.aicodepath/skills/roles/` as fallback
- All existing hook paths continue to work
- No breaking changes to public APIs
- Database schema unchanged (M2/M3 add new tables/columns)
- HookContext is optional; direct service access still works (M5)
- Session resumption is opt-in; manual resume still supported (M6)

---

## 8. Component Dependency Graph

```
bin/aicodepath.js
  imports: commander, ../package.json
  requires: commands/{agent,context,dashboard,generate,phase-state}.js (dynamic)
  uses: lib/error-handler.js (wrapCLICommand)

commands/init.js              <-- UPDATED (Enhancement S1/S3/S4, Env Config)
  imports: lib/settings-generator.js, lib/symlink-manager.js, lib/env-generator.js
  creates: .claude/settings.json (hook registration)
  creates: .claude/skills/*.md symlinks (per-file)
  creates: .claude/agents/*.md symlinks (per-file)
  creates: .env.aicodepath (environment configuration)
  initializes: AICodePath project structure

commands/phase-state.js       <-- NEW (Enhancement M3)
  imports: lib/phase-state-machine.js, lib/error-handler.js
  commands: current, transition, history, validate, force
  interactive: prompts for guided phase transitions

commands/agent.js
  imports: lib/agent-loader.js, lib/agent-registry.js, lib/agent-invoker.js
  imports: lib/error-handler.js, better-sqlite3
  writes: database (agent_executions table)

commands/context.js
  imports: lib/context-manager.js, lib/error-handler.js
  reads: config/context-management.json
  spawns: external editor (child_process)

commands/dashboard.js
  imports: lib/path-resolver.js, lib/error-handler.js
  spawns: Express API server + Vite dev server (child_process)
  reads: aicodepath-docs/aicodepath.db

commands/generate.js
  imports: lib/python-bridge.js, lib/error-handler.js
  spawns: Python generator processes

api/server.js                <-- NEW: Express API server with 7 route groups
  imports: express, better-sqlite3, @anthropic-ai/sdk, lib/path-resolver.js
  spawns: HTTP server on port 3000 (launched by commands/dashboard.js)
  routes: overview, workflow, agents, monitoring, code-analysis, visual-memory, schedules
  integration: WebSocket for terminal I/O, real-time updates

api/routes/db-helpers.js     <-- NEW: Shared database connection utilities
  imports: better-sqlite3, lib/path-resolver.js, lib/logger.js
  exports: getDatabase(), safeQuery(), safeQueryOne(), closeDatabase()
  usage: Used by overview, workflow, agents, monitoring, code-analysis routes

api/routes/overview.js       <-- NEW: Dashboard overview endpoint
  GET /: Returns workflow counts, artifact counts, validation counts, recent activity
  uses: db-helpers.getDatabase()
  tables: workflow_state, artifact_log, validation_log, workflow_history

api/routes/workflow.js       <-- NEW: Workflow state data endpoint
  GET /: Returns all workflow_state records for Kanban board
  uses: db-helpers.getDatabase()
  filters: optional phase, stage, unit_id parameters

api/routes/agents.js         <-- NEW: Agent status endpoint
  GET /: Returns all agent_status records with execution history
  uses: db-helpers.getDatabase()
  tables: agent_status, agent_executions (JOINed)

api/routes/monitoring.js      <-- NEW: Multi-endpoint monitoring routes
  GET /validations: Pre/Post validation summary grouped by type
  GET /validation-summary: Count by severity level
  GET /artifacts: Generated artifact logs
  GET /artifact-stats: Artifact type distribution
  GET /session-history: Session state history
  GET /design-violations: Architecture validation violations
  uses: db-helpers.getDatabase()

api/routes/code-analysis.js  <-- NEW: Code entity analysis routes
  GET /code-entities: Code entities with role_tags, complexity_score
  GET /code-relations: Entity relationships with JOINs to dependencies
  uses: db-helpers.getDatabase()
  tables: code_entities, code_relations (with computed scores)

api/routes/visual-memory.js  <-- NEW: Visual memory CRUD routes
  GET /: List all visual memory records
  GET /stats: Memory statistics by type
  POST /regenerate/:id: Regenerate memory using Claude API
  uses: own Database instance (not db-helpers)
  integrations: @anthropic-ai/sdk for memory generation

api/routes/schedules.js      <-- NEW: Schedule management routes
  GET /: List all schedules
  POST /: Create new schedule
  PUT /:id: Update schedule details
  PATCH /:id: Update partial schedule
  DELETE /:id: Delete schedule
  POST /:id/run: Trigger schedule execution
  persistence: JSON file-based (.aicodepath/data/schedules.json)

lib/path-resolver.js         <-- CRITICAL: used by nearly all modules
  imports: path, fs
  caches: projectRoot, aicodePathRoot
  exports: getDbPath() -- Centralized database path with AICODEPATH_DB_PATH env override

lib/error-handler.js         <-- CRITICAL: wraps all hooks and CLI commands
  imports: lib/errors.js, lib/logger.js

lib/errors.js
  exports: AICodePathError, ValidationError, PythonBridgeError,
           DatabaseError, HookExecutionError, ConfigurationError,
           FileSystemError

lib/logger.js
  imports: winston (Console + File transports)
  exports: singleton logger instance

lib/agent-loader.js
  imports: yaml, fs, path, lib/path-resolver.js
  reads: agents/*.md (primary) THEN skills/roles/*.md (fallback) -- Claude Code native format

lib/agent-registry.js
  imports: (standalone, no external deps)
  indexes: name, category, capability, keyword Maps

lib/agent-invoker.js
  imports: lib/agent-loader.js, lib/context-manager.js, better-sqlite3
  writes: agent_executions table

lib/context-manager.js
  reads: config/context-management.json
  exports: threshold checks, token estimation, model limits

lib/session-state-manager.js
  imports: better-sqlite3
  reads/writes: session_state table, session_history table

lib/kb-writer.js
  imports: better-sqlite3
  writes: workflow_state, session_state tables

lib/validation-recorder.js
  imports: better-sqlite3
  writes: validations table

lib/validation-storage-factory.js
  imports: lib/validation-recorder.js
  pattern: Factory with SQLite -> InMemory fallback

lib/visual-memory-writer.js
  imports: better-sqlite3, fs, path
  writes: visual_diagrams table, .aicodepath-docs/memory/ filesystem

lib/visual-memory-query.js
  imports: better-sqlite3
  reads: visual_diagrams table
  algorithm: relevance scoring (base_priority 30%, file_overlap 40%, tags 20%, unit 5%, type 5%)

lib/decision-logger.js
  imports: better-sqlite3
  writes: decisions table

lib/event-publisher.js
  writes: websocket_events table

lib/artifact-writer.js
  imports: better-sqlite3
  writes: artifacts table

lib/link-manager.js
  imports: better-sqlite3
  writes: links table

lib/code-indexer.js
  imports: better-sqlite3
  writes: code_entities, code_relations, duplication_findings tables

lib/python-bridge.js
  imports: child_process
  spawns: Python3 processes
  timeout: 60s (hardcoded)

lib/graph-bridge.js
  imports: child_process (execFile), path-resolver, logger
  spawns: ast_parser.py via python3
  timeout: 30s default (configurable)
  env overrides: AICODEPATH_GRAPH_SCRIPT, AICODEPATH_PYTHON
  exports: invokePython(), diffReindex(), reindexFile()

generators/parsers/graph_engine.py
  imports: networkx, sqlite3
  exports: GraphEngine class
  methods: load_graph(), callers_of(), callees_of(), impact_radius(), tests_for(), search(), _find_nodes()
  reads: code_entities + code_relations tables from SQLite DB
  purpose: NetworkX DiGraph for code-entity BFS traversal (call graph, impact radius, test discovery)

generators/mcp_graph_server.py
  imports: fastmcp, graph_engine, sqlite3, subprocess
  exports: mcp (FastMCP instance), 8 MCP tools
  tools: callers_of, callees_of, impact_radius, tests_for, file_summary, search_entities, build_or_update_graph, visualize_graph
  env: AICODEPATH_DB_PATH (optional, defaults to aicodepath-docs/aicodepath.db)
  purpose: FastMCP server exposing GraphEngine traversal over MCP protocol; delegates indexing to ast_parser.py via subprocess

lib/settings-generator.js    <-- NEW (Enhancement S1)
  imports: fs, path, path-resolver.js
  exports: generateClaudeSettings() -- Creates .claude/settings.json with hook paths

lib/symlink-manager.js       <-- NEW (Enhancement S3 & S4)
  imports: fs, path, path-resolver.js
  exports: setupSkillSymlinks(), setupAgentSymlinks() -- Per-file symlink creation

lib/env-generator.js         <-- NEW (Env Configuration)
  imports: fs, path, path-resolver.js
  exports: generateEnvConfig(), getDefaultEnvTemplate(), getEnvFilePath()
  creates: .env.aicodepath with documented environment variables

lib/checkpoint-manager.js <-- NEW (Enhancement M2)
  imports: better-sqlite3, fs, path-resolver.js
  exports: saveCheckpoint(), loadCheckpoint(), listCheckpoints(), pruneCheckpoints()
  storage: aicodepath-docs/checkpoints/ directory

lib/phase-state-machine.js   <-- NEW (Enhancement M3)
  imports: better-sqlite3, path-resolver.js
  exports: getCurrentPhase(), transitionTo(), validateTransition(), getAvailableTransitions()
  manages: phase transitions with guards and validation

lib/mcp-config-generator.js  <-- NEW (Enhancement M4)
  imports: fs, path, path-resolver.js
  exports: generateMCPConfig(), validateConfig(), transformConfig()
  transforms: config.json -> .mcp.json

lib/hook-context.js          <-- NEW (Enhancement M5)
  imports: all lib modules (lazy-loaded)
  exports: getDatabase(), getLogger(), getValidator(), getCheckpointManager(), getPhaseStateMachine()
  pattern: Facade with lazy initialization

lib/session-resumption.js    <-- NEW (Enhancement M6)
  imports: better-sqlite3, checkpoint-manager.js
  exports: detectIncompleteSession(), analyzeSessionState(), suggestResumption(), restoreSession()
  integrates: checkpoint system for intelligent session recovery

lib/kb-query.js
  imports: better-sqlite3
  reads: multiple tables (FTS5 queries)

hooks/*.js
  all import: lib/error-handler.js (wrapHook pattern)
  all import: lib/logger.js (structured logging) -- Updated in Enhancement S8
  RECOMMENDED: lib/hook-context.js (unified service access) -- Enhancement M5
  validators import: guidelines/*.json
  suggesters import: hooks/lib/agent-suggester.js
  artifact-creator imports: better-sqlite3, lib/artifact-writer.js
  gicl-iteration imports: hooks/lib/implementation-verifier.js
  session-start-hook imports: rules/core/*.md -- Phase detection (Enhancement S6)
  NOTE: 17 hook files updated to use getDbPath() (Enhancement S5)
  NOTE: 25+ hook files migrated to structured logger (Enhancement S8)
  NOTE: Future hooks should use HookContext facade for service access (M5)

hooks/hooks.json             <-- NEW (Enhancement M1)
  registry: 17 hook definitions with ${CLAUDE_PLUGIN_ROOT}/ paths
  lifecycle: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse
  matchers: file-type-specific hook targeting

hooks/lib/diagram-generators/*.js
  imports: (standalone Mermaid generators)
  exports: generateDiagram() functions
```

---

## 9. Hook Inventory

### Production Hooks (21 JS files — 20 dead hooks deleted in v2.5.0)

> **v2.5.0 cleanup**: 20 unregistered hook files in `.aicodepath/hooks/experimental.DELETE/` were removed. Only hooks registered in `hooks/hooks.json` are active.

| Hook File | Trigger | Blocking | Purpose |
|-----------|---------|----------|---------|
| `session-start-hook.js` | SessionStart | No | Initialize workflow, detect phase, load phase rules; outputs valid `systemMessage` + `continue` fields |
| `visual-memory-loader.js` | SessionStart | No | Write ER diagrams to `.claude/rules/schema-context.md` for native loading (v2.3.2: fixed non-functional appendToSystemPrompt) |
| `pre-flight-check.js` | UserPromptSubmit | Can block | Validate plugins, MCP servers, file structure, DB |
| `plan-role-activator.js` | UserPromptSubmit | No | Detect phase-start signals, extract plan keywords, inject best-fit role as additionalContext |
| `workflow-query-detector.js` | UserPromptSubmit | No | Detect workflow explanation queries, inject additionalContext to enforce /aicodepath-analyze; 30-min debounce via state file |
| `schema-context-hook.js` | PreToolUse Write/Edit | No | Inject actual DB schema via `additionalContext` for data-layer files (v2.3.2) |
| `guideline-validator.js` | PreToolUse Write/Edit | Can block | Validate against all 14+ guideline JSON files |
| `duplication-checker.js` | PreToolUse Write/Edit | Can block | Code duplication detection (SQL-aware with boilerplate filtering) |
| `permission-request-hook.js` | PreToolUse | No | Dynamic permission management |
| `pre-commit-validator.js` | PreToolUse Bash | Can block | Git commit validation |
| `auto-artifact-creator.js` | PostToolUse Write/Edit | No | Create artifact DB entries (**MUST be first** in PostToolUse chain) |
| `gicl-iteration-hook.js` | PostToolUse Write/Edit | No | GICL quality gates; token cost tracking; reflexion recording on low scores; budget line in lite mode |
| `visual-memory-generator.js` | PostToolUse Write/Edit | No | Generate Mermaid diagrams from code |
| `inception-skill-suggester.js` | PostToolUse Write/Edit | No | Suggest inception-phase skills |
| `construction-skill-suggester.js` | PostToolUse Write/Edit | No | Suggest construction-phase skills |
| `document-skill-suggester.js` | PostToolUse Write/Edit | No | Suggest documentation skills |
| `monorepo-skill-suggester.js` | PostToolUse Write/Edit | No | Suggest monorepo skills |
| `post-tool-failure-hook.js` | PostToolUse | No | Handle tool execution failures |
| `maintenance-skill-suggester.js` | PostToolUse Bash | No | Suggest maintenance skills |
| `notification-hook.js` | Notification | No | User notification delivery |
| `post-commit-hook.js` | PostToolUse Bash | No | Detect git commits and remind Claude to run /aicodepath-learn |
| `pre-compact-hook.js` | PreCompact | No | Pre-conversation compaction actions |
| `response-stop-hook.js` | Stop | No | Response stop lifecycle handling |
| `session-end-hook.js` | SessionEnd | No | Resource cleanup at session end |
| `damage-control/damage-control.js` | PostToolUse Error | No | Error recovery circuit breaker |

### Hook Execution Order (Critical Dependency)

```
SessionStart:
  session-start-hook.js -> visual-memory-loader.js

UserPromptSubmit:
  pre-flight-check.js -> plan-role-activator.js -> workflow-query-detector.js

PreToolUse (Write|Edit):
  schema-context-hook.js -> guideline-validator.js -> duplication-checker.js

PreToolUse (Bash):
  pre-commit-validator.js

PostToolUse (Write|Edit) -- ORDER IS CRITICAL:
  auto-artifact-creator.js  <-- MUST be #1 (gicl depends on its DB entries)
  gicl-iteration-hook.js    <-- MUST be #2 (queries artifact records)
  visual-memory-generator.js
  construction-skill-suggester.js
  document-skill-suggester.js
  monorepo-skill-suggester.js

PostToolUse (Bash):
  inception-skill-suggester.js
  maintenance-skill-suggester.js
  monorepo-skill-suggester.js
```

### Hook Support Libraries (`hooks/lib/`)

| File | Purpose | Key API |
|------|---------|---------|
| `permission-manager.js` | Permission storage & querying | `grant()`, `check()`, `getSuggestions()` |
| `mermaid-validator.js` | Mermaid diagram syntax validation | `validate()`, `detectDiagramType()` |
| `agent-hook-executor.js` | Execute agent hooks with context | `executeHook()`, `formatResponse()` |
| `agent-suggester.js` | Suggest appropriate agents for tasks | `suggestAgents()`, `formatSuggestions()` |
| `agent-wiring-check.js` | Deterministic D4 wiring verification (18-pt, 9 sub-checks) | `quickWiringCheck(agentName, options)` → `{ score, max:18, missing[], details{} }` |
| `async-hook-executor.js` | Async hook execution with timeout | `executeAsync()`, `withTimeout()` |
| `implementation-verifier.js` | Verify implementation vs design docs | `verifyRequirements()` |
| `lsp-integration.js` | Language Server Protocol integration | `getLSPDiagnostics()` |
| `prompt-hook-executor.js` | Execute hooks from prompts | `executePromptHook()` |
| `python-bridge.js` | Bridge to Python generators | `executePython()` |
| `graph-bridge.js` | Bridge to ast_parser.py for graph indexing | `invokePython()`, `diffReindex()`, `reindexFile()` |
| `graph-visual-memory.js` (lib/) | Register code-graph HTML in visual memory DB with `diagram_type=graph-interactive` | `registerCodeGraph(htmlPath?)` |
| `requirements-parser.js` | Parse design docs for requirements | `parseDesignDocsForFile()` |

### Diagram Generators (`hooks/lib/diagram-generators/`)

| File | Diagram Type |
|------|-------------|
| `er-diagram-generator.js` | Entity-Relationship |
| `class-diagram-generator.js` | Class diagrams |
| `flowchart-generator.js` | Flowcharts |
| `sequence-diagram-generator.js` | Sequence diagrams |
| `journey-diagram-generator.js` | User journey diagrams |

---

## 10. Skill Inventory

45+ skills defined as `SKILL.md` files with Claude Code frontmatter (Enhancement S2). **v2.5.0 added 21 new behavioral skills** (debug, tdd, verify, brainstorm, write-plan, subagent-dev, worktree, pause, learn, knowledge, skill-audit, skill-testing, confidence-check, mental-model, orchestration-mode, efficiency-mode, research-mode, using-aicodepath, and more).

All SKILL.md files now include:
- `user-invocable: true` - Indicates skills can be invoked by users
- `allowed-tools: [...]` - Whitelist of tools the skill can use
- `argument-hint: "..."` - Usage instructions for arguments
- Symlinked from `.claude/skills/` via per-file symlinks (Enhancement S3)

| Skill | Invocation | Phase | Category | Purpose |
|-------|-----------|-------|----------|---------|
| `aicodepath-learn` | `/aicodepath:learn` | all | Workflow | Analyze conversation for learning signals, propose rule updates |
| `aicodepath-help` | `/aicodepath:help` | all | Workflow | Show command reference and workflow guidance |
| `aicodepath-status` | `/aicodepath:status` | all | Workflow | Show current workflow status, progress, artifacts |
| `aicodepath-preferences` | `/aicodepath:preferences` | all | Workflow | View and manage learned coding preferences |
| `aicodepath-resume` | `/aicodepath:resume` | all | Workflow | Restore session state and continue from pause |
| `aicodepath-pause` | `/aicodepath:pause` | all | Workflow | Save session state and pause workflow |
| `aicodepath-init` | `/aicodepath:init` | pre-flight | Setup | Initialize AICodePath for a project |
| `aicodepath-preflight` | `/aicodepath:preflight` | pre-flight | Quality | Validate workflow prerequisites |
| `aicodepath-diagnostics` | `/aicodepath:diagnostics` | all | Quality | Run diagnostics on AICodePath setup |
| `aicodepath-c4-architecture` | `/aicodepath:c4-architecture` | construction | Architecture | Generate C4 model diagrams (Context/Container/Component/Deployment) |
| `aicodepath-visual-memory` | `/aicodepath:visual-memory` | inception/construction | Architecture | Generate and manage visual diagrams (ER, Class, Flowchart) |
| `aicodepath-code-graph` | `/aicodepath:code-graph` | inception/construction | Architecture | Build AST code graph, query callers/callees/impact/tests via MCP |
| `aicodepath-mental-model` | `/aicodepath:mental-model` | inception | Architecture | Understand code changes via commit analysis, diff visualization |
| `aicodepath-diagrams` | `/aicodepath:diagrams` | construction | Architecture | General diagram generation and management |
| `aicodepath-interconnection-diagram` | `/aicodepath:interconnection-diagram` | construction/operations | Architecture | Generate interactive HTML interconnection diagram of all AICodePath components |
| `aicodepath-requirements` | `/aicodepath:requirements` | inception/construction | Development | Document requirements and acceptance criteria |
| `aicodepath-naming-analyzer` | `/aicodepath:naming-analyzer` | construction | Development | Analyze and suggest naming conventions |
| `aicodepath-command-creator` | `/aicodepath:command-creator` | all | Development | Create custom CLI commands |
| `coding-standards` | `/coding-standards` | construction | Development | Code quality and standard enforcement |
| `aicodepath-validate-guidelines` | `/aicodepath:validate-guidelines` | construction | Quality | Check code against all guidelines |
| `aicodepath-skill-audit` | `/aicodepath:skill-audit` | all | Quality | Audit and analyze installed skills (manual-only) |
| `aicodepath-readme-crafter` | `/aicodepath:readme-crafter` | operations | Documentation | Craft READMEs (OSS, personal, internal, config variants) |
| `aicodepath-dependency-updater` | `/aicodepath:dependency-updater` | maintenance | Maintenance | Multi-language dependency management |
| `aicodepath-reducing-entropy` | `/aicodepath:reducing-entropy` | maintenance | Maintenance | Refactoring and entropy reduction (manual-only) |
| `frontend-design-review` | `/frontend-design-review` | construction | Quality | Review frontend design and components |
| `aicodepath-statusline` | `/aicodepath:statusline` | all | Workflow | Status line configuration for terminal |
| `aicodepath-debug` | `/aicodepath-debug` | construction | Quality | **NEW v2.5.0**: Systematic root-cause analysis; Step 0 reflexion memory lookup |
| `aicodepath-tdd` | `/aicodepath-tdd` | construction | Quality | **NEW v2.5.0**: Red-Green-Refactor cycle enforcement |
| `aicodepath-verify` | `/aicodepath-verify` | all | Quality | **NEW v2.5.0**: Iron-law verification before completion claims |
| `aicodepath-brainstorm` | `/aicodepath-brainstorm` | inception | Development | **NEW v2.5.0**: Design-before-code with 2–3 options, incremental approval |
| `aicodepath-write-plan` | `/aicodepath-write-plan` | inception | Development | **NEW v2.5.0**: TDD-first implementation plans from approved designs |
| `aicodepath-subagent-dev` | `/aicodepath-subagent-dev` | construction | Development | **NEW v2.5.0**: Parallel subagent dispatching with two-stage review |
| `aicodepath-worktree` | `/aicodepath-worktree` | construction | Development | **NEW v2.5.0**: Git worktree isolation before significant implementations |
| `aicodepath-knowledge` | `/aicodepath-knowledge` | construction | Workflow | **NEW v2.5.0**: Update tasks.md and knowledge.md during CONSTRUCTION |
| `aicodepath-skill-testing` | `/aicodepath-skill-testing` | all | Quality | **NEW v2.5.0**: Skill validation methodology |
| `aicodepath-confidence-check` | `/aicodepath-confidence-check` | all | Quality | **NEW v2.5.0**: Pre-claim confidence calibration |
| `aicodepath-orchestration-mode` | `/aicodepath-orchestration-mode` | construction | Workflow | **NEW v2.5.0**: Subagent team orchestration mode |
| `aicodepath-efficiency-mode` | `/aicodepath-efficiency-mode` | all | Workflow | **NEW v2.5.0**: Token-efficient response mode |
| `aicodepath-research-mode` | `/aicodepath-research-mode` | inception | Workflow | **NEW v2.5.0**: Research-focused exploration mode |
| `using-aicodepath` | auto-injected | all | Workflow | **NEW v2.5.0**: AIDLC workflow discipline rules, injected at session start |

### Skill JSON Configs (in `skills/` root)

| File | Purpose |
|------|---------|
| `status.json` | Status skill actions, options, examples |
| `resume.json` | Resume skill: restore/recap/verify actions |
| `pause.json` | Pause skill: save/checkpoint actions |
| `help.json` | Help skill: command reference |
| `learn.json` | Learn skill: analyze/propose/apply actions |
| `preferences.json` | Preferences skill: list/approve/reject actions |
| `ci-lint.json` | CI/Lint integration metadata |
| `frontend-design-review.json` | Frontend review metadata |

### Monorepo CI/CD Skills (v2.3.3)

Two complementary skills for monorepo Git configuration and GCP deployment automation.

#### aicodepath-git-monorepo-config (PRE-FLIGHT/INCEPTION)

| File | Purpose |
|------|---------|
| `skills/aicodepath-git-monorepo-config/SKILL.md` | Main skill: 6 capabilities (branch strategy, protection rules, hooks, service discovery, workflow docs, Git config) |
| `skills/aicodepath-git-monorepo-config/templates/git-hooks/pre-push` | Safety check: confirms production pushes, warns on staging |
| `skills/aicodepath-git-monorepo-config/templates/git-hooks/pre-commit` | Quality check: debug statements, large files, secrets detection |
| `skills/aicodepath-git-monorepo-config/templates/git-hooks/commit-msg` | Conventional commits enforcement regex |
| `skills/aicodepath-git-monorepo-config/templates/gitattributes.template` | Line ending normalization, binary detection |
| `skills/aicodepath-git-monorepo-config/templates/gitignore-monorepo.template` | Multi-language monorepo ignore patterns |
| `skills/aicodepath-git-monorepo-config/templates/services.yaml.template` | Service manifest skeleton |
| `skills/aicodepath-git-monorepo-config/templates/workflow-docs.md.template` | Team workflow guide template |
| `skills/aicodepath-git-monorepo-config/templates/branch-protection.md.template` | GitHub/GitLab protection setup instructions |
| `skills/aicodepath-git-monorepo-config/scripts/detect-services.sh` | Scan repo for services (package.json, go.mod, etc.) |
| `skills/aicodepath-git-monorepo-config/scripts/install-hooks.sh` | Install git hooks, configure core.hooksPath |
| `skills/aicodepath-git-monorepo-config/scripts/validate-setup.sh` | Validate branches, hooks, services.yaml |

**Output**: `services.yaml` (consumed by aicodepath-gcp-monorepo-deploy)

#### aicodepath-gcp-monorepo-deploy (OPERATIONS)

| File | Purpose |
|------|---------|
| `skills/aicodepath-gcp-monorepo-deploy/SKILL.md` | Main skill: 7 capabilities (prereqs, GCP setup, build config, env config, triggers, deploy scripts, monitoring) |
| `skills/aicodepath-gcp-monorepo-deploy/templates/cloudbuild/cloudbuild.root.yaml` | Root build config: change detection + multi-service orchestration |
| `skills/aicodepath-gcp-monorepo-deploy/templates/cloudbuild/cloudbuild.service.yaml.template` | Per-service build/push/deploy pipeline |
| `skills/aicodepath-gcp-monorepo-deploy/templates/environments/dev.yaml` | Dev: scale-to-zero, auto-deploy, debug logging |
| `skills/aicodepath-gcp-monorepo-deploy/templates/environments/staging.yaml` | Staging: min 1 instance, approval required |
| `skills/aicodepath-gcp-monorepo-deploy/templates/environments/prod.yaml` | Prod: min 2+ instances, manual trigger, alerts |
| `skills/aicodepath-gcp-monorepo-deploy/templates/deployment/deploy.sh.template` | Deploy script with env selection and prod confirmation |
| `skills/aicodepath-gcp-monorepo-deploy/templates/deployment/rollback.sh.template` | Rollback: list revisions, shift traffic |
| `skills/aicodepath-gcp-monorepo-deploy/templates/deployment/check-status.sh.template` | Health check all services per environment |
| `skills/aicodepath-gcp-monorepo-deploy/templates/monitoring/dashboard.json.template` | Cloud Monitoring dashboard (4 panels) |
| `skills/aicodepath-gcp-monorepo-deploy/templates/monitoring/alerts.yaml.template` | Alerting policies (error rate, latency) |
| `skills/aicodepath-gcp-monorepo-deploy/scripts/setup-gcp.sh` | Enable APIs, create Artifact Registry, configure IAM |
| `skills/aicodepath-gcp-monorepo-deploy/scripts/validate-prerequisites.sh` | Check gcloud CLI, project access, services.yaml |
| `skills/aicodepath-gcp-monorepo-deploy/scripts/deploy.sh` | Deployment wrapper |
| `skills/aicodepath-gcp-monorepo-deploy/scripts/rollback.sh` | Rollback wrapper |

**Input**: `services.yaml` (from aicodepath-git-monorepo-config)

#### Monorepo Skill Suggester Hook

| File | Trigger | Detection |
|------|---------|-----------|
| `hooks/monorepo-skill-suggester.js` | PostToolUse (Write\|Edit, Bash) | PRE-FLIGHT/INCEPTION: monorepo structure + missing services.yaml -> suggest aicodepath-git-monorepo-config. OPERATIONS: services.yaml + missing cloudbuild.yaml -> suggest aicodepath-gcp-monorepo-deploy |

---

## 11. Agent Role Inventory

24 roles migrated from `skills/roles/*.md` to `.aicodepath/agents/*.md` (Enhancement S4).

**MIGRATION NOTE**:
- **New Location**: `.aicodepath/agents/*.md` (primary source)
- **Legacy Location**: `.aicodepath/skills/roles/*.md` (fallback for backward compatibility)
- **Claude Code Integration**: Symlinked from `.claude/agents/` via per-file symlinks
- **Format**: Claude Code native frontmatter with `name`, `category`, `capabilities`, `triggers`, `priority`, `context-budget`

Agent files loaded by `agent-loader.js` with priority: `.aicodepath/agents/` THEN `.aicodepath/skills/roles/` (fallback).

### Architecture Roles (6)

| Role | File | Priority | Context Budget | Key Capabilities |
|------|------|----------|----------------|-----------------|
| `architect` | `architect.md` | high | 12,000-15,000 | System design, scalability, design patterns |
| `api-designer` | `api-designer.md` | high | 10,000 | REST, GraphQL, OpenAPI, contract-first |
| `backend-architect` | `backend-architect.md` | high | 12,000 | Backend system design, patterns, scalability |
| `frontend-architect` | `frontend-architect.md` | high | 12,000 | Component design, state management |
| `database-architect` | `database-architect.md` | high | 10,000 | Schema design, optimization, migrations |
| `mobile-architect` | `mobile-architect.md` | normal | 10,000 | Mobile app architecture, platform patterns |

### Quality and Review Roles (4)

| Role | File | Priority | Key Capabilities |
|------|------|----------|-----------------|
| `code-reviewer` | `code-reviewer.md` | high | Code quality, SOLID, security, maintainability |
| `security-engineer` | `security-engineer.md` | high | OWASP Top 10, crypto, auth, vulnerability assessment |
| `performance-engineer` | `performance-engineer.md` | normal | Benchmarks, profiling, tuning |
| `refactoring-expert` | `refactoring-expert.md` | normal | SOLID, DRY, KISS, tech debt reduction |

### DevOps and Infrastructure Roles (3)

| Role | File | Priority | Key Capabilities |
|------|------|----------|-----------------|
| `devops-architect` | `devops-architect.md` | high | Docker, K8s, IaC, CI/CD |
| `sre-engineer` | `sre-engineer.md` | normal | SLOs, monitoring, incident response |
| `cost-optimizer` | `cost-optimizer.md` | normal | Cloud cost optimization, resource efficiency |

### Domain-Specific Roles (5)

| Role | File | Priority | Key Capabilities |
|------|------|----------|-----------------|
| `data-scientist` | `data-scientist.md` | normal | ML/AI, data analysis, model training |
| `ml-engineer` | `ml-engineer.md` | normal | MLOps, model deployment, monitoring |
| `ui-designer` | `ui-designer.md` | normal | UI design, component design, design systems |
| `ux-designer` | `ux-designer.md` | normal | User experience, research, interaction design |
| `technical-writer` | `technical-writer.md` | normal | Documentation, API docs, user docs |

### Specialized Roles (6)

| Role | File | Priority | Key Capabilities |
|------|------|----------|-----------------|
| `communication-coach` | `communication-coach.md` | normal | Draft review, tone calibration, roleplay, presentation feedback |
| `compliance-auditor` | `compliance-auditor.md` | normal | Compliance verification, audit trails, regulations |
| `test-engineer` | `test-engineer.md` | high | Testing strategy, coverage, test organization |
| `qa` | `qa.md` | normal | Quality assurance, acceptance criteria |
| `security` | `security.md` | high | General security concerns |
| `codebase-pattern-finder` | `codebase-pattern-finder.md` | normal | Pattern analysis, reverse engineering |

### Role Authority Model

- **Read**: Requirements, existing code, design docs (all roles)
- **Write**: Design artifacts only (to `aicodepath-docs/` directory)
- **Cannot Write**: Implementation code (design-only constraint)
- **Deliverables**: Markdown documents in phase-specific subdirectories

---

## 12. Library Inventory

35+ production modules in `lib/`, totaling approximately 15,000+ lines of code. **v2.5.0 added**: `reflexion-learner.js`, `confidence-checker.js`, `conversation-searcher.js`, `tiered-watcher.js`, `session-cache.js`, `incremental-session-parser.js`, and `adapters/` (3 files).

| Module | LOC (est.) | Pattern | Key API | Dependencies |
|--------|-----------|---------|---------|-------------|
| `path-resolver.js` | 200 | Singleton+Cache | `findProjectRoot()`, `getAicodePathRoot()`, `resolvePath()`, `hooks()`, `rules()`, `guidelines()`, `lib()`, `scripts()`, `db()`, `templates()`, `skills()`, `agents()`, `getDbPath()` **(NEW S5)** | fs, path |
| `settings-generator.js` | 150 | Utility | `generateClaudeSettings()` **(NEW S1)** | fs, path, path-resolver.js |
| `symlink-manager.js` | 250 | Utility | `setupSkillSymlinks()`, `setupAgentSymlinks()` **(NEW S3/S4)** | fs, path, path-resolver.js |
| `env-generator.js` | 220 | Utility | `generateEnvConfig()`, `getDefaultEnvTemplate()`, `isDevModeEnabled()` **(NEW)** | fs, path, path-resolver.js |
| `checkpoint-manager.js` | 450+ | Repository | `saveCheckpoint()`, `loadCheckpoint()`, `listCheckpoints()`, `pruneCheckpoints()`, `validateCheckpoint()` **(NEW M2)** | better-sqlite3, fs, path-resolver.js |
| `phase-state-machine.js` | 592 | State Machine | `getCurrentPhase()`, `transitionTo()`, `validateTransition()`, `getAvailableTransitions()`, `getPhaseHistory()` **(NEW M3)** | better-sqlite3, path-resolver.js |
| `mcp-config-generator.js` | 240 | Transformer | `generateMCPConfig()`, `validateConfig()`, `transformConfig()` **(NEW M4)** | fs, path, path-resolver.js |
| `hook-context.js` | 301 | Facade | `getDatabase()`, `getLogger()`, `getValidator()`, `getArtifactWriter()`, `getVisualMemory()`, `getCheckpointManager()`, `getPhaseStateMachine()` **(NEW M5)** | All lib modules (lazy-loaded) |
| `session-resumption.js` | 523 | Service | `detectIncompleteSession()`, `analyzeSessionState()`, `suggestResumption()`, `restoreSession()` **(NEW M6)** | better-sqlite3, checkpoint-manager.js |
| `errors.js` | 120 | Inheritance | `AICodePathError`, `ValidationError`, `PythonBridgeError`, `DatabaseError`, `HookExecutionError`, `ConfigurationError`, `FileSystemError` | (none) |
| `error-handler.js` | 200 | Static Utility | `handleHookError()`, `handleCLIError()`, `wrapHook()`, `wrapCLICommand()`, `safeAsync()` | errors.js, logger.js |
| `logger.js` | 180 | Singleton | `logHook()`, `logValidation()`, `logPerformance()`, `startTimer()`, `child()` | winston |
| `agent-loader.js` | 300 | Cache+Factory | `loadAll()`, `loadAgent()`, `reloadAgent()`, `clearCache()`, `exists()` **(Updated S4: reads .aicodepath/agents/ first)** | yaml, fs, path-resolver.js |
| `agent-registry.js` | 200 | Repository | `register()`, `findByName()`, `findByCategory()`, `findByCapability()`, `suggestAgent()`, `getStats()` | (standalone) |
| `agent-invoker.js` | 300 | DI | `invoke()`, `buildPrompt()`, `writeOutput()`, `logExecution()` | agent-loader.js, context-manager.js, better-sqlite3 |
| `context-manager.js` | 250 | Strategy | `loadConfig()`, `estimateTokens()`, `getModelLimit()`, `checkThreshold()`, `getUsagePercentage()`, `trackUsage()` | config/context-management.json |
| `session-state-manager.js` | 200 | Repository | `setState()`, `getState()`, `listStates()`, `archiveSession()`, `getSessionHistory()` | better-sqlite3 |
| `kb-writer.js` | 300 | Repository | `initializePhaseStages()`, `updateStageStatus()`, `updateSessionState()`, `getSessionState()`, `getWorkflowState()` | better-sqlite3 |
| `kb-query.js` | 250 | Repository | FTS5 queries across multiple tables | better-sqlite3 |
| `validation-recorder.js` | 150 | Repository | `recordValidation()` | better-sqlite3 |
| `validation-storage-factory.js` | 120 | Factory+Fallback | `create()`, `createInMemory()`, `createSQLite()` | validation-recorder.js |
| `visual-memory-writer.js` | 400 | Repository | `initializeMemoryFolder()`, `writeDiagram()`, `updateDiagram()`, `writeIndexFile()`, `writeMetadataFile()` | better-sqlite3, fs |
| `visual-memory-query.js` | 350 | Query Engine | `calculateTokenBudget()`, `calculateRelevance()`, `queryDiagrams()`, `getDiagramsByType()`, `scoreRelevance()` | better-sqlite3 |
| `decision-logger.js` | 200 | Repository | `logDecision()` | better-sqlite3 |
| `event-publisher.js` | 150 | Publisher | `publish()` | better-sqlite3 |
| `artifact-writer.js` | 400+ | Repository | Artifact lifecycle management | better-sqlite3 |
| `link-manager.js` | 400+ | Repository | `createLink()`, traceability chains | better-sqlite3 |
| `code-indexer.js` | 500+ | Analyzer | Entity fingerprinting (exact, token, structural) | better-sqlite3 |
| `python-bridge.js` | 150 | Singleton | `generateDiagram()`, `checkAvailability()` | child_process |
| `graph-bridge.js` | 100 | Utility | `invokePython()`, `diffReindex()`, `reindexFile()` | child_process, path-resolver, logger |
| `graph-visual-memory.js` | 110 | Utility | `registerCodeGraph(htmlPath?)` | visual-memory-writer, path-resolver, logger |

### v2.5.0 New Library Modules

| Module | LOC (est.) | Pattern | Key API | Dependencies |
|--------|-----------|---------|---------|-------------|
| `reflexion-learner.js` | 200 | Repository | `recordFailure()`, `recordResolution()`, `findSimilar()`, `markHelpful()`, `formatHints()`, `getStats()` | better-sqlite3 |
| `confidence-checker.js` | 150 | Utility | Red-flag phrase detection, confidence level calculation | — |
| `conversation-searcher.js` | 350+ | Query Engine | FTS5 + regex dual-path search, `search()`, `suggestions()`, `stats()` | better-sqlite3 |
| `tiered-watcher.js` | 400+ | Event Emitter | Hot tier (chokidar, real-time, max 50 paths) + Cold tier (polling, 10s); `watch()`, `unwatch()`, auto-demotion | chokidar |
| `session-cache.js` | 250+ | LRU Cache | mtime-based staleness, byte-offset tracking; `getSession()`, `invalidate()` | — |
| `incremental-session-parser.js` | 400+ | Parser | Full parse + byte-offset incremental reads; handles 100MB+ JSONL; `getPage()`, `getMessagePage()`, `getCacheStats()` | readline, session-cache.js |
| `adapters/base-adapter.js` | 100 | Abstract | BaseAdapter interface: `Session`, `Message`, `UsageStats` models | EventEmitter |
| `adapters/claude-code-adapter.js` | 400+ | Adapter | Detects `~/.claude/projects/`, parses JSONL, calculates cost, watches via chokidar; emits `session_discovered`, `session_updated`, `message_added` | chokidar, readline |
| `suggester-lock.js` | 180 | Lock/Queue | File-based exclusive lock + JSONL queue for serializing parallel DOMAIN_MAPPING/taxonomy/plugin.json writes; `acquireLock()`, `queueEdit()`, `applyBatchMerge()`, `releaseLock()`; PID-based crash recovery; file-type-aware merge (.json/.md/.js) | path-resolver, logger |
| `adapters/adapter-manager.js` | 200 | Singleton | AdapterManager (EventEmitter); proxies watcher events with `adapterID`; pluggable for Cursor/Gemini | EventEmitter |
| `stats-builder.js` | 90 | Builder | `buildStats()` — reads agents/skills/hooks counts + package.json version; writes `generated/agent-stats.json`; returns `{ version, generated_at, totals, agents_by_pack }` | path-resolver, logger |
| `template-renderer.js` | 100 | Renderer | `renderTemplate(tplPath, outPath, stats)` + `renderTemplates(stats)` — substitutes `{{AGENT_COUNT/SKILL_COUNT/HOOK_COUNT/VERSION}}`; strict unknown-placeholder rejection; prepends DO NOT EDIT banner | path-resolver, logger |

### Phase 6 Enhancement Files (M1-M6)

**M2: Checkpoint Recovery System**
- `.aicodepath/lib/__tests__/checkpoint-manager.test.js` (120 lines) - Test suite for checkpoint operations
- `.aicodepath/docs/M2-checkpoint-recovery-system.md` - Full system documentation
- `.aicodepath/docs/checkpoint-quick-reference.md` - Quick reference guide

**M3: Phase State Machine**
- `.aicodepath/lib/PHASE-STATE-MACHINE-README.md` (582 lines) - Usage guide and API reference
- `.aicodepath/lib/phase-state-machine-diagram.md` (364 lines) - Visual diagrams and flows
- `.aicodepath/lib/__test_state_machine.js` (130 lines) - Unit tests
- `.aicodepath/lib/__test_session_integration.js` (137 lines) - Integration tests

**M4: MCP Configuration Generation**
- `.aicodepath/lib/__tests__/mcp-config-generator.test.js` (230 lines) - Test suite
- `.aicodepath/lib/examples/mcp-config-examples.js` (115 lines) - Usage examples
- `.aicodepath/docs/mcp-config-generation.md` (350 lines) - Full documentation
- `.aicodepath/docs/mcp-quick-reference.md` (230 lines) - Quick reference

**M5: Hook Service Facade**
- `.aicodepath/test-hook-context.js` (64 lines) - Test suite
- `.aicodepath/HOOK-CONTEXT-GUIDE.md` - Developer guide
- `.aicodepath/M5-IMPLEMENTATION-SUMMARY.md` - Implementation summary
- `.aicodepath/M5-COMPLETE-OVERVIEW.md` - Complete overview

**M6: Session Resumption**
- `.aicodepath/lib/test-session-resumption.js` - Test suite

---

## 13. Database Schema

**Engine**: SQLite with WAL mode, FTS5 full-text search, JSON1 extension, foreign keys enforced.
**Location**: `aicodepath-docs/aicodepath.db`
**Schema**: `db/schema.sql` (base schema with all prior migrations applied) + `db/migrations/015_reflexion_patterns.sql`

### Core Tables

| Table | PK | Key Columns | FTS | Purpose |
|-------|-----|-------------|-----|---------|
| `artifacts` | id (auto) | artifact_type, phase, stage, unit, title, content, file_path, metadata(JSON), cr_number, version, status | Yes (`artifacts_fts`) | Central artifact repository |
| `code_entities` | id (auto) | entity_type, name, qualified_name, language, file_path, line_start/end, signature, body, entity_hash, token_hash, structural_hash, complexity, dependencies(JSON), cr_number | Yes (`code_entities_fts`) | Code fingerprinting and analysis |
| `code_relations` | id (auto) | from_entity_id(FK), to_entity_id(FK), relation_type, metadata(JSON) | No | Dependency graph edges |
| `duplication_findings` | id (auto) | entity_id, duplicate_entity_id, similarity_score(0-100), duplication_type, status | No | Clone detection results |
| `decisions` | id (auto) | artifact_id(FK), title, decision, rationale, alternatives(JSON), category, scope, impact, status, superseded_by(self-FK) | Yes (`decisions_fts`) | Architecture Decision Records |
| `validations` | id (auto) | artifact_id(FK), file_path, validation_type, score, status, violations(JSON) | No | Quality gate results |
| `workflow_state` | id (auto) | cr_number, phase, stage, unit, status, steps_total, steps_completed, artifacts_created(JSON), blockers(JSON) | No | Phase progression |
| `session_state` | key (text) | value(JSON), updated_at | No | Key-value session persistence |
| `session_history` | id (auto) | session_id, phase, stage, unit, action, details(JSON) | No | Activity log |
| `visual_diagrams` | id (auto) | diagram_type, name, scope, unit_name, mermaid_content, generation_method, confidence(0-1), source_files(JSON), sync_strategy, is_stale, priority(0-100), cr_number | Yes (`visual_diagrams_fts`) | Mermaid diagram storage |
| `diagram_entity_links` | id (auto) | diagram_id(FK), entity_id(FK, nullable), entity_type, entity_name, link_type | No | Diagram-to-code traceability |
| `diagram_history` | id (auto) | diagram_id(FK), version, mermaid_content, change_reason | No | Diagram version history |
| `links` | id (auto) | source_id(FK), target_id(FK), link_type, confidence(0-1) | No | Artifact traceability (implements, derived_from, tests, blocks, relates_to) |
| `websocket_events` | id (auto) | channel, event_type, data(JSON), session_id | No | Real-time event streaming |
| `agent_status` | id (singleton) | session_id, status, current_task, progress_percentage | No | Singleton agent status |
| `agent_executions` | id (auto) | agent_name, task_description, output_path, tokens_used, duration_ms, status, error_message, metadata(JSON) | No | Agent execution log |
| `context_usage` | id (auto) | agent_name, tokens_used, model_name, threshold_status, compaction_triggered | No | Token tracking |
| `gicl_feature_tracking` | id (auto) | feature_name, design_doc_path, criteria counters, progress_pct, status, blockers | No | GICL feature progress |
| `gicl_suggestions` | id (auto) | suggestion_type, requirement_text, violation_message, severity, suggested_agents(JSON), status | No | GICL remediation suggestions |
| `reflexion_patterns` | id (auto) | error_type, description, failure_reason, occurrence_count, helpful_count, is_resolved, resolution, session_id, project_root | No | **NEW (v2.5.0 migration 015)**: Cross-session error pattern learning for debug skill Step 0 |

### Frontend Designer Tables

| Table | Purpose |
|-------|---------|
| `user_profile` | Session expertise levels, project type, disciplines, preferences(JSON) |
| `design_systems` | Design tokens(JSON), component library(JSON), documentation path |
| `design_violations` | Severity, category, expected/found values, suggestions |
| `frontend_designer_sessions` | Mode, design_system_id, scan metrics, duration |

### Views (13)

| View | Purpose |
|------|---------|
| `v_requirements_traceability` | Requirement -> Story -> Design -> Code -> Test chains |
| `v_recent_decisions` | Recent ADRs with artifact context |
| `v_workflow_progress` | Phase completion percentages |
| `v_user_expertise_summary` | User expertise by discipline (normalized) |
| `v_violation_summary` | Session violation aggregates |
| `v_session_effectiveness` | Session fix rate and metrics |
| `audit_log` | Backwards-compatible audit trail |
| `v_active_diagrams` | High-priority active diagrams |
| `v_diagrams_needing_sync` | Stale eager-sync diagrams |
| `v_diagram_entity_coverage` | Entity documentation coverage |

### Migrations

| File | Purpose |
|------|---------|
| `db/schema.sql` | Base schema (all tables, indexes, views, triggers) |
| `db/migrations/002_add_cr_reference.sql` | Add cr_number tracking to artifacts, code_entities |
| `db/migrations/003_websocket_events.sql` | Add WebSocket real-time streaming tables |
| `db/migrations/fix-code-entities-fts.sql` | Fix FTS5 index on code_entities |

### Key Relationships

```
artifacts 1--* validations         (artifact_id FK)
artifacts 1--* decisions           (artifact_id FK)
artifacts *--* artifacts           (via links table: source_id, target_id)
code_entities *--* code_entities   (via code_relations: from_entity_id, to_entity_id)
code_entities 1--* duplication_findings  (entity_id FK)
visual_diagrams 1--* diagram_entity_links (diagram_id FK)
visual_diagrams 1--* diagram_history      (diagram_id FK)
diagram_entity_links *--1 code_entities   (entity_id FK, nullable)
decisions *--1 decisions           (superseded_by self-FK)
```

### Artifact Types & Statuses

- **artifact_type**: requirement, story, design, code, test, decision, plan
- **phase**: inception, construction, operations
- **validation_type**: guideline, api, data, architecture, duplication, devops, iac, security, gicl
- **validation_status**: PASS, REVIEW, FAIL (also: passed, failed, warning, skipped)
- **workflow_status**: pending, in_progress, completed, skipped, blocked
- **agent_status**: idle, running, paused, crashed
- **link_type**: implements, derived_from, tests, blocks, relates_to
- **duplication_type**: exact, near, structural
- **sync_strategy**: eager, lazy, manual

---

## 14. Guideline Inventory

15 JSON files in `guidelines/`, totaling 200+ validation rules.

| File | Category | Est. Rules | Coverage |
|------|----------|-----------|----------|
| `security-rules.json` | Security | 30+ | Secrets, auth, crypto, input validation, headers, dependencies, data protection |
| `architecture-rules.json` | Architecture | 25+ | SOLID, patterns, organization, dependencies |
| `coding-standards.json` | Code Quality | 40+ | Naming (camelCase/PascalCase/snake_case), complexity (cyclomatic<=10, cognitive<=15), function length (<=50 lines), params (<=5), duplication |
| `api-design-rules.json` | API Design | 20+ | REST, GraphQL, versioning, pagination |
| `data-modeling-rules.json` | Data Models | 15+ | Normalization, keys, indexing, migrations |
| `testing-standards.json` | Testing | 20+ | Coverage (>=80%), organization (AAA/GWT), assertions, mocking, naming |
| `linting-rules.json` | Linting | 20+ | Language-specific lint rules |
| `devops-rules.json` | DevOps | 15+ | Docker, K8s, CI/CD, IaC |
| `observability-rules.json` | Observability | 10+ | Logging, metrics, tracing |
| `ai-implementation-rules.json` | AI/ML | 15+ | Model training, evaluation |
| `mobile-design-rules.json` | Mobile | 20+ | iOS, Android, design patterns |
| `search-rules.json` | Search | 10+ | Elasticsearch, indexing |
| `type-design-rules.json` | Types | 10+ | TypeScript, type safety |
| `writing-style-rules.json` | Writing | 15+ | Prose clarity, anti-AI-writing patterns, documentation |
| `project-preferences.json` | Project | -- | Project-specific overrides to defaults |

### Guideline JSON Schema

```json
{
  "$schema": "AICodePath Guideline Schema",
  "version": "1.0.0",
  "description": "...",
  "categories": {
    "category_name": {
      "description": "...",
      "rules": [
        {
          "id": "unique-rule-id",
          "description": "What this rule checks",
          "pattern": "regex pattern",
          "severity": "error|warning|info",
          "languages": ["*"|"javascript"|"python"|...],
          "message": "User-friendly error message"
        }
      ]
    }
  }
}
```

### Severity Levels

| Level | Behavior | Action |
|-------|----------|--------|
| `error` | Blocks merge | Must fix |
| `warning` | Code review comment | Should fix |
| `info` | Suggestion | Nice to have |

### Escape Hatch

```javascript
// aicodepath: allow-<rule-id>       // Bypass specific rule
// aicodepath: allow-stub|mock|fake  // Bypass for test data
```

---

## 15. Rule Inventory

64 rule files organized by workflow phase.

### Common Rules (20 files -- apply to all phases)

| File | Purpose |
|------|---------|
| `process-overview.md` | General workflow overview |
| `session-continuity.md` | Session resumption guidance |
| `content-validation.md` | Mermaid syntax, special chars validation |
| `question-format-guide.md` | Q&A format with [Answer] tags |
| `pre-flight-check.md` | Pre-flight validation checklist |
| `welcome-message.md` | New workflow welcome message |
| `expertise-capture.md` | Capture user expertise signals |
| `git-integration.md` | Git workflow integration |
| `cr-folder-structure.md` | Change Request folder structure |
| `mandatory-plugins.md` | Required plugin enforcement |
| `knowledge-base.md` | Knowledge base usage rules |
| `depth-levels.md` | Analysis depth level definitions |
| `central-installation.md` | Central installation rules |
| `guideline-enforcement.md` | Guideline enforcement rules |
| `context-rot-prevention.md` | Context window degradation prevention |
| `error-handling.md` | Error handling rules |
| `damage-control.md` | Damage control / recovery rules |
| `statusline-dashboard.md` | Statusline and dashboard rules |
| `overconfidence-prevention.md` | Prevent overconfident AI behavior |
| `plugin-development.md` | Plugin development rules |
| `workflow-changes.md` | Workflow change management |
| `terminology.md` | Standard terminology definitions |
| `multi-context-management.md` | Multi-context handling rules |

### Inception Rules (6 files)

| File | Purpose |
|------|---------|
| `workspace-detection.md` | Detect greenfield vs brownfield project |
| `reverse-engineering.md` | Reverse engineer existing codebase |
| `requirements-analysis.md` | Analyze and document requirements |
| `workflow-planning.md` | Plan workflow execution |
| `user-stories.md` | Create user stories |
| `units-generation.md` | Generate implementation units |
| `sprint-planning.md` | Sprint planning rules |
| `application-design.md` | Application design rules |

### Construction Rules (25 files)

| File | Purpose |
|------|---------|
| `functional-design.md` | API and system functional design |
| `nfr-design.md` | Non-functional requirement design |
| `nfr-requirements.md` | NFR requirements documentation |
| `database-design.md` | SQL/NoSQL database patterns |
| `nosql-design.md` | NoSQL-specific design patterns |
| `api-gateway-design.md` | API gateway patterns |
| `auth-design.md` | Authentication/authorization design |
| `docker-design.md` | Docker containerization patterns |
| `kubernetes-design.md` | Kubernetes orchestration patterns |
| `environment-strategy.md` | Environment configuration strategy |
| `s3-storage-design.md` | AWS S3 storage design |
| `message-queue-design.md` | Async messaging patterns |
| `caching-design.md` | Caching strategy and patterns |
| `search-design.md` | Search system design |
| `vector-database-design.md` | Vector DB design patterns |
| `observability-design.md` | Observability design |
| `secrets-management.md` | Secrets management design |
| `infrastructure-design.md` | Infrastructure design |
| `cicd-design.md` | CI/CD pipeline design |
| `ci-integration.md` | CI integration rules |
| `ai-implementation.md` | AI/ML implementation rules |
| `code-generation.md` | Code generation rules |
| `build-and-test.md` | Build and test rules |
| `iterative-loop.md` | GICL iterative loop rules |
| `gap-analysis.md` | Gap analysis rules |
| `mobile-design.md` | Mobile app design |
| `mobile-ux-design.md` | Mobile UX design |
| `web-ux-design.md` | Web UX design |

### Operations Rules (2 files)

| File | Purpose |
|------|---------|
| `deployment.md` | Deployment rules and procedures |
| `sprint-tracking.md` | Sprint tracking rules |

### Infrastructure Rules (1 file)

| File | Purpose |
|------|---------|
| `terraform.md` | Terraform IaC rules |

### Master Orchestration

**DEPRECATED (as of Enhancement S6)**: Monolithic `core-workflow.md` (56KB) replaced by phase-specific rule files.

**New Architecture (Enhancement S6)**:

| File | Location | Size | Purpose |
|------|----------|------|---------|
| `preamble.md` | `rules/core/` | 8.2KB | Core principles, pattern library, common practices (loaded for all phases) |
| `pre-flight.md` | `rules/core/` | 10.8KB | Project initialization, environment setup, plugin validation, MCP server checks |
| `inception.md` | `rules/core/` | 15.9KB | Requirements analysis, user stories, workspace detection, design preparation |
| `construction.md` | `rules/core/` | 21.7KB | GICL iterative loop, code generation, quality gates, test-driven development |
| `operations.md` | `rules/core/` | 9.4KB | Deployment procedures, monitoring, production readiness, incident response |
| `adaptive-routing.md` | `rules/core/` | 6.8KB | Phase transition detection, routing logic, context optimization strategies |

**Loading Strategy**:
- `session-start-hook.js` detects current phase from database
- Loads: `preamble.md` + current phase rule + `adaptive-routing.md`
- Context reduction: 34-57% vs original monolith

**Context Comparison**:
| Phase | Loaded Rules | Total Size | Reduction vs 56KB Monolith |
|-------|--------------|-----------|---------------------------|
| Pre-flight | preamble + pre-flight + routing | 25.8KB | 54% |
| Inception | preamble + inception + routing | 30.9KB | 45% |
| Construction | preamble + construction + routing | 36.7KB | 34% |
| Operations | preamble + operations + routing | 24.2KB | 57% |

**Legacy File**:
| File | Size | Status |
|------|------|--------|
| `core-workflow.md` | 56KB | **DEPRECATED** - Kept for backward compatibility, not actively loaded |

---

## 16. Script Inventory

36 scripts in `scripts/`.

### Installation and Setup (10)

| Script | Language | Purpose |
|--------|----------|---------|
| `init.sh` | Bash | Initial project setup |
| `init-knowledge-base.sh` | Bash | Database initialization |
| `init-dashboard.sh` | Bash | Dashboard setup |
| `install-git-hooks.sh` | Bash | Git hook installation |
| `install-v2.sh` | Bash | v2 installation suite |
| `install-central.sh` | Bash | Central installation |
| `setup-project.sh` | Bash | Project setup |
| `setup-claude-settings.js` | Node | Claude Code settings configuration |
| `register-skills.js` | Node | Skill registration system |
| `integrate-validators.sh` | Bash | Integrate validators into hooks |

### Validation and Verification (6)

| Script | Language | Purpose |
|--------|----------|---------|
| `validate-environment.sh` | Bash | Environment checks |
| `validate-installation.sh` | Bash | Installation verification |
| `validate-structure.sh` | Bash | Code structure validation |
| `validate-dashboard.sh` | Bash | Dashboard validation |
| `verify-hooks.sh` | Bash | Hook verification |
| `product-readiness-check.js` | Node | Product readiness assessment |

### Data Management (4)

| Script | Language | Purpose |
|--------|----------|---------|
| `backfill-artifacts.js` | Node | Backfill artifact data |
| `backfill-visual-memory-db.js` | Node | Populate visual diagrams |
| `insert-c4-diagrams.js` | Node | Insert C4 architecture diagrams |
| `insert-journey-diagrams.js` | Node | Insert journey diagrams |

### Code Generation (2)

| Script | Language | Purpose |
|--------|----------|---------|
| `generate-claude-md.js` | Node | Generate CLAUDE.md documentation |
| `generate-iac.js` | Node | Generate Infrastructure as Code |

### Agent and Skill Orchestration (3)

| Script | Language | Purpose |
|--------|----------|---------|
| `agent.js` | Node | Agent CLI interface |
| `skill-orchestrator.js` | Node | Multi-skill coordination |
| `skill-prompt-wrapper.js` | Node | Skill prompt wrapper |

### Statusline (5)

| Script | Language | Purpose |
|--------|----------|---------|
| `statusline.sh` | Bash | Terminal statusline (Linux/Mac) |
| `statusline.py` | Python | Terminal statusline (cross-platform) |
| `statusline.ps1` | PowerShell | Terminal statusline (Windows) |
| `statusline-kb-query.js` | Node | Statusline KB integration |
| `statusline-setup.js` | Node | Statusline initialization |
| `statusline-debug.sh` | Bash | Statusline debugging |
| `provider-data-extractor.js` | Node | stdin JSON → provider detection → normalized JSON stdout; called by statusline scripts |

### Utility (4)

| Script | Language | Purpose |
|--------|----------|---------|
| `auto-commit.js` | Node | Automated git commits |
| `dashboard.js` | Node | Dashboard launcher |
| `test-dashboard-init.sh` | Bash | Dashboard testing |
| `cleanup-experimental.sh` | Bash | Clean up experimental hooks |

---

## 17. Template Inventory

### Core Setup Templates (6)

| Template | Variables | Purpose |
|----------|-----------|---------|
| `CLAUDE.md.template` | PROJECT_NAME, CREATED_DATE, CR_NUMBER, PRD_SECTION | Project setup guide for Claude Code |
| `claude-settings.json.template` | Hook paths, matchers | Hook configuration (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse) |
| `claude-skills.json.template` | -- | DEPRECATED -- points to SKILL.md format |
| `package.json.template` | PROJECT_NAME | npm configuration (better-sqlite3, commander, yaml) |
| `.gitignore.template` | -- | 340-line comprehensive multi-platform git ignores |
| `.claudeignore.template` | -- | 267-line Claude Code ignore rules (binaries, locks, large assets) |

### State Templates (4)

| Template | Variables | Purpose |
|----------|-----------|---------|
| `state/STATE.template.md` | PROJECT_NAME, TIMESTAMP, CURRENT_PHASE, CURRENT_UNIT, GICL_ITERATION, etc. | Current session state tracking |
| `state/PROJECT.template.md` | PROJECT_NAME | Project metadata |
| `state/ROADMAP.template.md` | PHASE_PROGRESS, OVERALL_PROGRESS | Phase progression |
| `state/SUMMARY.template.md` | IN_PROGRESS, COMPLETED_TODAY, BLOCKERS, DECISIONS, NEXT_STEPS | Executive summary |

### Analysis Templates (7)

| Template | Key Variables | Purpose |
|----------|---------------|---------|
| `analysis/ARCHITECTURE.template.md` | ARCHITECTURE_PATTERN, ARCHITECTURE_STYLE, LAYERS, KEY_COMPONENTS | Architecture analysis |
| `analysis/CONCERNS.template.md` | CONCERNS, STRENGTHS | Identified risks |
| `analysis/CONVENTIONS.template.md` | -- | Coding conventions |
| `analysis/INTEGRATIONS.template.md` | -- | External integrations |
| `analysis/STACK.template.md` | -- | Technical stack |
| `analysis/STRUCTURE.template.md` | ENTRY_POINTS, MODULE_DEPS | Directory structure |
| `analysis/TESTING.template.md` | -- | Test strategy |

### Swarm Orchestration (Agent Teams Integration)

Multi-agent team coordination using Claude Code's experimental Agent Teams feature.

| File | Purpose |
|------|---------|
| `lib/swarm-availability-checker.js` | Feature gate: detects Agent Teams env var, determines spawn backend |
| `lib/swarm-team-composer.js` | Maps 24 AICodePath agents to team roles by phase, capability, task |
| `lib/swarm-bridge.js` | Adapter bridging SQLite DAG units with Claude Code file-based tasks |
| `hooks/teammate-idle-hook.js` | TeammateIdle hook: reassign or allow idle based on remaining tasks |
| `hooks/task-completed-hook.js` | TaskCompleted hook: validate quality gates before accepting |
| `agents/aicodepath-swarm-lead.md` | Team lead agent (coordination-only, delegate mode) |
| `skills/aicodepath-swarm/SKILL.md` | `/aicodepath-swarm` skill for team formation and orchestration |
| `db/migrations/006_swarm_teams.sql` | DB tables: swarm_teams, swarm_team_members, swarm_task_mapping |
| `__tests__/swarm-team-composer.test.js` | Unit tests for team composition logic |
| `__tests__/swarm-bridge.test.js` | Unit tests for task sync bridge |

Orchestration patterns: parallel, pipeline, swarm, review.
Phase defaults: PRE-FLIGHT=review, INCEPTION=pipeline, CONSTRUCTION=parallel, OPERATIONS=review.

### Dashboard Template App (~30 files)

React/Vite application in `templates/dashboard/`:
- Express API server (`api/server.cjs`)
- React components: KanbanBoard, DependencyGraph, MonitorView, DiagramViewer, VisualMemoryView
- Enhanced variants: KanbanBoardEnhanced, DependencyGraphEnhanced, MonitorViewEnhanced, VisualMemoryViewEnhanced
- Database hook: `useDatabase.ts`
- Config: Vite, TypeScript, Tailwind CSS, PostCSS

Template engine: Handlebars (`{{variable}}` syntax with `{{#each}}` loops).

---

## 18. Entry Point Flow

```
User types: npx aicodepath <command>
    |
    v
bin/aicodepath.js
    | parses args via commander
    | registers 7 subcommands: init, agent, dashboard, generate, preflight, validate, context
    |
    v
commands/<command>.js  (dynamic require)
    | e.g., commands/init.js (Enhancement S1/S3/S4)
    |       ├─> settings-generator.js (creates .claude/settings.json)
    |       ├─> symlink-manager.js (creates .claude/skills/ symlinks)
    |       └─> symlink-manager.js (creates .claude/agents/ symlinks)
    | e.g., commands/agent.js
    |
    v
lib/ modules
    | agent-loader.js -> loads .aicodepath/agents/*.md THEN skills/roles/*.md (S4)
    | agent-registry.js -> indexes agents in memory
    | agent-invoker.js -> builds prompt, checks context budget
    | context-manager.js -> token estimation, threshold checks
    | path-resolver.js -> resolves all paths, provides getDbPath() (S5)
    |
    v
Database (better-sqlite3)
    | via pathResolver.getDbPath() (centralized, env-configurable S5)
    | Default: aicodepath-docs/aicodepath.db
    | Override: AICODEPATH_DB_PATH environment variable
    | Records: agent_executions, workflow_state, session_state
    |
    v
Output: stdout | file | clipboard
```

### Hook Execution Flow (during Claude Code session)

```
Claude Code session starts
    |
    v
SessionStart hooks fire:
    session-start-hook.js (Enhancement S6)
        ├─> Detects current phase from DB via getDbPath() (S5)
        ├─> Loads preamble.md (8.2KB)
        ├─> Loads current phase rule: pre-flight.md | inception.md | construction.md | operations.md
        ├─> Loads adaptive-routing.md (6.8KB)
        ├─> Total context: 25-37KB (vs 56KB monolith - 34-57% reduction)
        └─> Logs via structured logger (S8)
    context-health-hook.js -> visual-memory-loader.js
    |
    v
User submits prompt
    |
    v
UserPromptSubmit hooks fire:
    pre-flight-check.js (can block)
        └─> Uses structured logger (S8)
    |
    v
Claude Code invokes Write/Edit tool
    |
    v
PreToolUse hooks fire (can block):
    guideline-validator.js -> api-validator.js -> data-validator.js ->
    architecture-validator.js -> duplication-checker.js ->
    devops-validator.js -> iac-validator.js
        └─> All use getDbPath() (S5) and structured logger (S8)
    |
    v
Tool executes (Write/Edit/Bash)
    |
    v
PostToolUse hooks fire (non-blocking):
    auto-artifact-creator.js -> gicl-iteration-hook.js (Enhancement S7: enabled by default) ->
    visual-memory-generator.js -> skill-suggesters
        └─> All use getDbPath() (S5) and structured logger (S8)
        └─> GICL opt-out: check AICODEPATH_GICL_DISABLED environment variable
    |
    v
Results returned to Claude Code
```

### Validation Pipeline

```
Code written by Claude
    |
    v
guideline-validator.js
    | loads 14 JSON guideline files
    | matches rules by language, file pattern
    | checks regex patterns against code
    |
    v
Violations collected
    | severity: error (block) | warning (flag) | info (suggest)
    |
    v
validation-recorder.js
    | records to validations table
    | score: 0-100
    |
    v
gicl-iteration-hook.js
    | dual validation: quality gates + requirements verification
    | calls implementation-verifier.js
    | suggests agents for gaps
    |
    v
Loop continues until PASS
```

---

## 19. State Flow

### Session Creation

```
1. Claude Code session starts
2. session-start-hook.js fires:
   a. Finds project root (path-resolver.js)
   b. Checks/creates aicodepath-docs/aicodepath.db
   c. Reads session_state table for existing state
   d. Sets: CURRENT_PHASE, CURRENT_STAGE, CURRENT_UNIT, WORKFLOW_STARTED
   e. Records session start in session_history
3. context-health-hook.js fires:
   a. Loads context-management.json config
   b. Checks current token usage
   c. Applies threshold rules (60% warn, 70% critical, 85% exceeded)
4. visual-memory-loader.js fires:
   a. Calculates available token budget
   b. Queries visual_diagrams table
   c. Scores diagrams by relevance
   d. Injects top diagrams into context
```

### State Persistence

```
During workflow execution:
1. kb-writer.js updates workflow_state table:
   - phase, stage, unit transitions
   - steps_total, steps_completed tracking
   - artifacts_created (JSON array)
   - blockers (JSON array)
   - Automatic timestamps on status changes

2. session-state-manager.js updates session_state table:
   - Key-value pairs with JSON serialization
   - Keys: current_phase, current_stage, current_unit, etc.
   - Optional metadata alongside values

3. artifact-writer.js creates artifact records:
   - Type, phase, stage, unit, title, content
   - File path, CR number tracking
   - Version and status

4. decision-logger.js records ADRs:
   - Title, decision, rationale, alternatives
   - Category, scope, impact classification

5. event-publisher.js streams to websocket_events:
   - Channels: agent:logs, agent:status, agent:progress, agent:artifact
```

### Session Resumption

```
1. User invokes /aicodepath:resume
2. Skill loads session_state table:
   a. Reads current_phase, current_stage, current_unit
   b. Reads workflow_started flag
   c. Reads last_activity timestamp
3. Queries workflow_state for progress:
   a. Finds incomplete stages
   b. Identifies blockers
4. Queries artifacts for generated work:
   a. Counts by phase/stage
   b. Identifies missing deliverables
5. Restores context:
   a. Loads relevant visual diagrams
   b. Applies context-management thresholds
   c. Rebuilds agent registry
6. Presents recap to user:
   a. Phase/stage/unit status
   b. Completed vs remaining work
   c. Active blockers
```

### Pause Flow

```
1. User invokes /aicodepath:pause
2. Skill saves state:
   a. Writes all session_state keys
   b. Archives current session in session_history
   c. Records checkpoint timestamp
3. State is durable in SQLite:
   a. WAL mode ensures consistency
   b. Foreign keys maintain referential integrity
```

---

## 20. Known Issues

### Critical Issues

| # | Issue | Impact |
|---|-------|--------|
| 1 | ~~`init.js` and `preflight.js` not implemented in `commands/`~~ **RESOLVED**: Both fully implemented; `preflight` passes all 6 checks, `init` runs symlinks + settings + env + MCP generation | ~~Non-functional~~ Working |
| 2 | ~~No enforcement mechanism for hook ordering~~ **RESOLVED**: `_ordering_note` added to hooks.json PostToolUse entry; ordering is documented as a machine-readable constraint | ~~Silent failure on reorder~~ Order documented and enforced at config level |
| 3 | ~~Inconsistent AICodePath ignoring in `.gitignore.template`~~ `.gitignore` **RESOLVED (v2.5.1)**: all workflow-generated documents (PRDs, design plans) saved to `aicodepath-docs/`; framework docs remain in `.aicodepath/docs/` | ~~Leftover from rename~~ Fixed — generated artifacts in `aicodepath-docs/`, framework docs in `.aicodepath/docs/` |

### Design Concerns

| # | Issue | Impact |
|---|-------|--------|
| 4 | ~~Python bridge timeout hardcoded at 60s~~ **RESOLVED**: `AICODEPATH_PYTHON_TIMEOUT` env var override added; falls back to 60000ms | Configurable per environment |
| 5 | ~~Database path hardcoded to `aicodepath-docs/aicodepath.db`~~ **RESOLVED (S5)** | ~~Cannot configure per-project or per-environment DB location~~ **Now centralized via getDbPath() with AICODEPATH_DB_PATH override** |
| 6 | ~~No command aliasing (`aicodepath` vs `acp`)~~ **RESOLVED**: `bin` field added to `package.json` with both `aicodepath` and `acp` entries pointing to same CLI | Both aliases work after `npm install -g` |
| 7 | Hook matchers use string matching only, no regex | Cannot match complex file patterns |
| 8 | No rate limiting on agent invocation | Could spam database with execution records |
| 9 | No request queuing for concurrent agent invocations | Race conditions possible |
| 10 | ~~`claude-skills.json.template` marked DEPRECATED but still present~~ **RESOLVED**: File deleted | Removed from `templates/` |

### Code Quality

| # | Issue | Impact |
|---|-------|--------|
| 11 | Error messages hardcoded as strings | Cannot externalize/localize messages |
| 12 | ~~Documentation paths scattered across `config.json` without schema validation~~ **RESOLVED**: Preflight check #7 validates all `config.json` `paths.*` directories; reports missing entries by name | Caught at startup, not silently |
| 13 | Minimal inline code comments in library modules | Harder for contributors to understand intent |
| 14 | ~~`experimental.DELETE/` directory with 7 hooks still present~~ **RESOLVED (v2.5.0)**: 20 dead hooks deleted | ~~Dead code in the repository~~ Hooks directory cleaned to 21 active hooks |
| 15 | Token estimation uses rough ~4 chars/token approximation | May miscalculate context budgets for non-English or code content |

### Architecture Observations

| # | Observation | Detail |
|---|------------|--------|
| 16 | Three-layer quality enforcement (prompting, hooks, checkpoints) is well-designed but complex | High barrier to understanding for new contributors |
| 17 | ~~24 agent roles with overlapping coverage (e.g., `security` and `security-engineer`)~~ **RESOLVED**: Merged test-engineer+qa, merged security-engineer+security-auditor, deleted generic architect (subsumed by specialists); 25→22 agents | ~~Role deduplication may be needed~~ 22 agents with clear, non-overlapping responsibilities |
| 18 | ~~`core-workflow.md` at 56KB is a monolith~~ **RESOLVED (S6)** | ~~Could benefit from decomposition into smaller rule files~~ **Split into 6 phase-specific files with 34-57% context reduction** |
| 19 | Visual memory relevance scoring uses 5-factor weighted algorithm | Tuning these weights requires empirical testing |
| 20 | Context management thresholds based on "Lost in the Middle" research (2026) | Research-backed but thresholds may need model-specific tuning |
| 21 | **NEW (S1)**: Hook registration now automated via settings-generator.js | Eliminates manual configuration errors, improves developer experience |
| 22 | **NEW (S3/S4)**: Per-file symlink strategy for skills and agents | Maintains single source of truth while satisfying Claude Code's `.claude/` requirement |
| 23 | **NEW (S7)**: GICL enabled by default improves quality | Users may need to disable for rapid prototyping scenarios |
| 24 | **NEW (S8)**: Structured logging provides better observability | Enables log aggregation and advanced monitoring capabilities |

---

## 21. Enhancement Blueprint File Changes Summary

> **Implementation Date**: 2026-02-05
> **Total Files Changed**: 70+
> **New Files Created**: 32
> **Files Updated**: 40+

### New Files Created (32)

**New Directory: `.aicodepath/agents/` (24 files)**
- Migrated from `.aicodepath/skills/roles/`
- Claude Code native agent format
- Files: `architect.md`, `api-designer.md`, `backend-architect.md`, `frontend-architect.md`, `database-architect.md`, `mobile-architect.md`, `code-reviewer.md`, `security-engineer.md`, `performance-engineer.md`, `refactoring-expert.md`, `devops-architect.md`, `sre-engineer.md`, `cost-optimizer.md`, `data-scientist.md`, `ml-engineer.md`, `ui-designer.md`, `ux-designer.md`, `technical-writer.md`, `communication-coach.md`, `compliance-auditor.md`, `test-engineer.md`, `qa.md`, `security.md`, `codebase-pattern-finder.md`

**New Directory: `.aicodepath/rules/core/` (6 files)**
- Split from monolithic `core-workflow.md`
- Phase-specific workflow rules
- Files: `preamble.md`, `pre-flight.md`, `inception.md`, `construction.md`, `operations.md`, `adaptive-routing.md`

**New Libraries: `.aicodepath/lib/` (3 files)**
- `settings-generator.js` - Generates `.claude/settings.json` with hook paths (Enhancement S1)
- `symlink-manager.js` - Creates per-file symlinks for skills and agents (Enhancement S3/S4)
- `env-generator.js` - Generates `.env.aicodepath` with documented environment variables (Env Config)

---

### Files Updated by Enhancement

**S1: Hook Registration System (1 file)**
- `.aicodepath/commands/init.js` - Added settings-generator call

**S2: Skill Frontmatter Migration (23 files)**
All files in `.aicodepath/skills/*/SKILL.md`:
1. `aicodepath-learn/SKILL.md`
2. `aicodepath-help/SKILL.md`
3. `aicodepath-status/SKILL.md`
4. `aicodepath-preferences/SKILL.md`
5. `aicodepath-resume/SKILL.md`
6. `aicodepath-pause/SKILL.md`
7. `aicodepath-init/SKILL.md`
8. `aicodepath-preflight/SKILL.md`
9. `aicodepath-diagnostics/SKILL.md`
10. `aicodepath-c4-architecture/SKILL.md`
11. `aicodepath-visual-memory/SKILL.md`
12. `aicodepath-mental-model/SKILL.md`
13. `aicodepath-diagrams/SKILL.md`
14. `aicodepath-requirements/SKILL.md`
15. `aicodepath-naming-analyzer/SKILL.md`
16. `aicodepath-command-creator/SKILL.md`
17. `coding-standards/SKILL.md`
18. `aicodepath-validate-guidelines/SKILL.md`
19. `aicodepath-skill-audit/SKILL.md`
20. `aicodepath-readme-crafter/SKILL.md`
21. `aicodepath-dependency-updater/SKILL.md`
22. `aicodepath-reducing-entropy/SKILL.md`
23. `frontend-design-review/SKILL.md`

**S3: Symlink Skill Manager (1 file)**
- `.aicodepath/commands/init.js` - Added symlink-manager.setupSkillSymlinks() call

**S4: Native Agent Migration (1 file)**
- `.aicodepath/lib/agent-loader.js` - Updated to read from `.aicodepath/agents/` first

**S5: Centralized Database Paths (18 files)**

*Core Library:*
1. `.aicodepath/lib/path-resolver.js` - Added `getDbPath()` function

*Hook Files (13):*
2. `.aicodepath/hooks/session-start-hook.js`
3. `.aicodepath/hooks/auto-artifact-creator.js`
4. `.aicodepath/hooks/gicl-iteration-hook.js`
5. `.aicodepath/hooks/visual-memory-generator.js`
6. `.aicodepath/hooks/visual-memory-loader.js`
7. `.aicodepath/hooks/visual-memory-sync.js`
8. `.aicodepath/hooks/pre-commit-validator.js`
9. `.aicodepath/hooks/architecture-validator.js`
10. `.aicodepath/hooks/data-validator.js`
11. `.aicodepath/hooks/duplication-checker.js`
12. `.aicodepath/hooks/devops-validator.js`
13. `.aicodepath/hooks/iac-validator.js`
14. `.aicodepath/hooks/ci-lint-hook.js`

*Hook Libraries (2):*
15. `.aicodepath/hooks/lib/implementation-verifier.js`
16. `.aicodepath/hooks/lib/requirements-parser.js`

*Scripts (2):*
17. `.aicodepath/scripts/backfill-artifacts.js`
18. `.aicodepath/scripts/backfill-visual-memory-db.js`

**S6: Core Workflow Split (1 file)**
- `.aicodepath/hooks/session-start-hook.js` - Added phase detection and phase-specific rule loading

**S7: GICL Enabled by Default (1 file)**
- `.aicodepath/hooks/gicl-iteration-hook.js` - Changed from opt-in to opt-out logic

**S8: Structured Error Logging (25+ files)**

*Core Hooks:*
1. `.aicodepath/hooks/session-start-hook.js`
2. `.aicodepath/hooks/pre-flight-check.js`
3. `.aicodepath/hooks/auto-artifact-creator.js`
4. `.aicodepath/hooks/gicl-iteration-hook.js`
5. `.aicodepath/hooks/visual-memory-generator.js`
6. `.aicodepath/hooks/visual-memory-loader.js`
7. `.aicodepath/hooks/visual-memory-sync.js`

*Validators:*
8. `.aicodepath/hooks/guideline-validator.js`
9. `.aicodepath/hooks/api-validator.js`
10. `.aicodepath/hooks/architecture-validator.js`
11. `.aicodepath/hooks/data-validator.js`
12. `.aicodepath/hooks/duplication-checker.js`
13. `.aicodepath/hooks/devops-validator.js`
14. `.aicodepath/hooks/iac-validator.js`
15. `.aicodepath/hooks/pre-commit-validator.js`
16. `.aicodepath/hooks/validate-mcp-memory.js`
17. `.aicodepath/hooks/ci-lint-hook.js`
18. `.aicodepath/hooks/phase-entry-validator.js`

*Suggesters:*
19. `.aicodepath/hooks/inception-skill-suggester.js`
20. `.aicodepath/hooks/construction-skill-suggester.js`
21. `.aicodepath/hooks/maintenance-skill-suggester.js`
22. `.aicodepath/hooks/document-skill-suggester.js`

*Additional:*
23. `.aicodepath/hooks/validate-plan-output.js`
24. `.aicodepath/hooks/run-tests.js`
25. `.aicodepath/hooks/damage-control/damage-control.js`

---

### File Change Statistics by Enhancement

| Enhancement | New Files | Updated Files | Total Changes |
|-------------|-----------|---------------|---------------|
| S1: Hook Registration | 1 | 1 | 2 |
| S2: Skill Frontmatter | 0 | 23 | 23 |
| S3: Symlink Manager | 1 | 1 | 2 |
| S4: Native Agents | 24 | 1 | 25 |
| S5: Centralized DB | 0 | 18 | 18 |
| S6: Workflow Split | 6 | 1 | 7 |
| S7: GICL Default | 0 | 1 | 1 |
| S8: Structured Logging | 0 | 25+ | 25+ |
| **S1-S8 TOTAL** | **32** | **71+** | **103+** |
| | | | |
| M1: Plugin Packaging | 2 | 0 | 2 |
| M2: Checkpoint Recovery | 5 | 0 | 5 |
| M3: Phase State Machine | 7 | 0 | 7 |
| M4: MCP Config Generation | 5 | 1 (init.js) | 6 |
| M5: Hook Service Facade | 5 | 0 | 5 |
| M6: Session Resumption | 2 | 1 (session-start-hook.js) | 3 |
| **M1-M6 TOTAL** | **26** | **2** | **28** |
| | | | |
| **GRAND TOTAL (S1-S8 + M1-M6)** | **58** | **73+** | **131+** |

---

### Key Migration Patterns

**Pattern 1: Database Path Resolution (S5)**
```javascript
// Before
const dbPath = path.join(projectRoot, 'aicodepath-docs', 'aicodepath.db');

// After
const pathResolver = require('../lib/path-resolver');
const dbPath = pathResolver.getDbPath();
```

**Pattern 2: Structured Logging (S8)**
```javascript
// Before
console.error(`[hook-name] Error: ${message}`);

// After
const logger = require('../lib/logger');
logger.error('Error occurred', { hook: 'hook-name', error: err });
```

**Pattern 3: Agent Loading (S4)**
```javascript
// Before
const agentPath = path.join(pathResolver.getAicodePathRoot(), 'skills', 'roles', `${agentName}.md`);

// After
// Try .aicodepath/agents/ first
let agentPath = path.join(pathResolver.getAicodePathRoot(), 'agents', `${agentName}.md`);
if (!fs.existsSync(agentPath)) {
  // Fall back to legacy location
  agentPath = path.join(pathResolver.getAicodePathRoot(), 'skills', 'roles', `${agentName}.md`);
}
```

**Pattern 4: Phase-Specific Rule Loading (S6)**
```javascript
// Before
const rules = fs.readFileSync(path.join(rulesDir, 'core-workflow.md'), 'utf8');

// After
const phase = getCurrentPhase(db); // pre-flight | inception | construction | operations
const rulesCore = path.join(pathResolver.rules(), 'core');
const rules = [
  fs.readFileSync(path.join(rulesCore, 'preamble.md'), 'utf8'),
  fs.readFileSync(path.join(rulesCore, `${phase}.md`), 'utf8'),
  fs.readFileSync(path.join(rulesCore, 'adaptive-routing.md'), 'utf8')
].join('\n\n---\n\n');
```

---

### Testing Checklist for Enhancement Blueprint

**S1-S8 (Short-Term Enhancements)**
- [x] S1: Hook registration generates valid `.claude/settings.json`
- [x] S2: All 23 SKILL.md files have valid Claude Code frontmatter
- [x] S3: Skill symlinks created in `.claude/skills/` pointing to `.aicodepath/skills/*/SKILL.md`
- [x] S4: Agent files in `.aicodepath/agents/` with symlinks in `.claude/agents/`
- [x] S4: Agent loader reads from `.aicodepath/agents/` before fallback to `skills/roles/`
- [x] S5: All 18 files use `getDbPath()` instead of hardcoded paths
- [x] S5: `AICODEPATH_DB_PATH` environment variable override works
- [x] S6: Phase detection in `session-start-hook.js` loads correct rule files
- [x] S6: Context reduction verified (34-57% per phase)
- [x] S7: GICL runs by default without `AICODEPATH_GICL_ENABLED`
- [x] S7: `AICODEPATH_GICL_DISABLED=true` disables GICL
- [x] S8: All 25+ hooks use structured logger with metadata
- [x] S8: Logs formatted consistently across all hooks

**M1-M6 (Medium-Term Enhancements)**
- [x] M1: `plugin.json` manifest with valid metadata
- [x] M1: `hooks/hooks.json` registry with 17 hook definitions
- [x] M1: Hooks use `${CLAUDE_PLUGIN_ROOT}/` paths
- [x] M2: `checkpoint-manager.js` save/load/list/prune functions work
- [x] M2: Checkpoints stored in `aicodepath-docs/checkpoints/`
- [x] M2: Test suite passes (120 tests)
- [x] M3: `phase-state-machine.js` validates phase transitions
- [x] M3: `phase-state.js` CLI commands work (current, transition, history)
- [x] M3: Entry/exit gates enforce quality standards
- [x] M3: Test suites pass (unit + integration)
- [x] M4: `mcp-config-generator.js` transforms `config.json` to `.mcp.json`
- [x] M4: Generated `.mcp.json` validates against schema
- [x] M4: Test suite passes (230 tests)
- [x] M5: `HookContext` lazy-loads services correctly
- [x] M5: Shared service instances reduce memory usage
- [x] M5: Test suite passes (64 tests)
- [x] M6: `session-resumption.js` detects incomplete sessions
- [x] M6: Resumption suggestions are intelligent and actionable
- [x] M6: Integration with checkpoint system works

**S9 (Terminal Integration)**
- [x] S9: `terminal-session-manager.js` creates PTY sessions
- [x] S9: `terminal-websocket-handler.js` handles WebSocket communication
- [x] S9: `terminal-sandbox.js` validates commands and paths
- [x] S9: Terminal.tsx component renders xterm.js terminal
- [x] S9: TerminalTabs.tsx manages multiple terminal tabs
- [x] S9: API server integrates terminal WebSocket handler
- [x] S9: Test suite passes for terminal manager
- [x] S9: Security controls block dangerous commands
- [x] S9: Graceful shutdown closes terminal sessions

---

*v2.2.0 - Enhancement Blueprint (S1-S8) Complete - 2026-02-05*
*v2.2.1 - Phase 6 Enhancements (M1-M6) Complete - 2026-02-06*

---

## Code Graph & RE Enhancement (2026-03-26)

> **Sprint**: Code Graph & Reverse Engineering Enhancement
> **Features**: Multi-language AST parser, NetworkX graph engine, FastMCP code-graph server, D3.js visualizer, git-triggered reindex hook, 11 structured RE extraction templates

### DB Migrations

| File | Purpose |
|------|---------|
| `db/migrations/020_code_graph_columns.sql` | Adds `repo_name` and `package_name` columns + 2 indexes to `code_entities` table for multi-repo graph support |

### Generators — Parsers

| File | Purpose |
|------|---------|
| `generators/parsers/language_types.py` | 4 per-language type dicts (`CLASS_TYPES`, `FUNCTION_TYPES`, `IMPORT_TYPES`, `CALL_TYPES`) for 13 languages (Python, JS, TS, Go, Java, Rust, C, C++, Ruby, PHP, Swift, Kotlin, C#) |
| `generators/parsers/ast_parser.py` | Multi-language tree-sitter AST parser + SQLite DB writer + CLI (`--index` / `--reindex` / `--diff-reindex`); produces `code_entities` and `code_relationships` rows |
| `generators/parsers/graph_engine.py` | NetworkX BFS graph engine: `callers_of`, `callees_of`, `impact_radius`, `tests_for`, `search`; loads from SQLite; pure-logic, no side effects |

### Generators

| File | Purpose |
|------|---------|
| `generators/mcp_graph_server.py` | FastMCP 3.x MCP server named `aicodepath-code-graph`; exposes 8 tools: `callers_of`, `callees_of`, `impact_radius`, `tests_for`, `search`, `visualize`, `reindex`, `diff_reindex` |
| `generators/graph_visualizer.py` | D3.js force-directed HTML generator; reads graph DB, applies scope filtering (`full` / `package` / `file` / `impact`), injects data into `graph-viewer.html` template |

### Generators — Templates

| File | Purpose |
|------|---------|
| `generators/templates/graph-viewer.html` | D3.js force-directed graph template; `{GRAPH_DATA}` placeholder is replaced at generation time by `graph_visualizer.py` |

### Hooks — lib

| File | Purpose |
|------|---------|
| `hooks/lib/graph-bridge.js` | JS→Python bridge: `invokePython()`, `diffReindex()`, `reindexFile()`; fail-safe (never blocks hooks on Python errors) |

### Hooks

| File | Purpose |
|------|---------|
| `hooks/graph-git-hook.js` | PostToolUse Bash hook; triggers on `git commit` / `git pull` / `git merge`; calls `diffReindex()` via `graph-bridge.js` to keep code graph current |
| `hooks/framework-asset-quality-hook.js` | PostToolUse Write\|Edit hook; detects writes to `.aicodepath/skills/*/SKILL.md`, `.aicodepath/agents/*.md`, `.aicodepath/hooks/*.js`; emits mandatory `additionalContext` directive to invoke the appropriate meta-skill (`/aicodepath-skill-audit`, `/aicodepath-agent-audit`, `/aicodepath-hook-audit`) |

### Rules — Inception (RE Templates)

| File | Purpose |
|------|---------|
| `rules/inception/re-templates/01-business-overview.md` | RE extraction template: business context, stakeholders, value proposition |
| `rules/inception/re-templates/02-system-boundaries.md` | RE extraction template: system boundaries, external interfaces, integration points |
| `rules/inception/re-templates/03-functional-requirements.md` | RE extraction template: functional requirements from existing behaviour |
| `rules/inception/re-templates/04-data-model.md` | RE extraction template: data model reverse-engineering with MCP graph route gate |
| `rules/inception/re-templates/05-api-contracts.md` | RE extraction template: API contract discovery and documentation |
| `rules/inception/re-templates/06-architecture-patterns.md` | RE extraction template: architecture pattern identification |
| `rules/inception/re-templates/07-quality-attributes.md` | RE extraction template: quality attribute extraction (performance, security, reliability) |
| `rules/inception/re-templates/08-constraints-assumptions.md` | RE extraction template: constraints and assumptions discovery |
| `rules/inception/re-templates/09-risk-register.md` | RE extraction template: risk identification and classification |
| `rules/inception/re-templates/10-migration-path.md` | RE extraction template: migration path and modernisation opportunities |
| `rules/inception/re-templates/11-dependency-graph.md` | RE extraction template: dependency graph with MCP + route gates |
| `rules/inception/reverse-engineering-legacy.md` | Legacy RE orchestrator (preserved for reference); superseded by `re-templates/` structured templates |
*v2.2.2 - Terminal Integration (S9) Complete - 2026-02-06*

---

### Sprint: Specialist Review Agents (2026-04-20)

| New File | Purpose |
|----------|---------|
| `agents/aicodepath-silent-failure-hunter.md` | Error observability review agent — 5-phase audit for silent failures, swallowed catches, generic error types, fallback masking; integrated into `/aicodepath-review` at standard/strict depth on service/middleware files |
| `agents/aicodepath-test-completeness-analyzer.md` | Test completeness review agent — 6-step behavioral coverage analysis with 1-10 criticality rating; integrated into `/aicodepath-review` at standard/strict depth when test files in diff |

**Modified:**
- `skills/aicodepath-review/SKILL.md` — Added Steps 2d (error observability) and 2e (test completeness) as 7th and 8th review perspectives with depth-gating
- `hooks/lib/agent-suggester.js` — Added 6 DOMAIN_MAPPING entries and 2 VIOLATION_TYPE_MAPPING entries for both new agents
- `skills/aicodepath-classify-component/references/agent-taxonomy.md` — Added 2 rows (service + test component types) for new agents
- `skills/using-aicodepath/SKILL.md` — Added 2 trigger entries for new review perspectives and agent triggers
- `docs/agents/quality-agents.md` — Added documentation sections for both new agents

---

## Directory Conventions

The `aicodepath-docs/` artifact directories have distinct owners and must not be merged or renamed:

| Directory | Owner Skill | Purpose |
|-----------|-------------|---------|
| `aicodepath-docs/design/` | `/aicodepath-write-design` | Design documents written during INCEPTION; one per sprint/topic |
| `aicodepath-docs/plan/` | `/aicodepath-write-plan` | Implementation plans written during INCEPTION; one per sprint/topic |
| `aicodepath-docs/task/` | `/aicodepath-acceptance` | Per-CR task snapshots archived at sprint close; read-only historical record |
| `aicodepath-docs/task/` | `/aicodepath-write-plan` | Per-sprint task files (7-column format consumed by `plan-loader.js` via `task-resolver.js`) |
