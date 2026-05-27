# Build and Test

**Purpose**: Build all units and execute comprehensive testing

**Always Executes**: This stage runs after all units are complete

## Prerequisites
- All unit code generation complete
- All tests generated

## Step 1: Load Context

### 1.1 Load All Generated Code
- All unit code directories
- All test files
- Configuration files

### 1.2 Identify Build Requirements
- Build tools required
- Dependencies to install
- Environment setup

## Step 2: Create Build Instructions

Create `aicodepath-docs/construction/build-and-test/build-instructions.md`:

```markdown
# Build Instructions

## Prerequisites
- [Runtime]: [Version required]
- [Package Manager]: [Version required]
- [Database]: [If required for tests]
- [Other dependencies]

## Environment Setup

### 1. Install Dependencies
```bash
# [Package manager install command]
npm install
# or
pip install -r requirements.txt
# or
mvn install
```

### 2. Environment Variables
Create `.env` file or set environment variables:
```bash
DATABASE_URL=[connection string]
API_KEY=[api key]
[Other variables]
```

### 3. Database Setup (if applicable)
```bash
# Run migrations
npm run migrate
# or
python manage.py migrate
```

## Build Commands

### Development Build
```bash
npm run build:dev
# or
python setup.py develop
```

### Production Build
```bash
npm run build
# or
python setup.py install
```

### Docker Build (if applicable)
```bash
docker build -t [unit-name] .
docker-compose up -d
```

## Verification
After build, verify:
- [ ] No build errors
- [ ] All dependencies resolved
- [ ] Configuration files in place
- [ ] Environment variables set
```

## Step 2.5: CI/CD Lint Validation (Optional)

If CI/CD configuration is detected in the project, run linting checks to prevent pipeline failures.

### 2.5.1 Detect CI Configuration

The system automatically detects CI/CD config files:
- `.github/workflows/*.yml` (GitHub Actions)
- `.gitlab-ci.yml` (GitLab CI)
- `azure-pipelines.yml` (Azure Pipelines)
- `.circleci/config.yml` (CircleCI)

### 2.5.2 Verify Linter Installation

Check that all linters used in CI/CD are installed locally:

```bash
# Python linters
pip show flake8 mypy black isort

# JavaScript/TypeScript linters
npm list eslint prettier typescript
```

If linters are missing, install them:
```bash
pip install flake8 mypy black isort
npm install --save-dev eslint prettier typescript
```

### 2.5.3 Run CI Linting Checks

Execute the same linting checks that CI/CD will run:

```bash
# Use the /ci-lint skill
/ci-lint

# Or run individual linters
flake8 src/
mypy src/
npx eslint src/
npx prettier --check src/
```

### 2.5.4 Handle Lint Failures

If linting fails:
1. Review the error output
2. Fix issues in the source code
3. Re-run linters to verify fixes
4. For auto-fixable issues, use `/ci-lint --fix`

### 2.5.5 Skip File (Emergency Only)

To temporarily bypass CI lint checks:
```bash
touch .ci-lint-skip
```

**WARNING**: This should only be used in emergencies. Remove the file after the emergency is resolved.

> See `rules/construction/ci-integration.md` for full documentation on CI/CD integration.

## Step 3: Create Test Instructions

Create `aicodepath-docs/construction/build-and-test/unit-test-instructions.md`:

```markdown
# Unit Test Instructions

## Running Unit Tests

### All Tests
```bash
npm test
# or
pytest
# or
mvn test
```

### Specific Test Suites
```bash
# Test specific unit
npm test -- --grep "[Unit Name]"
# or
pytest tests/unit/[unit_name]/
```

### With Coverage
```bash
npm test -- --coverage
# or
pytest --cov=src
```

## Expected Results
- **Total Tests**: [Count]
- **Expected Pass**: [Count]
- **Coverage Target**: [Percentage]

## Test Categories
| Category | Files | Expected |
|----------|-------|----------|
| Entities | [Count] | All Pass |
| Services | [Count] | All Pass |
| Validators | [Count] | All Pass |
| Controllers | [Count] | All Pass |
```

Create `aicodepath-docs/construction/build-and-test/integration-test-instructions.md`:

```markdown
# Integration Test Instructions

## Prerequisites
- Database running (local or test instance)
- External services mocked or available
- Environment configured for integration tests

## Running Integration Tests

### Setup Test Environment
```bash
# Start test dependencies
docker-compose -f docker-compose.test.yml up -d

