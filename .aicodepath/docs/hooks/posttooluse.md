# Hooks — PostToolUse

Covers: `auto-artifact-creator.js`, `gicl-iteration-hook.js`, `post-tool-security-scan.js`, `test-tampering-detector.js`, `plans-watcher.js`, `tdd-order-check.js`, `auto-test-runner.js`, `visual-memory-generator.js`, and all skill-suggester hooks.

PostToolUse hooks run after a tool completes. They cannot block operations — they enrich context, track state, and make suggestions.

**Critical ordering for `Write|Edit`:** `auto-artifact-creator` MUST run first — `gicl-iteration-hook` queries artifact records it creates.

---

## auto-artifact-creator.js

**Event:** `PostToolUse` — matcher: `Write|Edit`
**File:** `.aicodepath/hooks/auto-artifact-creator.js`

**Purpose:** Automatically create artifact entries in the SQLite DB when files are written to `aicodepath-docs/` directories, keeping the dashboard populated without manual commands.

**Artifact type detection** (by file path):
| Path fragment | Artifact type |
|---------------|---------------|
| `/requirements/` | `requirement` |
| `/user-stories/` | `story` |
| `/plans/` | `plan` |
| `/functional-design/`, `/nfr-design/`, `/database-design/`, `/infrastructure-design/` | `design` |
| `/code/`, `/src/`, `.js`, `.ts`, `.py`, `.go` | `code` |
| `/tests/`, `.test.`, `.spec.` | `test` |
| `CLAUDE.md`, `/docs/` | `documentation` |

**Only triggers for files under `aicodepath-docs/`.**

**Side effects:** Writes to `artifacts` table via `lib/artifact-writer.js`; writes knowledge entries via `lib/kb-writer.js`.

---

## gicl-iteration-hook.js

**Event:** `PostToolUse` — matcher: `Write|Edit`
**File:** `.aicodepath/hooks/gicl-iteration-hook.js`

**Purpose:** Run GICL quality gates after every file write. The core quality enforcement loop.

**Two modes of operation:**

### Full Mode (active GICL session exists)
1. Looks up active GICL session in DB
2. Runs `collectScoreComponents()`:
   - **Tests** (35%): test presence and coverage
   - **Guidelines** (20%): via `guideline-validator.validateContent()`
   - **Architecture** (15%): architectural compliance
   - **Duplication** (20%): fingerprint-based duplicate check
   - **Authenticity** (10%): stub/mock detection
3. Calculates weighted score via `lib/gicl-score-calculator.js`
4. Records iteration in DB
5. Checks `shouldContinue()`:
   - Score ≥ 90 → auto-complete session
   - Max iterations reached → complete
   - Regression > 10 pts → complete with warning
   - Stalled 3 iterations → complete
6. Suggests agents for any score gaps via `hooks/lib/agent-suggester.js`
7. Emits WebSocket `gicl_iteration_complete` event

### Lite Mode (no active GICL session)
Used for files written without a running GICL session.

- **Trivial/simple files (≤ 100 LOC):** runs guideline check only, returns `additionalContext` with feedback
- **Moderate/complex files:** passes through with suggestion to start full GICL session
- **DB unavailable:** falls back to lite mode (was previously silent pass-through)

**Cost tracking:** Reads `CLAUDE_INPUT_TOKENS`, `CLAUDE_OUTPUT_TOKENS`, `CLAUDE_CACHE_READ_TOKENS`, `CLAUDE_CACHE_WRITE_TOKENS`, `CLAUDE_MODEL_ID` env vars and calculates USD cost via `lib/pricing-calculator.js`.

**Output (lite mode):**
```json
{
  "hookSpecificOutput": {
    "additionalContext": "GICL Lite: 2 guideline warnings found. Consider running /aicodepath-gicl-start for full quality gates."
  }
}
```

---

## post-tool-security-scan.js

**Event:** `PostToolUse` — matcher: `Write|Edit`
**File:** `.aicodepath/hooks/post-tool-security-scan.js`

**Purpose:** Warn (never block) when written code contains common security anti-patterns.

**5 patterns detected:**

