# Skill Authoring Guide

Skills are markdown files that provide structured instructions for Claude to follow. They are invoked via the `Skill` tool.

---

## File Structure

```
.aicodepath/skills/<skill-name>/
└── SKILL.md
```

The directory name becomes the skill identifier used in `/skill-name` invocations.

---

## Frontmatter Schema

```markdown
---
name: my-skill
description: Use when <trigger condition> — <what it does>. Triggered by: "<keyword>", "<keyword>".
user-invocable: true
allowed-tools: [Read, Write, Bash, Edit, Glob, Grep]
argument-hint: <optional-arg-description>
---
```

**Required fields:**
- `name` — matches directory name
- `description` — trigger condition + what it does (see CSO format below)
- `user-invocable` — `true` if user can invoke with `/skill-name`
- `allowed-tools` — list of tools this skill may use

**Optional fields:**
- `argument-hint` — shown in skill picker, describes what argument the skill accepts

---

## Description Format (CSO Pattern)

The `description` field must use "Use when..." format — trigger conditions only, not feature description.

```
✅ Use when implementing any feature or bug fix — enforces test-first development with Red-Green-Refactor cycle
✅ Use when a bug, error, or unexpected behavior occurs — systematic root cause analysis before any fix
✅ Use at phase transitions — maintains the three persistent knowledge files that survive context resets

❌ This skill provides TDD methodology for implementing features
❌ A comprehensive debugging framework for all error types
```

**Pattern:**
```
Use when <trigger condition(s)> — <brief what it does>. Triggered by: "<keyword>", "<keyword>".
```

---

## Skill Body Structure

### Rigid Skills (brainstorm, TDD, verify)

Follow exactly. The skill dictates the process step-by-step. Include:

```markdown
## HARD-GATE

<HARD-GATE>
Do NOT [action] without [prerequisite].
</HARD-GATE>

## Steps

### Step 1: [Name]
[Exact instructions]

### Step 2: [Name]
[Exact instructions]
```

### Flexible Skills (patterns, standards)

Adapt principles to project context. Include:

```markdown
## When to Apply
## Core Principles
## Examples
```

---

## HARD-GATE Pattern

Use HARD-GATEs to prevent premature actions:

```markdown
<HARD-GATE>
Do NOT write any production code before:
1. This skill has been completed
2. Design has been approved by user
</HARD-GATE>
```

HARD-GATEs appear in: brainstorm, tdd, verify, confidence-check, preflight, requirements, orchestrate, implement.

---

## Creating a New Skill

```bash
# 1. Create directory
mkdir -p .aicodepath/skills/my-skill

# 2. Create SKILL.md
cat > .aicodepath/skills/my-skill/SKILL.md << 'EOF'
---
name: my-skill
description: Use when <trigger> — <what it does>. Triggered by: "keyword".
user-invocable: true
allowed-tools: [Read, Write, Bash]
argument-hint: <optional-arg>
---

# My Skill

## When to Use
<trigger conditions>

## Steps

### Step 1: Assess
...

### Step 2: Execute
...

## Output
<what Claude should produce>
EOF

# 3. Re-run init to create symlink in .claude/skills/
node .aicodepath/bin/aicodepath.js init
```

---

## Skill Invocation

Skills are invoked via the `Skill` tool, not via `Read`:

```
// ✅ Correct — loads and executes skill instructions
Skill tool: /my-skill [optional-arg]

// ❌ Wrong — reads file as text, doesn't invoke skill
Read: .aicodepath/skills/my-skill/SKILL.md
```

---

## Skill Types

| Type | Description | Example skills |
|------|-------------|---------------|
| **Rigid** | Follow exactly, no deviation | brainstorm, tdd, verify, gicl-start |
| **Flexible** | Adapt principles to context | coding-standards, analyze, mental-model |
| **Utility** | Execute a specific action | checkpoint, status, pause, resume |
| **Reference** | Load information | knowledge, using-aicodepath, coding-standards |

---

## Skill Eval Workspace Location

Eval workspaces (iteration runs, benchmarks, feedback) are **runtime artifacts** — they belong in `aicodepath-docs/`, not inside `.aicodepath/skills/`.

```
✅ aicodepath-docs/<skill-name>-workspace/   ← gitignored, runtime output
❌ .aicodepath/skills/<skill-name>-workspace/ ← framework source, committed to git
```

The `aicodepath-skill-creator` automatically places workspaces in `aicodepath-docs/<skill-name>-workspace/`. Never create them as siblings to the skill directory.

---

## Testing a Skill

Use `/aicodepath-skill-testing` to apply TDD to skill development:

```
/aicodepath-skill-testing my-skill
```

This runs the skill against test scenarios and measures:
- Trigger accuracy (does it fire at the right time?)
- Output quality (does it produce the right artifacts?)
- HARD-GATE enforcement (does it block premature actions?)

Use `/aicodepath-skill-audit` to score an existing skill:

```
/aicodepath-skill-audit my-skill
```

Produces a letter grade (A-F) across 8 dimensions (120 points total).

---

## Symlink Management

The `init` command creates symlinks from `.claude/skills/` → `.aicodepath/skills/`:

```
.claude/skills/my-skill → .aicodepath/skills/my-skill
```

Never create files directly in `.claude/skills/`. The `.aicodepath/skills/` directory is the single source of truth.

---

## Skill Chain Position

If your skill is part of the main AIDLC chain, document where it fits:

```
knowledge → brainstorm → write-plan → confidence-check → tdd → gicl-start → verify → checkpoint
                                                                    ↑
                                                              your-skill here?
```

Update `using-aicodepath/SKILL.md` Skill Directory table and the Skill Chain section.
