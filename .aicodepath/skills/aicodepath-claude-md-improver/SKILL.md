---
name: aicodepath-claude-md-improver
description: Audit and improve CLAUDE.md files, or capture session learnings for future sessions.
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash, Edit, Write
argument-hint: "[audit|revise]"
---

# CLAUDE.md Improver

Audit and improve CLAUDE.md files to ensure Claude Code has optimal project context, or capture session learnings into CLAUDE.md after a session completes.

**This skill can write to CLAUDE.md files.** It always shows proposed changes as diffs and requires user approval before applying.

---

## Mode Selection

| Mode | When to Use | Trigger |
|------|-------------|---------|
| `audit` (default) | Proactively improve CLAUDE.md quality across the codebase | User asks to audit/improve/check CLAUDE.md |
| `revise` | Capture learnings from the current session into CLAUDE.md | Session end, `/aicodepath-checkpoint`, "save what we learned" |

If no mode argument is provided, run `audit` mode.

---

## AICodePath Project Awareness

When working in an AICodePath project (`.aicodepath/` directory exists), treat these files as special CLAUDE.md equivalents — they serve the same function as CLAUDE.md but are named differently:

| File | Role | Scope |
|------|------|-------|
| `CLAUDE.md` | Primary project context | Root — shared with team |
| `.aicodepath/CLAUDE.md` | Internal developer reference | Framework internals — contributor context |
| `.aicodepath/DEVELOPER-GUIDE.md` | Contributor quick reference | Commands, rules, file placement |

Assess and improve all three files when auditing an AICodePath project. Apply the same quality criteria to each. When proposing changes, direct additions to the most specific file that fits: framework-internals → `.aicodepath/CLAUDE.md`, contributor commands → `.aicodepath/DEVELOPER-GUIDE.md`, project-level context → `CLAUDE.md`.

---

## Mode: audit

A 5-phase workflow to evaluate CLAUDE.md quality and propose targeted improvements.

### Phase 1: Discovery

Find all CLAUDE.md files in the repository:

```bash
find . -name "CLAUDE.md" -o -name ".claude.md" -o -name ".claude.local.md" 2>/dev/null | grep -v node_modules | head -50
```

**File Types & Locations:**

| Type | Location | Purpose |
|------|----------|---------|
| Project root | `./CLAUDE.md` | Primary project context (checked into git, shared with team) |
| Local overrides | `./.claude.local.md` | Personal/local settings (gitignored, not shared) |
| Global defaults | `~/.claude/CLAUDE.md` | User-wide defaults across all projects |
| Package-specific | `./packages/*/CLAUDE.md` | Module-level context in monorepos |
| Subdirectory | Any nested location | Feature/domain-specific context |
| AICodePath internal | `.aicodepath/CLAUDE.md` | Framework developer reference (AICodePath projects only) |
| AICodePath guide | `.aicodepath/DEVELOPER-GUIDE.md` | Contributor commands and rules (AICodePath projects only) |

**Note:** Claude auto-discovers CLAUDE.md files in parent directories, making monorepo setups work automatically.

### Phase 2: Quality Assessment

For each file found, read it completely, then cross-reference with the actual codebase:
- Check if documented commands work (verify paths, scripts exist)
- Check if referenced files/directories still exist
- Check if architecture descriptions match current structure

Evaluate against 6 weighted criteria. Load [references/quality-criteria.md](references/quality-criteria.md) for detailed rubrics and the full assessment process.

**Quick Assessment Checklist:**

| Criterion | Weight | Check |
|-----------|--------|-------|
| Commands/workflows documented | 20 pts | Are build/test/deploy commands present and accurate? |
| Architecture clarity | 20 pts | Can Claude understand the codebase structure? |
| Non-obvious patterns | 15 pts | Are gotchas and quirks documented? |
| Conciseness | 15 pts | No verbose explanations or obvious info? |
| Currency | 15 pts | Does it reflect current codebase state? |
| Actionability | 15 pts | Are instructions executable, not vague? |

**Quality Grades:**
- **A (90-100)**: Comprehensive, current, actionable
- **B (70-89)**: Good coverage, minor gaps
- **C (50-69)**: Basic info, missing key sections
- **D (30-49)**: Sparse or outdated
- **F (0-29)**: Missing or severely outdated

### Phase 3: Quality Report

**Output the quality report BEFORE making any updates or asking about changes.**

Format:

```
## CLAUDE.md Quality Report

### Summary
- Files found: X
- Average score: X/100
- Files needing update: X

### File-by-File Assessment

#### 1. ./CLAUDE.md (Project Root)
**Score: XX/100 (Grade: X)**

| Criterion | Score | Notes |
|-----------|-------|-------|
| Commands/workflows | X/20 | ... |
| Architecture clarity | X/20 | ... |
| Non-obvious patterns | X/15 | ... |
| Conciseness | X/15 | ... |
| Currency | X/15 | ... |
| Actionability | X/15 | ... |

**Issues:**
- [List specific problems found]

**Recommended additions:**
- [List what should be added]

#### 2. .aicodepath/CLAUDE.md (AICodePath Internal — if present)
...
```

