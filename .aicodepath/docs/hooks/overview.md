# Hooks — Overview

Hooks are Node.js scripts that Claude Code executes automatically at lifecycle events. They intercept operations to enforce quality, inject context, and suggest skills.

**Source:** `.aicodepath/hooks/`
**Registration:** `.aicodepath/hooks/hooks.json` → resolved to absolute paths in `.claude/settings.json` by `lib/settings-generator.js`

---

## Event Types & Registered Hooks

| Event | Matcher | Hook(s) |
|-------|---------|---------|
| `SessionStart` | — | `session-start-hook.js`, `visual-memory-loader.js`, `session-auto-cleanup.js`, `pre-flight-check.js` |
| `UserPromptSubmit` | — | `plan-role-activator.js` |
| `PermissionRequest` | — | `permission-request-hook.js` |
| `PreToolUse` | `Write\|Edit` | `config-protection-hook.js`, `schema-context-hook.js`, `guideline-validator.js`, `duplication-checker.js`, `checkpoint-guard-hook.js` |
| `PreToolUse` | `mcp__.*` | `mcp-health-check.js` |
| `PreToolUse` | `Bash` | `safety-guardrails.js`, `pre-commit-validator.js`, `spec-sync-validator.js` |
| `PostToolUse` | `Bash` | `ci-status-checker.js`, `post-commit-hook.js`, `graph-git-hook.js`, `maintenance-skill-suggester.js` |
| `PostToolUse` | `Write\|Edit` | `auto-artifact-creator.js`, `gicl-iteration-hook.js`, `post-tool-security-scan.js`, `test-tampering-detector.js`, `construction-skill-suggester.js`, `document-skill-suggester.js`, `plans-watcher.js`, `tdd-order-check.js`, `auto-test-runner.js`, `inception-skill-suggester.js`, `visual-memory-generator.js`, `monorepo-skill-suggester.js` |
| `PostToolUseFailure` | — | `post-tool-failure-hook.js` |
| `Stop` | — | `response-stop-hook.js`, `cost-tracker-hook.js`, `desktop-notify-hook.js` |
| `PreCompact` | — | `pre-compact-hook.js` |
| `SessionEnd` | — | `session-end-hook.js` |
| `Notification` | — | `notification-hook.js` |
| `WorktreeRemove` | — | `worktree-lifecycle.js` |

**Note:** `TeammateIdle` and `TaskCompleted` events (swarm) are gated behind the `swarm` feature flag. `WorktreeCreate` is opt-in only — `worktree-lifecycle.js` supports it but it is not registered by default (it replaces standard git behavior).

---

## All 39 Hooks — Quick Reference

