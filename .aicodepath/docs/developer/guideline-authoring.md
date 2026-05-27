# Guideline Authoring Guide

Guidelines are JSON files in `.aicodepath/guidelines/` that `guideline-validator.js` evaluates against every Write/Edit operation.

---

## File Location

```
.aicodepath/guidelines/<name>.json
```

All 16 guideline files are loaded in parallel on every write operation.

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

---

## Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique rule identifier (kebab-case) |
| `description` | string | Human-readable rule description |
| `severity` | string | `"error"` (blocks), `"warning"` (warns), `"info"` (informs) |
| `message` | string | Message shown when rule triggers |

---

## Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `pattern` | string | Regex matched against file content |
| `file_pattern` | string | Single glob string (legacy — prefer `file_patterns`) |
| `file_patterns` | array | Array of globs; `!` prefix negates (excludes matching files) |
| `languages` | array | File extensions to target; `"*"` means all |
| `inverse` | boolean | If `true`, a pattern MATCH means violation (pattern should NOT match) |
| `check` | string | Named check type (e.g., `"authenticity"`, `"mock_detection"`) |
| `component_types` | array | Restrict to component types (e.g., `["ai"]`, `["mobile"]`) |
| `phase` | array | Apply only during specific phases (e.g., `["design", "code"]`) |
| `design_check` | string | Human-readable design-time question for classify-component hook |

---

## Severity Behavior

| Severity | Exit Code | Effect |
|----------|-----------|--------|
| `error` | 2 | Blocks write — Claude must fix before proceeding |
| `warning` | 1 | Warns — write allowed, message shown |
| `info` | 0 | Informs — shown in output, no interruption |

---

## Pattern Writing

### Specific patterns (preferred)

```json
{
  "pattern": "\\.execute\\s*\\(\\s*[`'\"].*?\\$\\{",
  "message": "SQL injection risk — requires SQL method with template string"
}
```

### Patterns with inverse flag

Use `inverse: true` when the pattern should NOT match (the code should have the pattern to be safe):

```json
{
  "id": "no-sensitive-logs",
  "pattern": "(console\\.log|logger\\.).*\\b(password|api_key|token)\\b",
  "inverse": true,
  "severity": "error",
  "message": "Never log sensitive data"
}
```

### Negative lookbehind for false positive prevention

```json
{
  "pattern": "(?<!path\\.)(\\.\\.[\\\\/])",
  "message": "Path traversal — allows path.dirname/path.resolve"
}
```

---

## File Patterns — Exclusion Convention

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

Use `file_patterns` (plural array) rather than `file_pattern` (singular string) when exclusions are needed.

---

## Common Mistakes

### Too broad patterns

```json
// ❌ BAD — matches all template strings
{ "pattern": "\\$\\{" }

// ✅ GOOD — only SQL + template string combination
{ "pattern": "\\.query\\s*\\([^)]*\\$\\{" }
```

### Missing test exclusions

```json
// ❌ BAD — fires on test mocks
{ "file_patterns": ["**/*.js"] }

// ✅ GOOD — excludes test directories
{
  "file_patterns": [
    "**/*.js",
    "!**/__tests__/**",
    "!**/test/**"
  ]
}
```

### Rules with `check` field but no handler

If `rule.check` references a named check type (e.g., `"authenticity"`) that has no handler in `CHECK_HANDLERS` map in `guideline-validator.js`, the rule is **skipped entirely** (not matched via pattern). This is intentional — add the handler or remove the `check` field.

---

## Project-Specific Rule Overrides

To customise guidelines **per-project** without modifying framework files, create a file in `.aicodepath-overrides/guidelines/` using the **same filename** as the framework guideline (e.g., `coding-standards.json`).

The validator loads the framework file first, then merges the overlay at the rule level by `id`. Three behaviours apply:

| Overlay entry | Effect |
|---------------|--------|
| Matching `id`, no `enabled` field | Overlay rule **replaces** the framework rule |
| Matching `id` with `"enabled": false` | Framework rule is **removed** |
| New `id` not in framework | Rule is **appended** to the category |

```json
{
  "categories": {
    "naming": {
      "rules": [
        { "id": "class-pascal-case", "severity": "warning" },
        { "id": "no-single-letter-var", "enabled": false },
        {
          "id": "no-abbreviations",
          "severity": "error",
          "pattern": "\\b(btn|cls|mgr|svc)\\b",
          "message": "Avoid abbreviations in identifiers"
        }
      ]
    }
  }
}
```

- Only categories and rules you mention are affected — all other framework rules are inherited unchanged.
- Override files are merged at **runtime** on every validator execution; no `init` re-run required.
- To test the merge: `node .aicodepath/__tests__/guideline-merge.test.js`

---

## Adding a New Rule

1. Open the appropriate guideline file (or create a new one)
2. Add the rule to the relevant `categories` object
3. Test against legitimate code first to verify no false positives:

```bash
node .aicodepath/__tests__/guideline-validator-false-positives.test.js
```

4. Check that test file exclusions work:

```bash
# Create a test file and verify it's excluded
echo 'const mock = { password: "test-value-123" }' > /tmp/test.test.js
echo '{"tool_input": {"file_path": "/tmp/test.test.js", "content": "..."}}' | \
  node .aicodepath/hooks/guideline-validator.js
```

---

## Bypass Mechanism

To suppress guideline checks for a file (legitimate stubs, test fixtures in non-test paths):

```javascript
// aicodepath: allow-stub
// aicodepath: allow-mock
// aicodepath: allow-fake
```

Add one of these comments at the top of the file. The bypass applies to the entire file.

**Do NOT add bypasses to production implementation files.** Use only in test fixtures or integration stubs.

---

## Validation Storage

Results are stored in SQLite via `lib/validation-recorder.js`:
- Table: `validation_results`
- Aggregated by file and session
- Used by dashboard for quality trend visualization
- Used by GICL score calculator (guidelines dimension = 20% weight)

---

## Guideline File Registry

All 16 guideline files are loaded by `guideline-validator.js`. A new file at `.aicodepath/guidelines/my-rules.json` is automatically picked up — no registration required.

See `.aicodepath/docs/guidelines/overview.md` for the full file list and rule structure documentation.
