---
name: aicodepath-preferences
description: View, approve, reject, and manage learned coding preferences — diagnose why Claude applies unexpected styles.
version: 1.1.0
user-invocable: true
allowed-tools: Read, Write, Glob
argument-hint: "[list|approve|reject|toggle|clear|export] [--category=...] [--confidence=...]"
---

# AICodePath Preferences

Manage learned coding conventions. The key expert insight is distinguishing **durable preferences** (apply everywhere) from **context-specific corrections** (apply only once) — conflating them produces rules that fire in the wrong context.

---

## What Makes a Good Preference Rule

Before approving any pending rule, ask:

- **Is it general?** "Use `const` for module imports" is durable. "Use `const user = req.body.user` in this specific handler" is not.
- **Is it about style, not facts?** "Prefer early returns" is a preference. "This file uses Prisma, not raw SQL" is a fact — it belongs in `knowledge.md`, not preferences.
- **Does it reference specific paths or variable names?** If yes, reject it — path-specific rules break as the codebase evolves.

**The false-signal trap**: When Claude misunderstands your codebase and you correct it ("no, this uses the repository pattern"), the `aicodepath-learn` skill may generate a rule from that correction. But it's a factual clarification, not a style preference. Approving it as a rule causes it to fire in unrelated contexts.

---

## Commands

### List All Preferences

```bash
/aicodepath-preferences list
/aicodepath-preferences list --pending          # only source:learned rules with enabled:false
/aicodepath-preferences list --category=backend # filter by category
/aicodepath-preferences list --confidence=low   # surface weak signals
```

Rules are read from `rules[]` in `aicodepath-docs/preferences/project-preferences.json` (v2.0 schema) and grouped by `source` then `category`:

```
Manual Rules (source: manual)
  frontend  [3 rules]
  backend   [2 rules]
  ...

Learned Rules (source: learned)
  Pending approval: [1 rule]
  Enabled: [0 rules]

Workarounds (expires_when is set — review when condition met)
  extract-pure-utils-for-testability
    → Expires when: "When Jest/Babel transform issue is resolved in web-portal"
```

Low-confidence rules warrant extra scrutiny — they were generated from limited evidence and are most likely to be false signals.

### Approve or Reject Pending Rules

Pending rules are `source: "learned"` entries with `enabled: false`.

```bash
/aicodepath-preferences approve   # interactive selection from pending learned rules
/aicodepath-preferences reject    # remove from pending
```

When in doubt, **reject**. A missing rule causes Claude to ask or infer. An incorrect rule causes Claude to consistently apply wrong conventions silently.

### Toggle an Existing Rule

```bash
/aicodepath-preferences toggle <rule-id>
```

On toggle: flip `enabled` field, update rule-level `updated_at` to current ISO timestamp, and update file-level `updated_at`. Use this to temporarily disable a rule without losing it — useful when working on a module that intentionally violates a project-wide convention.

### Export and Clear

```bash
/aicodepath-preferences export              # backup to JSON — includes all v2.0 metadata
/aicodepath-preferences clear               # reset all rules
/aicodepath-preferences clear --keep-history  # reset rules but keep signalHistory
```

Export includes all v2.0 fields: `repo`, file-level `created_at`/`updated_at`, and per-rule `source`, `category`, `severity`, `expires_when`, `created_at`, `updated_at`.

---

## When a Preference is Ready to Become a Guideline

A rule that has been approved, enabled, and never manually overridden across 10+ sessions has enough signal to graduate from preference to permanent guideline rule. At that point:

1. Export the preference (`export` command)
2. Add it to the appropriate `.aicodepath/guidelines/*.json` file as a formal rule
3. Remove it from preferences (it will now be enforced at the hook level)

Preferences are Claude's working memory. Guidelines are the project's law.

---

## NEVER

- **NEVER** approve a rule containing a specific file path, variable name, or module reference — these rules break when code is renamed or moved.
- **NEVER** approve a rule generated from a factual correction ("use Prisma not raw SQL") — this belongs in `knowledge.md`, not preferences.
- **NEVER** let pending rules accumulate beyond 10 without reviewing them — stale pending rules reduce the signal quality of the whole preference system.
- **NEVER** use `clear` without first running `export` — cleared preferences cannot be recovered.

---

## Preference File Location

```
aicodepath-docs/preferences/project-preferences.json
```

If this file is missing, run `node .aicodepath/bin/aicodepath.js init` to regenerate it.
