# Guideline Enforcement System

**Purpose**: Ensure coding guidelines are read, applied, and validated at every stage

**Three-Layer Enforcement Strategy**:
1. **Explicit Prompting** - Read guidelines before each stage
2. **Validation Hooks** - Block code with violations
3. **Structured Checkpoints** - JSON-based verification

---

## Overview

The Guideline Enforcement System ensures that all code generated through the AICodePath workflow complies with project standards. This addresses the root cause identified in the AICodePath Guideline Violation Analysis: guidelines exist but aren't actively enforced.

---

## Layer 1: Explicit Prompting

### MANDATORY: Pre-Stage Guideline Loading

Before ANY code generation or design stage, Claude MUST:

1. **Load applicable guideline files**:
   - `guidelines/coding-standards.json` - Naming, structure, style
   - `guidelines/architecture-rules.json` - Layering, dependencies
   - `guidelines/security-rules.json` - OWASP, secrets, injection
   - `guidelines/testing-standards.json` - Coverage, naming, patterns

2. **Summarize key guidelines** that apply to the current task

3. **Create compliance checklist** in the stage plan

4. **Explicitly commit** to following the guidelines

### Guideline Loading Template

Include this in every code generation plan:

```markdown
## Guideline Compliance Checklist

### Guidelines Loaded
- [x] coding-standards.json (loaded, [X] rules)
- [x] architecture-rules.json (loaded, [X] rules)
- [x] security-rules.json (loaded, [X] rules)
- [x] testing-standards.json (loaded, [X] rules)

### Applicable Rules for This Unit

Based on unit type **[Controller/Service/Repository/etc.]**, these rules apply:

**Naming Conventions**:
- [ ] Classes use PascalCase
- [ ] Methods use camelCase
- [ ] Constants use SCREAMING_SNAKE_CASE
- [ ] Files match class names

**Architecture**:
- [ ] Controllers don't access database directly
- [ ] Services don't depend on request objects
- [ ] Repositories contain only data access logic
- [ ] Dependencies flow inward

**Security**:
- [ ] No hardcoded secrets
- [ ] All user input validated
- [ ] No SQL string concatenation
- [ ] Proper error handling (no stack traces exposed)

**Testing**:
- [ ] Test files use .test. or .spec. naming
- [ ] Each public method has tests
- [ ] Error cases covered
- [ ] Mocks for external dependencies

**Database** (if applicable):
- [ ] Use lookup tables, NOT ENUMs
- [ ] Foreign keys indexed
- [ ] Transactions for multi-step operations

### Commitment

I will follow all [X] loaded guidelines during this code generation.
```

---

## Layer 2: Validation Hooks

### Pre-Tool-Use Hook

The `guideline-validator.js` hook runs BEFORE any `Write` or `Edit` tool use:

1. **Detect file type** from path and content
2. **Load applicable guidelines** based on file type
3. **Scan content** for violations using regex patterns
4. **Block write** if error-level violations found
5. **Report violations** with line numbers and fix suggestions

### Violation Severity Levels

| Severity | Action | Examples |
|----------|--------|----------|
| **error** | Block write, must fix | Hardcoded secrets, SQL injection, empty catch |
| **warning** | Allow with flag, should fix | console.log, long functions, missing docs |
| **info** | Allow, nice to fix | Style preferences, suggestions |

### Pre-Commit Hook

The `pre-commit-validator.js` hook runs BEFORE any `git commit`:

1. **Get list of staged files**
2. **Scan each file** for violations
3. **Block commit** if any error-level violations
4. **Report all violations** grouped by file

---

## Layer 3: Structured Checkpoints

### JSON-Based Verification

Use structured JSON files to track compliance:

#### compliance-checklist.json Template

