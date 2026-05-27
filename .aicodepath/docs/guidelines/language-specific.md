# Guidelines — Language-Specific Rules

Language-specific guideline files enforce idiomatic patterns, style, and security rules for individual programming languages. They complement the general rules in `code-quality.md` and `data-security.md`.

**Files:** `.aicodepath/guidelines/<language>-lint-rules.json` and `.aicodepath/guidelines/<language>-security-rules.json`

All language-specific files use the nested `categories` schema (not the flat `rules` array used by older files).

---

## Overview

| File | Language | Rules | What it enforces |
|------|----------|-------|-----------------|
| `python-lint-rules.json` | Python | 5 | No print(), type hints, safe defaults, bare-except prevention |
| `python-security-rules.json` | Python | 4 | eval/exec, shell=True, pickle, hardcoded secrets |
| `typescript-lint-rules.json` | TypeScript | 6 | No console.log, explicit return types, prefer const, Next.js 15 patterns |
| `typescript-security-rules.json` | TypeScript | 6 | No any cast, no eval, no innerHTML, SQL injection, hardcoded secrets |
| `go-lint-rules.json` | Go | 3 | No fmt.Println, error wrapping, no init() |
| `go-security-rules.json` | Go | 4 | SQL injection, unsafe package, error suppression, hardcoded secrets |
| `java-lint-rules.json` | Java | 3 | No System.out, no raw types, prefer final |
| `java-security-rules.json` | Java | 4 | SQL injection, Spring field injection, hardcoded secrets, no System.exit |
| `kotlin-lint-rules.json` | Kotlin | 3 | No println, no force-unwrap (!!), prefer val |
| `kotlin-security-rules.json` | Kotlin | 3 | SQL injection, no runBlocking in prod, hardcoded secrets |
| `rust-lint-rules.json` | Rust | 3 | No dbg!, no TODO panics, prefer iterators |
| `rust-security-rules.json` | Rust | 3 | unsafe blocks require SAFETY comment, no unwrap in prod, hardcoded secrets |
| `ai-regression-patterns.json` | All | 3 | Advisory: sandbox parity, error cleanup, rollback assumptions in test files |

---

## python-lint-rules.json

**File:** `.aicodepath/guidelines/python-lint-rules.json`
**Description:** Code quality lint rules for Python — enforces type hints, clean logging, and safe patterns.

**Applied to:** `*.py` files (test files excluded from most rules)

### Categories

#### logging
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-print` | warning | No `print()` in production Python — use the `logging` module |

#### type-quality
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `type-hints` | info | Function parameters and return types should have type annotations |
| `no-bare-except` | warning | No `except:` without a specific exception type — catches SystemExit and KeyboardInterrupt |

#### defaults
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-mutable-default` | error | Mutable default arguments (`def f(x=[])`) cause shared state bugs — use `None` and assign inside |

#### pydantic
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `pydantic-input-schema-no-strict-base` | warning | Pydantic input schemas should use `model_config = ConfigDict(extra='forbid')` to reject unknown fields |

---

## python-security-rules.json

**File:** `.aicodepath/guidelines/python-security-rules.json`
**Description:** Security rules for Python — prevents code injection, unsafe deserialization, shell injection, and hardcoded secrets.

### Categories

#### code-injection
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-eval-exec` | error | No `eval()` or `exec()` — arbitrary code execution risk |
| `no-shell-true` | error | No `subprocess(..., shell=True)` — use list arguments to prevent shell injection |

#### deserialization
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-pickle-untrusted` | error | Do not unpickle data from untrusted sources — use JSON or msgpack instead |

#### secrets
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-hardcoded-secrets` | error | No hardcoded passwords, API keys, tokens in Python files |

---

## typescript-lint-rules.json

**File:** `.aicodepath/guidelines/typescript-lint-rules.json`
**Description:** Code quality lint rules for TypeScript — enforces explicit types, const preference, and clean logging.

**Applied to:** `*.ts`, `*.tsx` files

### Categories

#### logging
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-console-log` | warning | No `console.log` in production TypeScript — use a structured logger |

#### type-quality
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `explicit-return-type` | info | Functions should declare their return type explicitly |
| `no-non-null-assertion` | warning | Avoid `!` non-null assertions — use optional chaining or a null check |

