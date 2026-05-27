# Test Coverage — RE Template

## Route Gate

**Included in routes**:
- `greenfield`: SKIP — no existing codebase to analyze
- `brownfield-shallow`: SKIP — shallow route covers docs 1–5 only
- `brownfield-deep`: INCLUDE

If `re_route` = `greenfield`: stop here, do not generate this document.
If `re_route` = `brownfield-shallow`: stop here, do not generate this document.

---

## Frontmatter

When generating output, populate this frontmatter:

```yaml
---
repo: <git remote name or directory name>
repo_url: <git remote url>
branch: <current branch>
commit: <HEAD short hash>
generated_at: <ISO timestamp>
data_source: graph|llm-only
route: <re_route value>
---
```

---

## Instructions

Output file: `aicodepath-docs/inception/reverse-engineering/09-test-coverage.md`

### Graph Data Collection [DATA SOURCE: graph]

If `mcp__aicodepath-code-graph__tests_for` is available, call it for each significant exported entity:

```
mcp__aicodepath-code-graph__tests_for(qualified_name="<UserService or primary service>")
mcp__aicodepath-code-graph__tests_for(qualified_name="<OrderService or secondary service>")
mcp__aicodepath-code-graph__tests_for(qualified_name="<AuthMiddleware>")
mcp__aicodepath-code-graph__tests_for(qualified_name="<primary repository class>")
mcp__aicodepath-code-graph__search_entities(query="test spec describe it expect assert", limit=20)
```

Repeat `tests_for` for the top 10 most important entities identified in the component inventory. Note which entities have no associated test files.

If MCP server is unavailable, skip to LLM-only analysis below.

---

### Document Sections

#### Section 1: Test Infrastructure [DATA SOURCE: llm-only]

Identify the testing stack:
- **Unit test framework**: Jest, Pytest, Go test, RSpec, JUnit, Vitest, Mocha — version, config file location
- **Integration test framework**: Supertest, HTTPX, TestClient, RSpec request specs
- **E2E test framework**: Playwright, Cypress, Selenium, Puppeteer
- **Test database strategy**: in-memory SQLite, test containers, fixtures, factories (`factory_boy`, `faker`, `fishery`)
- **Mocking libraries**: Jest mocks, `unittest.mock`, `sinon`, `mockery`, testify mocks
- **Coverage tool**: Istanbul/nyc, coverage.py, go cover, JaCoCo — threshold configured?
- **Test runner config**: `jest.config.js`, `pytest.ini`, `go test ./...`, `rspec --format`

State whether CI enforces coverage thresholds (check `.github/workflows`, `.gitlab-ci.yml` for coverage gates).

---

#### Section 2: Test Suite Structure [DATA SOURCE: graph|llm-only]

**Graph path**: From `tests_for` results and `search_entities` test entity results, build a mapping of source entities → test files. Identify which source components have corresponding test files and which do not.

**LLM-only path**: Map the test directory structure to the source structure. For each source component, check for a corresponding test file using naming conventions: `<name>.test.ts`, `test_<name>.py`, `<name>_test.go`, `<name>_spec.rb`.

Produce a coverage map:
| Component | Source File | Test File | Test Type | Has Tests |
|-----------|------------|-----------|-----------|-----------|

Flag components with no test files as "Untested".

---

#### Section 3: Test Quality Assessment [DATA SOURCE: llm-only]

For each test file found, sample the test cases and assess:

**Test completeness signals** (positive):
- Tests for both happy path and error/edge cases
- Tests for boundary conditions (empty input, max values, null/undefined)
- Integration tests that exercise database operations
- Tests for authentication and authorization enforcement

**Test smell signals** (negative):
- Tests that only assert `expect(result).toBeDefined()` (trivial assertion)
- Tests with no assertions at all
- Tests that mock every dependency including the unit under test
- Duplicate test cases (copy-paste testing)
- Test setup so complex the test is harder to understand than the source code

Summarize: what percentage of sampled tests appear meaningful vs. superficial?

---

#### Section 4: Coverage Gap Analysis [DATA SOURCE: graph|llm-only]

**Graph path**: Cross-reference entities from `search_entities` with `tests_for` results. List all entities that have no corresponding test file. Prioritize gaps by fan-in (widely-used untested code is highest risk).

**LLM-only path**: From the coverage map in Section 2, identify the untested components. Prioritize by:
1. Services and repositories (business logic — highest risk if untested)
2. Auth and security middleware (security risk if untested)
3. Utilities called from many places (cross-cutting risk)
4. Simple DTOs and config (lowest risk)

Produce a prioritized gap list:
| Gap | Component | Risk (High/Med/Low) | Reason | Recommended Test Type |
|-----|-----------|--------------------|---------|--------------------|

---

#### Section 5: Test Data and Fixture Strategy [DATA SOURCE: llm-only]

Assess how test data is managed:
- **Fixtures**: Static JSON/YAML fixtures committed to repo — are they kept up to date with schema?
- **Factories**: Dynamic object factories (factory_boy, Faker.js) — do they cover all required fields?
- **Seed data**: Scripts to populate test database — idempotent?
- **Mocked external services**: Are HTTP calls to third-party APIs mocked in tests?
- **Test isolation**: Are tests isolated (each test resets DB state) or do they share state (risk of order-dependence)?

---

#### Section 6: Test Coverage Recommendations

Based on coverage gaps from Section 4, recommend a test-writing priority order for the incoming development sprint. For each recommendation:

```
**Priority N: Test <ComponentName>**
- Gap type: Missing unit tests | Missing integration tests | Missing E2E tests
- Risk: <why this gap matters>
- Suggested approach: <specific test scenarios to write>
- Effort: Small (< 1 day) | Medium (1–3 days) | Large (> 3 days)
```

Set `data_source` in frontmatter to `graph` if `tests_for` MCP calls were used, otherwise `llm-only`.