| Hook | Event | Purpose |
|------|-------|---------|
| `session-start-hook.js` | SessionStart | Inject `using-aicodepath` SKILL.md + resume summary into context |
| `visual-memory-loader.js` | SessionStart | Load relevant visual diagrams from `aicodepath-docs/memory/` |
| `session-auto-cleanup.js` | SessionStart | Close stale GICL sessions (>24h), expire old fix proposals (>7d), prune agent-inbox (>48h) |
| `pre-flight-check.js` | SessionStart | Verify required plugins and MCP servers are installed |
| `plan-role-activator.js` | UserPromptSubmit | Detect phase-start signals, inject best-fit agent role |
| `permission-request-hook.js` | PermissionRequest | Auto-approve/deny/ask based on configured rules |
| `config-protection-hook.js` | PreToolUse Write\|Edit | Block writes to protected config files: guidelines JSON, hooks.json, hook lib, linter configs |
| `schema-context-hook.js` | PreToolUse Write\|Edit | Inject DB schema when writing data-layer files |
| `guideline-validator.js` | PreToolUse Write\|Edit | Validate content against all 15 guideline files; block on errors |
| `duplication-checker.js` | PreToolUse Write\|Edit | Detect code/SQL duplication via fingerprint matching |
| `checkpoint-guard-hook.js` | PreToolUse Write\|Edit | Block checkpoint writes when uncommitted changes exist in the active worktree |
| `mcp-health-check.js` | PreToolUse mcp__.* | Detect MCP tool invocations; inject server awareness as additionalContext |
| `safety-guardrails.js` | PreToolUse Bash | R01-R06 declarative safety rules: block sudo, protected path writes, rm-rf, force-push |
| `pre-commit-validator.js` | PreToolUse Bash | Validate staged files + check for secrets before git commit |
| `spec-sync-validator.js` | PreToolUse Bash | Intercept git push; validate design docs are in sync with code changes |
| `ci-status-checker.js` | PostToolUse Bash | Monitor GitHub Actions CI status after git push; async, opt-in via feature flag |
| `post-commit-hook.js` | PostToolUse Bash | Post-commit lifecycle placeholder (learn suggestion moved to acceptance skill) |
| `graph-git-hook.js` | PostToolUse Bash | Update code graph after git operations (commit, pull, merge, checkout, rebase) |
| `maintenance-skill-suggester.js` | PostToolUse Bash | Suggest `aicodepath-dependency-updater` during OPERATIONS phase |
| `auto-artifact-creator.js` | PostToolUse Write\|Edit | Auto-create DB artifact entries when files written to `aicodepath-docs/` |
| `gicl-iteration-hook.js` | PostToolUse Write\|Edit | Run GICL quality gates + effort scoring; suggest agents for gaps; lite mode without session |
| `post-tool-security-scan.js` | PostToolUse Write\|Edit | Warn on 5 security anti-patterns: eval injection, XSS, command injection, hardcoded credentials |
| `test-tampering-detector.js` | PostToolUse Write\|Edit | Warn on 12 test tampering patterns: test skips, commented assertions, CI bypass, hardcoded values |
| `construction-skill-suggester.js` | PostToolUse Write\|Edit | Suggest skills during CONSTRUCTION phase |
| `document-skill-suggester.js` | PostToolUse Write\|Edit | Suggest `aicodepath-readme-crafter` when README operations detected |
| `plans-watcher.js` | PostToolUse Write\|Edit | Detect tasks.md/planning.md changes; emit progress events; surface status diffs |
| `tdd-order-check.js` | PostToolUse Write\|Edit | Warn when production code is written before a test file in the current session |
| `auto-test-runner.js` | PostToolUse Write\|Edit | Async: auto-run test suite after source file writes (opt-in via feature flag) |
| `inception-skill-suggester.js` | PostToolUse Write\|Edit | Suggest skills during INCEPTION phase (mental-model, codebase-pattern-finder) |
| `visual-memory-generator.js` | PostToolUse Write\|Edit | Generate class/ER/flowchart/sequence/journey diagrams |
| `monorepo-skill-suggester.js` | PostToolUse Write\|Edit | Suggest monorepo skills based on project structure |
| `post-tool-failure-hook.js` | PostToolUseFailure | Log failures, suggest retry, emit WebSocket event |
| `response-stop-hook.js` | Stop | Handle response completion; save checkpoint on session boundaries |
| `cost-tracker-hook.js` | Stop | Record per-session token usage and cost into session_costs table |
| `desktop-notify-hook.js` | Stop | Send desktop notification when Claude finishes a response (macOS/Linux/WSL) |
| `pre-compact-hook.js` | PreCompact | Save checkpoint before context compaction |
| `session-end-hook.js` | SessionEnd | Final cleanup, checkpoint save, WebSocket notification |
| `notification-hook.js` | Notification | Filter/suppress verbose notifications; enhance important ones |
| `worktree-lifecycle.js` | WorktreeRemove | Clean up agent-inbox messages + emit trace/broadcast for removed worktree |

---

## Hook Protocol (stdin/stdout)

```
stdin → JSON hook data → execute() → stdout JSON → exit code
```

**Exit codes:**
- `0` — pass (continue normally)
- `1` — warning (show message, continue)
- `2` — block (halt the operation)

**Valid output fields:**

| Field | Available On | Purpose |
|-------|-------------|---------|
| `hookSpecificOutput.additionalContext` | PreToolUse | Inject text into Claude's context |
| `decision` / `reason` | PreToolUse | `"block"` or `"approve"` with reason |
| `systemMessage` | Any | Display message in Claude's UI |
| `continue` | SessionStart | Whether to continue session |
| `suppressOutput` | PostToolUse | Suppress tool output display |

**NEVER use** `appendToSystemPrompt` — it is not a valid Claude Code field and is silently ignored.

---

## Utility Libraries in `hooks/lib/`

| File | Purpose |
|------|---------|
| `exit-codes.js` | `exitSuccess()`, `exitBlock()`, `exitWarning()`, `createResult()` helpers |
| `ws-emitter.js` | WebSocket event emitter singleton (safe-fail, non-blocking) |
| `hook-wrapper.js` | stdin/stdout protocol wrapper for hook scripts |
| `agent-suggester.js` | Maps violations to agents via DOMAIN_MAPPING (95 entries) + VIOLATION_TYPE_MAPPING |
| `requirements-parser.js` | Parses design docs for implementation requirements |
| `implementation-verifier.js` | Verifies implementation against parsed requirements |
| `exit-codes.js` | Standard exit code helpers |
| Diagram generators | `class-diagram-generator.js`, `er-diagram-generator.js`, `flowchart-generator.js`, `sequence-diagram-generator.js`, `journey-diagram-generator.js` |

---

## Detailed Hook Documentation

- Session lifecycle hooks → `session-lifecycle.md`
- PreToolUse hooks → `pretooluse.md`
- PostToolUse hooks → `posttooluse.md`
- UserPromptSubmit hooks → `userpromptsubmit.md`
