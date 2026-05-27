# Guidelines — Overview

Guidelines are JSON rule files that `guideline-validator.js` evaluates against every Write/Edit operation. They enforce code quality, security, architecture, and style standards across the project.

**Source:** `.aicodepath/guidelines/*.json`
**Hook:** `hooks/guideline-validator.js` (PreToolUse Write|Edit)

---

## How Validation Works

```
User writes code
      ↓
guideline-validator.js fires (PreToolUse Write|Edit)
      ↓
Loads 29 guideline files (async parallel)
      ↓
Filters rules by file extension + component type
      ↓
Evaluates each rule:
  - Pattern match (regex against file content)
  - File pattern match (glob against file path)
  - Authenticity check (stub/mock/fake detection)
      ↓
Severity aggregation:
  - error → exit 2 (block write)
  - warning → exit 1 (warn, allow)
  - info → exit 0 (show, allow)
```

---

## All 29 Guideline Files

### General Rules (16 files)

| File | Description |
|------|-------------|
| `coding-standards.json` | Naming conventions, structure, style |
| `linting-rules.json` | Code style enforcement (no console.log, etc.) |
| `type-design-rules.json` | TypeScript type usage patterns |
| `architecture-rules.json` | Structural patterns, layer separation |
| `api-design-rules.json` | REST/GraphQL API design standards |
| `data-modeling-rules.json` | Schema design, normalization, indexes |
| `database-operations-rules.json` | Connection pooling, query discipline, transactions |
| `security-rules.json` | OWASP Top 10, secrets, auth patterns |
| `testing-standards.json` | Test naming, coverage, structure |
| `devops-rules.json` | Docker, CI/CD, environment config |
| `observability-rules.json` | Logging, metrics, tracing standards |
| `ai-implementation-rules.json` | AI/ML implementation patterns |
| `mobile-design-rules.json` | iOS/Android/cross-platform patterns |
| `search-rules.json` | Search implementation standards |
| `writing-style-rules.json` | Documentation clarity, anti-AI-pattern rules |
| `project-preferences.json` | Project-specific overrides |

### Language-Specific Rules (12 files)

| File | Language | Rules | What it enforces |
|------|----------|-------|-----------------|
| `python-lint-rules.json` | Python | 5 | No print(), type hints, no mutable defaults, bare-except prevention |
| `python-security-rules.json` | Python | 4 | eval/exec, shell=True, pickle, hardcoded secrets |
| `typescript-lint-rules.json` | TypeScript | 6 | No console.log, explicit return types, prefer const, Next.js 15 patterns |
| `typescript-security-rules.json` | TypeScript | 6 | No any cast, eval, innerHTML, SQL injection, secrets |
| `go-lint-rules.json` | Go | 3 | No fmt.Println, error wrapping, no init() |
| `go-security-rules.json` | Go | 4 | SQL injection, unsafe import, error suppression, secrets |
| `java-lint-rules.json` | Java | 3 | No System.out, no raw types, prefer final |
| `java-security-rules.json` | Java | 4 | SQL injection, Spring field injection, secrets, no System.exit |
| `kotlin-lint-rules.json` | Kotlin | 3 | No println, no !! force-unwrap, prefer val |
| `kotlin-security-rules.json` | Kotlin | 3 | SQL injection, no runBlocking in prod, secrets |
| `rust-lint-rules.json` | Rust | 3 | No dbg!, no todo!, prefer iterators |
| `rust-security-rules.json` | Rust | 3 | unsafe SAFETY comment, no unwrap in prod, secrets |

### Advisory Rules (1 file)

| File | Applies to | Rules | What it enforces |
|------|-----------|-------|-----------------|
| `ai-regression-patterns.json` | All test files | 3 | Advisory: sandbox parity, error cleanup, rollback assumptions |

---

## Rule Structure

```json
{
  "id": "no-hardcoded-secrets",
  "description": "No hardcoded passwords, API keys, or tokens",
  "pattern": "(password|secret|api_key)\\s*[:=]\\s*['\"][A-Za-z0-9+/=_-]{12,}['\"]",
  "severity": "error",
  "languages": ["*"],
  "file_patterns": [
    "**/*.js",
    "**/*.ts",
    "!**/__tests__/**",
    "!**/test/**"
  ],
  "message": "Hardcoded secret detected - use environment variables"
}
```

**Key fields:**
- `pattern` — regex matched against file content
- `file_pattern` — single glob string (legacy)
- `file_patterns` — array of globs; `!` prefix negates (excludes)
- `severity` — `error` (blocks), `warning` (warns), `info` (informs)
- `languages` — array of file extensions, `"*"` means all
- `check` — named check type (e.g. `authenticity`, `mock_detection`)
- `inverse` — if `true`, match means VIOLATION (pattern should NOT match)

---

## Rule File Patterns — Exclusion Convention

Always exclude test and script files from production rules:

```json
"file_patterns": [
  "**/*.js",
  "**/*.ts",
  "!**/__tests__/**",
  "!**/test/**",
  "!**/tests/**",
  "!**/scripts/**"
]
```

Use `file_patterns` (array) rather than `file_pattern` (string) when exclusions are needed.

---

## Bypass Mechanism

To skip the authenticity check for legitimate stubs or mocks in non-test code:

```javascript
// aicodepath: allow-stub
// aicodepath: allow-mock
// aicodepath: allow-fake
```

Add to the file. The bypass applies to the entire file.

**Do NOT add bypasses to production implementation files.** Use only in test fixtures or integration stubs.

---

## Validation Storage

Results are stored in the DB via `lib/validation-recorder.js`:
- Each validation run stored in `validation_results` table
- Aggregated by file and session
- Used by dashboard for quality trend visualization
- Used by GICL for score calculation

---

## Detailed Guideline Documentation

- Code quality rules → `code-quality.md`
- Architecture & API rules → `architecture.md`
- Data & security rules → `data-security.md`
- Testing & DevOps rules → `testing-devops.md`
- Specialized rules → `specialized.md`
- Language-specific rules → `language-specific.md`
