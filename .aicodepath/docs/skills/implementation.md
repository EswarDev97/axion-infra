# Skills — Implementation (CONSTRUCTION)

---

## /aicodepath-tdd

**When:** Implementing any feature or bug fix.

**Rigid skill** — follow exactly. The Iron Law: no production code before a failing test.

**Red-Green-Refactor cycle:**

```
RED:    Write smallest failing test for next behavior
        → Run: confirm it fails for the right reason
GREEN:  Write minimum code to make it pass
        → Run: confirm only this test fails/passes
REFACTOR: Improve structure, naming, remove duplication
        → Run: confirm all tests still pass
```

**Cycle rules:**
- One failing test at a time — never two
- Green phase: only code necessary for that specific test
- Refactor only when all tests are green

**Anti-patterns that trigger HARD-GATE:**
- "Let me write the code first, then add tests"
- Writing multiple tests before any code
- Marking tests as `skip` and moving on

---

## /aicodepath-implement

**When:** Ready to write code after design is approved and confidence is HIGH.

**Orchestrates the full implementation sequence:**
1. Verifies brainstorm is complete (reads `aicodepath-docs/adr-log.md`)
2. Verifies plan exists (reads the active task file in `aicodepath-docs/task/`)
3. Verifies confidence ≥ 70% (runs confidence-check)
4. Executes each task in plan order using TDD
5. Runs GICL after each task to check score
6. Signals completion when all tasks done and score ≥ 90

---

## /aicodepath-test

**When:** Writing or reviewing tests — creates comprehensive test suites.

**Coverage requirements:**
- Happy path (expected behavior)
- Edge cases (boundaries, empty inputs, max values)
- Error paths (invalid inputs, network failures, DB errors)
- Integration scenarios (cross-component interactions)

**Test structure per scenario:**
```
Arrange — set up test data and mocks
Act     — call the code under test
Assert  — verify the outcome
```

**Framework selection guidance:**
| Stack | Unit | Integration | E2E |
|-------|------|------------|-----|
| Node.js/TS | Jest/Vitest | Supertest | Cypress/Playwright |
| Python | pytest | pytest + requests | Playwright |
| Go | testing | testify | Playwright |

---

## /aicodepath-debug

**When:** Investigating any bug, error, or unexpected behavior.

**Rigid skill** — systematic root cause analysis BEFORE attempting any fix.

**Debug process:**
1. **Reproduce** — create a reliable reproduction case
2. **Narrow** — identify the exact line/condition causing the failure
3. **Hypothesize** — form a specific hypothesis about why
4. **Test hypothesis** — add logging/assertions to verify or falsify
5. **Fix** — only after root cause is confirmed
6. **Verify** — confirm the fix resolves the reproduction case

**Anti-pattern blocked:** "Try this fix" without understanding root cause.

**HARD-GATE:** No fix attempt until root cause is identified with evidence.

---

## /aicodepath-validate-guidelines

**When:** Reviewing code against AICodePath coding guidelines, security rules, and architecture standards.

**What it validates:**
- All 15 active guideline files
- Interprets violations: fix vs suppress vs false positive
- Distinguishes genuine violations from context-inappropriate rules

**Violation categories:**
- **Fix:** Real violation, code should change
- **Suppress:** Rule doesn't apply in this context (`// aicodepath: allow-stub`)
- **False positive:** Rule pattern is too broad; note it for guideline improvement

---

## /aicodepath-analyze

**When:** Asked to understand, explain, audit, or assess code.

**Output structure:**
- **Summary:** What this code does at a high level
- **Findings:** Specific observations (patterns, anti-patterns, risks)
- **Risks:** What could break or cause issues
- **Recommendations:** Prioritized list of improvements

**Does not modify code** — analysis only.

---

## /aicodepath-git

**When:** Git operations beyond simple commits — branch management, conflict resolution, history investigation, safe destructive operations.

