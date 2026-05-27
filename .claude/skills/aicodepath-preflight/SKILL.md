---
name: aicodepath-preflight
description: Use at the start of every session or before writing any code — verifies AICodePath environment is correctly configured
user-invocable: true
allowed-tools: Read, Bash, Glob, Grep
argument-hint: ""
disable-model-invocation: false
---

# AICodePath Pre-Flight Check

<HARD-GATE>
Do NOT write any code, create any files, or run any implementation commands until ALL pre-flight checks pass.
If checks fail, fix the reported issues first, then re-run preflight.
Skip this gate only when explicitly instructed by the user.
</HARD-GATE>

## Activation Triggers

Use this skill when user says:
- "preflight", "pre-flight", "run checks"
- "check environment", "validate environment"
- "verify setup", "check setup"
- "are we ready", "ready to start"
- Keywords: preflight, check, validate, environment, setup, verify

## Purpose

Validates AICodePath environment before workflow execution.

## Checks

- Required plugins (Claude Code Indexer, Context7)
- MCP servers (claude-code-indexer, context7)
- File structure (.aicodepath/ directories)
- Database (aicodepath.db exists and accessible)
- Hook system (.claude/hooks.json correct format)
- Code graph (`code_entities` table populated — invoke `/aicodepath-code-graph` if empty)

## Usage

```bash
# Manual run (delegates to the canonical JS check)
bash ./.aicodepath/scripts/validate-environment.sh

# Or directly via the JS module
node .aicodepath/hooks/pre-flight-check.js
```

## Output

Reports ✓ PASS, ⚠ WARNING, or ✗ FAIL for each component with fix suggestions.

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Environment is obviously fine, let's skip this" | That's what everyone thinks before an environment issue wastes 2 hours |
| "I ran this yesterday, no need to rerun" | State changes. Always run fresh. |
| "The DB probably exists" | "Probably" is not "confirmed". One check = zero ambiguity. |
| "We're in a rush" | A failed preflight mid-session takes longer to debug than the check itself |
| "I know this project works" | Knowing the project ≠ knowing the current environment state |

## NEVER

- **NEVER** skip preflight because "the environment worked yesterday" — state changes invisibly: a teammate updated a shared `.env`, the DB migration ran on another machine but not this one, a plugin was updated with a breaking change. Yesterday's passing environment is not evidence about today's.
- **NEVER** proceed past a ✗ FAIL result without fixing the reported issue — a FAIL means a hard dependency is broken. Proceeding means you'll either hit the error mid-session (wasting more time) or, worse, silently produce wrong output because a broken component falls back to stale data.
- **NEVER** treat ⚠ WARNING as optional when it involves hook registration — a hook that's not registered means guideline validation, schema injection, or GICL scoring silently doesn't run. The session continues without the safety net, and you won't know it's missing until something slips through.
- **NEVER** run preflight from inside `.aicodepath/` or any subdirectory — path resolution uses `process.cwd()` and will construct wrong paths, causing checks to pass against nonexistent locations. Always run from the project root.

## Integration

Auto-invoked by `SessionStart` hook (once per session). Can be manually triggered anytime.
