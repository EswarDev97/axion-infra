---
rubricVersion: 1.0.0
lastBarChange: 2026-04-08
changedBy: Initial primitive spec sheet authored during harness-eval skill creation
---

<!--
This file is pinned to rubricVersion defined in eval-rubric.md frontmatter.
If you edit the PASS bar for any primitive, you MUST also edit eval-rubric.md
and bump the version there. See eval-rubric.md for the full versioning policy.
-->

# The 12 Primitives — Specifications

Combines `cc-source-map.md` (Claude Code anchors) and `eval-rubric.md` (verdict bar) into one per-primitive spec sheet. Use this when verdicting any single primitive.

Source: framework attributed to Nate B. Jones, derived from analysis of the Claude Code v2.1.88 source code. The primitive names below are extracted from his public Prompt Kit at `promptkit.natebjones.com/20260331_6yc_promptkit_1` (verified 2026-04-08 via two independent WebFetch passes).

## Tier structure (Day One / Week One)

- **Day One** primitives 1–8: minimum infrastructure for any production agent
- **Week One** primitives 9–12: operational maturity layer
- **Month One** items: NOT counted in the 12; see `cc-source-map.md` for the list (agent type system, memory aging, skills framework, etc.)

---

## 1. Tool Registry with Metadata-First Design

**What it solves**: tools must be enumerable without invoking the model. If listing tools requires an LLM call, the harness cannot bootstrap itself.

**CC reference**: `Tool.ts`, `skills/loadSkillsDir.ts`, `skills/bundledSkills.ts`, `tools/` directory. Tools register via static metadata (TypeScript types, frontmatter, or static arrays).

**Bar for PASS**: tools/skills/agents discoverable via static metadata (frontmatter, static array, manifest file) without running the LLM.

**Search hints when verdicting a target**:
- Files matching `*Registry.{js,ts}`, `loadSkillsDir`, `loadAgentsDir`, `bundledSkills`, `bundledTools`
- Frontmatter parsers (look for `---` delimiter scanners and `parseFrontmatter`)
- Static manifest files (`manifest.json`, `tools.json`, `agents.json`)

**Common synonyms**: registry, loader, manifest, catalog, bundled, builtin

---

## 2. Permission System with Trust Tiers

**What it solves**: not all tool calls are equally risky. The harness needs distinct decision tiers (auto-allow / ask user / hard-deny) AND classifiers that map specific calls to tiers.

**CC reference**: `utils/permissions/` (24 files including `PermissionMode.ts`, `PermissionRule.ts`, `bashClassifier.ts`, `dangerousPatterns.ts`, `yoloClassifier.ts`, `denialTracking.ts`, `shadowedRuleDetection.ts`).

**Bar for PASS**: at least 3 distinct decision tiers (typically allow/deny/ask) AND at least one classifier or rule engine that maps tools to tiers.

**Search hints**:
- Directory `permissions/`, `auth/`, `acl/`, `policy/`
- Schema definitions with CHECK constraints like `IN ('allow', 'deny', 'ask')`
- Files named `*Classifier`, `*Rule`, `*Mode`, `*Policy`
- Functions `canUse*`, `checkPermission`, `authorize*`, `gate*`

**EXCEEDS signal**: scope tiers (global/session/temporary) on top of decision tiers, dynamic rule mutation, expirable grants.

---

## 3. Session Persistence That Survives Crashes

**What it solves**: if the harness process dies mid-task, the user must be able to resume without losing state. Crash-resilience is not optional for long-running agents.

**CC reference**: `bootstrap/state.ts` (`getSessionId`, `isSessionPersistenceDisabled`), `utils/sessionStorage.ts` (`flushSessionStorage`, `recordTranscript`), `utils/fileHistory.ts` (`fileHistoryMakeSnapshot`), `utils/conversationRecovery.ts`.

**Bar for PASS**: session state survives process exit (file or DB), can be resumed after crash.

**Search hints**:
- Tables: `session*`, `checkpoint*`, `*_history`, `*_state`
- Functions: `flush*`, `save*`, `persist*`, `recover*`, `resume*`
- File-based snapshots in any output directory

**Common synonyms**: snapshot, checkpoint, persist, durable, recover, resume

---

## 4. Workflow State and Idempotency

**What it solves**: workflow state ("what step are we on") must be separate from chat state ("what did we say"). Without this separation, retrying a turn can re-execute side effects.

**CC reference**: `state/AppState.tsx`, `Task.ts:isTerminalTaskStatus()`. CC uses terminal-state guards (a task in `completed | failed | killed` cannot transition further) instead of explicit idempotency keys.

**Bar for PASS**: workflow state separated from chat state AND a guard preventing duplicate side effects in retry/resume paths. Acceptable forms: terminal-state guards, unique constraints, OR idempotency keys.

**Search hints**:
- Files: `*StateMachine`, `phase*`, `workflow*`, `*Phase`
- Tables: `workflow_state`, `phase*`, with UNIQUE constraints
- Functions: `transition`, `isTerminal`, `canAdvance`

**EXCEEDS signal**: explicit `idempotency_key` columns with cross-session uniqueness, request body hashing.