| ID | Pattern | Risk |
|----|---------|------|
| S01 | `process.env.*password\|secret\|key` in string | Env secret embedded |
| S02 | `eval(request\|req\|input\|param)` | RCE via eval |
| S03 | `` exec(`...${ `` | Command injection via template literal |
| S04 | `innerHTML = ... + ...` | XSS via concatenation |
| S05 | `password\|api_key = "..."` (8+ chars) | Hardcoded credential |

**Output (warn-only, exit 1):**
```json
{ "systemMessage": "Security: Env secret embedded in string; Hardcoded credential" }
```

---

## test-tampering-detector.js

**Event:** `PostToolUse` — matcher: `Write|Edit`
**File:** `.aicodepath/hooks/test-tampering-detector.js`

**Purpose:** Warn when test files or CI configs contain patterns that suppress or game test results.

**Only fires for:** files matching `*.test.*`, `*.spec.*`, `__tests__/`, `.eslintrc*`, `jest.config*`, `.github/workflows/*.yml`

**12 patterns detected (T01-T12):**

| ID | Pattern | Language |
|----|---------|----------|
| T01 | `it.skip()`, `test.skip()`, `describe.skip()` | JS/TS |
| T02 | `xit()`, `xtest()`, `xdescribe()` | Jasmine |
| T03 | `@pytest.mark.skip`, `@pytest.mark.xfail` | Python |
| T04 | `t.Skip()`, `t.Skipf()`, `t.SkipNow()` | Go |
| T05 | `// expect(` | Commented JS assertion |
| T06 | `// assert` | Commented assertion |
| T07 | `// TODO assert\|expect` | Assertion in TODO |
| T08 | `eslint-disable` | ESLint suppression |
| T09 | `continue-on-error: true` | GitHub Actions CI bypass |
| T10 | `if: always()` | CI forced execution |
| T11 | `answers_for_tests =` | Hardcoded test answers |
| T12 | `return "str"; // test` | Hardcoded return for test |

**Output (warn-only, exit 1):**
```json
{ "systemMessage": "Test tampering: [T01] Test skip detected; [T05] Commented-out expect()" }
```

---

## plans-watcher.js

**Event:** `PostToolUse` — matcher: `Write|Edit`
**File:** `.aicodepath/hooks/plans-watcher.js`

**Purpose:** Detect changes to `tasks.md` or `planning.md` and emit a progress summary so the current task status stays visible.

**Trigger condition:** Written file path ends with `tasks.md` or `planning.md`

**What it does:**
1. Counts TODO, WIP, DONE, BLOCKED entries in the updated file
2. Detects newly completed tasks (DONE lines added)
3. Returns `additionalContext` with a compact status summary

**Output:**
```json
{
  "hookSpecificOutput": {
    "additionalContext": "Tasks: 3 TODO, 1 WIP, 2 DONE, 0 BLOCKED"
  }
}
```

---

## tdd-order-check.js

**Event:** `PostToolUse` — matcher: `Write|Edit`
**File:** `.aicodepath/hooks/tdd-order-check.js`

**Purpose:** Warn when production source code is written before any test file in the current session — enforcing the TDD "test first" principle.

**Logic:**
1. Tracks file writes in session state (production files vs test files)
2. If a production file (not `*.test.*`, `*.spec.*`, `__tests__/`) is written and no test file has been written yet this session → warn
3. If test file written first → clears the warning state

**Output (warn-only):**
```json
{ "systemMessage": "TDD violation: production code written before test file. Write the failing test first." }
```

---

## auto-test-runner.js

**Event:** `PostToolUse` — matcher: `Write|Edit`
**File:** `.aicodepath/hooks/auto-test-runner.js`

**Purpose:** Automatically run the test suite after source file writes, asynchronously, so test results appear without manual intervention.

**Opt-in only:** Requires `features.flags.auto_test_runner = true` in config (default: `false`).

**What it does:**
1. Detects test framework from `package.json` `scripts.test`
2. Runs test command asynchronously (non-blocking — hook returns immediately)
3. Test results are logged to `aicodepath-docs/auto-test-results.jsonl`

**Does not trigger for:** documentation files, config-only changes, files in `aicodepath-docs/`.

---

## visual-memory-generator.js

**Event:** `PostToolUse` — matcher: `Write|Edit`
**File:** `.aicodepath/hooks/visual-memory-generator.js`

**Purpose:** Generate visual diagrams from the codebase after file writes. Stores diagrams in `aicodepath-docs/memory/`.

**Diagram types generated:**
- **Class diagrams** — from JavaScript/TypeScript class definitions
- **ER diagrams** — from SQL schemas and Prisma models
- **Flowcharts** — from function control flow
- **Sequence diagrams** — from async/await and callback patterns
- **Journey diagrams** — from user flow and route patterns

**Two generator paths:**
1. **Python generators** (preferred, 85-95% accuracy): Requires `pip install -r .aicodepath/generators/requirements.txt`
2. **JavaScript fallbacks** (60-70% accuracy): Always available, used when Python not installed

**When it runs:** Only triggers for significant code files (not config or documentation files). Checks context to avoid generating for every minor edit.

---

## construction-skill-suggester.js

**Event:** `PostToolUse` — matcher: `Write|Edit`
**File:** `.aicodepath/hooks/construction-skill-suggester.js`

**Purpose:** Suggest relevant skills during the CONSTRUCTION phase.

**Phase detection:** Reads `aicodepath-docs/aicodepath-state.md` (fast path), falls back to DB `session_state` table.

**Suggestions triggered by:**
- After functional design artifacts → suggest `aicodepath-c4-architecture`
- At start of construction unit → suggest `aicodepath-requirements`
- During code validation → suggest `aicodepath-naming-analyzer`

---

## document-skill-suggester.js

**Event:** `PostToolUse` — matcher: `Write|Edit`
**File:** `.aicodepath/hooks/document-skill-suggester.js`

**Purpose:** Suggest `aicodepath-readme-crafter` when README creation/update is detected.

**Trigger conditions:**
- File written is `README.md` or contains `readme` in path
- Phase is CONSTRUCTION or OPERATIONS

---

## monorepo-skill-suggester.js

**Event:** `PostToolUse` — matcher: `Write|Edit` and `Bash`
**File:** `.aicodepath/hooks/monorepo-skill-suggester.js`

**Purpose:** Detect monorepo patterns and suggest appropriate skills.

**Suggestions:**
- Monorepo structure detected but `services.yaml` missing → suggest `aicodepath-git-monorepo-config`
- `services.yaml` exists but `cloudbuild.yaml` missing → suggest `aicodepath-gcp-monorepo-deploy`

---

## inception-skill-suggester.js

**Event:** `PostToolUse` — matcher: `Bash`
**File:** `.aicodepath/hooks/inception-skill-suggester.js`

**Purpose:** Suggest skills during the INCEPTION phase when analyzing codebases.

**Trigger conditions:**
- Bash command involves git operations (diff, log, show) → suggest `aicodepath-mental-model`
- Brownfield project detected (has `src/`, `lib/`, `package.json`, etc.) → suggest `aicodepath-codebase-pattern-finder`

**Brownfield detection:** Checks for existence of `src`, `lib`, `app`, `server`, `client`, `package.json`, `go.mod`, `requirements.txt`, `pom.xml`

---

## maintenance-skill-suggester.js

**Event:** `PostToolUse` — matcher: `Bash`
**File:** `.aicodepath/hooks/maintenance-skill-suggester.js`

**Purpose:** Suggest `aicodepath-dependency-updater` during OPERATIONS when dependency-related operations are detected.

**Note:** `aicodepath-reducing-entropy` is manual-only and is never suggested automatically.

---

## post-tool-failure-hook.js

**Event:** `PostToolUseFailure`
**File:** `.aicodepath/hooks/post-tool-failure-hook.js`

**Input:**
```json
{
  "tool": "Bash",
  "params": { "command": "npm test" },
  "error": { "message": "Command not found", "code": "ENOENT" },
  "attemptNumber": 1
}
```

**What it does:**
1. Records failure via `ValidationRecorder` (if available)
2. Emits WebSocket `tool_failure` event
3. Determines whether retry is appropriate
4. Returns structured failure response

**Output:**
```json
{
  "retry": false,
  "log_level": "error"
}
```