```json
{
  "unit": "[unit-name]",
  "timestamp": "[ISO timestamp]",
  "stage": "code-generation",
  "guidelines": {
    "coding-standards": {
      "loaded": true,
      "rules_checked": 25,
      "violations": 0
    },
    "architecture-rules": {
      "loaded": true,
      "rules_checked": 15,
      "violations": 0
    },
    "security-rules": {
      "loaded": true,
      "rules_checked": 12,
      "violations": 0
    },
    "testing-standards": {
      "loaded": true,
      "rules_checked": 8,
      "violations": 0
    }
  },
  "checklist": [
    { "rule": "class-pascal-case", "status": "pass" },
    { "rule": "no-hardcoded-secrets", "status": "pass" },
    { "rule": "no-sql-concat", "status": "pass" }
  ],
  "verified_by": "pre-commit-validator",
  "commit_allowed": true
}
```

### Verification Before Stage Completion

Before marking any code generation stage as complete:

1. **Run validation** on all generated files
2. **Create compliance report** in JSON format
3. **Log in audit.md** with timestamp
4. **Block completion** if violations exist

---

## Guideline Categories

### 1. Coding Standards (`guidelines/coding-standards.json`)

| Category | Key Rules |
|----------|-----------|
| Naming | Classes=PascalCase, methods=camelCase, constants=SCREAMING_SNAKE |
| Structure | Max 500 lines/file, max 50 lines/function, max 4 nesting levels |
| Imports | No circular dependencies, ordered imports |
| Comments | No commented code, TODOs need ticket reference |
| Errors | No empty catch blocks, proper async error handling |
| Console | No console.log (use logger) |

### 2. Architecture Rules (`guidelines/architecture-rules.json`)

| Category | Key Rules |
|----------|-----------|
| Layering | Controllers → Services → Repositories (no reverse) |
| Dependencies | Flow inward, no circular deps, interface segregation |
| Patterns | Single responsibility, factory for complex creation |
| API | REST conventions, consistent response structure, versioning |
| Database | Lookup tables (no ENUMs), transactions, indexed FKs |
| Async | Prefer async/await, handle rejections, parallel when possible |

### 3. Security Rules (`guidelines/security-rules.json`)

| Category | Key Rules |
|----------|-----------|
| Secrets | No hardcoded passwords/keys/tokens, no private keys in code |
| Injection | No eval(), parameterized SQL, no shell injection, sanitize HTML |
| Auth | Strong password requirements, hash passwords, secure sessions |
| Headers | No CORS wildcard in prod, CSRF protection |
| Logging | No sensitive data in logs, no stack traces in responses |
| Crypto | No weak algorithms (MD5/SHA1), random IVs |

### 4. Testing Standards (`guidelines/testing-standards.json`)

| Category | Key Rules |
|----------|-----------|
| Naming | .test. or .spec. suffix, describe blocks, descriptive names |
| Structure | Arrange-Act-Assert, one assertion per test, isolated tests |
| Coverage | 70% minimum, 100% for critical paths, 80% for new code |
| Mocking | Mock external services, restore mocks, realistic data |
| Assertions | No empty tests, specific assertions, async assertions |
| Types | Isolated unit tests, scoped integration tests, E2E for critical flows |

### 5. Mock Implementation Detection (`guidelines/coding-standards.json`)

**Purpose**: Detect lazy/shortcut implementations where LLMs take the fastest route instead of real implementation.

#### Problem Statement

LLMs frequently take shortcuts during code generation:
- Return hardcoded mock data instead of database queries
- Stub functions with `TODO: implement` or `pass`
- Use placeholder logic that returns constant values
- Create fake validation that always returns `true`

#### Detection Categories

| Category | Weight | Description | Examples |
|----------|--------|-------------|----------|
| **stub** | High (3) | Placeholder code that needs implementation | `TODO: implement`, `raise NotImplementedError`, `pass`, `...` |
| **mock_data** | Medium (2) | Hardcoded fake data instead of real sources | `[{id: 1, name: "Test User"}]`, fake UUIDs, lorem ipsum |
| **fake_logic** | High (3) | Logic that doesn't perform real operations | `return true` validators, artificial delays, static responses |

#### Key Detection Rules

