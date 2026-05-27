# Claude Code v2.1.88 Source Map

Authoritative file paths for each of Nate B. Jones' 12 production primitives. Cite these as the canonical pattern when verdicting any harness — they are the reference implementations the primitive was extracted from.

All paths are relative to a cloned/decompiled `claude-code-source-code/src/` directory. Verified by direct read on 2026-04-08 against version 2.1.88 (`@anthropic-ai/claude-code-source` package).

## Primitive 1 — Tool Registry with Metadata-First Design

| File | Symbol | Pattern |
|---|---|---|
| `Tool.ts` | `ToolInputJSONSchema`, `ToolUseContext` | Tool interface separated from execution runtime |
| `skills/loadSkillsDir.ts` | `loadAllPluginsCacheOnly`, frontmatter parser | YAML frontmatter parsing without invoking model |
| `skills/bundledSkills.ts` | bundled skills array | Static registry registered at boot |
| `tools/` directory | `AgentTool/`, `BashTool/`, `FileEditTool/`, etc. | One directory per tool, metadata in `*.tsx` co-located |

**Pattern signature**: tools register via metadata files (frontmatter or static arrays) that can be enumerated WITHOUT running an LLM call.

## Primitive 2 — Permission System with Trust Tiers

| File | Symbol | Pattern |
|---|---|---|
| `utils/permissions/PermissionMode.ts` | `PermissionMode` type | Mode enum (`default | acceptEdits | bypassPermissions | plan`) |
| `utils/permissions/PermissionRule.ts` | `permissionBehaviorSchema` | Per-rule allow/ask/deny encoding |
| `utils/permissions/PermissionUpdate.ts` | rule mutation API | Dynamic rule updates |
| `utils/permissions/bashClassifier.ts` | bash command classifier | Per-tool risk classification |
| `utils/permissions/dangerousPatterns.ts` | regex catalog | Hardcoded dangerous-pattern list |
| `utils/permissions/yoloClassifier.ts` | auto-mode classifier | Auto-approve low-risk actions |
| `utils/permissions/shadowedRuleDetection.ts` | rule conflict detection | Detect when one rule shadows another |

**Pattern signature**: 24 files in a dedicated `permissions/` directory. Multiple tiers (allow/ask/deny) × multiple classifiers (bash/dangerous/yolo) × dynamic mutation.

## Primitive 3 — Session Persistence That Survives Crashes

| File | Symbol | Pattern |
|---|---|---|
| `bootstrap/state.ts` | `getSessionId`, `isSessionPersistenceDisabled` | Session ID lifecycle |
| `utils/sessionStorage.ts` | `flushSessionStorage`, `recordTranscript` | Disk-flush on every turn |
| `utils/fileHistory.ts` | `fileHistoryMakeSnapshot`, `fileHistoryEnabled` | File state snapshots for rollback |
| `utils/conversationRecovery.ts` | recovery entry points | Resume from interrupted state |

**Pattern signature**: every turn flushes to disk; sessions can resume after crash without data loss.

## Primitive 4 — Workflow State and Idempotency

| File | Symbol | Pattern |
|---|---|---|
| `state/AppState.tsx` | `AppState` | Centralized workflow state separate from chat history |
| `Task.ts` | `TaskStatus`, `isTerminalTaskStatus()` | Terminal-state guard prevents duplicate side effects |
| `Task.ts` | `TaskHandle`, `TaskContext` | Per-task lifecycle |

**Pattern signature**: state machine where terminal states (`completed`, `failed`, `killed`) cannot transition further. NOT idempotency keys — terminal-state guards.

## Primitive 5 — Token Budget Tracking with Pre-Turn Checks

| File | Symbol | Constants | Pattern |
|---|---|---|---|
| `query/tokenBudget.ts` | `checkTokenBudget()`, `BudgetTracker`, `createBudgetTracker()` | `COMPLETION_THRESHOLD = 0.9`, `DIMINISHING_THRESHOLD = 500` | Continuation gate at 90% turn-token usage with diminishing-returns detection (3+ continuations × <500 token delta = stop) |
| `cost-tracker.ts` | `getTotalCost`, `getModelUsage`, `addToTotalLinesChanged` | — | Cumulative cost/token rollup |
| `utils/tokenBudget.js` | `getBudgetContinuationMessage` | — | Nudge-message generator |

