# Skills — Session Management

---

## /aicodepath-status

**When:** Unsure what to work on next, quality score looks wrong, phase seems stuck, or before resuming after a break.

**What it shows:**
- Current AIDLC phase (PRE-FLIGHT / INCEPTION / CONSTRUCTION / OPERATIONS)
- Active unit and task
- Quality gate state (which gates have passed)
- Current GICL score (if session active)
- Blockers
- Recommended next action

**Data sources:**
1. `aicodepath-docs/aicodepath-state.md` (fast path)
2. DB `session_state` table (fallback)
3. `aicodepath-docs/checkpoints/latest.json` (checkpoint state)

---

## /aicodepath-resume

**When:** Starting a new session after a break, when auto-detection shows a prior session, or to load a specific checkpoint.

**What it does:**
1. Reads `aicodepath-docs/checkpoints/latest.json`
2. Shows resume summary: phase, stage, active unit, quality gates, notes
3. Offers to restore full state or start fresh
4. Updates DB session state on restore

**Checkpoint age:** Only checkpoints < 24 hours old are offered automatically. Older checkpoints can be loaded with `--force`.

**Options:**
```bash
/aicodepath-resume             # Resume from latest checkpoint
/aicodepath-resume --list      # List available checkpoints
/aicodepath-resume <id>        # Resume specific checkpoint
/aicodepath-resume --force     # Resume even if > 24 hours old
```

---

## /aicodepath-pause

**When:** Ending a session, transferring to another agent, or needing a clean handoff document.

**What it creates:**
A handoff document with:
- Current state summary (phase, unit, quality gates)
- Quality score (0-100, minimum 70 to create handoff)
- Staleness indicator (FRESH/STALE based on checkpoint age)
- Completed work this session
- Next actions (prioritized)
- Open questions/blockers

**Handoff chain:** Supports chaining handoffs for long-running projects. Each handoff references the previous.

**Staleness detection:** Handoffs marked STALE when checkpoint age > configured threshold.

**Related scripts:**
- `skills/aicodepath-pause/scripts/create_handoff.py`
- `skills/aicodepath-pause/scripts/validate_handoff.py`
- `skills/aicodepath-pause/scripts/list_handoffs.py`

---

## /aicodepath-rewind

**When:** Implementation direction failed, GICL score regressed severely, or need to undo a batch of changes.

**What it does:**
1. Lists available checkpoints with state summary
2. User selects target checkpoint
3. Restores specified files to their checkpoint state
4. Optionally restores conversation history
5. Resets DB session state to checkpoint values

**Rewind targets:**
- Files only (code changes undone, conversation preserved)
- Session state only (phase/quality reset, files preserved)
- Both (full restore)

**Uses:** `lib/enhanced-checkpoint-manager.js` and `lib/file-snapshot-manager.js`

---

## /aicodepath-learn

**When:** Completing a session, after resolving a hard bug, after a GICL regression.

**What it does:**
1. Extracts durable learning signals from the session
2. Distinguishes genuine style preferences from one-off corrections
3. Proposes preference rule updates (pending user approval)
4. Updates `aicodepath-docs/knowledge.md` with lessons learned
5. Stores patterns in `lib/reflexion-learner.js` for cross-session learning

**Reflexion patterns:** Failures + resolutions are indexed in FTS5 (`reflexion_patterns` table) for future similar problem detection.

**False signal detection:** A single correction ≠ a rule. Pattern requires 2+ occurrences across sessions before proposing a preference.

---

## /aicodepath-knowledge

**When:** Session start (read) and at phase transitions (write).

**Three persistent files:**

| File | Purpose | Updated when |
|------|---------|-------------|
| `aicodepath-docs/adr-log.md` | ADRs, design decisions, open questions | INCEPTION complete |
| `aicodepath-docs/task/` | Sprint, task status, blockers, definitions of done (per-sprint files) | CONSTRUCTION starts/ends |
| `aicodepath-docs/knowledge.md` | Lessons learned, patterns to follow/avoid | GICL learn phase |

**These files survive context window resets** — reading them restores context without re-reading the codebase.

---

## /aicodepath-efficiency-mode

**When:** Context window is large (>60% used) or task is complex with many tool calls.

**What it activates:**
- Token budget tracking (remaining vs used)
- Context reduction heuristics (skip redundant reads, compress outputs)
- Prioritized tool call ordering (highest-value reads first)
- Context compaction preparation (pre-compact checkpoint)

---

## /aicodepath-orchestration-mode

**When:** Complex multi-step work during INCEPTION or CONSTRUCTION that benefits from parallel execution.

**What it activates:**
- Parallel tool execution (multiple reads/searches in one response)
- Resource-aware task planning (estimates token cost per task)
- Dependency graph for task ordering
- Batch operations where possible

---

## /aicodepath-preferences

**When:** Reviewing what conventions Claude has learned, approving or rejecting pending rules.

**What it shows:**
- Pending preference rules (proposed by `/aicodepath-learn`, awaiting approval)
- Active preference rules (approved, applied in all sessions)
- Rejected rules (explicitly rejected, never re-proposed)

**Actions:**
```
/aicodepath-preferences              # Show all rules by status
/aicodepath-preferences approve <id> # Approve pending rule
/aicodepath-preferences reject <id>  # Reject and never re-propose
/aicodepath-preferences list         # List all active rules
```

---

## /aicodepath-context-budget

**When:** Auditing or managing context window usage — "context budget", "token audit", "how much context", "context usage".

**What it audits:**

| Source | Injected when | Typical size |
|--------|--------------|-------------|
| `using-aicodepath/SKILL.md` | Every session | ~2,000 tokens |
| Active skill content | On invocation | 1,000–5,000 tokens |
| Agent files | On subagent dispatch | ~500 tokens each |
| Guideline rules | PreToolUse hook | ~800 tokens total |
| MCP server context | On MCP call | Variable |

**Warning thresholds:**
- >50% context used: info advisory
- >70% context used: warning — consider `/aicodepath-efficiency-mode`
- >85% context used: alert — create checkpoint before proceeding

**Output:** Token usage breakdown by source, with recommendations to reduce or consolidate.

---

## /aicodepath-cruise-control

**When:** Executing the AIDLC workflow in supervised unattended mode — "cruise control", "unattended mode", "auto-advance", "run through phases automatically".

**Philosophy:** Supervised, not unsupervised. Respects AIDLC discipline:
- **Pauses at major gates:** Design approval, confidence check, verification, handoff
- **Auto-advances through minor steps:** Knowledge loading, classification, worktree setup, commit
- **Never skips quality:** GICL loop still runs; tests still required

**Arguments:**
```
/aicodepath-cruise-control --scope P0           # Priority 0 tasks only
/aicodepath-cruise-control --scope P0+P1        # Top two priorities
/aicodepath-cruise-control --scope all          # All pending tasks
/aicodepath-cruise-control --pause-at design    # Pause only at design approval
/aicodepath-cruise-control --clarify defer      # Defer clarifications to end
```

**Gate pause behavior:** When a gate is reached, cruise control pauses, presents context, and waits for explicit user approval before continuing.