| Rule ID | Severity | Pattern | Message |
|---------|----------|---------|---------|
| `no-todo-implement` | error | `TODO: implement/add/fix` | Incomplete implementation detected |
| `no-not-implemented-error` | error | `throw new Error("not implemented")` | Real implementation required |
| `no-hardcoded-mock-data` | error | `return [{id: 1, name: "test"...}]` | Use real data source |
| `no-return-true-stub` | error | `validate() { return true }` | Implement real validation |
| `no-pass-placeholder` | warning | `pass # placeholder` | Missing implementation |
| `no-hardcoded-users-array` | warning | `const users = [{...}]` | Should come from database |
| `no-fake-uuid` | warning | `"00000000-0000-0000-..."` | Generate real IDs |
| `no-lorem-ipsum` | warning | `lorem ipsum dolor sit` | Use real content |
| `no-noop-function` | warning | `() => {}` | Implementation missing? |
| `no-hardcoded-credentials` | error | `password = "test123"` | Use secrets manager |

#### Authenticity Scoring

Every file receives an **Implementation Authenticity Score** (0-100):

```
Score Calculation:
- Start at 100 points
- Subtract weighted penalties for each mock violation:
  - stub: -3 points per occurrence
  - mock_data: -2 points per occurrence
  - fake_logic: -3 points per occurrence
- Normalize by lines of code
```

| Score | Status | Action |
|-------|--------|--------|
| 90-100 | **PASS** | Code is production-ready |
| 70-89 | **REVIEW** | Proceed with warning, may need attention |
| 0-69 | **FAIL** | Block - must replace mock implementations |

#### Authenticity Report Format

```markdown
## Implementation Authenticity: FAIL

**Critical**: This code contains mock/stub implementations that need real logic.

**Score**: 45/100
**Status**: Code contains significant mock/stub implementations

### Mock Implementation Breakdown

| Category | Count | Impact |
|----------|-------|--------|
| Stub/Placeholder | 3 | High |
| Mock Data | 5 | Medium |
| Fake Logic | 2 | High |

### Mock Implementation Details

| Line | Category | Issue |
|------|----------|-------|
| 15 | stub | Incomplete implementation detected - TODO indicates missing logic |
| 42 | mock_data | Hardcoded mock data detected - use real data source |
| 78 | fake_logic | Validation function returns constant - implement real validation |

**Action Required**: Replace mock/stub implementations with real code before proceeding.
```

#### Test File Exemption

Mock detection is **automatically disabled** for test files:
- Files matching `*.test.ts`, `*.spec.js`, etc.
- Files in `__tests__/`, `/test/`, `/tests/` directories

This allows proper use of mocks and stubs in test code.

#### Integration with Workflow

1. **Pre-Write/Edit Hook**: Calculate authenticity score before allowing file write
2. **Block on FAIL**: Code with score < 70 is blocked from being written
3. **Warn on REVIEW**: Code with score 70-89 proceeds but shows warning
4. **Track in Audit**: Log authenticity scores in audit.md
5. **State File**: Record scores in `implementation-status.json`

### 6. Code and Database Duplication Detection (`guidelines/architecture-rules.json`)

**Purpose**: Detect duplicate code, similar patterns, and redundant database structures.

#### Problem Statement

Code duplication leads to:
- Maintenance burden (changes required in multiple places)
- Bug propagation (fix in one place, miss in another)
- Increased codebase size and complexity
- Missed opportunities for abstraction

Database duplication leads to:
- Data inconsistency risks
- Wasted storage and performance impact
- Complex synchronization requirements

#### Detection Categories

| Category | Target | Detection Method |
|----------|--------|------------------|
| **Exact Duplicates** | Code blocks | Hash-based fingerprinting |
| **Near Duplicates** | Similar code | Token similarity (>70%) |
| **Function Duplicates** | Similar functions | AST comparison (>80%) |
| **Class Duplicates** | Similar classes | Structure comparison (>75%) |
| **Table Duplicates** | Similar schemas | Column type matching |
| **Index Redundancy** | Overlapping indexes | Prefix analysis |
| **Query Patterns** | Similar queries | Pattern matching |

#### Code Duplication Rules

