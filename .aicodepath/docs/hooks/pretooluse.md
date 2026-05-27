# Hooks — PreToolUse

Covers: `schema-context-hook.js`, `guideline-validator.js`, `duplication-checker.js`, `safety-guardrails.js`, `pre-commit-validator.js`, `ci-status-checker.js`, `permission-request-hook.js`

PreToolUse hooks run before Claude executes a tool. They can inject context or block the operation.

---

## schema-context-hook.js

**Event:** `PreToolUse` — matcher: `Write|Edit`
**File:** `.aicodepath/hooks/schema-context-hook.js`

**Purpose:** Prevent DB schema hallucination by injecting real schema into context when Claude writes data-layer code.

**Trigger conditions (file path must match):**

Directory patterns: `/repositories/`, `/models/`, `/entities/`, `/queries/`, `/dao/`, `/mappers/`, `/controllers/`, `/prisma/`, `/drizzle/`, `/migrations/`

File name patterns: `.repository.`, `.model.`, `.entity.`, `.query.`, `.dao.`, `.mapper.`, `.schema.`, `.prisma`, `.sql`

**Two-path execution:**

1. **Fast path**: If `.claude/rules/schema-context.md` exists and is < 1 hour old, returns cached schema immediately
2. **Discovery path**: Scans project for schema sources:
   - SQL `CREATE TABLE` statements in migration files
   - Prisma `model` blocks
   - Drizzle schema files
   - ER diagram files in `aicodepath-docs/memory/`
   - `schema-design.md` files

**Output (context injection):**
```json
{
  "hookSpecificOutput": {
    "additionalContext": "## Database Schema\n\n### Table: users\n- id: INTEGER PRIMARY KEY\n- email: TEXT NOT NULL\n..."
  }
}
```

**Side effect:** Writes parsed schema to `.claude/rules/schema-context.md` for future fast-path reads.

---

## guideline-validator.js

**Event:** `PreToolUse` — matcher: `Write|Edit`
**File:** `.aicodepath/hooks/guideline-validator.js`

**Purpose:** Validate file content against 15 guideline rule files before allowing a write. Block on `error`-severity violations.

**Guideline files loaded:**
`ai-implementation-rules.json`, `api-design-rules.json`, `architecture-rules.json`, `coding-standards.json`, `data-modeling-rules.json`, `devops-rules.json`, `linting-rules.json`, `mobile-design-rules.json`, `observability-rules.json`, `project-preferences.json`, `search-rules.json`, `security-rules.json`, `testing-standards.json`, `type-design-rules.json`, `writing-style-rules.json`

**Rule matching logic:**
- Rules use `file_pattern` (string glob) or `file_patterns` (array of globs with `!` negation)
- Rules filtered by language (from file extension) and component type
- Authenticity check: detects stubs/mocks/fake logic via category matching

**Bypass mechanism:**
```javascript
// aicodepath: allow-stub
// aicodepath: allow-mock
// aicodepath: allow-fake
```
Add to file to skip authenticity check for that file.

**Exit behavior:**
- `error` severity violation → exit `2` (block write)
- `warning` severity → exit `1` (warn, allow write)
- No violations → exit `0`

**Output on block:**
```json
{
  "decision": "block",
  "reason": "Guideline violations found:\n[error] no-hardcoded-secrets: Hardcoded secret detected..."
}
```

---

## duplication-checker.js

**Event:** `PreToolUse` — matcher: `Write|Edit`
**File:** `.aicodepath/hooks/duplication-checker.js`

**Purpose:** Detect code and SQL duplication before writing, using fingerprint-based matching.

**Dependencies:**
- Requires `@anthropic/code-intelligence` npm package (optional)
- Falls back gracefully when not installed (duplication checking disabled, non-blocking)

**SQL-aware behavior:**
- Higher minimum line length for SQL files (50 chars) to avoid false matches on DDL boilerplate
- Filters 12 boilerplate patterns (CREATE TABLE header, index comments, etc.)

**Threshold:** 70% similarity triggers warning

**Output on detection:**
```json
{
  "decision": "block",
  "reason": "Duplicate code detected (78% similarity with src/services/userService.js:45-67)"
}
```

---