# Wait for services to be ready
./scripts/wait-for-services.sh
```

### Run Integration Tests
```bash
npm run test:integration
# or
pytest tests/integration/
```

### Cleanup
```bash
docker-compose -f docker-compose.test.yml down
```

## Test Scenarios
| Scenario | Description | Expected |
|----------|-------------|----------|
| [Scenario 1] | [Description] | [Expected result] |
| [Scenario 2] | [Description] | [Expected result] |

## Troubleshooting
- **Database connection fails**: [Solution]
- **External service timeout**: [Solution]
```

Create `aicodepath-docs/construction/build-and-test/performance-test-instructions.md` (if applicable):

```markdown
# Performance Test Instructions

## Prerequisites
- Application running in test environment
- Performance testing tool installed ([k6/JMeter/etc.])
- Baseline metrics defined

## Running Performance Tests

### Load Test
```bash
k6 run performance/load-test.js
# or
jmeter -n -t performance/load-test.jmx
```

### Stress Test
```bash
k6 run performance/stress-test.js
```

## Performance Targets
| Metric | Target | Acceptable |
|--------|--------|------------|
| Response Time (p95) | < [X]ms | < [Y]ms |
| Throughput | [X] req/s | [Y] req/s |
| Error Rate | < [X]% | < [Y]% |

## Test Scenarios
| Scenario | Users | Duration | Expected |
|----------|-------|----------|----------|
| Normal Load | [X] | [X] min | [Metrics] |
| Peak Load | [X] | [X] min | [Metrics] |
| Stress | [X] | [X] min | [Metrics] |
```

## Step 3.5: GICL - Iterative Refinement (Optional)

When `iterativeMode` is enabled, GICL (Governed Iterative Construction Loop) activates after initial tests run.

### 3.5.1 Check GICL Activation

GICL activates when ANY of these conditions are met:
- `.claude/settings.json` contains `"iterativeMode": true`
- `--iterative` flag passed to build command
- Environment variable `AICODEPATH_ITERATIVE_MODE=true`
- `.gicl.json` config file exists

### 3.5.2 GICL Initialization

If GICL is enabled:

```javascript
// Detect complexity and set iteration limits
const complexity = detectComplexity(targetPath);
// trivial: 3, simple: 5, moderate: 7, complex: 10, very_complex: 15

// Create or resume session
const session = await createGICLSession({
  unitName: currentUnit,
  targetPath: unitPath,
  maxIterations: complexity.iterationLimit
});
```

### 3.5.3 Iteration Loop

Each iteration:

1. **Run Tests** → Score (35% weight)
2. **Run Validators** → Scores (45% combined)
3. **Check Duplication** → Score (20% weight)
4. **Calculate Final Score** → 0-100

```
Final Score = (Tests × 0.35) + (Guidelines × 0.20) +
              (Architecture × 0.15) + (Duplication × 0.20) +
              (Authenticity × 0.10)
```

### 3.5.4 Stop Conditions

GICL stops when:

| Condition | Description |
|-----------|-------------|
| **PASS** | Score ≥ 90 |
| **MAX_ITERATIONS** | Reached limit |
| **SCORE_TOO_LOW** | Score < 70 |
| **EXCESSIVE_DUPLICATION** | Duplication score < 70 |
| **SCORE_DEGRADATION** | Score dropped > 10 points |
| **STUCK** | Same score for 3 iterations |

### 3.5.5 Fix Planning

When score < 90, GICL generates a fix plan:

```markdown
## Fix Plan (Iteration X)

1. [CRITICAL] Fix failing test: testUserAuth
   - Error: Expected true, got false
   - Location: src/auth/user.ts:42

2. [HIGH] Reduce code duplication
   - Score: 65/100
   - Suggestion: Extract common logic from handlers

3. [MEDIUM] Fix guideline violation
   - Rule: max-lines-per-function
   - Location: src/services/data.ts:120
```

### 3.5.6 Progress Tracking

GICL persists to KB for resume and audit:

```sql
-- Session tracking
INSERT INTO loop_sessions (unit_name, max_iterations, status, ...)
-- Iteration history
INSERT INTO loop_iterations (session_id, iteration, final_score, ...)
```

### 3.5.7 Manual Control

Create files in project root to control GICL:

