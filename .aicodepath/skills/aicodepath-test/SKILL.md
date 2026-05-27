---
name: aicodepath-test
description: Write comprehensive test suites — happy path, edge cases, error paths, and integration scenarios.
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, TodoWrite
argument-hint: "<module, feature, or file to test>"
---

# AICodePath Test

## When to Activate

- Writing tests for new code (alongside `/aicodepath-tdd`)
- Improving coverage of existing code
- User says "write tests", "add tests", "test this", "improve coverage"
- Reviewing whether existing tests are sufficient
- GICL score is low on "tests" component (35% weight)

## Test Categories (All Required)

### 1. Happy Path
The expected use case works correctly:
```
Input: valid data
Expected: correct output + side effects
```

### 2. Edge Cases
Boundary conditions and unusual but valid inputs:
```
- Empty inputs (empty string, [], {}, null, 0)
- Minimum/maximum values
- Single-element collections
- Very large inputs
- Unicode, special characters
- Concurrent calls (if applicable)
```

### 3. Error Paths
Invalid inputs and failure scenarios:
```
- Invalid types (pass string where number expected)
- Missing required fields
- Malformed data
- Filesystem/network errors (mock them)
- Permission denied scenarios
```

### 4. Integration Points
How this code interacts with dependencies:
```
- Does it call the right methods on dependencies?
- Does it handle dependency errors gracefully?
- Does it clean up resources (DB connections, file handles)?
```

## Test Writing Process

1. **Read** the module being tested completely
2. **Map** inputs → outputs for every code path
3. **List** test cases before writing any (use TodoWrite)
4. **Write** tests in order: happy → edge → error → integration
5. **Run** after each test: confirm it fails first if TDD, then passes after fix
6. **Check** coverage: which branches are uncovered?

## Test Checklist

```
- [ ] Happy path test
- [ ] Empty/null input test
- [ ] Invalid type test
- [ ] Boundary value tests (0, 1, max, max+1)
- [ ] Error propagation test (does it throw/return error correctly?)
- [ ] Side effect verification (was the right function called?)
- [ ] Async behavior tested (if applicable)
- [ ] No test depends on external state (each test is isolated)
- [ ] Tests run fast (no sleep, no real I/O unless integration test)
```

## AICodePath Test Conventions

```javascript
// Use the project's simple test runner (no jest)
const { test, assertEqual, assertTrue, assertThrows } = require('../test-utils');

test('descriptive name: what it does in what scenario', () => {
  // Arrange
  const input = ...;

  // Act
  const result = fn(input);

  // Assert
  assertEqual(result, expected);
});
```

Test files go in `.aicodepath/__tests__/` matching the module name:
- `lib/my-module.js` → `__tests__/my-module.test.js`
- `hooks/my-hook.js` → `__tests__/my-hook.test.js`

## Coverage Analysis

After writing tests, check coverage:
```bash
node .aicodepath/__tests__/run-tests.js
```

For each uncovered branch, ask:
- Is this branch reachable? If no: dead code to remove
- Is this branch tested elsewhere? If no: write the test
- Is this a defensive check? If yes: test the defensive scenario

## Red Flags — Weak Tests

| Pattern | Problem |
|---------|---------|
| Only testing happy path | No confidence in error handling |
| Tests with no assertions | Passes trivially, proves nothing |
| Tests that always pass | Never tests real failure conditions |
| Tests coupled to implementation | Break on refactor even when code is correct |
| `// TODO: add more tests` | Shipped incomplete |
| Mocking everything | Not testing real behavior |

## GICL Integration

Tests score is 35% of GICL score (highest weight):
```
0 tests passing  → tests score = 0  → GICL ≈ 65 max (FAIL)
50% tests pass   → tests score = 50 → GICL ≈ 82 max
All tests pass   → tests score = 100 → GICL can reach 100
```

A GICL score < 90 with failing tests = mandatory test fix before claiming done.

## Integration

```
/aicodepath-tdd → /aicodepath-test → /aicodepath-gicl-start → /aicodepath-verify
```