## pre-commit-validator.js

**Event:** `PreToolUse` — matcher: `Bash`
**File:** `.aicodepath/hooks/pre-commit-validator.js`

**Purpose:** Validate staged files against guidelines and check for secrets before a `git commit` runs.

**Trigger condition:** Bash command must match `git commit*`

**What it checks:**
1. Runs `git diff --cached --name-only` to get staged files
2. Reads each staged file
3. Validates content via `guideline-validator.js` (reuses the same logic)
4. Separately scans for hardcoded secrets (API keys, passwords, tokens)

**Secret detection patterns:** passwords, API keys, tokens, private keys matching pattern `(password|secret|api_key|...)[:=]['"]<12+ chars>['"]`

**Output on block:**
```json
{
  "decision": "block",
  "reason": "Pre-commit validation failed:\n- src/config.js: Hardcoded API key detected (line 12)"
}
```

---

## safety-guardrails.js

**Event:** `PreToolUse` — matcher: `Bash` and `Write|Edit`
**File:** `.aicodepath/hooks/safety-guardrails.js`

**Purpose:** Block or warn on 6 declarative safety rules (R01-R06) before any Bash command or file write runs.

**Rules evaluated in order (short-circuit on first match):**

| Rule | Tool | Pattern | Decision |
|------|------|---------|----------|
| R01 | Bash | ` sudo ` (with whitespace) | **block** |
| R02 | Write/Edit | `.git/`, `.env*`, `id_rsa`, `id_ed25519`, `*.pem`, `*.key`, `*.p12`, `authorized_keys` | **block** |
| R03 | Bash | Shell redirect (`>`) to protected file paths | **block** |
| R04 | Write/Edit | Absolute path outside project root | **warn** |
| R05 | Bash | `rm -rf`, `rm -fr`, `rm --recursive` | **warn** |
| R06 | Bash | `git push --force` / `--force-with-lease` / `-f` | **block (never bypassable)** |

**Default decision:** `approve` when no rule matches.

**Configuration** (optional, `config.json` `safety` section):
- `blockSudo` (default: `true`) — enables R01
- `blockForcePush` (default: `true`) — enables R06
- `blockDestructiveRm` (default: `true`) — enables R05
- `protectedPaths` — additional path patterns to add to R02
- `mode: "permissive"` — converts block decisions to warn for R01-R05 (R06 always blocks)

---

## ci-status-checker.js

**Event:** `PreToolUse` — matcher: `Bash`
**File:** `.aicodepath/hooks/ci-status-checker.js`

**Purpose:** After a `git push`, asynchronously check GitHub Actions CI status and surface failures before they go unnoticed.

**Trigger condition:** Bash command matches `git push*`

**What it does:**
1. Runs `gh run list --limit 1 --json status,conclusion,url` (non-blocking, async)
2. If CI is failing → injects `additionalContext` suggesting `/aicodepath-debug` or `aicodepath-ci-fixer` agent
3. If CI passes or no `gh` CLI → passes through silently

**Output (on failure detected):**
```json
{
  "hookSpecificOutput": {
    "additionalContext": "⚠️ CI status: FAILED — Run `/aicodepath-debug` or invoke the `aicodepath-ci-fixer` agent."
  }
}
```

**Requires:** GitHub CLI (`gh`) installed and authenticated.

---

## permission-request-hook.js

**Event:** `PermissionRequest`
**File:** `.aicodepath/hooks/permission-request-hook.js`

**Purpose:** Intercept permission dialogs and auto-approve, auto-deny, or pass through based on configured rules.

**Configuration:** `.aicodepath/config/permissions.json` (optional, falls back to defaults)

**Input:**
```json
{
  "tool": "Bash",
  "params": { "command": "rm -rf ./tmp" },
  "reason": "Cleaning temp files"
}
```

**Decision logic:**
1. Check deny-list (destructive patterns → `deny`)
2. Check allow-list (safe patterns → `approve`)
3. Default → `ask` (show dialog to user)

**Output:**
```json
{
  "decision": "approve | deny | ask",
  "reason": "Explanation shown to user when denied"
}
```

**Side effect:** Emits WebSocket `permission_request` event for dashboard visibility.