**Pattern signature**: post-completion gate (NOT literal pre-turn) that decides continue-or-stop based on token consumption percentage. Disabled for subagents.

## Primitive 6 — Structured Streaming Events

| File | Symbol | Pattern |
|---|---|---|
| `types/message.ts` | `StreamEvent`, `RequestStartEvent`, `TombstoneMessage`, `ToolUseSummaryMessage` | Typed event union |
| `query/stopHooks.ts` | `executeStopHooks`, `executeTaskCompletedHooks`, `executeTeammateIdleHooks` | Hook event firing on stream boundaries |
| `services/api/claude.ts` | streaming API client | SSE consumption |

**Pattern signature**: every state transition emits a typed event the harness can listen to. Not raw stdout — structured discriminated unions.

## Primitive 7 — System Event Logging

| File | Symbol | Pattern |
|---|---|---|
| `services/analytics/index.ts` | `logEvent`, `AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS` | Structured event log separate from chat transcript |
| `utils/log.ts` | `getInMemoryErrors`, `logForDebugging` | Debug log buffer |
| `utils/debug.ts` | `logForDebugging` | Levelled logging |

**Pattern signature**: "what the harness did" is logged separately from "what the model said". Two distinct streams.

## Primitive 8 — Basic Verification Harness

| File | Symbol | Pattern |
|---|---|---|
| `tools/VerifyPlanExecutionTool/` | tool implementation | Plan execution verification as a first-class tool |
| `utils/hooks/hookHelpers.ts` | `registerStructuredOutputEnforcement` | Output-shape enforcement |
| `tools/SyntheticOutputTool/SyntheticOutputTool.ts` | `SYNTHETIC_OUTPUT_TOOL_NAME` | Forced output wrapping for verification |

**Pattern signature**: runtime checks that the model's output conforms to expectations, before declaring the task done.

## Primitive 9 — Tool Pool Assembly

| File | Symbol | Pattern |
|---|---|---|
| `utils/plugins/pluginLoader.ts` | `loadAllPluginsCacheOnly` | Lazy plugin loading (cache-only, no execution) |
| `tools/` directory | per-tool registration | Static set + dynamic plugins |
| `skills/loadSkillsDir.ts` | skill discovery | Per-session skill subset |
| `services/mcp/types.ts` | `MCPServerConnection`, `ServerResource` | MCP-provided tools loaded on demand |

**Pattern signature**: a small static toolset + lazy on-demand expansion. Not all tools shown to the model on every prompt.

## Primitive 10 — Transcript Compaction

| File | Symbol | Pattern |
|---|---|---|
| `utils/messages.ts` | `SYNTHETIC_MESSAGES`, `countToolCalls`, `categorizeRetryableAPIError` | Synthetic message replacement |
| `utils/queryContext.ts` | `fetchSystemPromptParts` | Context assembly with compression |
| `utils/queryHelpers.ts` | helpers for context shaping | — |
| `utils/collapseReadSearch.ts` | `collapseReadSearch` | Collapse repeated search results |

**Pattern signature**: progressively compress conversation as it ages. Recent turns stay detailed; older turns get summarized or culled.

## Primitive 11 — Permission Audit Trail

| File | Symbol | Pattern |
|---|---|---|
| `utils/permissions/denialTracking.ts` | `DenialTrackingState`, `recordDenial`, `recordSuccess`, `shouldFallbackToPrompting` | In-memory denial counter (`{consecutiveDenials, totalDenials}`); thresholds `maxConsecutive: 3`, `maxTotal: 20`; triggers fallback to user prompt |
| `services/analytics/index.ts` | `logEvent` | Analytics events for permission decisions |
| `remote/remotePermissionBridge.ts` | bridge to remote permission service | Permission queries can route to remote authority |

**Pattern signature**: ALL permission decisions are observable. Note: Claude Code's reference implementation is in-memory only — a harness with a persistent SQL ledger EXCEEDS this baseline.