| File | Effect |
|------|--------|
| `.gicl-stop` | Stop loop immediately |
| `.gicl-pause` | Pause before next iteration |
| `.gicl-skip` | Skip GICL entirely |

### 3.5.8 GICL Summary Output

When GICL completes:

```markdown
## GICL Loop Complete

**Session**: #42
**Unit**: auth-module
**Status**: COMPLETE

**Iterations**: 4 / 10
**Final Score**: 94 / 100

| Iteration | Score | Status |
|-----------|-------|--------|
| 1 | 72 | continue |
| 2 | 81 | continue |
| 3 | 88 | continue |
| 4 | 94 | PASS |

**Score Breakdown**:
- Tests: 100/100 (35%)
- Guidelines: 92/100 (20%)
- Architecture: 88/100 (15%)
- Duplication: 95/100 (20%)
- Authenticity: 90/100 (10%)
```

> **Note**: GICL is OFF by default. See `rules/construction/iterative-loop.md` for full documentation.

---

## Step 3.6: E2E CRUD Validation (MANDATORY for data-driven features)

### 3.6.1 E2E CRUD Test Requirement

For EVERY entity with CRUD operations, verify the complete cycle:

```markdown
## E2E CRUD Validation Checklist: [Entity Name]

### Create Operation
- [ ] **UI Test**: Fill form → Submit → Verify success message
- [ ] **Storage Verification**: Query database → Confirm record exists
- [ ] **Data Integrity**: Verify all fields saved correctly (not just ID)

### Read Operation
- [ ] **List View**: Confirm new record appears in list
- [ ] **Detail View**: Navigate to detail → Verify all fields display correctly
- [ ] **Data Match**: Compare displayed values to database values

### Update Operation
- [ ] **UI Test**: Edit form → Change values → Submit → Verify success
- [ ] **Storage Verification**: Query database → Confirm changes persisted
- [ ] **History**: Verify audit log captured the change (if audit enabled)

### Delete Operation
- [ ] **UI Test**: Delete action → Confirm dialog → Verify removal
- [ ] **Storage Verification**: Query database → Confirm record removed/soft-deleted
- [ ] **Cascade**: Verify related records handled correctly
```

### 3.6.2 E2E Test Template

```typescript
describe('E2E CRUD: [EntityName]', () => {
  let createdId: string;

  it('CREATE: should save entity to database', async () => {
    const response = await createEntity(testData);
    createdId = response.id;

    // Verify in database - ALL fields, not just ID
    const dbRecord = await db.query('SELECT * FROM [table] WHERE id = $1', [createdId]);
    expect(dbRecord.name).toBe(testData.name);
    expect(dbRecord.status).toBe(testData.status);
  });

  it('READ: should display entity correctly', async () => {
    const displayed = await getEntity(createdId);
    const dbRecord = await db.query('SELECT * FROM [table] WHERE id = $1', [createdId]);
    expect(displayed.name).toBe(dbRecord.name);
  });

  it('UPDATE: should persist changes to database', async () => {
    await updateEntity(createdId, { name: 'Updated Name' });
    const dbRecord = await db.query('SELECT * FROM [table] WHERE id = $1', [createdId]);
    expect(dbRecord.name).toBe('Updated Name');
  });

  it('DELETE: should remove from database', async () => {
    await deleteEntity(createdId);
    const dbRecord = await db.query('SELECT * FROM [table] WHERE id = $1', [createdId]);
    expect(dbRecord).toBeNull();
  });
});
```

### 3.6.3 E2E CRUD Summary

| Entity | Create | Read | Update | Delete | Storage Verified |
|--------|--------|------|--------|--------|------------------|
| User | ✓ | ✓ | ✓ | ✓ | ✓ |
| Order | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Step 4: Create Build and Test Summary

Create `aicodepath-docs/construction/build-and-test/build-and-test-summary.md`:

```markdown
# Build and Test Summary

## Build Status

### Units Built
| Unit | Status | Notes |
|------|--------|-------|
| [Unit 1] | [Success/Failed] | [Notes] |
| [Unit 2] | [Success/Failed] | [Notes] |

### Build Artifacts
- Location: [Path]
- Size: [Size]
- Version: [Version]

## Test Results

### Unit Tests
| Unit | Total | Passed | Failed | Skipped | Coverage |
|------|-------|--------|--------|---------|----------|
| [Unit 1] | [X] | [X] | [X] | [X] | [X]% |
| [Unit 2] | [X] | [X] | [X] | [X] | [X]% |
| **Total** | [X] | [X] | [X] | [X] | [X]% |

### Integration Tests
| Suite | Total | Passed | Failed |
|-------|-------|--------|--------|
| [Suite 1] | [X] | [X] | [X] |
| **Total** | [X] | [X] | [X] |

### Performance Tests (if applicable)
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Response Time (p95) | < [X]ms | [X]ms | [Pass/Fail] |
| Throughput | [X] req/s | [X] req/s | [Pass/Fail] |

## Issues Found
| Issue | Severity | Resolution |
|-------|----------|------------|
| [Issue] | [High/Medium/Low] | [How resolved] |

## Quality Gates
- [ ] All unit tests pass
- [ ] Code coverage > [X]%
- [ ] All integration tests pass
- [ ] No critical security issues
- [ ] Performance targets met

## Next Steps
- [ ] Deploy to staging
- [ ] Run E2E tests
- [ ] Security scan
- [ ] Manual testing
```

## Step 5: Update State Tracking

Update `aicodepath-docs/aicodepath-state.md`:

```markdown
### CONSTRUCTION PHASE
- [x] Functional Design
- [x] NFR Requirements
- [x] NFR Design
- [x] Infrastructure Design
- [x] Database Design
- [x] AI Implementation
- [x] Code Generation
- [x] Build and Test
```

## Step 6: Present Completion Message

```markdown
# Build and Test Complete

All units have been built and tested:

**Build Results**:
- Units Built: [X] / [X]
- Build Status: [Success/Partial]

**Test Results**:
- Unit Tests: [X] passed / [X] total
- Integration Tests: [X] passed / [X] total
- Coverage: [X]%

**Quality Gates**:
- [Pass/Fail] All tests passing
- [Pass/Fail] Coverage threshold met
- [Pass/Fail] No blocking issues

> **REVIEW REQUIRED:**
> Please examine the build and test summary at: `aicodepath-docs/construction/build-and-test/`

> **WHAT'S NEXT?**
>
> **You may:**
>
> **Request Changes** - Fix failing tests or build issues
> **Proceed to Operations** - Move to **Sprint Tracking/Operations** stage
```

## Step 7: Wait for Explicit Approval
- User must confirm build and test results are acceptable
- Log user's response in audit.md

## Step 8: Auto-Commit Build and Test Results

**Execute after user approves build and test results.**

### 8.1 Verify Prerequisites

Before committing:
- [ ] All unit tests pass
- [ ] All integration tests pass (or skipped with reason)
- [ ] Build succeeds without errors
- [ ] No critical security issues

### 8.2 Update State Files

Update `aicodepath-docs/tests.json`:
```json
{
  "version": "1.0.0",
  "lastUpdated": "[ISO timestamp]",
  "summary": {
    "total": [X],
    "passed": [X],
    "failed": 0,
    "skipped": [X]
  },
  "coverage": {
    "lines": [X],
    "branches": [X],
    "functions": [X]
  },
  "failures": [],
  "recentlyFixed": []
}
```

Update `aicodepath-docs/implementation-status.json` with completion status.

Update `aicodepath-docs/context-state.json` with workflow completion.

### 8.3 Stage and Commit

```bash
# Stage test results and state
git add aicodepath-docs/construction/build-and-test/
git add aicodepath-docs/tests.json
git add aicodepath-docs/implementation-status.json
git add aicodepath-docs/context-state.json
git add aicodepath-docs/aicodepath-state.md
```

Create commit with standardized message:
```
test(cr-{number}): verify build and tests pass

Build Status: SUCCESS
Test Results:
- Total: {X}
- Passed: {X}
- Failed: 0
- Coverage: {X}%

Quality Gates:
- [x] All unit tests pass
- [x] All integration tests pass
- [x] No critical security issues
- [x] Code coverage threshold met

Generated by AICodePath workflow
```

### 8.4 Present Confirmation

```markdown
## Build and Test Committed

**Commit**: {short-hash}
**Message**: test(cr-XXX): verify build and tests pass

**Summary**:
- All tests passing: {count}
- Coverage: {X}%
- Quality gates: PASSED

CONSTRUCTION phase complete. Ready for Operations or deployment.
```

---

## References

- Git Integration: `rules/common/git-integration.md`
- Guideline Enforcement: `rules/common/guideline-enforcement.md`
- Multi-Context Management: `rules/common/multi-context-management.md`