---

## 5. Token Budget Tracking with Pre-Turn Checks

**What it solves**: agents must not run away. The harness needs to track token consumption per turn AND make a continue/stop decision based on a configured threshold.

**CC reference**: `query/tokenBudget.ts:checkTokenBudget()` with `BudgetTracker`. CC uses a 90% completion threshold (`COMPLETION_THRESHOLD = 0.9`) and diminishing-returns detection (`DIMINISHING_THRESHOLD = 500`, triggered after 3+ continuations with delta < 500 tokens). The check is POST-spend continuation gating, not literal pre-turn enforcement. Disabled for subagents.

**Bar for PASS**: token consumption tracked per turn AND a continuation/stop decision based on a configured threshold. Post-spend gating matches CC's pattern; literal pre-turn is not required.

**Search hints**:
- Files: `*budget*`, `*cost*`, `pricing*`
- Functions: `checkBudget`, `predictBudget`, `trackUsage`, `calculateCost`
- Constants near `0.8`, `0.9`, `0.85` for threshold values
- Tables: `cost_summary`, `*_costs`, `usage*`

**Note**: literal "pre-turn" interpretation is too strict. Read `query/tokenBudget.ts` first to confirm.

---

## 6. Structured Streaming Events

**What it solves**: state transitions need to be observable by something other than the chat UI. A typed event stream lets dashboards, telemetry, and downstream tools react in real time.

**CC reference**: `types/message.ts` defines `StreamEvent`, `RequestStartEvent`, `TombstoneMessage`, `ToolUseSummaryMessage`. `query/stopHooks.ts` fires hooks on stream boundaries.

**Bar for PASS**: typed events (not raw strings) emitted on state transitions AND consumable by something other than the chat UI.

**Search hints**:
- Files: `event*`, `stream*`, `emitter*`, `publisher*`
- WebSocket servers, SSE handlers
- Tables: `events`, `*_events`
- Functions: `emit*`, `publish*`, `broadcast*`

---

## 7. System Event Logging

**What it solves**: "what the harness did" must be logged separately from "what the model said". Conflating them makes debugging and audit impossible.

**CC reference**: `services/analytics/index.ts:logEvent`, `utils/log.ts:getInMemoryErrors`, `utils/debug.ts:logForDebugging`.

**Bar for PASS**: structured logger separate from chat transcript that records "what the harness did" — tool use, hook fires, decisions.

**Search hints**:
- Files: `logger*`, `*-logger`, `decision-log*`, `audit*`
- Functions: `logEvent`, `recordDecision`, `auditLog`
- Tables: `decisions`, `*_log`, `audit_*`, JSONL trace files

**Note**: structured logging ≠ console.log. Look for shaped event records.

---

## 8. Basic Verification Harness

**What it solves**: agents lie. The harness needs runtime checks that the model's claimed completion actually matches reality before declaring "done".

**CC reference**: `tools/VerifyPlanExecutionTool/`, `utils/hooks/hookHelpers.ts:registerStructuredOutputEnforcement`, `tools/SyntheticOutputTool/`.

**Bar for PASS**: runtime checks on model output against expected shape OR a separate verify/eval skill that can be invoked before declaring done.

**Search hints**:
- Skills: `*verify*`, `*eval*`, `*check*`, `*audit*`
- Files: `confidence*`, `validation*`, `assert*`
- Tables: `validations`, `verification*`
- TDD enforcement (tests must exist before code)

---

## 9. Tool Pool Assembly

**What it solves**: showing all tools to the model on every prompt creates a selection problem. The harness needs to assemble per-task tool subsets.

**CC reference**: `utils/plugins/pluginLoader.ts:loadAllPluginsCacheOnly`, `tools/` directory, `services/mcp/types.ts`. CC uses lazy plugin loading + MCP on-demand expansion.

**Bar for PASS**: not all tools shown on every prompt — at least one mechanism for selecting subsets (lazy loading, classification, MCP on-demand, agent-suggester).

**Search hints**:
- Files: `agent-suggester`, `team-composer`, `tool-selector`, `classify*`
- Mappings: `DOMAIN_MAPPING`, `*_MAPPING`, route tables
- MCP server lazy loading
- Per-phase or per-task agent subsets

---

## 10. Transcript Compaction

**What it solves**: long sessions blow the context window. The harness needs to compress old turns while preserving recent detail.

**CC reference**: `utils/messages.ts:SYNTHETIC_MESSAGES`, `utils/queryContext.ts`, `utils/collapseReadSearch.ts`. CC has a native auto-compact path triggered around 98% context usage.

**Bar for PASS**: either own compactor OR explicit integration with the host's compaction (e.g., PreCompact hook with checkpoint+preserve logic).

**Search hints**:
- Files: `*compact*`, `*-prune*`, `pre-compact-hook`
- Functions: `compact`, `summarize`, `prune`, `cull`
- Hook event handlers for compaction events

**Note**: integrating with the host's compaction is BETTER than reimplementing it.

---

## 11. Permission Audit Trail

**What it solves**: every permission decision must be observable after the fact. Without this, you cannot debug why a tool was blocked or audit a swarm worker's authorizations.

