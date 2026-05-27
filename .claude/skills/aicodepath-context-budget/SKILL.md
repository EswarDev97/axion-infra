---
name: aicodepath-context-budget
description: Audit context window usage — token counts across skills, rules, agents, MCP, and guidelines with warning thresholds.
user-invocable: true
allowed-tools: [Read, Grep, Glob, Bash]
argument-hint: "audit | check | report"
---

# Context Budget — Token Audit & Management

Quantitative token audit across all AICodePath context sources: skills, rules, agents, MCP servers, and guidelines. Prevents context exhaustion by tracking usage and enforcing warning thresholds.

---

## Why Context Budget Matters

Claude Code has a finite context window. AICodePath injects content from multiple sources:

| Source | Injected When | Typical Size |
|--------|--------------|-------------|
| Skills (SKILL.md) | Skill invoked | 100-400 lines each |
| Rules (.md) | Phase-specific loading | 20-80 lines each |
| Agents (.md) | Agent spawned | 50-200 lines each |
| Guidelines (.json) | PreToolUse hook | 50-300 lines each |
| MCP context | MCP tool call | Variable |
| CLAUDE.md files | Session start | 100-500 lines |
| Handoff docs | Session resume | 100-300 lines |

**The problem**: Loading too many sources simultaneously can consume 50%+ of the context window before any real work begins.

---

## Warning Thresholds

Monitor `used_percentage` from the statusline (input tokens only):

```
┌────────────────────────────────────────────────────┐
│  0%        30%        60%        80%        90%    │
│  ├──────────┼──────────┼──────────┼──────────┤     │
│  │  GREEN   │  NORMAL  │  YELLOW  │  ORANGE  │ RED │
│  │          │          │  TRIM    │  COMPACT │URGNT│
│  └──────────┴──────────┴──────────┴──────────┘     │
└────────────────────────────────────────────────────┘
```

| Zone | % Used | Action |
|------|--------|--------|
| **GREEN** (0-30%) | Comfortable | No action needed |
| **NORMAL** (30-60%) | Working range | Monitor; avoid loading large docs unnecessarily |
| **YELLOW** (60-80%) | Trim | Defer non-essential skill invocations; use targeted reads instead of full file loads |
| **ORANGE** (80-90%) | Compact | Create a checkpoint; consider `/clear` + `/aicodepath-resume`; stop loading new skills |
| **RED** (90%+) | Urgent | Immediate checkpoint via `/aicodepath-pause`; do NOT start new tasks; wrap up current work |

---

## Audit Process

### Step 1: Inventory active context sources

```bash
# Count SKILL.md files (each ~200 lines average)
find .aicodepath/skills/ -name "SKILL.md" | wc -l

# Count active rules
find .aicodepath/rules/ -name "*.md" | wc -l

# Count agents
find .aicodepath/agents/ -name "*.md" | wc -l

# Count guideline files
find .aicodepath/guidelines/ -name "*.json" | wc -l

# Count CLAUDE.md files in context
find . -name "CLAUDE.md" -not -path "*/node_modules/*" | wc -l
```

### Step 2: Measure per-source token cost

```bash
# Approximate token count (1 token ≈ 4 chars for English text)
wc -c .aicodepath/skills/aicodepath-brainstorm/SKILL.md | awk '{print $1/4 " tokens (approx)"}'

# Top 10 largest skills by file size
wc -c .aicodepath/skills/*/SKILL.md | sort -rn | head -10

# Total skill context cost
wc -c .aicodepath/skills/*/SKILL.md | tail -1 | awk '{print $1/4 " tokens total (approx)"}'
```

### Step 3: Identify budget categories

| Category | Sources | Priority |
|----------|---------|----------|
| **Always loaded** | CLAUDE.md, using-aicodepath, session-start hook | Cannot reduce — essential |
| **Phase-loaded** | Phase-specific rules, active skill | Loaded on demand — OK |
| **On-demand** | Research skills, analysis skills | Load only when invoked — trim first |
| **Optional** | Reference skills, visual memory, handoffs | Skip unless explicitly needed |

### Step 4: Generate budget report

```markdown
## Context Budget Report

**Date**: YYYY-MM-DD
**Current usage**: XX% (from statusline `used_percentage`)
**Zone**: GREEN / NORMAL / YELLOW / ORANGE / RED

### Token Breakdown (approximate)

| Category | Count | Est. Tokens | % of Budget |
|----------|-------|-------------|-------------|
| CLAUDE.md files | 3 | ~2,500 | 5% |
| Skills loaded | 4 | ~3,200 | 6% |
| Rules loaded | 6 | ~1,200 | 2% |
| Agents spawned | 2 | ~1,600 | 3% |
| Guidelines | 16 | ~4,000 | 8% |
| Conversation | — | ~15,000 | 30% |
| **Total** | — | **~27,500** | **55%** |

### Recommendations

1. ✅ YELLOW zone — consider trimming optional skills
2. ⚠️ 16 guideline files loaded — only 4 apply to current component types
3. ⚠️ 2 reference skills loaded but not used this session
```

---

## Optimization Strategies

### In YELLOW zone (60-80%)

- Defer loading skills until actually needed
- Use `Read` with `offset` and `limit` instead of reading full files
- Avoid loading reference skills unless explicitly needed
- Run `/aicodepath-checkpoint` to save progress before trimming

### In ORANGE zone (80-90%)

- Create a checkpoint immediately
- Consider `/clear` + `/aicodepath-resume` for a fresh context
- Stop invoking new skills — complete current work first
- Use Bash for quick checks instead of loading full guidelines

### In RED zone (90%+)

- **Immediate action**: `/aicodepath-pause` to save full state
- Do NOT start new tasks or load new skills
- Wrap up current task minimally
- After pause: `/clear` → `/aicodepath-resume` to continue fresh

---

## Integration with AICodePath

- **Statusline**: The `used_percentage` field in the statusline shows real-time context usage (input tokens only). This is the primary monitoring signal.
- **`/aicodepath-efficiency-mode`**: Activates token budgeting and context reduction when manually needed
- **`/aicodepath-pause`**: Creates handoff for fresh-context continuation
- **`/aicodepath-resume`**: Restores state in a clean context window

---

## NEVER

<HARD-GATE>
- **NEVER** ignore RED zone (90%+) context usage — context exhaustion causes truncated responses, lost conversation history, and degraded reasoning quality. Pause immediately and resume fresh.
- **NEVER** load all skills at session start — only the active phase's skills should be in context. Loading 80 skills wastes ~16,000 tokens on content that won't be used.
- **NEVER** assume context is unlimited — even with 1M context models, AICodePath's combined sources (skills + rules + guidelines + conversation) can consume 50%+ before real work begins.
- **NEVER** skip checkpointing before context trimming — if you clear context without saving state, you lose all in-session progress and must re-derive decisions from scratch.
- **NEVER** load reference documentation inline when a targeted search would suffice — `grep` for the specific information you need instead of reading entire files into context.
</HARD-GATE>
