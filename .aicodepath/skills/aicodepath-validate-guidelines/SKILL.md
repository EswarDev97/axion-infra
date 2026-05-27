---
name: aicodepath-validate-guidelines
description: Validate code against AICodePath guidelines — interpret violations, suppress false positives, fix blocked edits.
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash
argument-hint: "[--file path] [--staged] [--ruleset name]"
---

# Validate Guidelines

Run validation and interpret results. The expert value here is knowing which violations require immediate action, which are false positives, and which can be deferred.

---

## Running Validation

```bash
# Validate a specific file
node .aicodepath/hooks/guideline-validator.js --file path/to/file.ts

# Validate all staged files (pre-commit)
node .aicodepath/hooks/guideline-validator.js --staged

# Validate against a specific ruleset only
node .aicodepath/hooks/guideline-validator.js --file path/to/file.ts --ruleset security-rules
```

Validation also runs automatically as a PreToolUse hook on every Write/Edit. If a hook blocked your edit, the violation that caused it will be in the hook output.

---

## Interpreting Violations by Severity

| Severity | Meaning | Action |
|----------|---------|--------|
| **CRITICAL** | Security risk or data integrity issue | Fix before continuing — do not suppress |
| **ERROR** | Architectural violation or code quality issue | Fix before committing |
| **WARNING** | Style or convention issue | Fix within current GICL iteration |
| **INFO** | Informational only | Log, do not act unless accumulating |

**Non-obvious rule**: During a GICL session, warnings compound — each WARNING left unfixed slightly reduces the guidelines component score (20% weight). Three ignored warnings can drop a B-grade session to C.

---

## Common Violations and Their Root Causes

| Violation ID | Common misfire cause | Fix |
|-------------|---------------------|-----|
| `no-console` | Firing on test files | Rule missing `!**/__tests__/**` in `file_patterns` |
| `no-hardcoded-paths` | Firing on path.resolve() calls | Pattern too broad; add negative lookbehind for `path.` |
| `no-hallucinated-columns` | Firing on non-data-layer files | Check `file_pattern` vs `file_patterns` conflict in rule |
| `sql-injection-risk` | Firing on template strings that aren't SQL | Pattern matches `${` broadly — narrow to SQL method context |
| `path-traversal` | Firing on `../../` in import statements | Exclude `import`/`require` lines or use context-aware pattern |

---

## Suppressing a Violation Correctly

Only suppress after confirming it's not a real issue:

```typescript
// aicodepath-ignore: no-console -- intentional debug output for CLI tool
console.log(output);
```

**NEVER suppress CRITICAL violations** without first opening a GitHub issue tracking the risk. A suppressed security rule with no issue is a compliance gap.

**NEVER suppress** without the inline comment explaining why — suppressions without reasons accumulate as invisible technical debt.

---

## Fixing a False Positive in a Rule

If a rule fires incorrectly on a file type it shouldn't target:

1. Open the rule in `.aicodepath/guidelines/<ruleset>.json`
2. Add a negation pattern to `file_patterns`:
   ```json
   "file_patterns": ["**/*.ts", "!**/__tests__/**", "!**/scripts/**"]
   ```
3. Use `file_patterns` (plural array), not `file_pattern` (singular string) — having both causes the singular to be ignored
4. Run the false-positive test suite to confirm:
   ```bash
   node .aicodepath/__tests__/guideline-validator-false-positives.test.js
   ```

---

## Guidelines by File Type

| File pattern | Rulesets applied |
|-------------|-----------------|
| `*controller*`, `*routes*`, `*handler*` | api-design-rules, architecture-rules |
| `*service*`, `*repository*`, `*entity*` | architecture-rules, data-modeling-rules |
| `*migration*`, `*.sql`, `*schema*` | data-modeling-rules |
| `Dockerfile*`, `docker-compose*`, `*.yml` | devops-rules |
| All files | coding-standards, security-rules, testing-standards |

---

## SOLID Wiring

When this skill detects architecture violations (`architecture-rules` ruleset) on source files:

1. **After reporting the violation**, suggest running `/aicodepath-solid-principles --auto-scan` on the offending file
2. This provides the deeper structural diagnosis that guideline rules alone cannot produce
3. If SOLID score comes back C or D, offer to generate a refactoring plan with `/aicodepath-solid-principles --fix-plan`

**Typical sequence:**
```
guideline-validator fires ERROR on service.ts (architecture violation)
→ aicodepath-validate-guidelines reports it
→ suggests: /aicodepath-solid-principles --auto-scan src/service.ts
→ SOLID scan finds: SRP violation (2 responsibilities)
→ offers: /aicodepath-solid-principles --fix-plan
→ refactoring plan generated → feeds into /aicodepath-write-plan
```

This wiring applies for all `ERROR` and `CRITICAL` findings in `architecture-rules` and `coding-standards`. Wiring is optional (advisory) for `WARNING` findings.

---

## NEVER

- **NEVER** suppress a CRITICAL violation without a tracking issue — it creates an invisible security gap.
- **NEVER** run validation on generated files (migrations output, protobuf generated code, `dist/`) — add them to `.aicodepath/guidelines/.validateignore`.
- **NEVER** treat WARNING as ignorable during GICL — they contribute to score degradation that compounds across iterations.
- **NEVER** use `file_pattern` (singular) and `file_patterns` (plural) on the same rule — the singular is silently ignored when both exist, causing unexpected rule scope.
