# Agents — Quality & Security

Covers: `aicodepath-code-reviewer`, `aicodepath-test-engineer`, `aicodepath-qa`, `aicodepath-security-engineer`, `aicodepath-performance-engineer`, `aicodepath-refactoring-expert`

---

## aicodepath-code-reviewer

**File:** `.aicodepath/agents/aicodepath-code-reviewer.md`
**Description:** Use after implementing any feature or fix — reviews for bugs, logic errors, security vulnerabilities, code smells, and adherence to project conventions before committing.

**Review checklist:**
- Logic correctness and edge case handling
- Security vulnerabilities (injection, XSS, IDOR, etc.)
- Code smell detection (duplicates, long methods, deep nesting)
- Naming convention compliance
- Error handling completeness
- Test coverage adequacy
- Performance anti-patterns

**Invocation triggers (from agent-suggester.js):**
- After GICL detects authenticity violations
- Before commit when code review quality score drops

---

## aicodepath-test-engineer

**File:** `.aicodepath/agents/aicodepath-test-engineer.md`
**Description:** Create test strategies, write comprehensive tests, and enforce quality gates — spans test pyramid design, implementation, and coverage enforcement.

**Key capabilities:**
- Test pyramid design (unit 70%, integration 20%, E2E 10%)
- Test strategy documentation
- Coverage threshold enforcement (minimum 80%)
- Test framework selection (Jest, Vitest, Pytest, Go testing)
- Mocking strategy (when to mock, what to mock)
- E2E test design (Cypress, Playwright)
- Contract testing (Pact)
- Mutation testing

**Invocation triggers:**
- GICL test score < 70% (tests dimension)
- Files written without corresponding test files

---

## aicodepath-qa

**File:** `.aicodepath/agents/aicodepath-qa.md`
**Description:** Ensure code quality through test-first development, comprehensive coverage, and bug detection — writes unit, integration, and E2E tests; rejects code below 80% coverage or without proper error handling.

**Hard gate:** Rejects code submissions that:
- Have < 80% test coverage
- Lack error handling for all code paths
- Have no test for happy path + at least one error path

**Difference from test-engineer:** `aicodepath-qa` enforces standards and gates; `aicodepath-test-engineer` designs strategy and writes tests. QA is the gatekeeper, test-engineer is the builder.

---

## aicodepath-security-engineer

**File:** `.aicodepath/agents/aicodepath-security-engineer.md`
**Description:** Use when writing auth code, API endpoints, file upload handlers, input parsing, or any code that touches user data or permissions — conducts threat modeling, enforces security patterns, and audits for vulnerabilities.

**Coverage:**
- Threat modeling (STRIDE framework)
- OWASP Top 10 compliance
- Authentication: JWT validation, OAuth flows, session management
- Authorization: RBAC, ABAC, resource-level permissions
- Input validation and sanitization
- SQL injection prevention
- File upload security (type validation, size limits, virus scanning)
- Secrets management (no hardcoded credentials)
- CORS and CSRF protection
- TLS/certificate requirements

**Invocation triggers (from agent-suggester.js):**
- `security-rules.json` violations (error severity)
- Files matching auth/permission patterns

---

## aicodepath-performance-engineer

**File:** `.aicodepath/agents/aicodepath-performance-engineer.md`
**Description:** Use when writing DB queries, API endpoints with high traffic, loops over large datasets, or when profiling/optimizing slow code — identifies bottlenecks and applies caching, indexing, and algorithmic improvements.

**Coverage:**
- Database query optimization (EXPLAIN, index strategy, N+1 elimination)
- API response time optimization
- Caching strategy (Redis, CDN, HTTP cache headers)
- Algorithmic complexity reduction
- Connection pooling configuration
- Pagination optimization (cursor vs offset)
- Batch processing patterns

**Invocation triggers:**
- GICL architecture score drops for data-heavy files
- SQL file patterns detected without EXPLAIN analysis

---

## aicodepath-refactoring-expert