#### variables
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `prefer-const` | info | Declare variables with `const` when they are never reassigned |

#### react-nextjs
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `nextjs15-use-search-params-suspense` | error | Next.js 15: `useSearchParams()` must be inside a `<Suspense>` boundary |

#### exact-optional-types
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-undefined-passthrough-to-optional-prop` | warning | Do not pass `undefined` explicitly to optional props — use `exactOptionalPropertyTypes` compatible patterns |

---

## typescript-security-rules.json

**File:** `.aicodepath/guidelines/typescript-security-rules.json`
**Description:** Security rules for TypeScript — prevents unsafe type usage, XSS, SQL injection, and hardcoded secrets.

### Categories

#### type-safety
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-any-cast` | warning | Avoid `: any` type annotation — use `unknown` or a concrete type |
| `no-type-assertion-any` | warning | Avoid `as any` — use a specific type assertion or `unknown` |

#### injection
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-eval` | error | No `eval()` in TypeScript — arbitrary code execution |
| `no-innerhtml` | error | No `innerHTML` assignment — use `textContent` or a sanitizer (DOMPurify) |
| `no-sql-template-injection` | error | No template literals in SQL queries — use parameterized queries |

#### secrets
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-hardcoded-secrets` | error | No hardcoded passwords, API keys, or tokens in TypeScript files |

---

## go-lint-rules.json

**File:** `.aicodepath/guidelines/go-lint-rules.json`
**Description:** Code quality lint rules for Go — enforces structured logging, error wrapping, and init() avoidance.

**Applied to:** `*.go` files (test files excluded)

### Categories

#### logging
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-println` | warning | No `fmt.Println` in production Go — use a structured logger (slog, zap, logrus) |

#### error-quality
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `error-wrapping` | info | Errors should be wrapped with `fmt.Errorf("...: %w", err)` to preserve context |

#### init-function
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-init-func` | warning | Avoid `init()` functions — they make initialization order non-obvious; use explicit setup |

---

## go-security-rules.json

**File:** `.aicodepath/guidelines/go-security-rules.json`
**Description:** Security rules for Go — prevents SQL injection, unsafe package misuse, error suppression, and hardcoded secrets.

### Categories

#### injection
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-sql-injection` | error | No SQL built with `fmt.Sprintf` — use `db.Query` with `?` placeholders |

#### unsafe
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-unsafe` | warning | `import "unsafe"` requires a comment justifying the use |

#### error-handling
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `err-not-checked` | error | Assigned errors must be checked — `err` variable assigned but not inspected |

#### secrets
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-hardcoded-secrets` | error | No hardcoded passwords, API keys, or tokens in Go files |

---

## java-lint-rules.json

**File:** `.aicodepath/guidelines/java-lint-rules.json`
**Description:** Code quality lint rules for Java — enforces structured logging, typed generics, and immutability.

**Applied to:** `*.java` files (test files excluded)

### Categories

#### logging
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-sysout` | warning | No `System.out.println` — use SLF4J: `log.info("{}", value)` |

#### generics
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-raw-types` | warning | No raw generic types (e.g. `List` instead of `List<String>`) — defeats type safety |

#### immutability
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `prefer-final` | info | Declare local variables and parameters `final` when not reassigned |

---

## java-security-rules.json

**File:** `.aicodepath/guidelines/java-security-rules.json`
**Description:** Security rules for Java — prevents SQL injection, Spring field injection, hardcoded secrets, and process termination.

### Categories

#### injection
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-sql-injection` | error | No SQL built with string concatenation — use `PreparedStatement` or JPA |

#### spring
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-field-injection` | warning | No `@Autowired` on fields — use constructor injection for testability |

#### secrets
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-hardcoded-secrets` | error | No hardcoded passwords, API keys, or tokens in Java files |

#### lifecycle
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-system-exit` | error | No `System.exit()` in application code — let the framework manage lifecycle |

---

## kotlin-lint-rules.json

**File:** `.aicodepath/guidelines/kotlin-lint-rules.json`
**Description:** Code quality lint rules for Kotlin — enforces val preference, null safety, and structured logging.

**Applied to:** `*.kt`, `*.kts` files (test files excluded)

### Categories

#### logging
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-println` | warning | No `println()` in production Kotlin — use SLF4J or kotlin-logging |