| Rule ID | Severity | Threshold | Message |
|---------|----------|-----------|---------|
| `no-exact-duplicates` | error | 10+ lines identical | Extract to shared function/module |
| `no-near-duplicates` | warning | 15+ lines, >70% similar | Consider refactoring |
| `no-duplicate-functions` | warning | >80% similar | Reuse or extend existing |
| `no-duplicate-classes` | warning | >75% similar | Use inheritance or composition |
| `no-duplicate-validation` | warning | Similar validation | Extract to shared validator |
| `no-duplicate-api-patterns` | info | Similar endpoints | Consider generic handler |

#### Database Duplication Rules

| Rule ID | Severity | Target | Message |
|---------|----------|--------|---------|
| `no-duplicate-migrations` | error | Migration scripts | Consolidate or reference existing |
| `no-duplicate-table-definitions` | warning | Table schemas | Consider normalization |
| `no-duplicate-indexes` | warning | Index definitions | Remove redundant indexes |
| `no-duplicate-constraints` | warning | Constraints | Consolidate definitions |
| `no-duplicate-stored-procedures` | warning | Stored procs | Parameterize common logic |
| `no-duplicate-triggers` | warning | Triggers | Consolidate trigger logic |
| `no-duplicate-views` | info | View definitions | Reuse or extend existing |

#### Duplication Scoring

Files receive a **Duplication Score** (0-100):

```
Score Calculation:
- Start at 100 points
- Subtract weighted penalties:
  - Exact duplicates: -3 points per 10 lines
  - Near duplicates: -2 points per instance
  - Function duplicates: -2 points per instance
  - Table duplicates: -3 points per instance
  - Index redundancy: -1 point per instance
```

| Score | Status | Action |
|-------|--------|--------|
| 95-100 | **PASS** | Code is well-factored |
| 85-94 | **REVIEW** | Some duplication, consider refactoring |
| 0-84 | **FAIL** | Excessive duplication, refactoring required |

#### Duplication Report Format

```markdown
## Code Duplication: REVIEW

**Score**: 78/100
**Status**: Some duplication detected

### Exact Duplicates (must fix)

| Source | Target | Lines | Match |
|--------|--------|-------|-------|
| auth/validate.ts:15-30 | user/check.ts:42-57 | 15 | 100% |

### Similar Functions

| Function | Location | Similar To | Match |
|----------|----------|------------|-------|
| validateEmail | validators/email.ts:10 | helpers/validate.ts:25 | 85% |

### Database Redundancies

| Type | Item 1 | Item 2 | Issue |
|------|--------|--------|-------|
| Index | idx_user_email | idx_user_email_status | Prefix redundancy |

**Recommendations**:
1. Extract validateEmail to shared validator
2. Remove idx_user_email, keep composite index
```

#### Test File Exemption

Duplication detection is **relaxed** for test files:
- Test fixtures and setup code often intentionally duplicated
- Test isolation sometimes requires repeated code
- Severity reduced from error to warning for tests

#### Integration with Workflow

1. **Pre-Write/Edit Hook**: Calculate duplication score before file write
2. **Brownfield Discovery**: Full codebase scan during reverse engineering (Step 14)
3. **Pre-Commit Check**: Block commits with excessive duplication
4. **Cross-File Analysis**: Compare new code against existing codebase
5. **Suggest Reuse**: Present existing utilities before generating new code

#### Cross-File Duplicate Detection

When writing new code, the hook checks:
1. Is this function similar to an existing one?
2. Does this class duplicate existing functionality?
3. Are there existing utilities that could be reused?

```markdown
## Existing Code Match Found

Before creating new code, consider reusing:

| Your Code | Existing Code | Similarity |
|-----------|---------------|------------|
| validateUser() | src/utils/validate.ts:userValidator() | 85% |

**Recommendation**: Import and use existing `userValidator()` instead.
```

---

## Violation Detection

### Pattern Matching Rules

Guidelines use regex patterns to detect violations:

```json
{
  "id": "no-hardcoded-secrets",
  "pattern": "(password|secret|api_key)\\s*[:=]\\s*['\"][^'\"]{8,}['\"]",
  "severity": "error",
  "message": "Hardcoded secret detected - use environment variables"
}
```

### Detection Flow

