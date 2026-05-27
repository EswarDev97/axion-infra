---
name: aicodepath-efficiency-mode
description: Activate token budgeting during CONSTRUCTION — reduces context when window is large or task is complex.
user-invocable: true
allowed-tools: Read, Bash, Glob, Grep, TaskCreate, TaskGet, TaskList, TaskUpdate
argument-hint: ""
---

# AICodePath Efficiency Mode

## When to Activate

- Context window is more than 50% full
- Task involves more than 10 files in scope
- You're about to "just read everything to understand"
- Task has been going on for more than 30 exchanges
- Planning a complex feature from scratch

## Budget Allocation by Complexity

| Complexity | Token Budget | Strategy |
|-----------|-------------|---------|
| Simple (1 file, 1 change) | ~200 tokens | Read target only, edit, done |
| Medium (2–5 files) | ~1 000 tokens | Grep for pattern, read relevant sections only |
| Complex (6–15 files) | ~2 500 tokens | Use Explore agent, read summaries first |
| Very Complex (15+ files) | Delegate | Use `/aicodepath-subagent-dev` with fresh agents |

**Rule**: If your plan exceeds the budget for its complexity class, escalate to the next tier.

## Five Context Reduction Techniques

### 1. Grep Before Read
```
# Find the 10 lines you need, not 200 lines of the whole file
Grep("functionName", "lib/*.js") → read only matching file at matching line
```
Never read a whole file when you only need to find where something is.

### 2. Glob Before Read
```
# Confirm the file exists before spending tokens reading it
Glob("lib/feature-flags.js") → exists? then Read
```
Don't read a file that might not exist.

### 3. Tasks as Working Memory
```
TaskCreate: "feature-flags.js: isEnabled(name) → checks config.json → env var → default"
TaskCreate: "settings-generator.js: generateSettings(root, opts) — reads template, resolves paths"
```
Capture key facts in TaskCreate. Reference them (via TaskList/TaskGet) instead of re-reading files.

### 4. Read with Offset + Limit
```
# Read only the relevant section (lines 100-150) not the whole file
Read(file.js, offset=100, limit=50)
```
Use when you know roughly where the relevant code is.

### 5. Scope Clarification Before Reading
Before reading anything, ask:
> "Do I know exactly WHAT I'm looking for?"

If the answer is vague ("understand the codebase"), stop and narrow the scope.
Read with a specific question, not open-ended exploration.

## Budget Checkpoint Protocol

After every major milestone:
1. Estimate remaining complexity
2. Check: am I still within budget for this complexity class?
3. If over budget: call `/aicodepath-checkpoint` and continue in a fresh session
4. Never push to completion at the cost of quality

```
Milestone → Budget check → /aicodepath-checkpoint (if needed) → continue
```

## Red Flags — Token Waste

- "Let me read all the files in this directory to understand the codebase"
- Reading files with no specific question in mind
- Re-reading a file already read this session (check TaskList first)
- Glob patterns matching 20+ files when you need 2
- Copy-pasting large code blocks into your reasoning

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "I need full context to be safe" | You need targeted context, not total context |
| "Reading everything avoids mistakes" | It exhausts context faster than it prevents errors |
| "I'll just skim it quickly" | Skimming still costs tokens. Grep costs fewer. |
| "The file is small, it's fine" | 10 small files = 1 large file's worth of context |

## Strategic Compact

A **Strategic Compact** is a deliberate context reset — a mid-session `/clear` + `/aicodepath-resume` that trades in-session continuity for a clean context window.

### When to trigger a Strategic Compact

| Signal | Action |
|--------|--------|
| Tool call counter reaches ~50 calls | Consider compact — context is filling fast |
| `used_percentage` enters ORANGE zone (80–90%) | Run `/aicodepath-checkpoint` then compact |
| Phase transition from CONSTRUCTION → OPERATIONS | Natural break point — compact and resume fresh |
| Entering a new batch in a swarm plan | Compact between batches to avoid context bleed |

### DO / DON'T timing table

| DO compact when… | DON'T compact when… |
|------------------|---------------------|
| Current task is complete | Mid-task with unsaved edits |
| About to start a new unrelated batch | You have in-session reasoning not yet captured |
| Context is ≥80% before a complex task | You're <60% — there's still budget to use |
| About to spawn multiple fresh subagents | The next task depends on session memory |

### Pre-Compact Checklist

Before running `/clear`:

1. ✅ Run `/aicodepath-checkpoint` — save tasks.md, knowledge.md, adr-log.md
2. ✅ Commit any pending changes (`git add -A && git commit`)
3. ✅ Write a `/aicodepath-pause` handoff note if mid-feature
4. ✅ Verify tasks.md is up-to-date with current Status column

### Tool call counter reference

Count tool calls mentally as you work:
- Read, Grep, Glob, Bash: +1 each
- Write, Edit: +2 (heavier context impact)
- Agent spawn: +5 (subagent context overhead)

At ~50 tool calls, assess whether a compact is warranted using the table above.

**Reference**: `/aicodepath-context-budget` for quantitative token audits and `used_percentage` monitoring.

---

## Integration

```
Efficiency Mode is always active background discipline.
Invoke explicitly when context is large or task is complex.
```

Works alongside `/aicodepath-orchestration-mode` — Orchestration decides WHAT to read in parallel,
Efficiency Mode decides HOW MUCH to read and when to stop.

---

## NEVER

- **NEVER** re-read a file you already read in this session without checking TaskList first — a 200-line file read twice costs double. If you recorded key facts in TaskCreate after the first read, use those facts. Only re-read when you need a section you didn't capture, and read only that section with offset + limit.
- **NEVER** jump from "medium complexity" directly to delegating to a fresh subagent — subagent delegation discards all context accumulated this session. Work through the escalation tiers (medium → complex → very complex) before delegating; a task that looks very complex often scopes down once you've done targeted Grep investigation.
- **NEVER** call `/aicodepath-checkpoint` and continue in a fresh session when you're still within budget — unnecessary context resets lose architectural understanding that was expensive to build. Checkpoint only when you've genuinely exceeded the budget for your complexity class, not as a precaution.
- **NEVER** use a Glob pattern that returns 20+ files when you only need 2 — broad patterns like `**/*.js` waste tokens on file discovery and tempt you to read everything. Add directory constraints (`lib/*.js`) or filename fragments (`*feature-flags*`) to get a targeted match before reading.
