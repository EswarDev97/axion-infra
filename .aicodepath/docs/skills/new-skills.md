# Skills — Added in v2.6 and Later

This file documents skills added after v2.5.1. Each entry includes the version it was introduced, its invocation, trigger conditions, and key features.

---

## v2.6.0 Skills

### /aicodepath-work

**Introduced:** v2.6.0
**Invocation:** `/aicodepath-work`
**Phase:** CONSTRUCTION

Unified execution entry point. Auto-detects execution mode from pending task count in `tasks.md`:

| Pending tasks | Mode | How |
|--------------|------|-----|
| 1 | solo | Direct TDD, no overhead |
| 2–3 | parallel | Task tool, one worker per task |
| 4+ | swarm | Agent teams (if enabled) |

**Override flags:** `--solo`, `--parallel N`, `--swarm`, `--no-tdd`, `--no-commit`

---

### /aicodepath-review

**Introduced:** v2.6.0
**Invocation:** `/aicodepath-review`
**Phase:** CONSTRUCTION / OPERATIONS

Structured 4-perspective code review:

| Perspective | What it checks |
|------------|---------------|
| Security | OWASP Top 10, secrets, auth, injection |
| Performance | N+1, missing indexes, bundle size, cache misuse |
| Quality | SOLID violations, naming, test coverage |
| Accessibility | WCAG 2.2, ARIA, keyboard navigation |

**Grading:** A (excellent) → D (critical issues). Each perspective graded independently.

---

### /aicodepath-release

**Introduced:** v2.6.0
**Invocation:** `/aicodepath-release`
**Phase:** OPERATIONS

Release automation workflow:
1. Bump version in `package.json` / `pyproject.toml` / `Cargo.toml`
2. Generate or update `CHANGELOG.md` from conventional commits
3. Create git tag
4. Create GitHub Release with release notes
5. Optionally trigger CI/CD deployment

---

### /aicodepath-reducing-entropy

**Introduced:** v2.6.0
**Invocation:** `/aicodepath-reducing-entropy`
**Phase:** OPERATIONS (manual-only)

**Manual-only skill** — never suggested automatically. Only activate when explicitly requested.

Measures total codebase size and identifies:
- Dead code (unreachable functions, unused exports)
- Redundant abstractions (wrapper classes that add no value)
- Over-engineered patterns (factory for a single concrete type)
- Duplicate logic (copy-paste with minor variations)

**Success metric:** Final code reduction (LOC delta), not effort or number of changes made.

---

## v2.7.0 Skills

### /aicodepath-agent-creator

**Introduced:** v2.7.0
**Invocation:** `/aicodepath-agent-creator`
**Phase:** Any

Creates or improves specialist agents. Two modes:
- **Create:** 6-step workflow (interview → research → draft → register → taxonomy update → finalize)
- **Improve:** Hill-climbing loop (baseline audit → pressure scenarios → mutate → evaluate → keep best)

See `domain-specific.md` → Authoring Lifecycle section for full detail.

---

### /aicodepath-agent-audit

**Introduced:** v2.7.0
**Invocation:** `/aicodepath-agent-audit`
**Phase:** Any

6-dimension quality scoring (100 pts) for single agent or batch. See `domain-specific.md`.

---

### /aicodepath-hook-creator

**Introduced:** v2.7.0
**Invocation:** `/aicodepath-hook-creator`
**Phase:** Any

Creates or improves hooks. Generates persistent test file (`.aicodepath/__tests__/hook-<name>.test.js`) with minimum 4 test cases. See `domain-specific.md`.

---

### /aicodepath-hook-audit

**Introduced:** v2.7.0
**Invocation:** `/aicodepath-hook-audit`
**Phase:** Any

6-dimension quality scoring (100 pts) for single hook or batch. See `domain-specific.md`.

---

### /aicodepath-skill-improver

**Introduced:** v2.7.0
**Invocation:** `/aicodepath-skill-improver`
**Phase:** Any

Autonomous hill-climbing loop for SKILL.md optimization:
1. Read target SKILL.md
2. Run `/aicodepath-skill-audit` → baseline score + grade per dimension
3. Identify lowest-scoring dimensions
4. Apply dimension-specific mutation strategy
5. Re-audit → compare delta
6. If improved: keep mutation; else: discard
7. Repeat until Grade A or plateau

**Automatically invoked** by `aicodepath-skill-creator` after initial description optimization.

---

## v2.8.0 Skills

### /aicodepath-model-training

**Introduced:** v2.8.0
**Invocation:** `/aicodepath-model-training`

Autonomous ML experiment loop. See `domain-specific.md` → ML / Model Training Skills.

---

## v2.9.0 Skills

### /aicodepath-prompt-engg

**Introduced:** v2.9.0
**Invocation:** `/aicodepath-prompt-engg`

Generic LLM prompt engineering with symptom-based framework selection. See `domain-specific.md`.

---

## v2.10.0 Skills

### /aicodepath-interconnection-diagram

**Introduced:** v2.10.0
**Invocation:** `/aicodepath-interconnection-diagram`

Interactive HTML component map of AICodePath framework. See `domain-specific.md`.

---

## v2.11.0 Skills

### /aicodepath-brownfield-readiness