**CC reference**: `utils/permissions/denialTracking.ts:DenialTrackingState` — note this is **just two integers in memory** (`{consecutiveDenials, totalDenials}`) with thresholds `maxConsecutive: 3`, `maxTotal: 20`. The CC reference is intentionally narrow.

**Bar for PASS**: some record of permission decisions that survives the current turn. CC's in-memory counter passes the bar.

**EXCEEDS signal**: persistent SQL ledger with per-decision rows, action enum (grant/revoke/use/suggest), querable history, suggestion engine.

**Search hints**:
- Tables: `permission_audit`, `permission_log`, `permission_ledger`, `permission_history`
- Files: `permission-manager`, `permission-tracker`, `*Audit*`
- SQL CHECK constraints with `'grant'`, `'deny'`, `'use'`

**Critical**: a literal grep for `permission_ledger` will miss synonyms. Always search the full `*_audit | *_log | *_ledger | *_history` pattern.

---

## 12. Compound — Doctor + Staged Boot + Stop Reason + Provenance-Aware Context

This is one primitive in Nate's framework but covers four concerns. Verdict each sub-item separately, then average:
- 0 sub-PASS = MISSING
- 1 sub-PASS = MISSING
- 2 sub-PASS = PARTIAL
- 3 sub-PASS = PARTIAL
- 4 sub-PASS = PASS

### 12a — Doctor

**What it solves**: when something is broken, the user needs a single command to find out what.

**CC reference**: `screens/Doctor.tsx`, `utils/doctorDiagnostic.ts`, `utils/doctorContextWarnings.ts`.

**Bar for PASS**: a diagnostic command/skill/screen the user can run to check harness health.

**Search hints**: `doctor*`, `diagnostic*`, `health-check*`, `validate-structure*`

### 12b — Staged Boot

**What it solves**: boot order matters. The harness must initialize in stages with fail-fast on each stage.

**CC reference**: `bootstrap/state.ts`, `main.tsx`, `setup.ts`.

**Bar for PASS**: boot proceeds through ordered stages with the ability to fail-fast and report which stage broke.

**Search hints**: `bootstrap*`, `init*`, `setup*`, ordered phase init

### 12c — Stop Reason Taxonomy

**What it solves**: when the harness halts, the reason must be machine-readable so downstream systems can react appropriately.

**CC reference**: `query/stopHooks.ts:StopHookInfo`, `types/message.ts:TombstoneMessage`. **CC uses free-text strings, not enum-constrained reasons.**

**Bar for PASS**: stop/halt events carry a reason field, even if free-text.

**EXCEEDS signal**: enum-constrained taxonomy (CHECK constraint) used across multiple subsystems.

**Search hints**: `stop_reason`, `halt_reason`, `exit_reason`, `completion_reason`, `terminate_*`

### 12d — Provenance-Aware Context

**What it solves**: memory entries become stale. The harness must know when memories were captured AND warn the model when they may be outdated.

**CC reference**: `memdir/memoryAge.ts:memoryAgeDays`, `memoryAge`, `memoryFreshnessText`, `memoryFreshnessNote` — uses `fs.statSync().mtimeMs`, returns "47 days ago" strings, auto-injects `<system-reminder>` warning for memories > 1 day old. `memdir/memoryTypes.ts` defines the type taxonomy.

**Bar for PASS**: memory entries carry origin metadata (timestamp, source, confidence, etc.) AND the harness uses that metadata to warn about staleness or weight relevance.

**Search hints**:
- Files: `*staleness*`, `*age*`, `*freshness*`, `*provenance*`, `mem*Age*`
- Schemas with fields: `confidence`, `created_at`, `source_note`, `times_used`, `expires_at`
- Auto-injected warnings in system reminders or context loaders

**Critical**: provenance can live in (a) DB columns, (b) markdown frontmatter schemas, (c) filesystem mtime checks, OR (d) skill body specs. Search all four locations before declaring MISSING.

---

## Summary table — minimum PASS bar at a glance

| # | Primitive | One-line PASS criterion |
|---|---|---|
| 1 | Tool Registry Metadata-First | Static enumeration without LLM |
| 2 | Permission Trust Tiers | 3+ tiers + classifier |
| 3 | Session Persistence | Survives process exit |
| 4 | Workflow State + Idempotency | Separated state + retry guard |
| 5 | Token Budget | Per-turn tracking + threshold gate |
| 6 | Structured Streaming Events | Typed events on transitions |
| 7 | System Event Logger | Harness actions logged separately from chat |
| 8 | Basic Verification Harness | Runtime output checks before "done" |
| 9 | Tool Pool Assembly | Per-task tool subsetting |
| 10 | Transcript Compaction | Own or integrated host compaction |
| 11 | Permission Audit Trail | Permission decisions observable after the turn |
| 12a | Doctor | Single diagnostic entry point |
| 12b | Staged Boot | Ordered init with fail-fast |
| 12c | Stop Reason Taxonomy | Reason field on stop events |
| 12d | Provenance-Aware Context | Memory metadata + staleness signals |