**File:** `.aicodepath/agents/aicodepath-refactoring-expert.md`
**Description:** Improve code quality, reduce technical debt, and apply design patterns without changing functionality.

**Key capabilities:**
- Code smell identification (God class, shotgun surgery, feature envy)
- Design pattern application (Factory, Strategy, Observer, Repository)
- Extract method/class refactoring
- Dependency injection introduction
- SOLID principles enforcement
- Test-safe refactoring (ensure tests pass before and after)
- Incremental refactoring planning

**Constraint:** Does not change external behavior — only internal structure. Always verifies tests pass after changes.

**Invocation triggers:**
- GICL duplication score drops (code duplication detected)
- `/aicodepath-reducing-entropy` skill invoked

---

## aicodepath-silent-failure-hunter

**File:** `.aicodepath/agents/aicodepath-silent-failure-hunter.md`
**Description:** Use when reviewing code for error observability issues — missing logging on error paths, swallowed catch blocks, fallback behavior masking failures, or generic error types.

**5-phase review process:**
1. Identify all error handling code (try-catch, callbacks, fallbacks, null coalescing)
2. Scrutinize each error handler for logging quality, user feedback, catch specificity, and fallback behavior
3. Examine error messages for clarity and actionability
4. Check for hidden failures (empty catch blocks, returning null on error, silent retry exhaustion)
5. Validate against project standards in CLAUDE.md

**Output:** `Severity | Location | Issue | Suggestion | Auto-fixable` table with per-finding detail for CRITICAL/HIGH items.

**Severity mapping:** CRITICAL (silent failure, swallowed errors), HIGH (generic messages, unjustified fallbacks), MEDIUM (missing log context).

**Invocation triggers (from agent-suggester.js):**
- `'silent-failure'`, `'error-observability'`, `'catch-block'`, `'swallowed-error'`, `'fallback-masking'`, `'error-handler-review'` keywords
- `/aicodepath-review` at `standard` depth on service/middleware/handler files
- `/aicodepath-review` at `strict` depth (always)

**Collaboration:** `aicodepath-code-reviewer` (general review), `aicodepath-error-detective` (production investigation), `aicodepath-sre-engineer` (observability strategy)

---

## aicodepath-test-completeness-analyzer

**File:** `.aicodepath/agents/aicodepath-test-completeness-analyzer.md`
**Description:** Use when reviewing code changes for test completeness — behavioral coverage gaps, untested race conditions, missing edge cases, dual-layer safety mechanisms, multi-tenant isolation, and error propagation paths.

**6-step analysis process:**
1. Understand changes — map all behavioral paths (happy, error, edge, concurrent)
2. Map test coverage — match each path to existing tests
3. Identify critical gaps — dual-layer safety, multi-tenant isolation, error propagation, execution order
4. Evaluate test quality — behavioral vs implementation testing, DAMP principles
5. Rate each gap 1-10 (9-10: data loss/security; 7-8: user-facing errors; 5-6: edge cases; 3-4: completeness; 1-2: optional)
6. Produce test scenario inventory — what's tested vs what's missing, with criticality ratings

**Severity mapping (from rating):** CRITICAL (8-10), HIGH (5-7), MEDIUM (3-4), LOW (1-2).

**Standards:** References `guidelines/testing-standards.json` — `descriptive-test-names`, `arrange-act-assert`, `no-test-dependencies`, `minimum-coverage`.

**Invocation triggers (from agent-suggester.js):**
- `'test-completeness'`, `'behavioral-coverage'`, `'coverage-gap-analysis'`, `'missing-test-cases'`, `'regression-risk'`, `'dual-layer-safety'` keywords
- `/aicodepath-review` at `standard` depth when test files are in the diff
- `/aicodepath-review` at `strict` depth (always)

**Collaboration:** `aicodepath-test-engineer` (writes tests for gaps), `aicodepath-qa` (coverage thresholds), `aicodepath-silent-failure-hunter` (complementary error observability audit)