**Introduced:** v2.11.0
**Invocation:** `/aicodepath-brownfield-readiness`

Scores a brownfield codebase for AI-assisted development readiness. See `aicodepath-brownfield-readiness.md`.

---

## v2.12.0 Skills

### /aicodepath-reverse-engineer

**Introduced:** v2.12.0 (RE Enhancement System)
**Invocation:** `/aicodepath-reverse-engineer`
**Phase:** INCEPTION

Produces 11 comprehensive RE documents. Three routes: greenfield, brownfield-shallow, brownfield-deep. See `planning.md`.

---

### /aicodepath-discover

**Introduced:** v2.12.0
**Invocation:** `/aicodepath-discover`
**Phase:** PRE-FLIGHT / INCEPTION

Auto-discover full ecosystem from single repo entry point (10 signal types). See `planning.md`.

---

### /aicodepath-specify

**Introduced:** v2.12.0
**Invocation:** `/aicodepath-specify`
**Phase:** INCEPTION / CONSTRUCTION

Generate `.specify/` feature specs from design or RE docs. See `planning.md`.

---

### /aicodepath-gap-analysis

**Introduced:** v2.12.0
**Invocation:** `/aicodepath-gap-analysis`
**Phase:** CONSTRUCTION

Compare specs vs code, find gaps. See `implementation.md`.

---

### /aicodepath-batch

**Introduced:** v2.12.0
**Invocation:** `/aicodepath-batch`
**Phase:** Any

Parallel multi-repo processing. See `team-orchestration.md`.

---

### /aicodepath-write-design

**Introduced:** v2.12.0
**Invocation:** `/aicodepath-write-design`
**Phase:** INCEPTION

Synthesize approved brainstorm into structured design document. See `planning.md`.

---

### /aicodepath-cruise-control

**Introduced:** v2.12.0
**Invocation:** `/aicodepath-cruise-control`
**Phase:** Any

Supervised unattended AIDLC execution. See `session-management.md`.

---

### /aicodepath-edd

**Introduced:** v2.12.0
**Invocation:** `/aicodepath-edd`
**Phase:** Any

Eval-Driven Development (EDD) framework. See `implementation.md`.

---

### /aicodepath-harness-eval

**Introduced:** v2.12.0
**Invocation:** `/aicodepath-harness-eval`
**Phase:** Any

Audit any agentic harness against Nate B. Jones' 12 production primitives (derived from Claude Code v2.1.88 source). Two modes: Design (new harness plan with Day One / Week One / Month One sequencing) and Evaluate (four scopes: full / primitive / asset / external). Backed by deterministic evidence scripts, golden fixture drift analysis, and a verified Claude Code source map. Also auto-invoked from `/aicodepath-hook-creator` and `/aicodepath-hook-audit`. See `implementation.md`.

---

### /aicodepath-mcp-builder

**Introduced:** v2.12.0
**Invocation:** `/aicodepath-mcp-builder`
**Phase:** Any

Build/improve MCP servers with accuracy-driven hill-climbing. See `domain-specific.md`.

---

### /aicodepath-benchmark

**Introduced:** v2.12.0
**Invocation:** `/aicodepath-benchmark`
**Phase:** CONSTRUCTION / OPERATIONS

4-mode performance measurement (page/API/build/before-after). See `implementation.md`.

---

### /aicodepath-ai-regression-testing

**Introduced:** v2.12.0
**Invocation:** `/aicodepath-ai-regression-testing`
**Phase:** CONSTRUCTION

Test AI-written code for 7 systematic blind spot patterns. See `implementation.md`.

---

### /aicodepath-search-first

**Introduced:** v2.12.0
**Invocation:** `/aicodepath-search-first`
**Phase:** CONSTRUCTION

Ranked search strategy enforcement before any implementation. See `implementation.md`.

---

### /aicodepath-context-budget

**Introduced:** v2.12.0
**Invocation:** `/aicodepath-context-budget`
**Phase:** Any

Token audit across all AICodePath context sources. See `session-management.md`.

---

### /aicodepath-cost-aware-llm

**Introduced:** v2.12.0
**Invocation:** `/aicodepath-cost-aware-llm`
**Phase:** Any

LLM API cost management, model routing, prompt caching. See `domain-specific.md`.

---

### /aicodepath-codebase-onboarding

**Introduced:** v2.12.0
**Invocation:** `/aicodepath-codebase-onboarding`
**Phase:** PRE-FLIGHT / INCEPTION

Structured first-contact exploration — produces `aicodepath-docs/onboarding-guide.md`. See `planning.md`.

---

### /aicodepath-rules-distill

**Introduced:** v2.12.0
**Invocation:** `/aicodepath-rules-distill`
**Phase:** Any

Codify recurring patterns into JSON guideline rules. See `implementation.md`.

---

## Reference-Only Skills (Non-Invocable)

| Skill | Purpose | Used by |
|-------|---------|---------|
| `aicodepath-autonomous-loops` | Taxonomy of 6 loop patterns | Framework reference |
| `aicodepath-pytorch-patterns` | PyTorch idioms reference | `aicodepath-model-training`, data-scientist agent |
| `aicodepath-coding-standards` | Naming + import conventions | `guideline-validator.js` hook |