**Covers:**
- Branch strategy (feature branches, git flow, trunk-based)
- Conflict resolution
- Interactive rebase
- Cherry-pick
- History investigation (`git log`, `git blame`, `git bisect`)
- Safe force-push (with confirmation)
- `.gitignore` management

**Safe destructive operations:** Requires explicit confirmation before `--force`, `reset --hard`, branch deletion.

---

## /aicodepath-worktree

**When:** Before starting any significant implementation.

**What it does:**
1. Creates an isolated git worktree (`git worktree add`)
2. Establishes a clean test baseline (runs tests, records results)
3. Tracks what changes from baseline as implementation proceeds
4. Enables safe experimentation — main tree untouched

**Cleanup:** `git worktree remove <path>` when implementation is merged.

---

## /aicodepath-frontend-design-review

**When:** Reviewing or validating frontend components, pages, or UI implementations.

**Checks:**
- Design system compliance (tokens, component usage)
- Accessibility (WCAG 2.1 AA: ARIA, keyboard nav, color contrast)
- Component structure (single responsibility, composability)
- Performance (bundle size impact, render efficiency)
- Responsive design correctness

**Adapts depth to user expertise:**
- Beginner: guided walkthrough with explanations
- Expert: concise violation list with references

---

## /aicodepath-coding-standards

**Status:** Reference-only skill (not user-invocable, `user-invocable: false`)

**Purpose:** Loaded by Claude automatically when writing code. Defines:
- Naming conventions (PascalCase for classes, camelCase for functions, UPPER_SNAKE_CASE for constants)
- Import ordering (stdlib → external → internal → relative)
- Mock detection rules (stubs/mocks only in test files)
- File structure conventions
- Comment standards (why, not what)

**Does not need to be invoked** — guidelines are enforced by `guideline-validator.js` hook.

---

## /aicodepath-search-first

**When:** About to implement something new — enforces ranked search strategy before writing any code.

**Search order (ranked by value):**
1. Codebase search (Grep/Glob) — find existing implementations
2. Context7 MCP — verify library APIs and patterns
3. Package registry (npm/PyPI/crates.io) — find existing packages
4. WebSearch — broader research

**Decision gate:** ≥80% match → use existing. <80% → build with justification.

**Integrates with:** `rules/construction/research-first.md` — this skill is the executable workflow for that rule.

---

## /aicodepath-benchmark

**When:** Measuring or comparing performance — 4 supported modes.

| Mode | Trigger | What it measures |
|------|---------|-----------------|
| `page` | "benchmark this page", "check Core Web Vitals" | Lighthouse + CWV (LCP, INP, CLS, TTFB) |
| `api` | "API latency", "throughput test" | p50/p95/p99 latency, requests/sec, error rate |
| `build` | "build time", "compile speed" | Compile + bundle time, cache hit rate |
| `before-after` | "did this change help", "regression check" | Delta comparison with pass/fail verdict |

**Output:** Standard comparison table with delta and pass/fail verdict for each metric.

---

## /aicodepath-ai-regression-testing

**When:** Testing AI-written code for systematic blind spots — the same model makes the same mistakes and misses the same issues consistently.

**Key principle:** "Test where bugs WERE found" — AI makes identical mistakes repeatedly. Build test suites around past failures.

**The 7 AI Blind Spot Patterns:**

| # | Pattern | What to test |
|---|---------|-------------|
| 1 | Sandbox/Production path mismatch | Environment-specific URLs and configs |
| 2 | Error state cleanup omission | Rollback and cleanup paths on failures |
| 3 | Optimistic rollback assumption | What happens when rollback itself fails |
| 4 | Missing idempotency checks | Duplicate request handling |
| 5 | Silent failure swallowing | Exception paths that return success |
| 6 | Timing/race condition blindness | Concurrent state modification |
| 7 | Mock-reality divergence | Mocked interfaces matching production behavior |

**Sandbox-mode testing:** How to test production paths in sandbox environments — feature flags, traffic splitting, shadow testing.