```
File to Write/Edit
       ↓
Load applicable guidelines (by file type)
       ↓
For each rule in guidelines:
  - Apply regex pattern
  - Record matches with line numbers
       ↓
If error violations found:
  - BLOCK the operation
  - Report violations
  - Suggest fixes
       ↓
If only warnings/info:
  - ALLOW the operation
  - Log violations
  - Continue workflow
```

---

## Integration with Workflow

### Code Generation Stage

Add to `rules/construction/code-generation.md`:

```markdown
## PART 0: GUIDELINE LOADING (BEFORE Step 1)

### Step 0: Load and Verify Guidelines

1. Load all guideline files:
   - coding-standards.json
   - architecture-rules.json
   - security-rules.json
   - testing-standards.json

2. Create compliance checklist in plan

3. State commitment: "I will follow all [X] guidelines"

## PART 3: VALIDATION (AFTER Step 9)

### Step 10: Pre-Commit Validation

1. Run guideline validator on all generated files
2. If violations found:
   - Present violations with fix suggestions
   - Wait for fixes
   - Re-validate
3. Only proceed when validation passes
```

### Build and Test Stage

Add validation step before final commit.

---

## Error Handling

### When Violations Are Found

```markdown
## ⚠️ Guideline Violations Found

The following violations must be fixed before proceeding:

### Error-Level Violations (must fix)

| File | Line | Rule | Message |
|------|------|------|---------|
| src/auth.service.ts | 42 | no-hardcoded-secrets | Hardcoded secret detected |
| src/user.controller.ts | 15 | no-sql-concat | SQL injection risk |

### Warning-Level Violations (should fix)

| File | Line | Rule | Message |
|------|------|------|---------|
| src/utils.ts | 87 | no-console-log | Remove console.log |

---

> **WHAT'S NEXT?**
>
> **Fix Violations** - I'll help fix these issues
> **Show Details** - See full violation context
> **Override** - Proceed anyway (NOT RECOMMENDED)
```

---

## Logging

All guideline checks MUST be logged in `audit.md`:

```markdown
## Guideline Check - Code Generation
**Timestamp**: 2026-01-06T15:30:00Z
**Unit**: U001-user-service
**Stage**: code-generation

**Files Checked**: 12
**Rules Applied**: 60
**Violations Found**: 0

**Categories**:
- Coding Standards: PASS (25 rules)
- Architecture Rules: PASS (15 rules)
- Security Rules: PASS (12 rules)
- Testing Standards: PASS (8 rules)

**Result**: All checks passed - ready for commit

---
```

---

## Project-Specific Overrides

Projects can customize guidelines by placing files in `.aicodepath-overrides/guidelines/` using the **same filename** as the framework guideline they want to amend (e.g., `coding-standards.json`).

The validator merges at the **rule level by `id`** — framework rules not mentioned in the overlay are inherited unchanged.

### Merge behaviours

| Overlay entry | Effect |
|---------------|--------|
| Matching `id`, no `enabled` field | Overlay rule **replaces** the framework rule entirely |
| Matching `id` with `"enabled": false` | Framework rule is **removed** (disabled) |
| New `id` not in framework file | Rule is **appended** to the category |
| New category not in framework file | Entire category is **added** |

### Example

```json
{
  "categories": {
    "naming": {
      "rules": [
        { "id": "class-pascal-case", "severity": "warning" },
        { "id": "no-single-letter-var", "enabled": false },
        {
          "id": "service-suffix",
          "description": "Services must end with 'Service'",
          "pattern": "class\\s+\\w+(?<!Service)\\s+implements.*Service",
          "severity": "error",
          "message": "Service classes must use the 'Service' suffix"
        }
      ]
    }
  }
}
```

This example: demotes `class-pascal-case` to warning, removes `no-single-letter-var`, and appends the new `service-suffix` rule — while inheriting all other framework rules untouched.

> **Runtime loading** — overlay files are merged on every validator execution. No `init` re-run required after adding or changing an override file.

---

## References

- Guideline files: `guidelines/*.json`
- Validation hook: `hooks/guideline-validator.js`
- Pre-commit hook: `hooks/pre-commit-validator.js`
- AICodePath Violation Analysis: `aicodepath-docs/AICODEPATH-GUIDELINE-VIOLATION-ANALYSIS.md`