#### null-safety
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-force-unwrap` | warning | Avoid `!!` (force unwrap) — use safe-call `?.` or Elvis `?: default` instead |

#### variables
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `prefer-val` | info | Prefer `val` over `var` when the variable is not reassigned |

---

## kotlin-security-rules.json

**File:** `.aicodepath/guidelines/kotlin-security-rules.json`
**Description:** Security rules for Kotlin — prevents SQL injection, unsafe coroutine usage, and hardcoded secrets.

### Categories

#### injection
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-sql-injection` | error | No SQL built with string interpolation (`"SELECT... ${variable}"`) — use parameterized queries |

#### coroutines
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-runblocking-prod` | warning | No `runBlocking` in production coroutine code — blocks the calling thread; use `launch`/`async` |

#### secrets
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-hardcoded-secrets` | error | No hardcoded passwords, API keys, or tokens in Kotlin files |

---

## rust-lint-rules.json

**File:** `.aicodepath/guidelines/rust-lint-rules.json`
**Description:** Code quality lint rules for Rust — flags debug macros, incomplete TODOs, and non-idiomatic iteration.

**Applied to:** `*.rs` files (test modules excluded)

### Categories

#### debug
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-dbg` | warning | No `dbg!()` macro in production code — use a proper logging crate |

#### completeness
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-todo` | warning | No `todo!()` macro in committed code — replace with implementation or `unimplemented!()` with tracking issue |

#### style
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `prefer-iter` | info | Prefer iterator methods (`.map()`, `.filter()`) over explicit `for` loops where idiomatic |

---

## rust-security-rules.json

**File:** `.aicodepath/guidelines/rust-security-rules.json`
**Description:** Security rules for Rust — flags unsafe blocks without justification, panic-inducing patterns, and hardcoded secrets.

### Categories

#### unsafe
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-unsafe-unjustified` | warning | `unsafe {}` blocks must have a `// SAFETY:` comment explaining the invariant |

#### panic
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-unwrap-production` | warning | No `.unwrap()` in production paths — use `?`, `expect("descriptive message")`, or proper error handling |

#### secrets
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-hardcoded-secrets` | error | No hardcoded passwords, API keys, or tokens in Rust files |

---

## ai-regression-patterns.json

**File:** `.aicodepath/guidelines/ai-regression-patterns.json`
**Description:** Advisory guidelines for AI-written test files — flags 3 common AI blind spots. All rules are `severity: info` (advisory only, never blocking).

**Applied to:** `**/*.test.*`, `**/*.spec.*` test files only.

**Purpose:** Complements `aicodepath-ai-regression-testing` skill. The skill provides the full 7-pattern framework; these guidelines provide automated advisory reminders on every test file write.

### Categories

#### sandbox-parity
| Rule ID | Severity | What it flags |
|---------|----------|--------------|
| `sandbox-parity-check` | info | Hardcoded `localhost`/`127.0.0.1` URLs in tests — advisory: verify this matches CI/production service discovery |

#### error-cleanup
| Rule ID | Severity | What it flags |
|---------|----------|--------------|
| `error-cleanup-verification` | info | Test setups without corresponding teardown — advisory: verify error state is cleaned up after failures |

#### rollback
| Rule ID | Severity | What it flags |
|---------|----------|--------------|
| `optimistic-rollback-reminder` | info | Tests asserting rollback success — advisory: verify the rollback path is tested for partial failure scenarios |

---

## Schema Format

Language-specific files use the nested `categories` schema:

```json
{
  "$schema": "AICodePath <Language> <Type> Guidelines",
  "version": "1.0.0",
  "description": "...",
  "_classification": {
    "component_types": ["all"],
    "default_phase": ["code"]
  },
  "categories": {
    "<category-name>": {
      "description": "...",
      "component_types": ["all"],
      "phase": ["code"],
      "rules": [
        {
          "id": "rule-id",
          "description": "...",
          "pattern": "regex",
          "severity": "error|warning|info",
          "file_patterns": ["*.ext", "!**/test_*.ext"],
          "message": "Human-readable guidance"
        }
      ]
    }
  }
}
```

This differs from older guideline files (which use a flat `rules` array). The `guideline-validator.js` hook handles both schemas.