After the report, ask: "Would you like me to apply the recommended updates?"

### Phase 4: Targeted Updates

Propose targeted additions only — focus on genuinely useful info. Load [references/update-guidelines.md](references/update-guidelines.md) for the full update decision framework (what to add vs. not add).

For each proposed change, use the diff format:

```markdown
### Update: ./CLAUDE.md

**Why:** [one-line reason — what gap this fills]

```diff
+ ## Quick Start
+
+ ```bash
+ npm install
+ npm run dev  # Start development server on port 3000
+ ```
```
```

### Phase 5: Apply Updates

After user approval, apply changes with the Edit tool. Preserve existing content structure. If a section already exists, append to it rather than replacing it.

---

## Mode: revise

A 5-step workflow to capture learnings from the current session into CLAUDE.md. Triggered at session end (from `/aicodepath-checkpoint`) or when the user wants to save session context.

### Step 1: Reflect

Review this session for context that would help future Claude sessions:

- Bash commands that were used or discovered
- Code style patterns followed
- Testing approaches that worked
- Environment/configuration quirks found
- Warnings or gotchas encountered
- Architectural constraints revealed
- Non-obvious patterns or workarounds discovered

Focus on things that were **missing** from the current CLAUDE.md — if Claude had to discover it during the session, it should be documented for next time.

### Step 2: Find CLAUDE.md Files

```bash
find . -name "CLAUDE.md" -o -name ".claude.local.md" 2>/dev/null | grep -v node_modules | head -20
```

For AICodePath projects, also check `.aicodepath/CLAUDE.md` and `.aicodepath/DEVELOPER-GUIDE.md`.

Decide where each addition belongs:
- `CLAUDE.md` — Team-shared context (checked into git)
- `.claude.local.md` — Personal/local only (gitignored)
- `.aicodepath/CLAUDE.md` — Framework developer context (AICodePath projects)
- `.aicodepath/DEVELOPER-GUIDE.md` — Contributor commands and rules (AICodePath projects)

### Step 3: Draft Additions

**Keep it concise** — one line per concept. CLAUDE.md is part of the prompt, so brevity matters.

Avoid:
- Verbose explanations
- Obvious information already in the file
- One-off fixes unlikely to recur
- Generic best practices not specific to this project

### Step 4: Show Proposed Changes

For each addition, use the diff format:

```
### Update: ./CLAUDE.md

**Why:** [one-line reason]

```diff
+ [the addition — keep it brief]
```
```

### Step 5: Apply with Approval

Ask if the user wants to apply the changes. Only edit files they approve.

---

## Common Issues to Flag

1. **Stale commands**: Build commands that no longer work
2. **Missing dependencies**: Required tools not mentioned
3. **Outdated architecture**: File structure that has changed
4. **Missing environment setup**: Required env vars or config not documented
5. **Broken test commands**: Test scripts that have been renamed or moved
6. **Undocumented gotchas**: Non-obvious patterns that caused friction during the session
7. **Duplicate info**: Same content across multiple CLAUDE.md files in a monorepo
8. **Generic advice**: Best practices not specific to this project (should be removed)

---

## User Tips

When presenting recommendations, remind users:

- **`#` key shortcut**: During a Claude session, press `#` to have Claude auto-incorporate learnings into CLAUDE.md
- **Keep it concise**: CLAUDE.md should be human-readable; dense is better than verbose
- **Actionable commands**: All documented commands should be copy-paste ready
- **Use `.claude.local.md`**: For personal preferences not shared with team (add to `.gitignore`)
- **Global defaults**: Put user-wide preferences in `~/.claude/CLAUDE.md`
- **AICodePath projects**: `.aicodepath/CLAUDE.md` and `DEVELOPER-GUIDE.md` are the equivalent files for framework-level context

---

## What Makes a Great CLAUDE.md

**Key principles:**
- Concise and human-readable
- Actionable commands that can be copy-pasted
- Project-specific patterns, not generic advice
- Non-obvious gotchas and warnings

**Recommended sections** (use only what is relevant):
- Commands (build, test, dev, lint)
- Architecture (directory structure)
- Key Files (entry points, config)
- Code Style (project conventions)
- Environment (required vars, setup)
- Testing (commands, patterns)
- Gotchas (quirks, common mistakes)
- Workflow (when to do what)

See [references/templates.md](references/templates.md) for CLAUDE.md templates by project type (minimal, comprehensive, monorepo, package/module).

---

## Reference Files

| File | Load when |
|------|-----------|
| `references/quality-criteria.md` | Starting Phase 2 quality assessment — detailed rubrics and assessment process |
| `references/update-guidelines.md` | Phase 4 — deciding what to add vs. not add, validation checklist |
| `references/templates.md` | Creating a new CLAUDE.md or restructuring an existing one |