---

## /aicodepath-gap-analysis

**When:** Comparing feature specifications against the actual codebase to identify what's missing, incomplete, or unimplemented.

**Requires:** `.specify/` directory from `/aicodepath-specify` or `aicodepath-docs/plan/`.

**Gap status categories:**
- `MISSING` — no implementation found
- `STUB` — route/function exists but returns 501 or has TODO body
- `PARTIAL` — tests pass with mocks only, or feature is incomplete
- `COMPLETE` — implementation matches spec with evidence

**Output:** `aicodepath-docs/gap-report.md` — prioritized by P0/P1/P2 with effort estimates.

**Upstream consumer:** `/aicodepath-write-plan` reads gap report to create implementation tasks for missing features.

---

## /aicodepath-rules-distill

**When:** Codifying a recurring pattern into an enforceable guideline rule — triggered by repeated GICL violations, knowledge.md observations, or code review patterns.

**Pattern sources (highest to lowest signal):**
1. GICL feedback (repeated score reductions for same issue)
2. `aicodepath-docs/knowledge.md` lessons
3. Code review comments across sessions
4. Learned preferences from `/aicodepath-learn`

**Output types:**
- **JSON rule** — added to appropriate `.aicodepath/guidelines/*.json` file for automatic enforcement
- **Markdown rule** — added to `.aicodepath/rules/` for workflow guidance

**Mandatory step:** False-positive testing before any rule is committed. Every new rule must pass the false-positive test suite.

---

## /aicodepath-edd

**When:** Defining evaluation criteria for AI/agent capabilities before coding (Eval-Driven Development).

**Two eval types:**
- **Capability evals** — does the agent/skill do what it claims? New behavior tests.
- **Regression evals** — does it still work after changes? Prevent degradation.

**Grader types:**
- Exact match (deterministic)
- LLM-as-judge (semantic correctness)
- Code execution (functional verification)
- Human-in-the-loop (approval gate)

**pass@k metric:** Run k samples — pass if at least 1 sample succeeds. Useful for non-deterministic AI outputs.

**Output:** Eval definition files in `aicodepath-docs/evals/` with scenario, grader, and pass threshold.

---

## /aicodepath-harness-eval

**When:** Auditing an agentic framework's architecture against Nate B. Jones' 12 production primitives, or designing a new harness from scratch.

**Two modes:**
- **Design** — produces a Day One / Week One / Month One sequenced implementation plan for a new harness (5 product-type templates: coding agent, conversational assistant, research agent, scheduled runner, swarm)
- **Evaluate** — verdicts an existing codebase across four scopes: `full` (whole framework), `primitive <N>` (single primitive deep-dive), `asset <path>` (single file, applicable primitives only), `external` (evaluate another framework)

**Architecture:**
- `scripts/check-primitives.js` — deterministic evidence collector (never assigns verdicts)
- `scripts/check-asset.js` — applicability matcher for asset scope
- `scripts/render-report.js` — verdict JSON → markdown renderer with golden-fixture drift analysis and `--pin-baseline` CLI
- `references/primitives.md` — 12-primitive spec sheet with PASS bars and CC source anchors
- `references/eval-rubric.md` — verdict decision tree (PASS / PARTIAL / MISSING / EXCEEDS) with rubricVersion gating
- `references/golden-verdicts/aicodepath-tool.json` — pinned baseline fixture; drift analysis classifies runs into Clean / Rubric Evolved / Codebase Changed / Check Script Regression

**Auto-invocation:** Hard-wired after `/aicodepath-hook-creator` (Grade A → Primitive Compliance Check) and in single-hook mode of `/aicodepath-hook-audit`. Soft-wired "See also" in `/aicodepath-agent-audit` for primitive #9.

**Output:** `<target>/aicodepath-docs/harness-eval/<timestamp>-<mode>.md` with verdict table, evidence detail, remediation backlog (Tier 1/2/3), and drift analysis section.
