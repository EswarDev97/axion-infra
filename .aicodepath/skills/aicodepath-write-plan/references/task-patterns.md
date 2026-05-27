# Task Writing Patterns

Load this file during Step 6 (Expand each task) when writing the implementation steps for standard task types.

---

## Common Task Patterns

### New function/method
```
1. Write test: test/<file>.test.ts — test that function returns X for input Y
2. Verify test fails (expected: function not found or wrong return)
3. Write function in src/<file>.ts
4. Verify all pass: npm test <file>
5. Commit: feat: add <function> to <module>
```

### Bug fix
```
1. Write test reproducing bug: test/<file>.test.ts — test that documents exact symptom
2. Verify test fails (expected: exact error message or wrong output that reproduces bug)
3. Fix in src/<file>.ts — targeted change only, no scope creep
4. Verify test now passes + all other tests pass: npm test
5. Commit: fix: resolve <symptom> in <module>
```

### Refactor (no behavior change)
```
1. Verify all existing tests pass: npm test (baseline green)
2. Refactor <file>.ts — rename/restructure only, zero behavior change
3. Verify all tests still pass: npm test
4. Commit: refactor: <what changed and why>
```

### Database migration + query
```
1. Write migration: db/migrations/<N>_<name>.sql
2. Verify migration applies cleanly: bash .aicodepath/scripts/migrate.sh
3. Write repository query: src/repositories/<name>.ts
4. Write integration test: test/repositories/<name>.test.ts
5. Verify test passes: npm test repositories
6. Commit: feat: add <name> migration and repository
```

### API endpoint
```
1. Write failing integration test: test/routes/<name>.test.ts
2. Verify test fails: npm test routes/<name>
3. Write route handler: src/routes/<name>.ts
4. Write service method: src/services/<name>.ts (if needed)
5. Verify all pass: npm test
6. Commit: feat: add <METHOD> /<path> endpoint
```

---

## TDD Anti-Patterns to Avoid in Plans

These are expert-level failure modes that produce plans that "look right" but break in practice:

| Anti-Pattern | What It Looks Like | Why It Fails |
|---|---|---|
| **The Liar** | Test passes immediately without implementation | You're testing something other than what you think; implementation correctness never verified |
| **The Dodger** | Steps test the easy parts (return type, status code) but skip core behavior | Core logic bugs go undetected; test suite is green but feature is broken |
| **The Giant** | One test covers multiple behaviors in a single assertion chain | When it fails you can't tell which behavior broke; test is undebuggable |
| **Excessive Setup** | Task needs 5+ mock objects or DB fixtures to run | Architecture is too coupled; split the task or refactor before adding tests |
| **The Slow Poke** | Test suite step runs >5 seconds | Will be skipped in practice; defeats the purpose of fast TDD feedback |

When you see these patterns in your drafted tasks, rewrite the step — don't silently carry them forward.

---

## DoD Quality Checklist

Before finalising any task's DoD, verify each criterion is a binary YES/NO:

| ✅ Acceptable | ❌ Not acceptable |
|---|---|
| `` `npm test src/auth/jwt` exits 0 and all 4 assertions pass `` | "tests pass" |
| `` `curl POST /auth/refresh` returns 401 with `{"error":"expired"}` `` | "endpoint works" |
| `TypeScript compiles with 0 errors in src/auth/` | "no errors" |
| `grep -c "generateToken" src/auth/jwt.ts` returns 1 | "function implemented" |