## Primitive 12 — Compound: Doctor + Staged Boot + Stop Reason + Provenance-Aware Context

### 12a — Doctor Pattern

| File | Symbol | Pattern |
|---|---|---|
| `screens/Doctor.tsx` | Doctor TUI screen | User-facing diagnostic UI |
| `utils/doctorDiagnostic.ts` | diagnostic checks | Health probe surface |
| `utils/doctorContextWarnings.ts` | context warnings | Context-window health |

### 12b — Staged Boot

| File | Symbol | Pattern |
|---|---|---|
| `bootstrap/state.ts` | bootstrap-time state | Centralized boot phase, single source of truth |
| `main.tsx` | app entry | Entry point that calls bootstrap before any session work |
| `setup.ts` | setup hooks | First-run setup ordering |

### 12c — Stop Reason Taxonomy

| File | Symbol | Pattern |
|---|---|---|
| `query/stopHooks.ts` | `StopHookInfo`, `stopReason` field | Free-text stop reasons attached to hook results |
| `types/message.ts` | `TombstoneMessage`, `ToolUseSummaryMessage` | Reason-tagged completion messages |

**Pattern signature**: stop reasons are free-text strings, not enum-constrained. A harness with a documented enum EXCEEDS this baseline.

### 12d — Provenance-Aware Context

| File | Symbol | Pattern |
|---|---|---|
| `memdir/memoryAge.ts` | `memoryAgeDays(mtimeMs)`, `memoryAge(mtimeMs)`, `memoryFreshnessText(mtimeMs)`, `memoryFreshnessNote(mtimeMs)` | Filesystem mtime → human age string → auto-injected `<system-reminder>` warning for memories >1 day old |
| `memdir/memoryTypes.ts` | `MEMORY_TYPES` (`user | feedback | project | reference`), `MEMORY_FRONTMATTER_EXAMPLE`, `WHEN_TO_ACCESS_SECTION`, `TRUSTING_RECALL_SECTION` | Memory type taxonomy + recall guidance prose |
| `memdir/memoryScan.ts` | memory scanner | Discover memory files |
| `memdir/findRelevantMemories.ts` | relevance ranking | Pull memories matching current task |
| `memdir/paths.ts` | path resolver | Memory directory layout |

**Pattern signature**: memory entries carry provenance (mtime + type) AND the harness auto-injects staleness warnings on read. Brilliantly simple — it's just `fs.statSync().mtimeMs` plus a `<system-reminder>` wrapper.

## Month One items (NOT in the 12 — for Design Mode reference)

| Item | Claude Code anchor |
|---|---|
| Agent type system | `Task.ts:TaskType` (7 types: `local_bash | local_agent | remote_agent | in_process_teammate | local_workflow | monitor_mcp | dream`); `tasks/` directory (`DreamTask`, `InProcessTeammateTask`, `LocalAgentTask`, `LocalMainSessionTask`, `LocalShellTask`, `RemoteAgentTask`) |
| Memory system with provenance and aging | `memdir/` (covered above as 12d) |
| Skills/extensibility framework | `skills/loadSkillsDir.ts`, `skills/bundledSkills.ts`, `skills/mcpSkillBuilders.ts` |
| Hooks architecture | `utils/hooks/`, `query/stopHooks.ts`, `hooks/lib/` |
| Multi-agent coordination | `tasks/RemoteAgentTask`, `tasks/InProcessTeammateTask`, `services/mcp/` |
| Analytics | `services/analytics/index.ts` |
| Configuration migrations | `migrations/` directory |

## How to use this map

1. When eval mode runs against a target codebase, each primitive check script searches the target for **functional equivalents** of the patterns above — NOT identical filenames.
2. When reporting verdicts, cite the Claude Code anchor as the "reference pattern" so the user can see what the primitive looks like in its canonical form.
3. When Design Mode proposes a primitive, cite the Claude Code anchor so the user can read the reference implementation directly.
4. If a target diverges from the Claude Code pattern, do NOT mark it MISSING — diverge ≠ missing. Mark MISSING only when no functional equivalent is present anywhere in the target.
